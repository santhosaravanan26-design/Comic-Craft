"""
Pydantic models for ComicCraft.
Handles request validation and structured schemas for Gemini responses.
"""

from typing import List, Optional
from pydantic import BaseModel, Field, field_validator


class PromptRequest(BaseModel):
    story_prompt: str = Field(
        ...,
        min_length=5,
        max_length=1500,
        description="The story idea or prompt for the comic"
    )
    character_name: str = Field(
        ...,
        min_length=1,
        max_length=100,
        description="Name of the main character"
    )
    setting: str = Field(
        default="Forest",
        description="Comic setting environment"
    )
    tone: str = Field(
        default="Adventure",
        description="Tone of the comic story"
    )
    art_style: str = Field(
        default="Comic Book",
        description="Visual illustration art style"
    )
    gemini_model: Optional[str] = Field(
        default="gemini-flash-latest",
        description="Gemini text model to use for generation"
    )

    @field_validator("story_prompt", "character_name")
    @classmethod
    def check_not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Field cannot be empty or only whitespace")
        return v.strip()


class CharacterProfile(BaseModel):
    name: str
    appearance: str
    clothing: str
    age: Optional[str] = "Young adult"
    personality: str
    distinctive_features: Optional[str] = "None"


class OutlinePanel(BaseModel):
    panel_number: int = Field(..., ge=1, le=5)
    title: str
    scene_description: str
    image_prompt: str
    characters: List[str] = Field(default_factory=list)
    location: str
    mood: str


class OutlineResponse(BaseModel):
    story_title: str
    character_profile: CharacterProfile
    panels: List[OutlinePanel]


class DialogueItem(BaseModel):
    character: str
    text: str


class StoryPanel(BaseModel):
    panel_number: int = Field(..., ge=1, le=5)
    narration: str
    caption: str
    dialogue: List[DialogueItem] = Field(default_factory=list)
    action_note: Optional[str] = ""


class StoryResponse(BaseModel):
    panels: List[StoryPanel]


class FinalPanel(BaseModel):
    panel_number: int
    title: str
    scene_description: str
    image_prompt: str
    image_url: str
    narration: str
    caption: str
    action_note: str = ""
    dialogue: List[DialogueItem] = Field(default_factory=list)
    mood: str
    location: str
    characters: List[str] = Field(default_factory=list)


class ComicResponse(BaseModel):
    comic_id: str
    story_title: str
    character_profile: CharacterProfile
    setting: str
    tone: str
    art_style: str
    panels: List[FinalPanel]
    pdf_path: Optional[str] = None
