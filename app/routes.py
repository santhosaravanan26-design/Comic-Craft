"""
FastAPI Routes for ComicCraft.
Section 13 Requirement.
"""

import time
import logging
from pathlib import Path
from fastapi import APIRouter, Request, Form, HTTPException, Depends
from fastapi.responses import HTMLResponse, JSONResponse, FileResponse
from fastapi.templating import Jinja2Templates

from app.config import TEMPLATES_DIR, EXPORTS_DIR, GEMINI_API_KEY
from app.models import PromptRequest, ComicResponse
from app.gemini_flash import generate_outline
from app.gemini_pro import generate_story
from app.image_generator import generate_image
from app.layout_builder import build_comic_layout
from app.exporters import save_pdf

logger = logging.getLogger(__name__)

router = APIRouter()
templates = Jinja2Templates(directory=str(TEMPLATES_DIR))


@router.get("/", response_class=HTMLResponse)
async def home(request: Request):
    """Render the ComicCraft homepage form."""
    return templates.TemplateResponse(
        "index.html",
        {
            "request": request,
            "has_api_key": bool(GEMINI_API_KEY)
        }
    )


@router.post("/generate", response_class=HTMLResponse)
async def generate_comic_html(
    request: Request,
    story_prompt: str = Form(...),
    character_name: str = Form(...),
    setting: str = Form("Forest"),
    tone: str = Form("Adventure"),
    art_style: str = Form("Comic Book"),
    gemini_model: str = Form("gemini-flash-latest")
):
    """
    Executes the complete comic generation pipeline from HTML form submission
    and renders comic_preview.html.
    """
    if not story_prompt.strip() or not character_name.strip():
        raise HTTPException(status_code=400, detail="Story prompt and character name are required.")

    try:
        comic_id = f"comic_{int(time.time())}"

        # Step 1: Outline & Character Profile
        logger.info(f"Generating outline with model {gemini_model}...")
        outline = generate_outline(
            story_prompt=story_prompt,
            character_name=character_name,
            setting=setting,
            tone=tone,
            art_style=art_style,
            preferred_model=gemini_model
        )

        # Step 2: Story narration & dialogue
        logger.info("Generating story & dialogue...")
        story = generate_story(
            outline=outline,
            tone=tone,
            art_style=art_style,
            preferred_model=gemini_model
        )

        # Step 3: Images for each panel
        image_paths = []
        for panel in outline.panels:
            logger.info(f"Generating image for panel {panel.panel_number}...")
            img_path = generate_image(
                panel_number=panel.panel_number,
                title=panel.title,
                image_prompt=panel.image_prompt,
                character_profile=outline.character_profile,
                setting=setting,
                mood=panel.mood,
                art_style=art_style
            )
            image_paths.append(img_path)

        # Step 4: Layout assembly
        comic = build_comic_layout(
            comic_id=comic_id,
            outline=outline,
            story=story,
            image_paths=image_paths,
            setting=setting,
            tone=tone,
            art_style=art_style
        )

        # Step 5: PDF Generation
        pdf_path = save_pdf(comic)
        comic.pdf_path = pdf_path

        return templates.TemplateResponse(
            "comic_preview.html",
            {
                "request": request,
                "comic": comic,
            }
        )

    except Exception as e:
        logger.error(f"Comic generation error: {e}", exc_info=True)
        return templates.TemplateResponse(
            "index.html",
            {
                "request": request,
                "error_message": f"Comic generation failed: {str(e)}",
                "story_prompt": story_prompt,
                "character_name": character_name,
                "has_api_key": bool(GEMINI_API_KEY)
            },
            status_code=500
        )


@router.post("/generate-comic/json", response_model=ComicResponse)
async def generate_comic_json(req: PromptRequest):
    """
    Accepts PromptRequest JSON and returns the full structured ComicResponse JSON.
    """
    try:
        comic_id = f"comic_{int(time.time())}"

        # 1. Outline
        outline = generate_outline(
            story_prompt=req.story_prompt,
            character_name=req.character_name,
            setting=req.setting,
            tone=req.tone,
            art_style=req.art_style,
            preferred_model=req.gemini_model or "gemini-flash-latest"
        )

        # 2. Story
        story = generate_story(
            outline=outline,
            tone=req.tone,
            art_style=req.art_style,
            preferred_model=req.gemini_model or "gemini-flash-latest"
        )

        # 3. Images
        image_paths = []
        for panel in outline.panels:
            img_path = generate_image(
                panel_number=panel.panel_number,
                title=panel.title,
                image_prompt=panel.image_prompt,
                character_profile=outline.character_profile,
                setting=req.setting,
                mood=panel.mood,
                art_style=req.art_style
            )
            image_paths.append(img_path)

        # 4. Layout
        comic = build_comic_layout(
            comic_id=comic_id,
            outline=outline,
            story=story,
            image_paths=image_paths,
            setting=req.setting,
            tone=req.tone,
            art_style=req.art_style
        )

        # 5. PDF
        pdf_path = save_pdf(comic)
        comic.pdf_path = pdf_path

        return comic

    except Exception as e:
        logger.error(f"JSON comic generation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/test-image")
async def test_image():
    """
    Developer test endpoint to verify image generation capabilities.
    Section 13 Requirement.
    """
    try:
        from app.models import CharacterProfile
        test_char = CharacterProfile(
            name="Rusty",
            appearance="Red-orange fox with amber eyes and a fluffy tail",
            clothing="Leather aviator goggles and a red traveler cape",
            personality="Brave and inquisitive",
            distinctive_features="White star mark on forehead"
        )
        img_path = generate_image(
            panel_number=1,
            title="The Forest Gate",
            image_prompt="A fox peering into an ancient glowing portal in the woods",
            character_profile=test_char,
            setting="Forest",
            mood="Mysterious",
            art_style="Comic Book"
        )
        return {
            "status": "success",
            "message": "Image generation completed",
            "image_url": img_path
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Image test failed: {str(e)}")


@router.get("/export-success", response_class=HTMLResponse)
async def export_success(request: Request, pdf_path: str = ""):
    """Renders the export success page."""
    return templates.TemplateResponse(
        "export_success.html",
        {
            "request": request,
            "pdf_path": pdf_path,
        }
    )


@router.get("/download/{filename}")
async def download_file(filename: str):
    """Serves the generated PDF file for direct download."""
    # Prevent path traversal
    safe_filename = Path(filename).name
    filepath = EXPORTS_DIR / safe_filename
    if not filepath.exists():
        raise HTTPException(status_code=404, detail="Requested file not found")
    return FileResponse(
        path=str(filepath),
        filename=safe_filename,
        media_type="application/pdf"
    )
