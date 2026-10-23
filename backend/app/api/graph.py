from fastapi import APIRouter, HTTPException, Depends, Query
from app.core.security import get_current_user
from app.core.database import get_db
from app.core.utils import serialize_doc, serialize_docs, to_object_id
from bson import ObjectId
from datetime import datetime, timezone

router = APIRouter(prefix="/graph", tags=["Campus Skill Graph"])


@router.get("/nodes")
async def get_graph_nodes(
    department: str = Query(None),
    node_types: str = Query(None),  # comma-separated: student,skill,resource,project
    current_user=Depends(get_current_user),
):
    """Return graph nodes from real database entities."""
    db = get_db()
    types = node_types.split(",") if node_types else ["student", "skill", "resource", "project"]
    nodes = []
    edges = []

    # Student nodes
    if "student" in types:
        user_query = {"is_profile_public": {"$ne": False}, "is_suspended": {"$ne": True}}
        if department and department != "All":
            user_query["department"] = department



        users = await db.users.find(
            user_query,
            {
                "_id": 1,
                "full_name": 1,
                "department": 1,
                "academic_year": 1,
                "avatar_url": 1,
                "skills_offered": 1,
                "skills_wanted": 1,
                "xp": 1,
                "level": 1,
            },
        ).limit(50).to_list(50)

        for u in users:
            uid = str(u["_id"])
            nodes.append({
                "id": f"user:{uid}",
                "type": "student",
                "label": u.get("full_name", "Student"),
                "data": {
                    "user_id": uid,
                    "name": u.get("full_name"),
                    "department": u.get("department"),
                    "avatar": u.get("avatar_url"),
                    "xp": u.get("xp", 0),
                    "level": u.get("level", 1),
                },
            })

            # Skill edges from this student
            for skill in u.get("skills_offered", []):
                skill_node_id = f"skill:{skill['name'].lower().replace(' ', '_')}"
                nodes.append({
                    "id": skill_node_id,
                    "type": "skill",
                    "label": skill["name"],
                    "data": {"category": skill.get("category"), "level": skill.get("level")},
                })
                edges.append({
                    "id": f"e:offers:{uid}:{skill_node_id}",
                    "source": f"user:{uid}",
                    "target": skill_node_id,
                    "type": "offers",
                    "label": "offers",
                })

            for skill_name in u.get("skills_wanted", []):
                skill_node_id = f"skill:{skill_name.lower().replace(' ', '_')}"
                edges.append({
                    "id": f"e:wants:{uid}:{skill_node_id}",
                    "source": f"user:{uid}",
                    "target": skill_node_id,
                    "type": "wants",
                    "label": "wants to learn",
                })

    # Resource nodes
    if "resource" in types:
        resource_query = {"status": "available"}
        resources = await db.resources.find(
            resource_query,
            {"_id": 1, "title": 1, "category": 1, "owner_id": 1, "condition": 1},
        ).limit(30).to_list(30)

        for r in resources:
            rid = str(r["_id"])
            r_node_id = f"resource:{rid}"
            nodes.append({
                "id": r_node_id,
                "type": "resource",
                "label": r.get("title"),
                "data": {
                    "resource_id": rid,
                    "category": r.get("category"),
                    "condition": r.get("condition"),
                },
            })
            edges.append({
                "id": f"e:lends:{r['owner_id']}:{rid}",
                "source": f"user:{r['owner_id']}",
                "target": r_node_id,
                "type": "lends",
                "label": "lends",
            })

    # Project nodes
    if "project" in types:
        projects = await db.projects.find(
            {"status": "active"},
            {"_id": 1, "title": 1, "required_skills": 1, "owner_id": 1, "category": 1},
        ).limit(20).to_list(20)

        for p in projects:
            pid = str(p["_id"])
            p_node_id = f"project:{pid}"
            nodes.append({
                "id": p_node_id,
                "type": "project",
                "label": p.get("title"),
                "data": {
                    "project_id": pid,
                    "category": p.get("category"),
                    "required_skills": p.get("required_skills", []),
                },
            })
            for skill_name in p.get("required_skills", []):
                skill_node_id = f"skill:{skill_name.lower().replace(' ', '_')}"
                edges.append({
                    "id": f"e:needs:{pid}:{skill_node_id}",
                    "source": p_node_id,
                    "target": skill_node_id,
                    "type": "needs_skill",
                    "label": "needs",
                })

    # Deduplicate nodes
    seen = set()
    unique_nodes = []
    for n in nodes:
        if n["id"] not in seen:
            seen.add(n["id"])
            unique_nodes.append(n)

    return {"nodes": unique_nodes, "edges": edges}


@router.get("/recommendations")
async def get_recommendations(current_user=Depends(get_current_user)):
    """Rule-based recommendations for the current user."""
    db = get_db()
    wanted = current_user.get("skills_wanted", [])
    offered = [s.get("name") for s in current_user.get("skills_offered", [])]
    interests = current_user.get("interests", [])
    dept = current_user.get("department")

    recommendations = []

    # Recommend skill providers for skills the user wants
    for skill_name in wanted[:5]:
        listings = await db.skill_listings.find(
            {
                "title": {"$regex": skill_name, "$options": "i"},
                "status": "active",
                "provider_id": {"$ne": str(current_user["_id"])},
            }
        ).limit(3).to_list(3)

        for listing in listings:
            recommendations.append({
                "type": "skill_listing",
                "id": str(listing["_id"]),
                "title": listing["title"],
                "provider_name": listing.get("provider_name"),
                "reason": f"Matched because you want to learn {skill_name} and this student offers it.",
                "match_score": 0.9,
            })

    # Recommend students with complementary skills
    if offered:
        complementary_users = await db.users.find(
            {
                "skills_wanted": {"$in": offered},
                "_id": {"$ne": current_user["_id"]},
                "is_profile_public": True,
            }
        ).limit(5).to_list(5)

        for u in complementary_users:
            recommendations.append({
                "type": "student",
                "id": str(u["_id"]),
                "title": u["full_name"],
                "reason": f"They want to learn {', '.join(s for s in u.get('skills_wanted', []) if s in offered)}—skills you offer.",
                "match_score": 0.8,
            })

    # Recommend projects needing the user's skills
    if offered:
        projects = await db.projects.find(
            {
                "required_skills": {"$in": offered},
                "status": "active",
                "owner_id": {"$ne": str(current_user["_id"])},
            }
        ).limit(3).to_list(3)

        for p in projects:
            matching = [s for s in p.get("required_skills", []) if s in offered]
            recommendations.append({
                "type": "project",
                "id": str(p["_id"]),
                "title": p["title"],
                "reason": f"This project needs {', '.join(matching)}—skills you offer.",
                "match_score": 0.85,
            })

    return {"recommendations": recommendations[:12]}
