from fastapi import APIRouter, Depends, Query
from app.core.security import get_current_user
from app.core.database import get_db
from app.core.utils import serialize_doc, serialize_docs, to_object_id
from bson import ObjectId
from datetime import datetime, timezone

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("/")
async def list_notifications(
    is_read: bool = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(30, ge=1, le=50),
    current_user=Depends(get_current_user),
):
    db = get_db()
    query = {"user_id": str(current_user["_id"])}
    if is_read is not None:
        query["is_read"] = is_read

    total = await db.notifications.count_documents(query)
    notifs = await db.notifications.find(query).sort("created_at", -1).skip(
        (page - 1) * page_size
    ).limit(page_size).to_list(page_size)

    return {
        "items": serialize_docs(notifs),
        "total": total,
        "unread_count": await db.notifications.count_documents({"user_id": str(current_user["_id"]), "is_read": False}),
    }


@router.post("/{notif_id}/read")
async def mark_read(notif_id: str, current_user=Depends(get_current_user)):
    db = get_db()
    oid = to_object_id(notif_id)
    await db.notifications.update_one(
        {"_id": oid, "user_id": str(current_user["_id"])},
        {"$set": {"is_read": True}},
    )
    return {"message": "Marked as read"}


@router.post("/read-all")
async def mark_all_read(current_user=Depends(get_current_user)):
    db = get_db()
    await db.notifications.update_many(
        {"user_id": str(current_user["_id"]), "is_read": False},
        {"$set": {"is_read": True}},
    )
    return {"message": "All notifications marked as read"}
