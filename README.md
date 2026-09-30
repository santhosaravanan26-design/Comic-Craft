# ComicCraft – AI Comic Story Creator

**ComicCraft** is a full-stack, AI-powered web application that turns any story idea into a complete, beautifully illustrated **5-panel comic book**. Powered by the latest Google Gemini API models, ComicCraft handles the entire storytelling pipeline: structured comic plotting, consistent character design, authentic captions and speech-bubble dialogue, visual panel illustration, and professional PDF export.

---

## 1. Features

- **End-to-End 5-Panel Pipeline**:
  - **Panel 1**: Introduction (The Hook & everyday world)
  - **Panel 2**: Development (Inciting incident & journey)
  - **Panel 3**: Conflict / Problem (Twist or obstacle)
  - **Panel 4**: Climax (Peak dramatic confrontation)
  - **Panel 5**: Resolution (Emotional closure or twist punchline)
- **Character Consistency Engine**: Automatically constructs a character profile (appearance, clothing, age, personality, and distinctive traits) and passes it through all image prompts.
- **Comic Book Typography & Styling**: Yellow caption boxes, dynamic speech bubbles, bold action titles, and comic halftone styling.
- **Dual Runtime Support**:
  - **FastAPI Python Backend** with interactive Swagger documentation at `/docs` and Jinja2 rendering.
  - **Vite & Express Full-Stack Runtime** with interactive React 19 UI, instant previews, and client-side PDF generation.
- **Export to PDF**: Produces a multi-page, formatted comic book with custom headers, panel artwork, captions, and dialogues.
- **Resilient AI Fallback**: If an image quota limit is reached, ComicCraft automatically falls back to clean, stylized comic vector illustrations so generation never crashes.

---

## 2. Project Architecture

```
ComicCraft/
│
├── app/
│   ├── __init__.py           # Package init
│   ├── main.py               # FastAPI application entry point
│   ├── routes.py             # HTTP routes (/generate, /generate-comic/json, etc.)
│   ├── models.py             # Pydantic models for validation and schemas
│   ├── gemini_flash.py       # Gemini Flash: 5-panel outline & character profile
│   ├── gemini_pro.py         # Gemini Pro: Narration, captions, dialogue
│   ├── image_generator.py    # Image generation with character continuity
│   ├── layout_builder.py     # Comic layout compiler
│   ├── exporters.py          # Professional PDF generator (FPDF2)
│   └── config.py             # Env config and directory management
│
├── templates/
│   ├── index.html            # Comic creator form
│   ├── comic_preview.html    # 5-panel comic previewer
│   └── export_success.html   # Download confirmation page
│
├── static/
│   ├── css/
│   │   └── style.css         # Authentic comic styling
│   ├── js/
│   │   └── app.js            # Client interaction & progress bar
│   ├── panels/               # Generated panel images
│   └── exports/              # Generated PDF files
│
├── src/                      # React full-stack frontend
├── server.ts                 # Full-stack Express server with Vite middleware
├── .env.example              # Environment variables template
├── .gitignore                # Ignored build and secret files
├── requirements.txt          # Python dependencies
├── package.json              # Node dependencies & scripts
├── run.py                    # Direct Python runner script
└── README.md                 # Documentation
```

---

## 3. How the AI Generation Pipeline Works

```
User Input (Prompt, Character, Setting, Tone, Art Style)
   │
   ▼
[app/gemini_flash.py]
Generates Character Profile + Structured 5-Panel Outline (Strict JSON Schema)
   │
   ▼
[app/gemini_pro.py]
Writes dramatic Narration, vintage Captions, and spoken Dialogue per panel
   │
   ▼
[app/image_generator.py]
Constructs consistent visual prompt (Character + Setting + Action + Style)
and generates panel artwork
   │
   ▼
[app/layout_builder.py]
Combines text, speech bubbles, captions, and images into a ComicResponse model
   │
   ▼
[app/exporters.py]
Renders high-resolution printable comic book PDF (FPDF2 / jsPDF)
```

---

## 4. Setup & Installation (Python FastAPI)

### Prerequisites
- Python 3.10 or 3.11+
- A Google Gemini API key from [Google AI Studio](https://aistudio.google.com/)

### Step 1: Clone or Open Directory
```bash
cd ComicCraft
```

### Step 2: Create and Activate Virtual Environment
On macOS / Linux:
```bash
python3 -m venv env
source env/bin/activate
```
On Windows:
```bash
python -m venv env
env\Scripts\activate
```

### Step 3: Install Dependencies
```bash
pip install -r requirements.txt
```

### Step 4: Configure Environment Variables
Create a `.env` file from `.env.example`:
```bash
cp .env.example .env
```
Edit `.env` and set:
```ini
GEMINI_API_KEY=your_actual_gemini_api_key_here
GEMINI_TEXT_MODEL=gemini-flash-latest
GEMINI_IMAGE_MODEL=gemini-3.1-flash-lite-image
PORT=8000
```

### Step 5: Start the Server
Using Uvicorn directly:
```bash
uvicorn app.main:app --reload --port 8000
```
Or using the runner script:
```bash
python run.py
```

### Step 6: Access the Application
- **Web App**: [http://127.0.0.1:8000](http://127.0.0.1:8000)
- **FastAPI Swagger API Documentation**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **Alternative Redoc Documentation**: [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)

---

## 5. Setup & Running Full-Stack Dev Server (Node.js / AI Studio)

```bash
npm install
npm run dev
```
The server will start on port `3000` (or `http://localhost:3000`).

---

## 6. API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | Renders the ComicCraft creation form |
| `POST` | `/generate` | Submits form data, executes full pipeline, returns comic preview HTML |
| `POST` | `/generate-comic/json` | JSON endpoint accepting `PromptRequest`, returns `ComicResponse` JSON |
| `GET` | `/test-image` | Developer endpoint to test panel image generation |
| `GET` | `/export-success` | Displays PDF download confirmation page |
| `GET` | `/download/{filename}` | Direct file download of generated PDF |
| `GET` | `/docs` | Interactive Swagger UI API documentation |

---

## 7. Supported Models

In accordance with Google AI Studio guidelines:
- **Text & Outline Generation**: `gemini-flash-latest` (default: fast, resilient), `gemini-3.1-flash-lite` (high availability), or `gemini-3.1-pro-preview`
- **Failover Protection**: Automatically reroutes to candidate models if a high-demand spike (HTTP 503) occurs on a single model endpoint.
- **Panel Illustration**: `gemini-3.1-flash-lite-image` (default) or `gemini-3.1-flash-image`
- Configurable directly via `GEMINI_TEXT_MODEL` and `GEMINI_IMAGE_MODEL` in `.env` or chosen dynamically in the UI form.

---

## 8. Troubleshooting

1. **`GEMINI_API_KEY is not configured`**:
   - Verify `.env` contains `GEMINI_API_KEY="AIza..."`.
   - In Google AI Studio, ensure the secret is enabled in the Secrets panel.
2. **`ModuleNotFoundError: No module named 'app'`**:
   - Run commands from the project root directory where `run.py` and `app/` reside.
3. **Image generation quota limit**:
   - The application automatically switches to its high-resolution vector comic illustration engine so generation completes seamlessly.
