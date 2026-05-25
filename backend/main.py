import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os

from apscheduler.schedulers.asyncio import AsyncIOScheduler

from database import engine, Base
import models
from routers import prospects, appointments, pipeline, ai, cases, queue
from services.queue_service import check_and_queue_stale_cases

logger = logging.getLogger(__name__)
scheduler = AsyncIOScheduler()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Run an immediate check on startup so the queue populates without waiting an hour
    try:
        result = await check_and_queue_stale_cases()
        logger.info("Startup stale check: %s", result)
    except Exception as exc:
        logger.warning("Startup stale check failed (non-fatal): %s", exc)

    # Schedule hourly checks
    scheduler.add_job(
        check_and_queue_stale_cases,
        trigger="interval",
        hours=1,
        id="stale_case_check",
        replace_existing=True,
    )
    scheduler.start()
    logger.info("Scheduler started — stale case check runs every hour")

    yield

    scheduler.shutdown(wait=False)


Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="InsureFlow AI",
    description="AI-powered life insurance sales consulting platform",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(prospects.router)
app.include_router(appointments.router)
app.include_router(pipeline.router)
app.include_router(ai.router)
app.include_router(cases.router)
app.include_router(queue.router)


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "InsureFlow AI"}


static_dir = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")
if os.path.exists(static_dir):
    app.mount("/assets", StaticFiles(directory=os.path.join(static_dir, "assets")), name="assets")

    @app.get("/{full_path:path}")
    def serve_frontend(full_path: str):
        index = os.path.join(static_dir, "index.html")
        return FileResponse(index)
