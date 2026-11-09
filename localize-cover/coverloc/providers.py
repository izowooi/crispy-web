"""Provider request builders / response parsers.

Builders return (url_path, json_body) so that the same body is used for the
synchronous call AND for batch JSONL lines — what you test is what you batch.

OpenAI
  mode="responses" : POST /v1/responses with the image_generation tool.
                     Supports `store` (dashboard logging). DEFAULT, store=false.
  mode="images"    : POST /v1/images/edits (JSON body). The Images API has no
                     `store` parameter (verified: "Unknown parameter: 'store'"),
                     so the toggle does not apply there.
Gemini
  POST models/{model}:generateContent with top-level `store` (verified the
  REST API accepts it; it overrides the project-level logging default).
"""
from __future__ import annotations

import base64
import time

import httpx

from . import config

OPENAI_BASE = "https://api.openai.com"
GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta"


class ProviderError(RuntimeError):
    pass


# ------------------------------------------------------------------ OpenAI

def openai_request(model: str, prompt: str, png_b64: str, w: int, h: int, *, quality: str,
                   mode: str, store: bool, text_model: str = config.DEFAULT_TEXT_MODEL) -> tuple[str, dict]:
    data_url = "data:image/png;base64," + png_b64
    if mode == "images":
        return "/v1/images/edits", {
            "model": model, "prompt": prompt, "images": [{"image_url": data_url}],
            "size": f"{w}x{h}", "quality": quality, "output_format": "png", "n": 1,
        }
    return "/v1/responses", {
        "model": text_model,
        "store": store,
        "input": [{"role": "user", "content": [
            {"type": "input_text", "text": prompt},
            {"type": "input_image", "image_url": data_url},
        ]}],
        "tools": [{"type": "image_generation", "model": model, "action": "edit",
                   "size": f"{w}x{h}", "quality": quality, "output_format": "png"}],
        "tool_choice": {"type": "image_generation"},
    }


def openai_parse(mode: str, j: dict) -> tuple[bytes, dict, dict]:
    """-> (image_bytes, usage_by_model, extra)"""
    if "error" in j and j["error"]:
        raise ProviderError(_err(j["error"]))
    if mode == "images":
        u = j.get("usage") or {}
        itd, otd = u.get("input_tokens_details") or {}, u.get("output_tokens_details") or {}
        usage = {"image": {"text_in": itd.get("text_tokens", 0), "image_in": itd.get("image_tokens", 0),
                           "text_out": otd.get("text_tokens", 0),
                           "image_out": otd.get("image_tokens", u.get("output_tokens", 0))}}
        return base64.b64decode(j["data"][0]["b64_json"]), usage, {}
    img, extra = None, {"response_id": j.get("id")}  # needed to delete the log later if store=true
    for o in j.get("output", []):
        if o.get("type") == "image_generation_call":
            if o.get("status") not in (None, "completed"):
                raise ProviderError(f"image_generation_call status={o.get('status')}")
            img = o.get("result")
            extra["revised_prompt"] = o.get("revised_prompt")
    if not img:
        raise ProviderError("No image in Responses output (the model may have refused)")
    u = j.get("usage") or {}
    usage = {"mainline": {"text_in": u.get("input_tokens", 0), "image_in": 0,
                          "text_out": u.get("output_tokens", 0), "image_out": 0}}
    # image tool usage (reported under tool_usage.image_gen on current API)
    tu = (j.get("tool_usage") or {}).get("image_gen") or {}
    if tu:
        itd, otd = tu.get("input_tokens_details") or {}, tu.get("output_tokens_details") or {}
        usage["image"] = {"text_in": itd.get("text_tokens", 0), "image_in": itd.get("image_tokens", 0),
                          "text_out": 0, "image_out": otd.get("image_tokens", tu.get("output_tokens", 0))}
    return base64.b64decode(img), usage, extra


# ------------------------------------------------------------------ Gemini

