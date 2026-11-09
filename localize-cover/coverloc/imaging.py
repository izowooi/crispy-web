"""Geometry planning, restoration, registration and pixel-lock compositing.

The golden rule of this module: the final image ALWAYS has exactly the same
width x height as the source image; we only pad/crop (or resize
when the model ignores the requested size) and report how far the model drifted.

Pipeline
--------
1. plan_*      : choose a model canvas that the model accepts natively
                 (OpenAI: multiples of 16; Gemini: fixed aspect-ratio tables)
                 while keeping the source at 1:1 scale whenever possible.
2. pad         : edge-replicate pad the source into that canvas (no stretching).
3. (model edit)
4. restore     : map the model output back to the canvas, crop the padding,
                 and resize to the original size only if a scale was needed.
5. measure     : ECC affine registration output -> source to MEASURE drift
                 (shift/scale) and how much of the image changed. Nothing is
                 corrected: the delivered pixels are the model's own pixels.
"""
from __future__ import annotations

import base64
import math
from dataclasses import asdict, dataclass

import cv2
import numpy as np

# ------------------------------------------------------------------ I/O


def read_image(path: str) -> np.ndarray:
    data = np.fromfile(path, dtype=np.uint8)  # unicode-safe on all OSes
    img = cv2.imdecode(data, cv2.IMREAD_UNCHANGED)
    if img is None:
        raise ValueError(f"Cannot read image: {path}")
    if img.ndim == 2:
        img = cv2.cvtColor(img, cv2.COLOR_GRAY2BGR)
    elif img.shape[2] == 4:  # flatten alpha onto white; covers are opaque
        a = img[:, :, 3:4].astype(np.float32) / 255.0
        img = (img[:, :, :3].astype(np.float32) * a + 255 * (1 - a)).astype(np.uint8)
    return img


