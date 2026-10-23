from fastapi import APIRouter, HTTPException, Depends, Query
from app.core.security import get_current_user
from app.core.database import get_db
from app.core.utils import serialize_doc, serialize_docs, to_object_id
from app.schemas.schemas import ExchangeRequestCreate, ExchangeRequestAction
from bson import ObjectId
from datetime import datetime, timezone
import hashlib

router = APIRouter(prefix="/exchanges", tags=["Exchange Requests"])

# Valid state machine transitions
SKILL_TRANSITIONS = {
    "pending": ["accepted", "rejected", "cancelled"],
    "accepted": ["completed", "cancelled"],
    "completed": [],
    "rejected": [],
    "cancelled": [],
}

RESOURCE_TRANSITIONS = {
    "pending": ["approved", "rejected", "cancelled"],
    "approved": ["handover_confirmed", "cancelled"],
    "handover_confirmed": ["return_pending"],
    "return_pending": ["returned", "disputed"],
    "returned": [],
    "disputed": ["returned"],
    "rejected": [],
    "cancelled": [],
}


def _can_transition(request_type: str, current: str, new: str) -> bool:
    transitions = SKILL_TRANSITIONS if request_type == "skill" else RESOURCE_TRANSITIONS
    return new in transitions.get(current, [])


async def _award_xp_and_credits(db, user_id: str, xp: int, credits: int, reason: str, idempotency_key: str):
    """Award XP and credits with idempotency protection."""
    existing = await db.credit_transactions.find_one({"idempotency_key": idempotency_key})
    if existing:
        return  # Already awarded

    now = datetime.now(timezone.utc)
    # Update user XP and credits
    await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$inc": {"xp": xp, "skill_credits": credits, "completed_exchanges": 1}},
    )

    # Record transaction
    if credits != 0:
        await db.credit_transactions.insert_one({
            "user_id": user_id,
            "amount": credits,
            "transaction_type": "earn",
            "reason": reason,
            "idempotency_key": idempotency_key,
            "status": "confirmed",
            "created_at": now,
        })


@router.post("/", status_code=201)
async def create_request(
    payload: ExchangeRequestCreate,
    current_user=Depends(get_current_user),
):
    db = get_db()
    now = datetime.now(timezone.utc)

    # Find the listing
    if payload.request_type == "skill":
        collection = db.skill_listings
    else:
        collection = db.resources

    oid = to_object_id(payload.listing_id)
    if not oid:
        raise HTTPException(status_code=400, detail="Invalid listing ID")

    listing = await collection.find_one({"_id": oid})
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")

    provider_field = "provider_id" if payload.request_type == "skill" else "owner_id"
    provider_id = listing[provider_field]

    if provider_id == str(current_user["_id"]):
        raise HTTPException(status_code=400, detail="Cannot request your own listing")

    # Check for duplicate active request
    existing = await db.exchange_requests.find_one({
        "requester_id": str(current_user["_id"]),
        "listing_id": payload.listing_id,
        "status": {"$in": ["pending", "accepted", "approved"]},
    })
    if existing:
        raise HTTPException(status_code=400, detail="You already have an active request for this listing")

    # For resources: check availability (no overlapping approved loans)
    if payload.request_type == "resource":
        if listing.get("status") != "available":
            raise HTTPException(status_code=400, detail="Resource is not available")

    doc = {
        "listing_id": payload.listing_id,
        "request_type": payload.request_type,
        "requester_id": str(current_user["_id"]),
        "requester_name": current_user["full_name"],
        "provider_id": provider_id,
        "listing_title": listing.get("title", ""),
        "proposed_time": payload.proposed_time or payload.proposed_date,
        "proposed_date": payload.proposed_date or payload.proposed_time,
        "duration_days": payload.duration_days,
        "return_date": payload.return_date,
        "message": payload.message or "",
        "status": "pending",
        "history": [{"status": "pending", "timestamp": now.isoformat(), "by": str(current_user["_id"])}],
        "created_at": now,
        "updated_at": now,
    }

    result = await db.exchange_requests.insert_one(doc)
    doc["_id"] = result.inserted_id

    # Increment request count on listing
    await collection.update_one({"_id": oid}, {"$inc": {"request_count": 1}})

    # Notify provider
    await db.notifications.insert_one({
        "user_id": provider_id,
        "title": "New Request",
        "body": f"{current_user['full_name']} wants to exchange: {listing.get('title', '')}",
        "type": "exchange_request",
        "reference_id": str(result.inserted_id),
        "is_read": False,
        "created_at": now,
    })

    return serialize_doc(doc)


@router.get("/")
async def list_my_requests(
    role: str = Query("all"),  # all | requester | provider
    status: str = Query(None),
    current_user=Depends(get_current_user),
):
    db = get_db()
    user_id = str(current_user["_id"])
    query = {}

    if role == "requester":
        query["requester_id"] = user_id
    elif role == "provider":
        query["provider_id"] = user_id
    else:
        query["$or"] = [{"requester_id": user_id}, {"provider_id": user_id}]

    if status:
        query["status"] = status

    requests = await db.exchange_requests.find(query).sort("created_at", -1).to_list(200)
    return serialize_docs(requests)


