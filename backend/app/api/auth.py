from fastapi import APIRouter, HTTPException, Depends, status
from datetime import timedelta
import logging
from pymongo.errors import DuplicateKeyError, PyMongoError
from app.schemas.schemas import RegisterRequest, LoginRequest, TokenResponse
from app.core.security import (
    get_password_hash,
    verify_password,
    create_access_token,
    get_current_user,
)
from app.core.config import settings
from app.core.database import get_db
from app.core.utils import serialize_doc
from bson import ObjectId
from datetime import datetime, timezone

logger = logging.getLogger("app.api.auth")

router = APIRouter(prefix="/auth", tags=["Authentication"])


def _safe_user(user: dict) -> dict:
    """Return user dict without password hash or sensitive credentials."""
    u = serialize_doc(user)
    if not u:
        return None
    u.pop("password_hash", None)
    u.pop("password", None)
    u["name"] = u.get("full_name") or "Student"
    u["year"] = u.get("academic_year") or ""
    u["profile_image"] = u.get("avatar_url")
    return u


@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(payload: RegisterRequest):
    db = get_db()
    email_clean = payload.email.strip().lower()

    logger.info(f"[Auth] Registration attempt received for email: {email_clean}")

    # 1. Validate email domain if restricted by configuration
    if settings.ALLOWED_EMAIL_DOMAIN and settings.ALLOWED_EMAIL_DOMAIN.strip():
        allowed_domain = settings.ALLOWED_EMAIL_DOMAIN.strip().lower().lstrip("@")
        domain = email_clean.split("@")[-1].lower()
        if domain != allowed_domain:
            logger.warning(f"[Auth] Registration rejected: Email '{email_clean}' does not match required domain @{allowed_domain}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Only @{allowed_domain} email addresses are allowed for registration",
            )

    # 2. Check if user already exists
    try:
        existing = await db.users.find_one({"email": email_clean})
    except PyMongoError as pe:
        logger.error(f"[Auth] Database query error during registration email check: {type(pe).__name__}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database connection error during registration. Please verify MongoDB connection.",
        )

    if existing:
        logger.warning(f"[Auth] Registration rejected: Duplicate email address '{email_clean}'")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists. Please sign in instead.",
        )

    # 3. Create unique username from email
    base_username = email_clean.split("@")[0].replace(".", "_")
    username = base_username
    count = 1
    try:
        while await db.users.find_one({"username": username}):
            username = f"{base_username}{count}"
            count += 1
    except PyMongoError as pe:
        logger.error(f"[Auth] Database query error during username uniqueness check: {type(pe).__name__}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database connection error during username verification.",
        )

    # 4. Hash password with bcrypt and build user document
    now = datetime.now(timezone.utc)
    user_doc = {
        "email": email_clean,
        "username": username,
        "full_name": payload.full_name.strip(),
        "password_hash": get_password_hash(payload.password),
        "department": payload.department,
        "academic_year": payload.academic_year,
        "role": "student",
        "is_verified": False,
        "is_suspended": False,
        "onboarding_completed": False,
        "onboarding_step": 0,
        "bio": "",
        "avatar_url": None,
        "skills_offered": [],
        "skills_wanted": [],
        "interests": [],
        "languages": ["English"],
        "availability": [],
        "is_profile_public": True,
        "show_department": True,
        "show_year": True,
        "xp": 0,
        "level": 1,
        "skill_credits": 5,  # Starter credits
        "badges": [],
        "completed_exchanges": 0,
        "contribution_score": 0,
        "created_at": now,
        "updated_at": now,
    }

    # 5. Insert document into MongoDB Atlas users collection
    try:
        result = await db.users.insert_one(user_doc)
        user_doc["_id"] = result.inserted_id
        logger.info(
            f"[Auth] New user registered successfully in MongoDB Atlas! "
            f"User ID: {result.inserted_id}, Email: {email_clean}, Collection: 'users'"
        )
    except DuplicateKeyError:
        logger.warning(f"[Auth] Registration rejected: DuplicateKeyError on MongoDB insert for '{email_clean}'")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address or username already exists.",
        )
    except Exception as e:
        logger.error(f"[Auth] Failed to insert user document into MongoDB Atlas: {type(e).__name__}: {str(e)[:120]}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database error: Failed to save registration record to MongoDB Atlas.",
        )

    # 6. Generate JWT token
    token = create_access_token(
        {"sub": str(result.inserted_id)},
        timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    )

    # 7. Initialize starter quest progress in MongoDB
    try:
        quests = await db.quests.find({}).to_list(100)
        for quest in quests:
            await db.quest_progress.update_one(
                {"user_id": str(result.inserted_id), "quest_id": str(quest["_id"])},
                {"$setOnInsert": {"progress": 0, "completed": False, "completed_at": None}},
                upsert=True,
            )
    except Exception as qe:
        logger.warning(f"[Auth] Non-fatal: Failed to initialize quests for user {result.inserted_id}: {type(qe).__name__}")

    return {"access_token": token, "token_type": "bearer", "user": _safe_user(user_doc)}


@router.post("/login")
async def login(payload: LoginRequest):
    db = get_db()
    email_clean = payload.email.strip().lower()

    logger.info(f"[Auth] Login attempt received for email: {email_clean}")

    # 1. Fetch user from MongoDB
    try:
        user = await db.users.find_one({"email": email_clean})
    except PyMongoError as pe:
        logger.error(f"[Auth] Database query failure during login for email {email_clean}: {type(pe).__name__}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database connection error during login. Please try again later.",
        )

    # If user not found, check if database was fresh/empty and seed demo data
    if not user:
        try:
            total_users = await db.users.count_documents({})
            if total_users == 0:
                from app.core.seeder import seed_demo_data
                await seed_demo_data(db)
                user = await db.users.find_one({"email": email_clean})
        except Exception as e:
            logger.warning(f"[Auth] Auto-seeding check failed: {e}")

    # 2. Check if user exists
    if not user:
        logger.warning(f"[Auth] Login failed: No user found for email: {email_clean}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No account found with this email. Please click 'Join CampusX' to create an account first, or use a demo account.",
        )

    # 3. Verify credentials using bcrypt
    if not verify_password(payload.password, user.get("password_hash", "")):
        logger.warning(f"[Auth] Login failed: Incorrect password for email: {email_clean}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect password. Please try again or use the demo credentials.",
        )

    # 3. Check account suspension status
    if user.get("is_suspended", False):
        logger.warning(f"[Auth] Login rejected: Suspended account for email: {email_clean}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is suspended. Contact campus administration.",
        )

    # Note: Login strictly authenticates existing users and NEVER creates a new user document.
    logger.info(f"[Auth] User logged in successfully: User ID: {user['_id']}, Email: {email_clean}")

    token = create_access_token(
        {"sub": str(user["_id"])},
        timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    )

    return {"access_token": token, "token_type": "bearer", "user": _safe_user(user)}


@router.get("/me")
async def get_me(current_user=Depends(get_current_user)):
    return _safe_user(current_user)


@router.post("/logout")
async def logout(current_user=Depends(get_current_user)):
    user_id = str(current_user.get("_id", "unknown"))
    logger.info(f"[Auth] User logged out: User ID: {user_id}")
    return {"message": "Logged out successfully"}

