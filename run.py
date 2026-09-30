"""
Runner script for ComicCraft application.
Usage: python run.py
"""

import uvicorn
from app.config import PORT, DEBUG

if __name__ == "__main__":
    print(f"Starting ComicCraft on http://127.0.0.1:{PORT}")
    print(f"Interactive API documentation available at http://127.0.0.1:{PORT}/docs")
    uvicorn.run("app.main:app", host="0.0.0.0", port=PORT, reload=DEBUG)
