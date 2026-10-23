import sys
import os
from pathlib import Path

# Add backend directory to sys.path
ROOT_DIR = Path(__file__).resolve().parent.parent
BACKEND_DIR = ROOT_DIR / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

# Ensure Vercel serverless writable directory for uploads
os.environ.setdefault("UPLOAD_DIR", "/tmp/uploads")

from app.main import app
