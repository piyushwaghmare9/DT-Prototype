from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.core.config import settings
from app.core.database import get_db
from bson import ObjectId

import bcrypt

security = HTTPBearer()


import logging

logger = logging.getLogger(__name__)


def verify_password(plain_password: str, hashed_password) -> bool:
    try:
        if not plain_password or not hashed_password:
            return False
        if isinstance(plain_password, str):
            plain_bytes = plain_password.encode("utf-8")[:72]
        else:
            plain_bytes = bytes(plain_password)[:72]

        if isinstance(hashed_password, str):
            hash_bytes = hashed_password.encode("utf-8")
        elif isinstance(hashed_password, bytes):
            hash_bytes = hashed_password
        else:
            return False

        return bcrypt.checkpw(plain_bytes, hash_bytes)
    except Exception as e:
        logger.warning(f"verify_password check failed: {e}")
        return False


def get_password_hash(password: str) -> str:
    # Truncate to 72 bytes if necessary per bcrypt spec
    pwd_bytes = password.encode("utf-8")[:72]
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pwd_bytes, salt).decode("utf-8")


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def decode_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(
            token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM]
        )
        return payload
    except JWTError:
        return None


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    payload = decode_token(credentials.credentials)
    if payload is None:
        raise credentials_exception

    user_id: str = payload.get("sub")
    email: str = payload.get("email")
    if not user_id and not email:
        raise credentials_exception

    db = get_db()
    user = None

    # 1. Look up by ObjectId or string ID
    if user_id:
        try:
            if ObjectId.is_valid(user_id):
                user = await db.users.find_one({"_id": ObjectId(user_id)})
            elif isinstance(user_id, str):
                user = await db.users.find_one({"_id": user_id})
        except Exception:
            user = None

    # 2. Look up by email (handles ID shifts across container environments)
    if user is None and email:
        try:
            user = await db.users.find_one({"email": email.strip().lower()})
        except Exception:
            user = None

    # 3. If missing from in-memory collection (e.g. serverless cold start), restore from persistent cache
    if user is None:
        try:
            from app.core.user_cache import get_cached_user
            cached = get_cached_user(email or user_id)
            if cached:
                doc = dict(cached)
                if "_id" in doc and ObjectId.is_valid(doc["_id"]):
                    doc["_id"] = ObjectId(doc["_id"])
                user_email = doc.get("email", "").strip().lower()
                if user_email:
                    await db.users.replace_one({"email": user_email}, doc, upsert=True)
                    user = await db.users.find_one({"email": user_email})
        except Exception as ce:
            logger.warning(f"Error restoring cached user in get_current_user: {ce}")

    if user is None:
        raise credentials_exception

    if user.get("is_suspended", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is suspended",
        )

    return user


async def get_current_active_user(current_user=Depends(get_current_user)):
    return current_user


async def require_admin(current_user=Depends(get_current_user)):
    if current_user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return current_user