def decode_image(data: bytes) -> np.ndarray:
    img = cv2.imdecode(np.frombuffer(data, np.uint8), cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("Model returned undecodable image data")
    return img


def encode_png(img: np.ndarray) -> bytes:
    ok, buf = cv2.imencode(".png", img, [cv2.IMWRITE_PNG_COMPRESSION, 3])
    if not ok:
        raise RuntimeError("PNG encode failed")
    return buf.tobytes()


def to_b64_png(img: np.ndarray) -> str:
    return base64.b64encode(encode_png(img)).decode()


def write_image(path: str, img: np.ndarray, quality: int = 95) -> None:
    ext = "." + path.rsplit(".", 1)[-1].lower()
    params = [cv2.IMWRITE_JPEG_QUALITY, quality] if ext in (".jpg", ".jpeg") else []
    ok, buf = cv2.imencode(ext, img, params)
    if not ok:
        raise RuntimeError(f"encode failed: {path}")
    buf.tofile(path)


# ------------------------------------------------------------------ planning


@dataclass
class Plan:
    orig_w: int
    orig_h: int
    scale: float          # source -> canvas content scale (1.0 == pixel exact)
    content_w: int        # source size after scaling
    content_h: int
    canvas_w: int         # padded canvas in "content" pixel space
    canvas_h: int
    off_x: int            # where the content sits inside the canvas
    off_y: int
    request_w: int        # what we ask the model for (OpenAI) / expect (Gemini)
    request_h: int
    aspect: str | None = None      # Gemini aspect ratio string
    image_size: str | None = None  # Gemini 1K/2K/4K

    def to_dict(self) -> dict:
        return asdict(self)

    @staticmethod
    def from_dict(d: dict) -> "Plan":
        return Plan(**d)


OPENAI_MIN_PX, OPENAI_MAX_PX, OPENAI_MAX_EDGE = 655_360, 8_294_400, 3840


def _ceil16(v: float) -> int:
    return int(math.ceil(v / 16.0) * 16)


def plan_openai(w: int, h: int) -> Plan:
    """GPT Image 2.6 accepts any WxH that are multiples of 16, ratio 1:3..3:1,
    long edge <= 3840 and 655,360 <= pixels <= 8,294,400.
    We pad (never stretch) up to the next multiple of 16 so the model works at
    the source's native resolution; only out-of-range sources are rescaled."""
    s = 1.0
    if max(w, h) > OPENAI_MAX_EDGE - 16:
        s = (OPENAI_MAX_EDGE - 16) / max(w, h)
    if w * h * s * s > OPENAI_MAX_PX * 0.97:
        s = math.sqrt(OPENAI_MAX_PX * 0.97 / (w * h))
    if w * h * s * s < OPENAI_MIN_PX:
        s = math.sqrt(OPENAI_MIN_PX * 1.02 / (w * h))
    cw, ch = (w, h) if s == 1.0 else (round(w * s), round(h * s))
    W, H = _ceil16(cw), _ceil16(ch)
    # aspect must stay within 1:3..3:1: pad the short side if needed
    if W / H > 3:
        H = _ceil16(W / 3)
    if H / W > 3:
        W = _ceil16(H / 3)
    return Plan(w, h, s, cw, ch, W, H, (W - cw) // 2, (H - ch) // 2, W, H)


# Nano Banana output tables (1K). 2K = x2, 4K = x4.
GEMINI_1K = {
    "1:1": (1024, 1024), "2:3": (848, 1264), "3:2": (1264, 848), "3:4": (896, 1200),
    "4:3": (1200, 896), "4:5": (928, 1152), "5:4": (1152, 928), "9:16": (768, 1376),
    "16:9": (1376, 768), "21:9": (1584, 672),
}
GEMINI_MULT = {"1K": 1, "2K": 2, "4K": 4}


def plan_gemini(w: int, h: int, image_size: str = "auto", sizes=("1K", "2K", "4K")) -> Plan:
    """Gemini image models do not take arbitrary sizes: they render a fixed
    pixel grid per aspect ratio. We pick the ratio that needs the least padding,
    pad the source to that exact grid ratio (so the later resize is uniform —
    no anisotropic stretch) and pick the smallest tier >= source long edge."""
    best = None
    for ar, (tw, th) in GEMINI_1K.items():
        r = tw / th
        cw, ch = (w, max(h, round(w / r))) if w / h >= r else (max(w, round(h * r)), h)
        waste = cw * ch - w * h
        if best is None or waste < best[0]:
            best = (waste, ar, cw, ch, tw, th)
    _, ar, cw, ch, tw, th = best
    if image_size == "auto":
        image_size = sizes[-1]
        for s in sizes:
            if max(tw, th) * GEMINI_MULT[s] >= max(cw, ch) * 0.98:
                image_size = s
                break
    m = GEMINI_MULT.get(image_size, 1)
    return Plan(w, h, 1.0, w, h, cw, ch, (cw - w) // 2, (ch - h) // 2, tw * m, th * m, ar, image_size)


def pad_to_canvas(img: np.ndarray, plan: Plan) -> np.ndarray:
    src = img
    if plan.scale != 1.0:
        interp = cv2.INTER_AREA if plan.scale < 1 else cv2.INTER_CUBIC
        src = cv2.resize(img, (plan.content_w, plan.content_h), interpolation=interp)
    top, left = plan.off_y, plan.off_x
    bottom = plan.canvas_h - plan.content_h - top
    right = plan.canvas_w - plan.content_w - left
    if top or bottom or left or right:
        src = cv2.copyMakeBorder(src, top, bottom, left, right, cv2.BORDER_REPLICATE)
    return src


def model_input(img: np.ndarray, plan: Plan) -> np.ndarray:
    """What we actually send: the padded canvas (same aspect ratio as the grid
    the model will render). Downscaled only if larger than the target grid."""
    canvas = pad_to_canvas(img, plan)
    # only ever downscale (never upscale: adds bytes, not information)
    if canvas.shape[1] > plan.request_w * 1.01:
        interp = cv2.INTER_AREA if plan.request_w < canvas.shape[1] else cv2.INTER_CUBIC
        canvas = cv2.resize(canvas, (plan.request_w, plan.request_h), interpolation=interp)
    return canvas


def restore(out: np.ndarray, plan: Plan) -> tuple[np.ndarray, dict]:
    """Map model output back to the exact original WxH."""
    oh, ow = out.shape[:2]
    info = {"model_output_w": ow, "model_output_h": oh,
            "requested_w": plan.request_w, "requested_h": plan.request_h,
            "model_honored_size": (ow, oh) == (plan.request_w, plan.request_h)}
    if (ow, oh) != (plan.canvas_w, plan.canvas_h):
        interp = cv2.INTER_AREA if ow > plan.canvas_w else cv2.INTER_CUBIC
        out = cv2.resize(out, (plan.canvas_w, plan.canvas_h), interpolation=interp)
    crop = out[plan.off_y:plan.off_y + plan.content_h, plan.off_x:plan.off_x + plan.content_w]
    if plan.scale != 1.0:
        interp = cv2.INTER_CUBIC if plan.scale < 1 else cv2.INTER_AREA
        crop = cv2.resize(crop, (plan.orig_w, plan.orig_h), interpolation=interp)
    info["resampled"] = (ow, oh) != (plan.canvas_w, plan.canvas_h) or plan.scale != 1.0
    assert crop.shape[1] == plan.orig_w and crop.shape[0] == plan.orig_h
    return np.ascontiguousarray(crop), info


# ------------------------------------------------------------------ registration


def _gray_small(img: np.ndarray, max_edge: int) -> tuple[np.ndarray, float]:
    h, w = img.shape[:2]
    f = min(1.0, max_edge / max(w, h))
    g = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    if f < 1.0:
        g = cv2.resize(g, (round(w * f), round(h * f)), interpolation=cv2.INTER_AREA)
    return g.astype(np.float32) / 255.0, f


def _change_map(a: np.ndarray, b: np.ndarray) -> np.ndarray:
    """Per-pixel perceptual-ish difference (0..255) robust to noise."""
    a1 = cv2.GaussianBlur(a, (3, 3), 0).astype(np.int16)
    b1 = cv2.GaussianBlur(b, (3, 3), 0).astype(np.int16)
    return np.abs(a1 - b1).max(axis=2).astype(np.uint8)


def _corner_drift(warp: np.ndarray, w: int, h: int) -> float:
    pts = np.array([[0, 0, 1], [w, 0, 1], [0, h, 1], [w, h, 1], [w / 2, h / 2, 1]], np.float64)
    moved = pts @ warp.T
    return float(np.max(np.linalg.norm(moved - pts[:, :2], axis=1)))


def measure_alignment(src: np.ndarray, out: np.ndarray, max_edge: int = 1000) -> dict:
    """MEASURE ONLY — estimate how far the model output drifted from the source
    (affine ECC, text regions masked out on the 2nd pass). Nothing is warped or
    corrected: the delivered image is the model's own pixels."""
    h, w = src.shape[:2]
    gs, f = _gray_small(src, max_edge)
    go, _ = _gray_small(out, max_edge)
    crit = (cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 200, 1e-6)
    warp = np.eye(2, 3, dtype=np.float32)

    def stable_mask(a: np.ndarray) -> np.ndarray | None:
        changed = (cv2.GaussianBlur(np.abs(a - gs), (0, 0), 3) > 0.06).astype(np.uint8)
        changed = cv2.dilate(changed, np.ones((15, 15), np.uint8))
        m = (1 - changed).astype(np.uint8)
        return m if m.mean() >= 0.3 else None

    mask = stable_mask(go)  # ignore text regions from the very first pass
    ok = True
    for _ in range(2):
        try:
            _, warp = cv2.findTransformECC(gs, go, warp, cv2.MOTION_AFFINE, crit, mask, 5)
        except cv2.error:
            ok = False
            break
        aligned = cv2.warpAffine(go, warp, (gs.shape[1], gs.shape[0]),
                                 flags=cv2.INTER_LINEAR | cv2.WARP_INVERSE_MAP,
                                 borderMode=cv2.BORDER_REPLICATE)
        mask = stable_mask(aligned)
    full = warp.astype(np.float64).copy()
    full[:, 2] /= f
    return {
        "registration_ok": ok,
        "drift_px_max": round(_corner_drift(full, w, h), 2) if ok else None,
        "shift_x_px": round(float(full[0, 2]), 2) if ok else None,
        "shift_y_px": round(float(full[1, 2]), 2) if ok else None,
        "scale_x": round(float(full[0, 0]), 5) if ok else None,
        "scale_y": round(float(full[1, 1]), 5) if ok else None,
    }


def changed_mask(src: np.ndarray, out: np.ndarray, threshold: int = 30) -> np.ndarray:
    """Float mask (0..1) of regions the model visibly changed (for metrics/heatmap only)."""
    h, w = src.shape[:2]
    m = (_change_map(src, out) > threshold).astype(np.uint8)
    m = cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((2, 2), np.uint8))
    k = max(3, int(round(min(w, h) * 0.006)))
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (k * 3, k * 3)))
    n, lab, stats, _ = cv2.connectedComponentsWithStats(m, 8)
    keep = np.zeros(n, np.uint8)
    keep[1:] = (stats[1:, cv2.CC_STAT_AREA] >= max(30, int(w * h * 0.00004))).astype(np.uint8)
    return keep[lab].astype(np.float32)


