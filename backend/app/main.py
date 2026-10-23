from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import logging
import os

from app.core.config import settings
from app.core.database import connect_to_mongo, close_mongo_connection, get_db, get_db_status
from app.api import auth, profiles, skills, resources, exchanges, graph, messages, projects, notifications, rewards, admin, search
from app.api.rewards import seed_quests

logging.basicConfig(
    level=logging.INFO if not settings.DEBUG else logging.DEBUG,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup - Connect to MongoDB Atlas
    await connect_to_mongo()
    db = get_db()
    # Seed core platform quest definitions if not present
    await seed_quests(db)
    # Synchronize all registered users' skills into skill_listings so all real student skills are visible
    from app.api.skills import sync_all_registered_skills
    await sync_all_registered_skills(db)
    # Note: seed_demo_data is intentionally not called on normal startup
    # to keep real authentication clean and prevent sample user injection.
    # To seed demo data manually, use: python seed_db.py
    logger.info(f"{settings.APP_NAME} v{settings.APP_VERSION} started")

    # Ensure upload directory exists
    try:
        os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    except OSError:
        pass

    yield

    # Shutdown
    await close_mongo_connection()
    logger.info("Application shut down")



app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="CampusXchange — Your Campus. Your Skills. Your Next Big Thing.",
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

# CORS - allow local dev, Vercel deployments, and production URLs
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.FRONTEND_URL,
        "https://campusxchange.vercel.app",
        "https://campusx.vercel.app",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:4173",
        "http://127.0.0.1:4173",
    ],
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?|https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def ensure_db_connected(request: Request, call_next):
    from app.core.database import db_connected, connect_to_mongo
    if not db_connected:
        try:
            await connect_to_mongo()
        except Exception as e:
            logger.error(f"Error connecting database on demand: {e}")
    return await call_next(request)

from app.api import (
    auth,
    profiles,
    skills,
    resources,
    exchanges,
    graph,
    messages,
    projects,
    notifications,
    rewards,
    admin,
    search,
    users,
)

# API Routes - mounted under both /api/v1 and /api for full compatibility
routers = [
    auth.router,
    users.router,
    profiles.router,
    skills.router,
    resources.router,
    exchanges.router,
    graph.router,
    messages.router,
    projects.router,
    notifications.router,
    rewards.router,
    admin.router,
    search.router,
]

for r in routers:
    app.include_router(r, prefix="/api/v1")
    app.include_router(r, prefix="/api")



@app.get("/api/health")
async def health():
    db_status = get_db_status()
    return {
        "status": "ok" if db_status.get("connected") else "degraded",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "database": db_status,
    }


@app.get("/")
async def root():
    return {"message": f"Welcome to {settings.APP_NAME} API", "docs": "/api/docs"}
