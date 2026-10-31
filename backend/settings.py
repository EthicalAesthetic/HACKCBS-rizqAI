import os
from pathlib import Path

from dotenv import load_dotenv


BASE_DIR = Path(__file__).resolve().parent
# Allow `backend/.env` for deployments that package the backend separately.
load_dotenv(BASE_DIR / ".env", override=False)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
AUTH_REDIRECT_URL = os.getenv(
    "AUTH_REDIRECT_URL",
    "http://localhost:3000/auth/callback",
)
PASSWORD_RESET_REDIRECT_URL = os.getenv(
    "PASSWORD_RESET_REDIRECT_URL",
    "http://localhost:3000/auth/reset-password",
)
DEFAULT_DB = "sqlite:////tmp/rizqai.db" if os.getenv("VERCEL") else "sqlite:///./rizqai.db"
DATABASE_URL = os.getenv("DATABASE_URL", DEFAULT_DB)
JWT_SECRET = os.getenv("JWT_SECRET")
