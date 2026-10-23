from fastapi import APIRouter, HTTPException, Depends, Query
from app.core.security import get_current_user
from app.core.database import get_db
from app.core.utils import serialize_doc, serialize_docs, to_object_id
from app.schemas.schemas import ResourceCreate, ResourceUpdate
from datetime import datetime, timezone

router = APIRouter(prefix="/resources", tags=["Resources"])

RESOURCE_CATEGORIES = [
    "Textbooks",
    "Calculators",
    "Lab Kits",
    "Electronics",
    "Engineering Drawing Tools",
    "Sports Equipment",
    "Cameras & Tripods",
    "Chargers & Adapters",
    "Project Components",
    "Stationery",
    "Clothing & Accessories",
    "Other",
]


@router.get("/categories")
async def get_categories():
    return {"categories": RESOURCE_CATEGORIES}


@router.post("", status_code=201)
@router.post("/", status_code=201)
@router.post("/listings", status_code=201)
async def create_resource(
    payload: ResourceCreate, current_user=Depends(get_current_user)
):
    db = get_db()
    now = datetime.now(timezone.utc)
    uid = str(current_user["_id"])
    data = payload.dict()
    max_days = data.get("max_duration_days") or data.get("max_loan_days") or 7
    pickup = data.get("pickup_location") or data.get("pickup_instructions") or "Campus Library"
    doc = {
        **data,
        "max_duration_days": int(max_days),
        "max_loan_days": int(max_days),
        "pickup_location": pickup,
        "condition": data.get("condition") or "Good",
        "owner_id": uid,
        "owner_name": current_user.get("full_name", "Student"),
        "owner_avatar": current_user.get("avatar_url"),
        "owner_department": current_user.get("department", ""),
        "status": "available",  # available | borrowed | unavailable
        "availability": "available",
        "photos": data.get("photos", []),
        "loan_count": 0,
        "created_at": now,
        "updated_at": now,
    }
    result = await db.resources.insert_one(doc)
    doc["_id"] = result.inserted_id
    doc["id"] = str(result.inserted_id)
    return serialize_doc(doc)


@router.get("")
@router.get("/")
@router.get("/listings")
async def list_resources(
    q: str = Query(None),
    category: str = Query(None),
    condition: str = Query(None),
    status: str = Query("available"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=50),
    current_user=Depends(get_current_user),
):
    db = get_db()
    query = {}
    if status and status != "All":
        query["status"] = status
    if category and category != "All":
        query["category"] = category
    if condition and condition != "All":
        query["condition"] = condition
    if q and q.strip():
        term = q.strip()
        query["$or"] = [
            {"title": {"$regex": term, "$options": "i"}},
            {"description": {"$regex": term, "$options": "i"}},
            {"category": {"$regex": term, "$options": "i"}},
            {"pickup_location": {"$regex": term, "$options": "i"}},
        ]

    total = await db.resources.count_documents(query)
    resources = (
        await db.resources.find(query)
        .sort("created_at", -1)
        .skip((page - 1) * page_size)
        .limit(page_size)
        .to_list(page_size)
    )

    # Populate current owner information from MongoDB Atlas users collection
    serialized = []
    for item in resources:
        s_item = serialize_doc(item)
        oid_str = s_item.get("owner_id")
        owner_suspended = False
        if oid_str:
            oid = to_object_id(oid_str)
            if oid:
                try:
                    owner = await db.users.find_one(
                        {"_id": oid},
                        {"full_name": 1, "avatar_url": 1, "department": 1, "academic_year": 1, "is_suspended": 1}
                    )
                    if owner:
                        if owner.get("is_suspended", False):
                            owner_suspended = True
                        s_item["owner_name"] = owner.get("full_name") or s_item.get("owner_name") or "Student"
                        s_item["owner_avatar"] = owner.get("avatar_url") or s_item.get("owner_avatar")
                        s_item["owner_department"] = owner.get("department") or s_item.get("owner_department")
                except Exception:
                    pass

        if owner_suspended and current_user.get("role") != "admin":
            continue

        s_item["availability"] = s_item.get("status", "available")
        s_item["max_duration_days"] = s_item.get("max_duration_days") or s_item.get("max_loan_days") or 7
        s_item["pickup_location"] = s_item.get("pickup_location") or "Campus Library"
        s_item["image"] = s_item.get("photos", [None])[0] if s_item.get("photos") else None
        serialized.append(s_item)

    return {
        "items": serialized,
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": (total + page_size - 1) // page_size if total > 0 else 1,
    }


@router.get("/my")
async def my_resources(current_user=Depends(get_current_user)):
    db = get_db()
    resources = await db.resources.find(
        {"owner_id": str(current_user["_id"])}
    ).sort("created_at", -1).to_list(100)
    return serialize_docs(resources)


@router.get("/{resource_id}")
@router.get("/listings/{resource_id}")
async def get_resource(resource_id: str, current_user=Depends(get_current_user)):
    db = get_db()
    oid = to_object_id(resource_id)
    if not oid:
        raise HTTPException(status_code=400, detail="Invalid resource ID")

    resource = await db.resources.find_one({"_id": oid})
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found")

    s_item = serialize_doc(resource)
    oid_str = s_item.get("owner_id")
    if oid_str:
        o_oid = to_object_id(oid_str)
        if o_oid:
            owner = await db.users.find_one({"_id": o_oid}, {"full_name": 1, "avatar_url": 1, "department": 1})
            if owner:
                s_item["owner_name"] = owner.get("full_name", s_item.get("owner_name"))
                s_item["owner_avatar"] = owner.get("avatar_url", s_item.get("owner_avatar"))
                s_item["owner_department"] = owner.get("department", s_item.get("owner_department"))

    return s_item


@router.put("/{resource_id}")
@router.put("/listings/{resource_id}")
async def update_resource(
    resource_id: str,
    payload: ResourceUpdate,
    current_user=Depends(get_current_user),
):
    db = get_db()
    oid = to_object_id(resource_id)
    if not oid:
        raise HTTPException(status_code=400, detail="Invalid resource ID")

    resource = await db.resources.find_one({"_id": oid})
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found")
    if resource.get("owner_id") != str(current_user["_id"]) and current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Not your resource")

    update_data = {k: v for k, v in payload.dict(exclude_unset=True).items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc)
    await db.resources.update_one({"_id": oid}, {"$set": update_data})
    updated = await db.resources.find_one({"_id": oid})
    return serialize_doc(updated)


@router.delete("/{resource_id}", status_code=204)
@router.delete("/listings/{resource_id}", status_code=204)
async def delete_resource(resource_id: str, current_user=Depends(get_current_user)):
    db = get_db()
    oid = to_object_id(resource_id)
    if not oid:
        raise HTTPException(status_code=400, detail="Invalid resource ID")

    resource = await db.resources.find_one({"_id": oid})
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found")
    if resource.get("owner_id") != str(current_user["_id"]) and current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")

    await db.resources.delete_one({"_id": oid})
    return None

