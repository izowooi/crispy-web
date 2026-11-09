"""Static configuration: models, pricing, languages, paths.

Pricing verified 2026-11-03 against:
  - https://developers.openai.com/api/docs/pricing
  - https://aistudio.google.com/docs/pricing
All prices are USD per 1M tokens.
"""
from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parent.parent
OUTPUT_DIR = Path(os.environ.get("COVERLOC_OUTPUT_DIR", ROOT / "outputs"))
UPLOAD_DIR = ROOT / "uploads"
BATCH_DIR = OUTPUT_DIR / "_batches"

for env_file in (ROOT / ".env.local", ROOT / ".env"):
    if env_file.exists():
        load_dotenv(env_file, override=False)


def openai_key() -> str | None:
    return os.environ.get("OPENAI_API_KEY")


def gemini_key() -> str | None:
    return os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")


# ---------------------------------------------------------------- languages
LANGUAGES: dict[str, dict[str, str]] = {
    "en": {"label": "English", "native": "English", "prompt": "English"},
    "ja": {"label": "Japanese", "native": "日本語", "prompt": "Japanese (natural, publication-quality Japanese)"},
    "zh-Hans": {"label": "Chinese (Simplified)", "native": "简体中文", "prompt": "Simplified Chinese (Mainland China)"},
    "zh-Hant": {"label": "Chinese (Traditional)", "native": "繁體中文", "prompt": "Traditional Chinese (Taiwan)"},
    "ko": {"label": "Korean", "native": "한국어", "prompt": "Korean"},
}
LANG_ALIASES = {"zh": "zh-Hans", "zh-cn": "zh-Hans", "zh-tw": "zh-Hant", "jp": "ja", "kr": "ko"}


def norm_lang(code: str) -> str:
    c = code.strip()
    c = LANG_ALIASES.get(c.lower(), c)
    for k in LANGUAGES:
        if k.lower() == c.lower():
            return k
    raise ValueError(f"Unsupported language '{code}'. Supported: {', '.join(LANGUAGES)}")


# ---------------------------------------------------------------- models
# price keys: text_in, image_in, text_out (incl. thinking), image_out
MODELS: dict[str, dict] = {
    "gpt-image-2.6-sunburst": {
        "provider": "openai",
        "label": "GPT Image 2.6 Sunburst",
        "alias": ["sunburst"],
        "note": "Slower, finest control for detailed edits",
        "price": {"text_in": 5.00, "image_in": 8.00, "text_out": 0.0, "image_out": 30.00},
        "batch_discount": 0.5,
    },
    "gpt-image-2.6-flare": {
        "provider": "openai",
        "label": "GPT Image 2.6 Flare",
        "alias": ["flare"],
        "note": "Fast default model (up to ~50% lower latency)",
        "price": {"text_in": 5.00, "image_in": 8.00, "text_out": 0.0, "image_out": 30.00},
        "batch_discount": 0.5,
    },
    "gemini-nano-banana-2.1": {
        "provider": "gemini",
        "label": "Nano Banana 2.1",
        "alias": ["nb21", "nano-banana-2.1", "banana"],
        "note": "Latest Gemini image model (1K/2K/4K)",
        "price": {"text_in": 1.50, "image_in": 1.50, "text_out": 7.50, "image_out": 30.00},
        "batch_discount": 0.5,
        "sizes": ["1K", "2K", "4K"],
        "thinking": ["minimal", "medium", "high"],
    },
    "gemini-3-pro-image": {
        "provider": "gemini",
        "label": "Nano Banana Pro",
        "alias": ["nbpro"],
        "note": "Gemini 3 Pro Image",
        "price": {"text_in": 2.00, "image_in": 2.00, "text_out": 12.00, "image_out": 120.00},
        "batch_discount": 0.5,
        "sizes": ["1K", "2K", "4K"],
        "thinking": None,
    },
    "gemini-3.1-flash-image": {
        "provider": "gemini",
        "label": "Nano Banana 2",
        "alias": ["nb2"],
        "note": "Gemini 3.1 Flash Image",
        "price": {"text_in": 0.50, "image_in": 0.50, "text_out": 3.00, "image_out": 60.00},
        "batch_discount": 0.5,
        "sizes": ["1K", "2K", "4K"],
        "thinking": ["minimal", "high"],
    },
}
DEFAULT_MODELS = ["gpt-image-2.6-sunburst", "gpt-image-2.6-flare", "gemini-nano-banana-2.1"]

# Mainline model used (a) to drive the Responses API image tool and
# (b) to OCR + translate text before editing.
TEXT_MODELS: dict[str, dict] = {
    "gpt-5.4-mini": {"provider": "openai", "price": {"text_in": 0.75, "image_in": 0.75, "text_out": 4.50}},
    "gpt-5.4": {"provider": "openai", "price": {"text_in": 2.50, "image_in": 2.50, "text_out": 15.00}},
    "gpt-5.5": {"provider": "openai", "price": {"text_in": 5.00, "image_in": 5.00, "text_out": 30.00}},
}
DEFAULT_TEXT_MODEL = "gpt-5.4-mini"


def resolve_model(name: str) -> str:
    n = name.strip().lower()
    for mid, m in MODELS.items():
        if n == mid or n in m.get("alias", []):
            return mid
    raise ValueError(f"Unknown model '{name}'. Choose from: {', '.join(MODELS)} (aliases: "
                     + ", ".join(a for m in MODELS.values() for a in m['alias']) + ")")


def price_for(model: str) -> dict:
    if model in MODELS:
        return MODELS[model]["price"]
    if model in TEXT_MODELS:
        return TEXT_MODELS[model]["price"]
    return {"text_in": 0, "image_in": 0, "text_out": 0, "image_out": 0}
