import json
import os
import logging
from pathlib import Path
from typing import Optional, List, Dict
from bson import ObjectId
from app.core.config import settings

logger = logging.getLogger(__name__)


def _get_cache_path() -> Path:
    """Resolve writable directory for persistent backup storage across serverless & local restarts."""
    candidate_dirs = []
    
    # Cloud / Vercel serverless environment
    if os.environ.get("VERCEL"):
        candidate_dirs.append(Path("/tmp/campusx"))
        candidate_dirs.append(Path("/tmp"))
        
    # Local uploads directories
    backend_dir = Path(__file__).resolve().parent.parent.parent
    candidate_dirs.append(backend_dir / "uploads")
    candidate_dirs.append(backend_dir.parent / "uploads")
    
    # System temp fallback
    temp_env = os.environ.get("TEMP") or os.environ.get("TMP")
    if temp_env:
        candidate_dirs.append(Path(temp_env) / "campusx")
    candidate_dirs.append(Path("/tmp"))

    for cdir in candidate_dirs:
        try:
            cdir.mkdir(parents=True, exist_ok=True)
            test_file = cdir / ".writable_test"
            test_file.write_text("ok")
            test_file.unlink(missing_ok=True)
            return cdir / "campusx_users_backup.json"
        except Exception:
            continue

    # Fallback in current working directory
    fallback = Path.cwd() / "campusx_users_backup.json"
    return fallback


def save_user_to_cache(user_doc: dict):
    """Save user document to persistent backup file so credentials survive in-memory restarts."""
    if not user_doc:
        return
    try:
        path = _get_cache_path()
        users: Dict[str, dict] = {}
        if path.exists():
            try:
                with open(path, "r", encoding="utf-8") as f:
                    users = json.load(f)
            except Exception:
                users = {}

        email = str(user_doc.get("email", "")).strip().lower()
        if not email:
            return

        # Prepare JSON serializable dictionary
        doc_copy = {}
        for k, v in user_doc.items():
            if k == "_id":
                doc_copy[k] = str(v)
            elif hasattr(v, "isoformat"):
                doc_copy[k] = v.isoformat()
            elif isinstance(v, (dict, list, str, int, float, bool)) or v is None:
                doc_copy[k] = v
            else:
                doc_copy[k] = str(v)

        users[email] = doc_copy
        # Also index by string user_id for fast lookup
        if "_id" in doc_copy:
            users[str(doc_copy["_id"])] = doc_copy

        with open(path, "w", encoding="utf-8") as f:
            json.dump(users, f, indent=2)
        logger.info(f"[UserCache] Cached user credentials for email: {email}")
    except Exception as e:
        logger.warning(f"[UserCache] Failed to cache user: {e}")


def load_cached_users() -> List[dict]:
    """Retrieve all cached users from persistent backup file."""
    try:
        path = _get_cache_path()
        if not path.exists():
            return []
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
            if isinstance(data, dict):
                # Filter out redundant ID-keyed duplicates (preserve items that have email)
                unique_users = {}
                for item in data.values():
                    if isinstance(item, dict) and "email" in item:
                        unique_users[item["email"].lower()] = item
                return list(unique_users.values())
            elif isinstance(data, list):
                return data
            return []
    except Exception as e:
        logger.warning(f"[UserCache] Failed to load cached users: {e}")
        return []


def get_cached_user(identifier: str) -> Optional[dict]:
    """Retrieve a single cached user by email or string ID."""
    if not identifier:
        return None
    ident = str(identifier).strip().lower()
    try:
        path = _get_cache_path()
        if path.exists():
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, dict):
                    if ident in data:
                        return data[ident]
                    for u in data.values():
                        if isinstance(u, dict):
                            if u.get("email", "").lower() == ident or str(u.get("_id", "")).lower() == ident:
                                return u
    except Exception as e:
        logger.warning(f"[UserCache] Error retrieving cached user: {e}")
    return None


async def sync_cached_users_to_db(db):
    """Restore all cached users into database collection (ensures survival after mock DB restarts)."""
    try:
        cached_list = load_cached_users()
        if not cached_list:
            return
        restored = 0
        for u in cached_list:
            email = u.get("email", "").strip().lower()
            if not email:
                continue
            doc = dict(u)
            if "_id" in doc and ObjectId.is_valid(doc["_id"]):
                doc["_id"] = ObjectId(doc["_id"])
            await db.users.replace_one({"email": email}, doc, upsert=True)
            restored += 1
        if restored > 0:
            logger.info(f"[UserCache] Restored {restored} cached user(s) to database.")
    except Exception as e:
        logger.warning(f"[UserCache] Error syncing cached users to DB: {e}")
