from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os
from database import engine, Base
import models
from routers import prospects, appointments, pipeline, ai, cases

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="InsureFlow AI",
    description="AI-powered insurance sales consulting platform",
    version="1.0.0",
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
