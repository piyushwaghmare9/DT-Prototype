import asyncio
import json
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings

async def main():
    client = AsyncIOMotorClient(settings.MONGODB_URI, serverSelectionTimeoutMS=5000)
    db = client[settings.DB_NAME]
    users = await db.users.find({}, {
        "_id": 1, "email": 1, "username": 1, "full_name": 1, "role": 1, "department": 1, "created_at": 1
    }).to_list(100)
    print(f"\n--- Total users in MongoDB Atlas ({settings.DB_NAME}.users): {len(users)} ---")
    for u in users:
        print(f"ID: {u['_id']} | Email: {u.get('email')} | Name: {u.get('full_name')} | Role: {u.get('role')} | Dept: {u.get('department')}")
    print("-------------------------------------------------------------------------\n")
    client.close()

if __name__ == "__main__":
    asyncio.run(main())
