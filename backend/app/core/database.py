from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings
from fastapi import HTTPException, status
import logging
import certifi

logger = logging.getLogger(__name__)

client: AsyncIOMotorClient = None
db = None
db_connected: bool = False
db_error: str = None
is_mock_db: bool = False


def mask_mongo_uri(uri: str) -> str:
    """Safely mask username and password from a MongoDB connection string."""
    if not uri:
        return "(empty)"
    try:
        if "@" in uri:
            scheme_and_auth, rest = uri.split("@", 1)
            scheme = uri.split("://")[0]
            # Strip query params for cleaner safe logging
            clean_rest = rest.split("?")[0]
            return f"{scheme}://***:***@{clean_rest}"
        return uri.split("?")[0]
    except Exception:
        return "(masked-uri)"


async def connect_to_mongo():
    global client, db, db_connected, db_error, is_mock_db
    uri = settings.MONGODB_URI or ""
    masked_uri = mask_mongo_uri(uri)

    is_placeholder = (
        "USERNAME:PASSWORD" in uri
        or not uri
        or ("cluster.mongodb.net" in uri and "USERNAME" in uri)
        or "CLUSTER_HOST" in uri
    )

    # 1. If mock DB is explicitly requested (e.g. offline unit test suite)
    if settings.USE_MOCK_DB:
        try:
            from mongomock_motor import AsyncMongoMockClient
            client = AsyncMongoMockClient()
            db = client[settings.DB_NAME]
            db_connected = True
            is_mock_db = True
            logger.info(f"[CampusX] Running with in-memory database ({settings.DB_NAME}) as explicitly requested.")
            await create_indexes()
            return
        except Exception as e:
            db_error = f"{type(e).__name__}: {str(e)[:100]}"
            logger.error(f"Failed to initialize mock database: {db_error}")
            raise

    # 2. Real MongoDB connection validation
    if is_placeholder:
        db_connected = False
        db_error = "Placeholder or empty MONGODB_URI detected in .env"
        logger.error(f"[CampusX MongoDB] {db_error}. Please set a valid MongoDB Atlas connection string.")
        raise RuntimeError(
            "MongoDB Atlas connection string is not configured. "
            "Please provide a valid MONGODB_URI in backend/.env"
        )

    # 3. Connect to real external MongoDB (Atlas)
    logger.info(f"[CampusX MongoDB] Connecting to MongoDB Atlas: {masked_uri} (Database: {settings.DB_NAME})...")
    try:
        client = AsyncIOMotorClient(
            uri,
            serverSelectionTimeoutMS=5000,
            tlsCAFile=certifi.where(),
        )
        db = client[settings.DB_NAME]

        # Verify connection with an administrative ping
        await client.admin.command("ping")
        db_connected = True
        db_error = None
        is_mock_db = False
        logger.info(f"[CampusX MongoDB] Successfully connected to MongoDB Atlas database '{settings.DB_NAME}' at {masked_uri}!")
        await create_indexes()
    except Exception as e:
        safe_err = f"{type(e).__name__}: {str(e)[:120]}"
        db_error = safe_err
        logger.warning(
            f"[CampusX MongoDB] Atlas connection could not be established: {safe_err}. "
            f"Please ensure your IP is whitelisted in MongoDB Atlas Network Access (or add 0.0.0.0/0). "
            f"Activating resilient fallback database so backend remains running on port 8000."
        )
        try:
            from mongomock_motor import AsyncMongoMockClient
            client = AsyncMongoMockClient()
            db = client[settings.DB_NAME]
            db_connected = True
            is_mock_db = True
            await create_indexes()
            # Seed demo data into in-memory fallback
            try:
                from app.core.seeder import seed_demo_data
                await seed_demo_data(db)
            except Exception as se:
                logger.warning(f"Fallback demo seed: {se}")
            logger.info(f"[CampusX MongoDB] Resilient in-memory database successfully initialized.")
            return
        except Exception as fallback_err:
            db_connected = False
            logger.error(f"[CampusX MongoDB] Fallback failed: {fallback_err}")
            raise RuntimeError(
                f"Failed to connect to Atlas and fallback initialization failed: {safe_err}"
            )


async def close_mongo_connection():
    global client, db_connected
    if client:
        client.close()
        db_connected = False
        logger.info("MongoDB connection closed")


def get_db():
    if db is None or not db_connected:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database connection failed. Unable to reach MongoDB Atlas. Please verify database connectivity.",
        )
    return db


def get_db_status() -> dict:
    return {
        "connected": db_connected,
        "database_name": settings.DB_NAME,
        "is_mock": is_mock_db,
        "error": db_error,
    }



async def create_indexes():
    """Create all database indexes for performance and uniqueness constraints."""
    try:
        # Users
        await db.users.create_index("email", unique=True)
        await db.users.create_index("username", unique=True)
        await db.users.create_index("role")
        await db.users.create_index("is_verified")

        # Skill Listings
        await db.skill_listings.create_index("provider_id")
        await db.skill_listings.create_index("category")
        await db.skill_listings.create_index("status")
        await db.skill_listings.create_index([("title", "text"), ("description", "text")])

        # Resources
        await db.resources.create_index("owner_id")
        await db.resources.create_index("category")
        await db.resources.create_index("status")
        await db.resources.create_index([("title", "text"), ("description", "text")])

        # Exchange Requests
        await db.exchange_requests.create_index("requester_id")
        await db.exchange_requests.create_index("provider_id")
        await db.exchange_requests.create_index("listing_id")
        await db.exchange_requests.create_index("status")
        await db.exchange_requests.create_index("type")

        # Messages
        await db.messages.create_index("conversation_id")
        await db.messages.create_index("sender_id")
        await db.messages.create_index("created_at")

        # Conversations
        await db.conversations.create_index("participants")
        await db.conversations.create_index("updated_at")

        # Projects
        await db.projects.create_index("owner_id")
        await db.projects.create_index("status")
        await db.projects.create_index([("title", "text"), ("description", "text")])

        # Project Memberships - unique per user per project
        await db.project_memberships.create_index(
            [("project_id", 1), ("user_id", 1)], unique=True
        )

        # Credit Transactions - idempotency key
        await db.credit_transactions.create_index("user_id")
        await db.credit_transactions.create_index("idempotency_key", unique=True, sparse=True)
        await db.credit_transactions.create_index("created_at")

        # Notifications
        await db.notifications.create_index("user_id")
        await db.notifications.create_index("is_read")
        await db.notifications.create_index("created_at")

        # Quest Progress
        await db.quest_progress.create_index([("user_id", 1), ("quest_id", 1)], unique=True)

        # Reviews
        await db.reviews.create_index("reviewee_id")
        await db.reviews.create_index("reviewer_id")
        await db.reviews.create_index([("exchange_id", 1), ("reviewer_id", 1)], unique=True)

        # Reports
        await db.reports.create_index("reporter_id")
        await db.reports.create_index("status")

        logger.info("Database indexes created successfully")
    except Exception as e:
        logger.error(f"Error creating indexes: {e}")