# ------------------------------------------------------------------ metrics


def psnr(a: np.ndarray, b: np.ndarray, where: np.ndarray | None = None) -> float:
    d = (a.astype(np.float32) - b.astype(np.float32)) ** 2
    if where is not None:
        if where.sum() == 0:
            return float("inf")
        d = d[where]
    mse = float(d.mean())
    return 99.0 if mse < 1e-10 else round(10 * math.log10(255 * 255 / mse), 2)


def fidelity_report(src: np.ndarray, out: np.ndarray) -> dict:
    """How much of the image did the model leave (nearly) untouched, and how
    close is it there? Measurement only."""
    mask = changed_mask(src, out)
    outside = mask < 0.5
    return {
        "changed_area_pct": round(float((~outside).mean() * 100), 2),
        "psnr_unchanged_db": psnr(src, out, outside),
        "psnr_full_db": psnr(src, out),
    }


def diff_heatmap(src: np.ndarray, out: np.ndarray, mask: np.ndarray | None = None) -> np.ndarray:
    d = _change_map(src, out)
    d = np.clip(d.astype(np.float32) * 3, 0, 255).astype(np.uint8)
    heat = cv2.applyColorMap(d, cv2.COLORMAP_INFERNO)
    base = cv2.cvtColor(cv2.cvtColor(src, cv2.COLOR_BGR2GRAY), cv2.COLOR_GRAY2BGR)
    vis = cv2.addWeighted(base, 0.35, heat, 0.65, 0)
    if mask is not None:
        edge = cv2.Canny((mask > 0.5).astype(np.uint8) * 255, 50, 150)
        vis[edge > 0] = (80, 255, 80)
    return vis
