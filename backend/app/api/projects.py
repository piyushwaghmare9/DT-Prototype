from fastapi import APIRouter, HTTPException, Depends, Query
from app.core.security import get_current_user
from app.core.database import get_db
from app.core.utils import serialize_doc, serialize_docs, to_object_id
from app.schemas.schemas import ProjectCreate, ProjectApplicationCreate
from bson import ObjectId
from datetime import datetime, timezone

router = APIRouter(prefix="/projects", tags=["Projects"])


@router.post("/", status_code=201)
async def create_project(payload: ProjectCreate, current_user=Depends(get_current_user)):
    db = get_db()
    now = datetime.now(timezone.utc)
    doc = {
        **payload.dict(),
        "owner_id": str(current_user["_id"]),
        "owner_name": current_user["full_name"],
        "owner_avatar": current_user.get("avatar_url"),
        "status": "active",
        "team_size": 1,
        "views": 0,
        "created_at": now,
        "updated_at": now,
    }
    result = await db.projects.insert_one(doc)
    doc["_id"] = result.inserted_id

    # Add owner as member
    await db.project_memberships.insert_one({
        "project_id": str(result.inserted_id),
        "user_id": str(current_user["_id"]),
        "role": "owner",
        "status": "active",
        "joined_at": now,
    })

    return serialize_doc(doc)


@router.get("/")
async def list_projects(
    q: str = Query(None),
    category: str = Query(None),
    skill: str = Query(None),
    status: str = Query("active"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=50),
    current_user=Depends(get_current_user),
):
    db = get_db()
    query = {}
    if status:
        query["status"] = status
    if category:
        query["category"] = category
    if skill:
        query["required_skills"] = {"$elemMatch": {"$regex": skill, "$options": "i"}}
    if q:
        query["$or"] = [
            {"title": {"$regex": q, "$options": "i"}},
            {"description": {"$regex": q, "$options": "i"}},
        ]

    total = await db.projects.count_documents(query)
    projects = (
        await db.projects.find(query)
        .sort("created_at", -1)
        .skip((page - 1) * page_size)
        .limit(page_size)
        .to_list(page_size)
    )
    return {
        "items": serialize_docs(projects),
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": (total + page_size - 1) // page_size,
    }


@router.get("/my")
async def my_projects(current_user=Depends(get_current_user)):
    db = get_db()
    # Projects where user is a member
    memberships = await db.project_memberships.find(
        {"user_id": str(current_user["_id"]), "status": "active"}
    ).to_list(50)
    project_ids = [to_object_id(m["project_id"]) for m in memberships]
    projects = await db.projects.find({"_id": {"$in": project_ids}}).to_list(50)
    return serialize_docs(projects)


@router.get("/{project_id}")
async def get_project(project_id: str, current_user=Depends(get_current_user)):
    db = get_db()
    oid = to_object_id(project_id)
    project = await db.projects.find_one({"_id": oid})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    await db.projects.update_one({"_id": oid}, {"$inc": {"views": 1}})

    # Fetch team members
    members = await db.project_memberships.find(
        {"project_id": project_id, "status": "active"}
    ).to_list(20)

    result = serialize_doc(project)
    result["members"] = serialize_docs(members)
    return result


@router.post("/apply", status_code=201)
async def apply_to_project(
    payload: ProjectApplicationCreate, current_user=Depends(get_current_user)
):
    db = get_db()
    project_oid = to_object_id(payload.project_id)
    project = await db.projects.find_one({"_id": project_oid})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if project["owner_id"] == str(current_user["_id"]):
        raise HTTPException(status_code=400, detail="You own this project")

    # Check duplicate application
    existing = await db.exchange_requests.find_one({
        "requester_id": str(current_user["_id"]),
        "listing_id": payload.project_id,
        "request_type": "project_application",
        "status": {"$in": ["pending", "accepted"]},
    })
    if existing:
        raise HTTPException(status_code=400, detail="Already applied")

    now = datetime.now(timezone.utc)
    doc = {
        "listing_id": payload.project_id,
        "listing_title": project["title"],
        "request_type": "project_application",
        "requester_id": str(current_user["_id"]),
        "requester_name": current_user["full_name"],
        "provider_id": project["owner_id"],
        "role_title": payload.role_title,
        "message": payload.message,
        "relevant_skills": payload.relevant_skills,
        "status": "pending",
        "history": [{"status": "pending", "timestamp": now.isoformat(), "by": str(current_user["_id"])}],
        "created_at": now,
        "updated_at": now,
    }
    result = await db.exchange_requests.insert_one(doc)
    doc["_id"] = result.inserted_id

    # Notify project owner
    await db.notifications.insert_one({
        "user_id": project["owner_id"],
        "title": "New Project Application",
        "body": f"{current_user['full_name']} applied for '{payload.role_title}' in {project['title']}",
        "type": "project_application",
        "reference_id": str(result.inserted_id),
        "is_read": False,
        "created_at": now,
    })

    return serialize_doc(doc)


@router.post("/{project_id}/applications/{app_id}/accept")
async def accept_application(
    project_id: str,
    app_id: str,
    current_user=Depends(get_current_user),
):
    db = get_db()
    project = await db.projects.find_one({"_id": to_object_id(project_id)})
    if not project or project["owner_id"] != str(current_user["_id"]):
        raise HTTPException(status_code=403, detail="Not authorized")

    app_oid = to_object_id(app_id)
    app = await db.exchange_requests.find_one({"_id": app_oid})
    if not app or app["listing_id"] != project_id:
        raise HTTPException(status_code=404, detail="Application not found")

    now = datetime.now(timezone.utc)
    await db.exchange_requests.update_one(
        {"_id": app_oid},
        {"$set": {"status": "accepted", "updated_at": now}, "$push": {"history": {"status": "accepted", "timestamp": now.isoformat(), "by": str(current_user["_id"])}}},
    )

    # Add to project membership
    await db.project_memberships.update_one(
        {"project_id": project_id, "user_id": app["requester_id"]},
        {"$setOnInsert": {
            "project_id": project_id,
            "user_id": app["requester_id"],
            "role": app.get("role_title", "Member"),
            "status": "active",
            "joined_at": now,
        }},
        upsert=True,
    )
    await db.projects.update_one({"_id": to_object_id(project_id)}, {"$inc": {"team_size": 1}})

    # Notify applicant
    await db.notifications.insert_one({
        "user_id": app["requester_id"],
        "title": "Application Accepted!",
        "body": f"You've been accepted to join {project['title']}!",
        "type": "project_accepted",
        "reference_id": project_id,
        "is_read": False,
        "created_at": now,
    })

    return {"message": "Application accepted"}
