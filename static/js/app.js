/**
 * ComicCraft - Client Interaction Script
 */

const PRESETS = {
    fox: {
        prompt: "A courageous fox discovers an ancient glowing portal hidden behind a waterfall in an enchanted forest.",
        character: "Rusty the Fox",
        setting: "Forest",
        tone: "Adventure",
        artStyle: "Comic Book"
    },
    space: {
        prompt: "A solo astronaut on a derelict space station receives a cryptic SOS message from an uncharted nebula.",
        character: "Commander Nova",
        setting: "Space",
        tone: "Mysterious",
        artStyle: "Anime"
    },
    cyber: {
        prompt: "A cyber-enhanced detective investigates a blackout in the high-tech neon district of a futuristic city.",
        character: "Axel Kane",
        setting: "City",
        tone: "Dramatic",
        artStyle: "Comic Book"
    },
    academy: {
        prompt: "A quirky wizard apprentice accidentally mixes up potions during the annual magic exam.",
        character: "Pip Kettle",
        setting: "School",
        tone: "Funny",
        artStyle: "Cartoon"
    }
};

function loadPreset(key) {
    const data = PRESETS[key];
    if (!data) return;

    document.getElementById("story_prompt").value = data.prompt;
    document.getElementById("character_name").value = data.character;
    document.getElementById("setting").value = data.setting;
    document.getElementById("tone").value = data.tone;
    document.getElementById("art_style").value = data.artStyle;
}

function showLoadingState() {
    const overlay = document.getElementById("loadingOverlay");
    const stepText = document.getElementById("loadingStepText");
    const progress = document.getElementById("loadingProgress");

    overlay.style.display = "flex";

    const steps = [
        { text: "1. Analyzing narrative and building character profile...", pct: "20%" },
        { text: "2. Crafting 5-panel dramatic outline with Gemini Flash...", pct: "40%" },
        { text: "3. Writing comic captions, dialogue, and narration...", pct: "60%" },
        { text: "4. Generating comic panel illustrations with character consistency...", pct: "85%" },
        { text: "5. Assembling layout and compiling comic...", pct: "95%" }
    ];

    let currentStep = 0;
    const interval = setInterval(() => {
        currentStep++;
        if (currentStep < steps.length) {
            stepText.innerText = steps[currentStep].text;
            progress.style.width = steps[currentStep].pct;
        } else {
            clearInterval(interval);
        }
    }, 2800);
}
