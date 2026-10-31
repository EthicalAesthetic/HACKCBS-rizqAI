
import os
from dotenv import load_dotenv
from contextlib import asynccontextmanager

from langgraph.checkpoint.sqlite.aio import AsyncSqliteSaver
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.routes import router as analysis_router
from api.conversation_routes import router as conversations_router
from api.auth_routes import router as auth_router
from graph.graph import graph_builder
from database.db import init_db

from pathlib import Path

load_dotenv(Path(__file__).resolve().parent / ".env", override=True)
load_dotenv(override=True)

CHECKPOINT_DB_PATH = (
    "/tmp/rizqai_checkpoints.db"
    if os.getenv("VERCEL")
    else os.getenv("CHECKPOINT_DB_PATH", "rizqai_checkpoints.db")
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        init_db()
    except Exception as exc:
        print(f"Database init notice: {exc}")

    async with AsyncSqliteSaver.from_conn_string(
        CHECKPOINT_DB_PATH
    ) as checkpointer:
        app.state.graph = graph_builder.compile(
            checkpointer=checkpointer
        )
        yield


app = FastAPI(
    title="RizqAI API",
    description=(
        "AI-powered investment research assistant — "
        "Planner, Research, Risk, Debate, and Thesis agents over a single API."
    ),
    version="0.1.0",
    lifespan=lifespan,
)

_frontend_origins = os.getenv(
    "FRONTEND_ORIGIN",
    "http://localhost:3000,http://127.0.0.1:3000,http://localhost:3001",
)

allow_origins = [
    origin.strip()
    for origin in _frontend_origins.split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    return {"status": "ok", "service": "RizqAI API", "version": "0.1.0"}


@app.get("/health")
async def health():
    return {"status": "healthy"}


app.include_router(analysis_router)
app.include_router(conversations_router)
app.include_router(auth_router)
