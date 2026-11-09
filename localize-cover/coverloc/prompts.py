"""Edit prompt. Deliberately plain: we ask the model to localize and keep the
layout — we do not try to force behaviour the model cannot deliver."""
from __future__ import annotations

from .config import LANGUAGES


def build_prompt(source_lang: str, target_lang: str, extra: str = "") -> str:
    src = LANGUAGES[source_lang]["prompt"] if source_lang != "auto" else "the original language"
    tgt = LANGUAGES[target_lang]["prompt"]
    p = (
        f"Localize this cover image: translate all visible text from {src} into {tgt}.\n"
        "Rules:\n"
        "- Edit ONLY the text. Keep the photo, people, background, colors, lines and decorations exactly as they are.\n"
        "- Keep the same canvas, framing and scale. Do not crop, zoom, shift or re-compose anything.\n"
        "- Keep each text block in the same position, alignment, color, weight and visual hierarchy; "
        "words highlighted in a different color must stay highlighted in the translation.\n"
        "- Do NOT translate logos, brand names or wordmarks (e.g. product/company logos); leave them untouched.\n"
        "- Person names: write them in the target language's customary script.\n"
        "- Use natural, idiomatic, publication-quality wording, not literal translation.\n"
        "- Text must be crisp, correctly spelled and fully legible."
    )
    if extra.strip():
        p += "\nAdditional instructions:\n" + extra.strip()
    return p
