"""
ComicCraft - FastAPI Application Entry Point.
Section 21 Requirement.
"""

import logging
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware

from app.config import STATIC_DIR, PANELS_DIR, EXPORTS_DIR
from app.routes import router

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("comiccraft")

# Initialize FastAPI application
app = FastAPI(
    title="ComicCraft",
    description="Turn your imagination into a complete 5-panel AI-powered comic with structured storytelling, consistent character design, detailed dialogue, and downloadable PDF.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Enable CORS for flexible integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static directory for CSS, JS, images, and exports
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

# Include API and page routes
app.include_router(router)


@app.on_event("startup")
async def startup_event():
    """Ensure required runtime directories exist upon application launch."""
    PANELS_DIR.mkdir(parents=True, exist_ok=True)
    EXPORTS_DIR.mkdir(parents=True, exist_ok=True)
    logger.info("ComicCraft application started successfully. Static directories ready.")