def gemini_request(model: str, prompt: str, png_b64: str, *, aspect: str, image_size: str,
                   store: bool, thinking: str | None = None) -> tuple[str, dict]:
    gen: dict = {"responseModalities": ["IMAGE"],
                 "imageConfig": {"aspectRatio": aspect, "imageSize": image_size}}
    if thinking and config.MODELS[model].get("thinking"):
        gen["thinkingConfig"] = {"thinkingLevel": thinking}
    return f"/models/{model}:generateContent", {
        "store": store,
        "contents": [{"role": "user", "parts": [
            {"text": prompt}, {"inline_data": {"mime_type": "image/png", "data": png_b64}}]}],
        "generationConfig": gen,
    }


def gemini_parse(j: dict) -> tuple[bytes, dict, dict]:
    if j.get("error"):
        raise ProviderError(_err(j["error"]))
    img, texts = None, []
    for c in j.get("candidates", []):
        for p in (c.get("content") or {}).get("parts", []):
            d = p.get("inlineData") or p.get("inline_data")
            if d and not p.get("thought"):
                img = d["data"]
            elif "text" in p and not p.get("thought"):
                texts.append(p["text"])
    if not img:
        reason = (j.get("candidates") or [{}])[0].get("finishReason") or j.get("promptFeedback")
        raise ProviderError(f"No image returned (reason: {reason}) {' '.join(texts)[:200]}")
    u = j.get("usageMetadata") or {}
    by_mod = lambda key: {d["modality"]: d.get("tokenCount", 0) for d in u.get(key) or []}  # noqa: E731
    pin, cout = by_mod("promptTokensDetails"), by_mod("candidatesTokensDetails")
    usage = {"image": {"text_in": pin.get("TEXT", 0), "image_in": pin.get("IMAGE", 0),
                       "text_out": cout.get("TEXT", 0) + u.get("thoughtsTokenCount", 0),
                       "image_out": cout.get("IMAGE", 0)}}
    return base64.b64decode(img), usage, {"text": " ".join(texts)[:500] or None}


# ------------------------------------------------------------------ transport

def _err(e) -> str:
    if isinstance(e, dict):
        return f"{e.get('code') or e.get('status') or ''} {e.get('message') or e}".strip()
    return str(e)


def post(provider: str, path: str, body: dict, timeout: float = 600, retries: int = 2) -> dict:
    if provider == "openai":
        key = config.openai_key()
        url, headers = OPENAI_BASE + path, {"Authorization": f"Bearer {key}"}
    else:
        key = config.gemini_key()
        url, headers = GEMINI_BASE + path, {"x-goog-api-key": key or ""}
    if not key:
        raise ProviderError(f"{provider} API key missing (.env.local)")
    for attempt in range(retries + 1):
        try:
            r = httpx.post(url, headers=headers, json=body, timeout=timeout)
        except httpx.HTTPError as e:
            if attempt < retries:
                time.sleep(2 ** attempt * 2)
                continue
            raise ProviderError(f"network error: {e}") from e
        if r.status_code in (429, 500, 502, 503, 504) and attempt < retries:
            time.sleep(2 ** attempt * 3)
            continue
        try:
            j = r.json()
        except ValueError:
            raise ProviderError(f"HTTP {r.status_code}: {r.text[:300]}")
        if r.status_code >= 400:
            raise ProviderError(f"HTTP {r.status_code}: {_err(j.get('error', j))}")
        return j
    raise ProviderError("unreachable")


# ------------------------------------------------------------------ cost

def cost(usage_by_model: dict, image_model: str, text_model: str, batch: bool) -> dict:
    """usage_by_model: {"image": {...tokens}, "mainline": {...tokens}}"""
    total, lines = 0.0, []
    for part, toks in usage_by_model.items():
        model = image_model if part == "image" else text_model
        price = config.price_for(model)
        disc = config.MODELS.get(model, {}).get("batch_discount", 0.5) if batch else 1.0
        c = sum(toks.get(k, 0) * price.get(k, 0) for k in ("text_in", "image_in", "text_out", "image_out")) / 1e6 * disc
        total += c
        lines.append({"part": part, "model": model, "tokens": toks, "usd": round(c, 6)})
    return {"usd": round(total, 6), "batch_pricing": batch, "breakdown": lines}