@router.get("/{request_id}")
async def get_request(request_id: str, current_user=Depends(get_current_user)):
    db = get_db()
    oid = to_object_id(request_id)
    if not oid:
        raise HTTPException(status_code=400, detail="Invalid request ID")

    req = await db.exchange_requests.find_one({"_id": oid})
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")

    user_id = str(current_user["_id"])
    if req["requester_id"] != user_id and req["provider_id"] != user_id:
        raise HTTPException(status_code=403, detail="Not authorized")

    return serialize_doc(req)


@router.post("/{request_id}/action")
@router.patch("/{request_id}/action")
async def act_on_request(
    request_id: str,
    payload: ExchangeRequestAction,
    current_user=Depends(get_current_user),
):
    db = get_db()
    oid = to_object_id(request_id)
    req = await db.exchange_requests.find_one({"_id": oid})
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")

    user_id = str(current_user["_id"])
    is_provider = req["provider_id"] == user_id
    is_requester = req["requester_id"] == user_id

    if not is_provider and not is_requester:
        raise HTTPException(status_code=403, detail="Not authorized")

    action = payload.action
    current_status = req["status"]
    request_type = req["request_type"]

    # Map actions to new statuses
    action_status_map = {
        "accept": "accepted",
        "approve": "approved",
        "reject": "rejected",
        "cancel": "cancelled",
        "complete": "completed",
        "confirm_handover": "handover_confirmed",
        "confirm_return": "returned",
        "dispute": "disputed",
    }

    new_status = action_status_map.get(action)
    if not new_status:
        raise HTTPException(status_code=400, detail=f"Unknown action: {action}")

    # Authorization per action
    provider_only = {"accept", "approve", "reject", "confirm_return"}
    requester_only = {"confirm_handover", "dispute"}

    if action in provider_only and not is_provider:
        raise HTTPException(status_code=403, detail="Only provider can perform this action")
    if action in requester_only and not is_requester:
        raise HTTPException(status_code=403, detail="Only requester can perform this action")

    # Check valid transition
    if not _can_transition(request_type, current_status, new_status):
        raise HTTPException(
            status_code=400,
            detail=f"Cannot transition from '{current_status}' to '{new_status}'",
        )

    now = datetime.now(timezone.utc)
    history_entry = {"status": new_status, "timestamp": now.isoformat(), "by": user_id}

    update = {
        "status": new_status,
        "updated_at": now,
        "$push": {"history": history_entry},
    }

    # Resource status updates
    if request_type == "resource":
        resource_oid = to_object_id(req["listing_id"])
        if new_status == "approved":
            await db.resources.update_one({"_id": resource_oid}, {"$set": {"status": "borrowed"}})
        elif new_status in ("returned", "cancelled", "rejected"):
            await db.resources.update_one({"_id": resource_oid}, {"$set": {"status": "available"}})

    # Award XP/credits on completion
    if new_status == "completed" and request_type == "skill":
        # Award to both provider and requester
        key_provider = hashlib.md5(f"complete:{request_id}:provider".encode()).hexdigest()
        key_requester = hashlib.md5(f"complete:{request_id}:requester".encode()).hexdigest()
        await _award_xp_and_credits(db, req["provider_id"], 50, 1, "Teaching session completed", key_provider)
        await _award_xp_and_credits(db, req["requester_id"], 25, 0, "Learning session completed", key_requester)

        # Notify both
        for uid, name in [(req["provider_id"], "Session"), (req["requester_id"], "Session")]:
            await db.notifications.insert_one({
                "user_id": uid,
                "title": "Exchange Completed!",
                "body": f"Your skill exchange for '{req['listing_title']}' is complete. XP awarded!",
                "type": "exchange_completed",
                "reference_id": request_id,
                "is_read": False,
                "created_at": now,
            })

    if new_status == "returned" and request_type == "resource":
        key = hashlib.md5(f"return:{request_id}:owner".encode()).hexdigest()
        await _award_xp_and_credits(db, req["provider_id"], 20, 0, "Resource lending completed", key)
        await db.resources.update_one(
            {"_id": to_object_id(req["listing_id"])},
            {"$inc": {"loan_count": 1}}
        )

    # Update the request (handle $push separately)
    await db.exchange_requests.update_one(
        {"_id": oid},
        {
            "$set": {"status": new_status, "updated_at": now},
            "$push": {"history": history_entry},
        },
    )

    updated = await db.exchange_requests.find_one({"_id": oid})
    return serialize_doc(updated)


@router.post("/{request_id}/review")
async def create_exchange_review(
    request_id: str,
    payload: dict,
    current_user=Depends(get_current_user),
):
    db = get_db()
    oid = to_object_id(request_id)
    req = await db.exchange_requests.find_one({"_id": oid})
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")

    user_id = str(current_user["_id"])
    if req["requester_id"] != user_id and req["provider_id"] != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to review this exchange")

    target_id = req["provider_id"] if req["requester_id"] == user_id else req["requester_id"]
    rating = int(payload.get("rating", 5))
    comment = payload.get("comment", "")
    now = datetime.now(timezone.utc)

    review_doc = {
        "exchange_id": request_id,
        "reviewer_id": user_id,
        "reviewer_name": current_user["full_name"],
        "reviewee_id": target_id,
        "rating": rating,
        "comment": comment,
        "created_at": now,
    }
    result = await db.reviews.insert_one(review_doc)
    review_doc["_id"] = result.inserted_id

    # Award bonus XP for leaving a review
    await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$inc": {"xp": 15}}
    )

    return serialize_doc(review_doc)
