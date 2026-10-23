import asyncio
import sys
import logging
from motor.motor_asyncio import AsyncIOMotorClient

from app.core.config import settings
from app.core.database import create_indexes
from app.core.seeder import seed_demo_data
from app.api.rewards import seed_quests

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s]: %(message)s")
logger = logging.getLogger("seed_db")


async def run_seed(custom_uri: str = None):
    uri = custom_uri or settings.MONGODB_URI
    db_name = settings.DB_NAME or "campusx"

    if not uri or "USERNAME:PASSWORD" in uri or "CLUSTER_HOST" in uri or "<db_password>" in uri:
        logger.error("Please provide a valid MONGODB_URI in backend/.env before running the seeder.")
        print("\n[ERROR] Invalid MONGODB_URI. Update your backend/.env with your real MongoDB Atlas connection string.")
        return False

    print(f"\n=======================================================")
    print(f"Connecting to MongoDB Atlas Database: {db_name}")
    print(f"URI: {uri.split('@')[-1] if '@' in uri else uri}")
    print(f"=======================================================\n")

    try:
        client = AsyncIOMotorClient(uri, serverSelectionTimeoutMS=10000)
        db = client[db_name]

        # 1. Test ping
        await client.admin.command("ping")
        print(" Connected successfully to MongoDB Atlas!")

        # 2. Setup indexes
        print("\n[1/3] Creating database indexes...")
        # Monkey patch or set db for create_indexes
        import app.core.database as db_module
        db_module.db = db
        await create_indexes()
        print(" Indexes created.")

        # 3. Seed quests
        print("\n[2/3] Seeding platform quests...")
        await seed_quests(db)
        print(" Quests seeded.")

        # 4. Seed demo users, skills, resources, projects
        print("\n[3/3] Seeding demo dataset (users, skills, resources, projects)...")
        await seed_demo_data(db)
        print(" Demo dataset seeded successfully.")

        # Summary of documents
        print("\n================ DATASET SUMMARY ================")
        collections = await db.list_collection_names()
        for col in sorted(collections):
            count = await db[col].count_documents({})
            print(f" - {col:22} : {count} documents")
        print("=================================================\n")

        client.close()
        return True

    except Exception as e:
        print(f"\n[ERROR] Failed to connect/seed database: {e}")
        return False


if __name__ == "__main__":
    custom_uri = sys.argv[1] if len(sys.argv) > 1 else None
    success = asyncio.run(run_seed(custom_uri))
    sys.exit(0 if success else 1)
