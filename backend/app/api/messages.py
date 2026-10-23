from fastapi import APIRouter, HTTPException, Depends, Query
from app.core.security import get_current_user
from app.core.database import get_db
from app.core.utils import serialize_doc, serialize_docs, to_object_id
from app.schemas.schemas import MessageSend
from bson import ObjectId
from datetime import datetime, timezone

router = APIRouter(prefix="/messages", tags=["Messages"])


async def _get_or_create_conversation(db, user1_id: str, user2_id: str) -> dict:
    participants = sorted([user1_id, user2_id])
    conv = await db.conversations.find_one({"participants": participants})
    if not conv:
        now = datetime.now(timezone.utc)
        result = await db.conversations.insert_one({
            "participants": participants,
            "last_message": None,
            "last_message_at": now,
            "unread_counts": {user1_id: 0, user2_id: 0},
            "created_at": now,
            "updated_at": now,
        })
        conv = await db.conversations.find_one({"_id": result.inserted_id})
    return conv


@router.get("/conversations")
async def list_conversations(current_user=Depends(get_current_user)):
    db = get_db()
    user_id = str(current_user["_id"])
    convs = await db.conversations.find(
        {"participants": user_id}
    ).sort("updated_at", -1).to_list(50)

    # Enrich with other participant's profile
    result = []
    for conv in convs:
        serialized = serialize_doc(conv)
        other_id = next((p for p in conv["participants"] if p != user_id), None)
        if other_id:
            other_user = await db.users.find_one(
                {"_id": ObjectId(other_id)},
                {"full_name": 1, "avatar_url": 1, "department": 1},
            )
            if other_user:
                serialized["other_participant"] = {
                    "id": str(other_user["_id"]),
                    "name": other_user.get("full_name"),
                    "avatar": other_user.get("avatar_url"),
                    "department": other_user.get("department"),
                }
        result.append(serialized)
    return result


@router.get("/conversations/{conv_id}")
async def get_conversation(conv_id: str, current_user=Depends(get_current_user)):
    db = get_db()
    oid = to_object_id(conv_id)
    conv = await db.conversations.find_one({"_id": oid})
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    if str(current_user["_id"]) not in conv["participants"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    return serialize_doc(conv)


@router.get("/conversations/{conv_id}/messages")
async def get_messages(
    conv_id: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    current_user=Depends(get_current_user),
):
    db = get_db()
    oid = to_object_id(conv_id)
    conv = await db.conversations.find_one({"_id": oid})
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    if str(current_user["_id"]) not in conv["participants"]:
        raise HTTPException(status_code=403, detail="Not authorized")

    messages = await db.messages.find(
        {"conversation_id": conv_id}
    ).sort("created_at", -1).skip((page - 1) * page_size).limit(page_size).to_list(page_size)

    # Mark as read
    await db.conversations.update_one(
        {"_id": oid},
        {"$set": {f"unread_counts.{str(current_user['_id'])}": 0}},
    )

    return serialize_docs(list(reversed(messages)))


@router.post("/send/{recipient_id}", status_code=201)
async def send_message(
    recipient_id: str,
    payload: MessageSend,
    current_user=Depends(get_current_user),
):
    db = get_db()
    sender_id = str(current_user["_id"])

    if sender_id == recipient_id:
        raise HTTPException(status_code=400, detail="Cannot message yourself")

    # Verify recipient exists
    rec_oid = to_object_id(recipient_id)
    recipient = await db.users.find_one({"_id": rec_oid})
    if not recipient:
        raise HTTPException(status_code=404, detail="Recipient not found")

    conv = await _get_or_create_conversation(db, sender_id, recipient_id)
    conv_id = str(conv["_id"])

    now = datetime.now(timezone.utc)
    msg_doc = {
        "conversation_id": conv_id,
        "sender_id": sender_id,
        "sender_name": current_user["full_name"],
        "content": payload.content,
        "is_read": False,
        "created_at": now,
    }
    result = await db.messages.insert_one(msg_doc)
    msg_doc["_id"] = result.inserted_id

    # Update conversation
    await db.conversations.update_one(
        {"_id": conv["_id"]},
        {
            "$set": {
                "last_message": payload.content[:100],
                "last_message_at": now,
                "updated_at": now,
            },
            "$inc": {f"unread_counts.{recipient_id}": 1},
        },
    )

    # Notify recipient
    await db.notifications.insert_one({
        "user_id": recipient_id,
        "title": f"New message from {current_user['full_name']}",
        "body": payload.content[:80],
        "type": "message",
        "reference_id": conv_id,
        "is_read": False,
        "created_at": now,
    })

    return serialize_doc(msg_doc)


@router.post("/conversations/{conv_id}/messages", status_code=201)
async def reply_in_conversation(
    conv_id: str,
    payload: MessageSend,
    current_user=Depends(get_current_user),
):
    db = get_db()
    sender_id = str(current_user["_id"])
    oid = to_object_id(conv_id)
    conv = await db.conversations.find_one({"_id": oid})
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    if sender_id not in conv["participants"]:
        raise HTTPException(status_code=403, detail="Not authorized")

    recipient_id = next((p for p in conv["participants"] if p != sender_id), None)
    now = datetime.now(timezone.utc)
    msg_doc = {
        "conversation_id": conv_id,
        "sender_id": sender_id,
        "sender_name": current_user["full_name"],
        "content": payload.content,
        "is_read": False,
        "created_at": now,
    }
    result = await db.messages.insert_one(msg_doc)
    msg_doc["_id"] = result.inserted_id

    await db.conversations.update_one(
        {"_id": oid},
        {
            "$set": {"last_message": payload.content[:100], "last_message_at": now, "updated_at": now},
            "$inc": {f"unread_counts.{recipient_id}": 1},
        },
    )

    if recipient_id:
        await db.notifications.insert_one({
            "user_id": recipient_id,
            "title": f"New message from {current_user['full_name']}",
            "body": payload.content[:80],
            "type": "message",
            "reference_id": conv_id,
            "is_read": False,
            "created_at": now,
        })

    return serialize_doc(msg_doc)
