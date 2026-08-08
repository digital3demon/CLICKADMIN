"""
Click Lab — сканер в заказ.

Разбор на ПК (QR + локальный OCR) → CRM только attach в найденный заказ.
Главное окно: галерея миниатюр (зелёная/красная рамка).
Вкладка «Настройки»: папка, CRM, ключ, автозапуск.
"""

from __future__ import annotations

import base64
import json
import logging
import mimetypes
import os
import queue
import re
import shutil
import sys
import tempfile
import threading
import time
import tkinter as tk
import uuid
from dataclasses import dataclass, field
from pathlib import Path
from tkinter import filedialog, messagebox, simpledialog, ttk
from urllib.parse import quote

import numpy as np

try:
    import cv2
except ImportError:
    print("Установите зависимости: pip install -r requirements.txt", file=sys.stderr)
    raise

from watchdog.events import FileSystemEventHandler
from watchdog.observers import Observer

IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".tif", ".tiff", ".webp"}
STABLE_CHECKS = 4
STABLE_INTERVAL_SEC = 0.35
PROCESS_DELAY_SEC = 0.5
THUMB_SIZE = 148
APP_TITLE = "Click Lab — сканер в заказ"
AUTOSTART_REG_NAME = "ClickLabScanner"
# Ширина одной ячейки галереи (превью + поля + отступы) — колонки считаем по окну
CELL_SLOT_W = 188
COLS_MIN = 2
COLS_MAX = 12
# 100–1000 сканов/день: очередь + мало воркеров (лимит CRM ~60/мин на ключ)
# Разбор (QR/OCR) на ПК; CRM = только attach — один воркер достаточен.
WORKER_COUNT = 1
SWEEP_INTERVAL_SEC = 2.0
GALLERY_MAX = 48
RATE_LIMIT_BACKOFF_SEC = 8.0
UPLOAD_TIMEOUT_SEC = 90
SINGLE_INSTANCE_MUTEX = "Local\\ClickLabScannerSingleton"
MAX_AUTO_ATTEMPTS = 3
AUTO_RETRY_DELAY_SEC = 4.0
GIVE_UP_HEADER = "Не удалось спустя 3 попытки,\nвнесите номер вручную"


# ─── paths / settings / autostart ───────────────────────────────────────────


def app_dir() -> Path:
    if getattr(sys, "frozen", False):
        return Path(sys.executable).resolve().parent
    return Path(__file__).resolve().parent


def data_dir() -> Path:
    """Настройки/логи вне Temp — иначе запуск из ZIP теряет всё и плодит копии."""
    base = Path(
        os.environ.get("LOCALAPPDATA")
        or (Path.home() / "AppData" / "Local")
    )
    d = base / "ClickLabScanner"
    d.mkdir(parents=True, exist_ok=True)
    # перенос со старого места рядом с exe (в т.ч. из Temp-распаковки)
    for name in ("settings.json", "gallery.json"):
        dest = d / name
        if dest.is_file():
            continue
        src = app_dir() / name
        if src.is_file():
            try:
                shutil.copy2(src, dest)
            except OSError:
                pass
    return d


def is_ephemeral_install() -> bool:
    p = str(app_dir()).lower().replace("/", "\\")
    return (
        "\\temp\\" in p
        or "\\tmp\\" in p
        or ".zip." in p
        or "\\appdata\\local\\temp\\" in p
    )


def acquire_single_instance() -> bool:
    """False — уже запущена другая копия."""
    if sys.platform != "win32":
        return True
    try:
        import ctypes

        kernel32 = ctypes.windll.kernel32  # type: ignore[attr-defined]
        handle = kernel32.CreateMutexW(None, False, SINGLE_INSTANCE_MUTEX)
        # держим handle до выхода процесса
        acquire_single_instance._handle = handle  # type: ignore[attr-defined]
        ERROR_ALREADY_EXISTS = 183
        return int(kernel32.GetLastError()) != ERROR_ALREADY_EXISTS
    except Exception:
        return True


def launch_command() -> str:
    if getattr(sys, "frozen", False):
        return f'"{Path(sys.executable).resolve()}"'
    return f'"{Path(sys.executable).resolve()}" "{Path(__file__).resolve()}"'


def is_windows_autostart_enabled() -> bool:
    if sys.platform != "win32":
        return False
    try:
        import winreg

        with winreg.OpenKey(
            winreg.HKEY_CURRENT_USER,
            r"Software\Microsoft\Windows\CurrentVersion\Run",
            0,
            winreg.KEY_READ,
        ) as key:
            winreg.QueryValueEx(key, AUTOSTART_REG_NAME)
            return True
    except OSError:
        return False


def set_windows_autostart(enabled: bool) -> tuple[bool, str]:
    if sys.platform != "win32":
        return False, "Только Windows"
    try:
        import winreg

        with winreg.OpenKey(
            winreg.HKEY_CURRENT_USER,
            r"Software\Microsoft\Windows\CurrentVersion\Run",
            0,
            winreg.KEY_SET_VALUE | winreg.KEY_QUERY_VALUE,
        ) as key:
            if enabled:
                winreg.SetValueEx(
                    key, AUTOSTART_REG_NAME, 0, winreg.REG_SZ, launch_command()
                )
            else:
                try:
                    winreg.DeleteValue(key, AUTOSTART_REG_NAME)
                except FileNotFoundError:
                    pass
        return True, "ok"
    except OSError as e:
        return False, str(e)


def settings_path() -> Path:
    return data_dir() / "settings.json"


def gallery_index_path() -> Path:
    return data_dir() / "gallery.json"


def load_settings() -> dict:
    defaults = {
        "watch_dir": "",
        "crm_base_url": "",
        "crm_api_key": "",
        "autostart": False,
    }
    path = settings_path()
    if not path.is_file():
        return defaults
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return defaults
    return {
        "watch_dir": str(data.get("watch_dir") or "").strip(),
        "crm_base_url": str(data.get("crm_base_url") or "").strip(),
        "crm_api_key": str(data.get("crm_api_key") or "").strip(),
        "autostart": bool(data.get("autostart")),
    }


def save_settings(data: dict) -> None:
    payload = {
        "watch_dir": str(data.get("watch_dir") or "").strip(),
        "crm_base_url": str(data.get("crm_base_url") or "").strip(),
        "crm_api_key": str(data.get("crm_api_key") or "").strip(),
        "autostart": bool(data.get("autostart")),
    }
    settings_path().write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def order_url(crm_base: str, order_id: str, order_path: str | None = None) -> str:
    base = crm_base.rstrip("/")
    if order_path:
        return f"{base}{order_path if order_path.startswith('/') else '/' + order_path}"
    ref = "or_" + base64.urlsafe_b64encode(order_id.encode("utf-8")).decode("ascii").rstrip(
        "="
    )
    return f"{base}/orders/{ref}"


# ─── file / network helpers ─────────────────────────────────────────────────


def wait_until_stable(path: Path) -> bool:
    last = -1
    stable = 0
    for _ in range(40):
        try:
            size = path.stat().st_size
        except OSError:
            return False
        if size <= 0:
            time.sleep(STABLE_INTERVAL_SEC)
            continue
        if size == last:
            stable += 1
            if stable >= STABLE_CHECKS:
                return True
        else:
            stable = 0
            last = size
        time.sleep(STABLE_INTERVAL_SEC)
    return False


def imread_bgr(path: Path) -> np.ndarray | None:
    """Читает картинку; cv2.imread ломается на кириллических путях Windows."""
    try:
        data = np.fromfile(str(path), dtype=np.uint8)
    except OSError:
        return None
    if data.size == 0:
        return None
    img = cv2.imdecode(data, cv2.IMREAD_COLOR)
    return img if img is not None else None


def _qr_candidates(img: np.ndarray) -> list[np.ndarray]:
    h, w = img.shape[:2]
    out: list[np.ndarray] = [img]
    if h > 2:
        out.append(img[0 : h // 2, :])
        out.append(img[0 : max(1, int(h * 0.4)), :])
    # QR часто справа сверху на наряде
    if w > 4 and h > 4:
        out.append(img[0 : h // 2, w // 2 :])
        out.append(img[0 : max(1, int(h * 0.45)), max(0, int(w * 0.45)) :])
    return out


def _decode_qr_zxing(mat: np.ndarray) -> str | None:
    """zxing-cpp надёжнее OpenCV на фото нарядов (детект без decode)."""
    try:
        import zxingcpp
    except ImportError:
        return None
    try:
        if mat.ndim == 2:
            rgb = cv2.cvtColor(mat, cv2.COLOR_GRAY2RGB)
        else:
            rgb = cv2.cvtColor(mat, cv2.COLOR_BGR2RGB)
        results = zxingcpp.read_barcodes(rgb)
    except Exception:
        return None
    for r in results or []:
        text = (getattr(r, "text", None) or "").strip()
        if text:
            return text
    return None


def decode_qr(path: Path) -> str | None:
    """QR: сначала zxing, затем OpenCV (цвет / серый / контраст / кропы / масштаб)."""
    img = imread_bgr(path)
    if img is None:
        return None

    candidates = _qr_candidates(img)
    for c in candidates:
        hit = _decode_qr_zxing(c)
        if hit:
            return hit
        for sc in (1.5, 2.0):
            scaled = cv2.resize(c, None, fx=sc, fy=sc, interpolation=cv2.INTER_CUBIC)
            hit = _decode_qr_zxing(scaled)
            if hit:
                return hit

    detector = cv2.QRCodeDetector()

    def try_cv(mat: np.ndarray) -> str | None:
        try:
            data, _points, _ = detector.detectAndDecode(mat)
        except Exception:
            return None
        text = (data or "").strip()
        return text or None

    variants: list[np.ndarray] = []
    for c in candidates:
        variants.append(c)
        gray = cv2.cvtColor(c, cv2.COLOR_BGR2GRAY)
        variants.append(gray)
        variants.append(cv2.equalizeHist(gray))
        thr = cv2.adaptiveThreshold(
            gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 31, 5
        )
        variants.append(thr)
        variants.append(cv2.flip(c, 1))

    scales = (1.0, 1.5, 2.0, 0.75)
    for mat in variants:
        for sc in scales:
            if sc == 1.0:
                scaled = mat
            else:
                scaled = cv2.resize(
                    mat, None, fx=sc, fy=sc, interpolation=cv2.INTER_CUBIC
                )
            hit = try_cv(scaled)
            if hit:
                return hit
    return None


def short_name(name: str, limit: int = 26) -> str:
    if len(name) <= limit:
        return name
    stem, dot, suf = name.rpartition(".")
    if not dot:
        return name[: limit - 1] + "…"
    keep = max(8, limit - len(suf) - 2)
    return stem[:keep] + "…." + suf


def clip_person(name: str | None, limit: int = 20) -> str:
    s = (name or "").strip()
    if not s:
        return "—"
    if len(s) <= limit:
        return s
    return s[: limit - 1] + "…"


# ─── local OCR (в exe: номер наряда / Kaiten без серверного tesseract) ─────

# После номера OCR часто клеит латиницу (2607-359KaMpaHOB) — режем только цифры.
# \b не используем: кириллица до/после ломает word-boundary в JS/Python без \p{L}.
_ORDER_OCR_RE = re.compile(
    r"(?<![\dA-Za-z])(\d{4})\s*[-–—−]\s*(\d{3})(?!\d)"
)
# OCR путает .ru→.rw, https→ittps/ttps
_KAITEN_OCR_RE = re.compile(
    r"(?:h?t?tps?://)?(?:[\w.-]+\.)?kaiten\.r[uw]/(?:card/)?(\d{4,})", re.I
)
_ID_FIELD_RE = re.compile(r"(?:^|[\s:])ID\s*[:：]?\s*(\d{6,})(?!\d)", re.I)

_ocr_engine = None
_ocr_lock = threading.Lock()


def _get_ocr_engine():
    global _ocr_engine
    if _ocr_engine is not None:
        return _ocr_engine
    with _ocr_lock:
        if _ocr_engine is not None:
            return _ocr_engine
        try:
            from rapidocr_onnxruntime import RapidOCR

            _ocr_engine = RapidOCR()
            logging.info("local OCR engine ready (RapidOCR)")
        except Exception as e:
            logging.warning("local OCR unavailable: %s", e)
            _ocr_engine = False  # type: ignore[assignment]
        return _ocr_engine


def _ocr_text_from_bgr(img: np.ndarray) -> str:
    engine = _get_ocr_engine()
    if not engine:
        return ""
    try:
        result, _elapse = engine(img)
    except Exception as e:
        logging.warning("local OCR run: %s", e)
        return ""
    if not result:
        return ""
    parts: list[str] = []
    for row in result:
        if len(row) >= 2 and row[1]:
            parts.append(str(row[1]))
    return " ".join(parts)


def pick_order_number_from_text(raw: str) -> str | None:
    found: list[str] = []
    seen: set[str] = set()
    for m in _ORDER_OCR_RE.finditer(raw or ""):
        num = f"{m.group(1)}-{m.group(2)}"
        if num in seen:
            continue
        seen.add(num)
        found.append(num)
    if not found:
        return None
    if len(found) == 1:
        return found[0]
    # предпочитаем разумный YYMM
    best = found[0]
    best_score = -1
    for i, n in enumerate(found):
        yymm, _, nn = n.partition("-")
        score = 100 - i
        if len(yymm) == 4:
            yy, mm = int(yymm[:2]), int(yymm[2:])
            if 20 <= yy <= 39 and 1 <= mm <= 12:
                score += 50
        if score > best_score:
            best_score = score
            best = n
    return best


def pick_kaiten_url_from_text(raw: str) -> str | None:
    m = _KAITEN_OCR_RE.search(raw or "")
    if m:
        return f"https://clicklab.kaiten.ru/{m.group(1)}"
    m2 = _ID_FIELD_RE.search(raw or "")
    if m2:
        return f"https://clicklab.kaiten.ru/{m2.group(1)}"
    return None


def _ocr_mats_for_crop(crop: np.ndarray) -> list[np.ndarray]:
    """Нормальный размер + 2× серый (склеенный мелкий текст шапки)."""
    ch, cw = crop.shape[:2]
    work = crop
    if max(ch, cw) > 1600:
        sc = 1600 / max(ch, cw)
        work = cv2.resize(crop, None, fx=sc, fy=sc, interpolation=cv2.INTER_AREA)
    mats = [work]
    gray = cv2.cvtColor(work, cv2.COLOR_BGR2GRAY)
    up = cv2.resize(gray, None, fx=2.0, fy=2.0, interpolation=cv2.INTER_CUBIC)
    mats.append(cv2.cvtColor(up, cv2.COLOR_GRAY2BGR))
    return mats


def local_ocr_hints(path: Path) -> tuple[str | None, str | None]:
    """
    Локальный OCR верхней части скана.
    Возвращает (номер_наряда YYMM-NNN | None, qr_hint URL | None).
    """
    img = imread_bgr(path)
    if img is None:
        return None, None
    h = img.shape[0]
    crops = [
        img[0 : max(1, h * 2 // 5), :],
        img[0 : max(1, h // 2), :],
        img,
    ]
    t0 = time.time()
    blob_all = ""
    for crop in crops:
        for mat in _ocr_mats_for_crop(crop):
            text = _ocr_text_from_bgr(mat)
            blob_all += " " + text
            order_n = pick_order_number_from_text(blob_all)
            kaiten = pick_kaiten_url_from_text(blob_all)
            if order_n or kaiten:
                logging.info(
                    "local OCR %s → order=%s kaiten=%s (%.1fs)",
                    path.name,
                    order_n,
                    "yes" if kaiten else "no",
                    time.time() - t0,
                )
                return order_n, kaiten
    logging.info(
        "local OCR %s: no match (%.1fs, chars=%s)",
        path.name,
        time.time() - t0,
        len(blob_all.strip()),
    )
    return None, None


def resolve_upload_hints(path: Path) -> tuple[str | None, str | None]:
    """QR, иначе локальный OCR → (qr_hint, force_order_number)."""
    qr = decode_qr(path)
    if qr:
        return qr, None
    order_n, kaiten_url = local_ocr_hints(path)
    # приоритет: явный номер наряда (сервер без OCR); URL — как qr hint
    if order_n:
        return kaiten_url or qr, order_n
    if kaiten_url:
        return kaiten_url, None
    return None, None


def move_to(subdir: Path, path: Path) -> Path:
    subdir.mkdir(parents=True, exist_ok=True)
    dest = subdir / path.name
    if dest.exists():
        stem, suffix = path.stem, path.suffix
        i = 1
        while dest.exists():
            dest = subdir / f"{stem}_{i}{suffix}"
            i += 1
    shutil.move(str(path), str(dest))
    return dest


def api_request(
    *,
    method: str,
    url: str,
    api_key: str,
    data: bytes | None = None,
    headers: dict[str, str] | None = None,
    json_body: dict | None = None,
    timeout: int = UPLOAD_TIMEOUT_SEC,
) -> tuple[int, dict]:
    import urllib.error
    import urllib.request

    hdrs = {"Authorization": f"Bearer {api_key}", **(headers or {})}
    body = data
    if json_body is not None:
        body = json.dumps(json_body).encode("utf-8")
        hdrs["Content-Type"] = "application/json"
    # Без Content-Length часть прокси (nginx) отдаёт пустое тело → CRM 415 unsupported_type
    if body is not None:
        hdrs["Content-Length"] = str(len(body))
    req = urllib.request.Request(url, data=body, headers=hdrs, method=method)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            raw = resp.read().decode("utf-8", errors="replace")
            try:
                parsed = json.loads(raw) if raw.strip() else {}
            except json.JSONDecodeError:
                parsed = {"raw": raw[:500]}
            return int(resp.status), parsed if isinstance(parsed, dict) else {}
    except urllib.error.HTTPError as e:
        raw = e.read().decode("utf-8", errors="replace")
        try:
            parsed = json.loads(raw) if raw.strip() else {}
        except json.JSONDecodeError:
            parsed = {"error": raw[:500]}
        if not isinstance(parsed, dict):
            parsed = {"error": str(parsed)}
        parsed.setdefault("error", f"HTTP {e.code}")
        return int(e.code), parsed
    except Exception as e:
        return 0, {"error": str(e)}


def upload_scan(
    *,
    crm_base: str,
    api_key: str,
    path: Path,
    qr_hint: str | None = None,
    force_order_number: str | None = None,
) -> tuple[bool, int, dict]:
    """
    Загрузка с повторами: на проде тело иногда обрезается (415 unsupported_type /
    408 body_incomplete) — клиент шлёт файл снова.
    """
    url = crm_base.rstrip("/") + "/api/scanner/ingest"
    data = path.read_bytes()
    mime = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
    headers = {
        "Content-Type": "application/octet-stream",
        "x-upload-filename": quote(path.name),
        "x-upload-mime": mime,
        # Keep-alive на проде иногда отдаёт обрезанное тело → 415 unsupported_type
        "Connection": "close",
    }
    if qr_hint:
        headers["x-scanner-qr"] = quote(qr_hint, safe=":/?&=#%")
    if force_order_number:
        headers["x-scanner-order-number"] = force_order_number.strip()

    upload_attempts = max(MAX_AUTO_ATTEMPTS, 5)
    last_status = 0
    last_parsed: dict = {}
    for attempt in range(1, upload_attempts + 1):
        status, parsed = api_request(
            method="POST", url=url, api_key=api_key, data=data, headers=headers
        )
        last_status, last_parsed = status, parsed
        ok = 200 <= status < 300 and bool(parsed.get("ok"))
        if ok:
            if attempt > 1:
                logging.info(
                    "upload ok on retry %s/%s %s",
                    attempt,
                    upload_attempts,
                    path.name,
                )
            return True, status, parsed

        err = str(parsed.get("error") or "").lower()
        truncated = (
            status in {408, 415}
            and (
                "unsupported_type" in err
                or "body_incomplete" in err
                or "not_image" in str(parsed.get("detail") or "").lower()
            )
        )
        if truncated and attempt < upload_attempts:
            got = parsed.get("bytes")
            logging.warning(
                "upload truncated %s attempt %s/%s status=%s bytes=%s — retry",
                path.name,
                attempt,
                upload_attempts,
                status,
                got,
            )
            time.sleep(0.8 * attempt)
            data = path.read_bytes()
            continue
        break

    return False, last_status, last_parsed


def delete_crm_attachment(
    *,
    crm_base: str,
    api_key: str,
    order_id: str,
    attachment_id: str,
) -> tuple[bool, dict]:
    url = crm_base.rstrip("/") + "/api/scanner/attachment"
    status, parsed = api_request(
        method="DELETE",
        url=url,
        api_key=api_key,
        json_body={"orderId": order_id, "attachmentId": attachment_id},
    )
    ok = 200 <= status < 300 and bool(parsed.get("ok"))
    return ok, parsed


def make_thumb_png(path: Path, size: int = THUMB_SIZE) -> Path | None:
    img = imread_bgr(path)
    if img is None:
        logging.warning("thumb: cannot read %s", path)
        return None
    h, w = img.shape[:2]
    scale = min(size / max(w, 1), size / max(h, 1), 1.0)
    nw, nh = max(1, int(w * scale)), max(1, int(h * scale))
    resized = cv2.resize(img, (nw, nh), interpolation=cv2.INTER_AREA)
    canvas = 255 * np.ones((size, size, 3), dtype=np.uint8)
    y0, x0 = (size - nh) // 2, (size - nw) // 2
    canvas[y0 : y0 + nh, x0 : x0 + nw] = resized
    # PPM — нативный формат tk.PhotoImage (без зависимости от PNG в Tcl).
    tmp = Path(tempfile.gettempdir()) / f"clscan_thumb_{uuid.uuid4().hex}.ppm"
    try:
        rgb = cv2.cvtColor(canvas, cv2.COLOR_BGR2RGB)
        header = f"P6\n{size} {size}\n255\n".encode("ascii")
        tmp.write_bytes(header + rgb.tobytes())
    except OSError as e:
        logging.warning("thumb write: %s", e)
        return None
    return tmp if tmp.is_file() else None


# ─── gallery item ───────────────────────────────────────────────────────────


@dataclass
class ScanItem:
    uid: str
    path: Path
    ok: bool
    order_id: str | None = None
    order_number: str | None = None
    patient_name: str | None = None
    doctor_name: str | None = None
    attachment_id: str | None = None
    order_url: str | None = None
    error: str | None = None
    caption: str = ""
    attempts: int = 0
    give_up: bool = False
    photo: tk.PhotoImage | None = field(default=None, repr=False)
    thumb_file: Path | None = field(default=None, repr=False)
    frame: tk.Frame | None = field(default=None, repr=False)
    head_lbl: tk.Label | None = field(default=None, repr=False)
    border_frame: tk.Frame | None = field(default=None, repr=False)
    cap_lbl: tk.Label | None = field(default=None, repr=False)

    def header_text(self) -> str:
        if self.ok:
            num = self.order_number or "—"
            return (
                f"{num}\n"
                f"пац {clip_person(self.patient_name)}\n"
                f"док {clip_person(self.doctor_name)}"
            )
        if self.give_up or self.attempts >= MAX_AUTO_ATTEMPTS:
            return GIVE_UP_HEADER
        err = (self.error or "ошибка").strip()
        if len(err) > 36:
            err = err[:35] + "…"
        n = max(1, self.attempts)
        return f"Попытка {n}/{MAX_AUTO_ATTEMPTS}\n{err}"

    def to_dict(self) -> dict:
        return {
            "uid": self.uid,
            "path": str(self.path),
            "ok": self.ok,
            "order_id": self.order_id,
            "order_number": self.order_number,
            "patient_name": self.patient_name,
            "doctor_name": self.doctor_name,
            "attachment_id": self.attachment_id,
            "order_url": self.order_url,
            "error": self.error,
            "caption": self.caption,
            "attempts": self.attempts,
            "give_up": self.give_up,
        }

    @staticmethod
    def from_dict(d: dict) -> ScanItem | None:
        p = Path(str(d.get("path") or ""))
        if not p.is_file():
            return None
        attempts = int(d.get("attempts") or 0)
        give_up = bool(d.get("give_up")) or (
            not bool(d.get("ok")) and attempts >= MAX_AUTO_ATTEMPTS
        )
        return ScanItem(
            uid=str(d.get("uid") or uuid.uuid4().hex),
            path=p,
            ok=bool(d.get("ok")),
            order_id=(str(d["order_id"]) if d.get("order_id") else None),
            order_number=(str(d["order_number"]) if d.get("order_number") else None),
            patient_name=(str(d["patient_name"]) if d.get("patient_name") else None),
            doctor_name=(str(d["doctor_name"]) if d.get("doctor_name") else None),
            attachment_id=(str(d["attachment_id"]) if d.get("attachment_id") else None),
            order_url=(str(d["order_url"]) if d.get("order_url") else None),
            error=(str(d["error"]) if d.get("error") else None),
            caption=str(d.get("caption") or p.name),
            attempts=attempts,
            give_up=give_up,
        )


# ─── watcher ────────────────────────────────────────────────────────────────


class ScanHandler(FileSystemEventHandler):
    def __init__(self, watch_dir: Path, enqueue) -> None:
        super().__init__()
        self.watch_dir = watch_dir
        self.enqueue = enqueue

    def on_created(self, event):  # type: ignore[no-untyped-def]
        if not event.is_directory:
            self._maybe(Path(event.src_path))

    def on_modified(self, event):  # type: ignore[no-untyped-def]
        if not event.is_directory:
            self._maybe(Path(event.src_path))

    def on_moved(self, event):  # type: ignore[no-untyped-def]
        if not event.is_directory:
            self._maybe(Path(event.dest_path))

    def _maybe(self, path: Path) -> None:
        try:
            path = path.resolve()
        except OSError:
            return
        try:
            if path.parent.resolve() != self.watch_dir.resolve():
                return
        except OSError:
            return
        if path.suffix.lower() not in IMAGE_EXTS:
            return
        self.enqueue(path)


# ─── GUI ────────────────────────────────────────────────────────────────────


class ScannerApp:
    def __init__(self) -> None:
        self.root = tk.Tk()
        self.root.title(APP_TITLE)
        self.root.minsize(780, 560)
        self.root.geometry("900x640")

        self.ui_q: queue.Queue = queue.Queue()
        self.job_q: queue.Queue = queue.Queue()
        self._pending: set[str] = set()
        self._pending_lock = threading.Lock()
        self._path_attempts: dict[str, int] = {}
        self.observer: Observer | None = None
        self.running = False
        self._workers: list[threading.Thread] = []
        self._sweep_thread: threading.Thread | None = None
        self._watch_dir: Path | None = None
        self._persist_after_id: str | None = None
        self._status_tick = 0
        self.items: list[ScanItem] = []
        self._thumb_keep: list[tk.PhotoImage] = []
        self._processed_ok = 0
        self._processed_fail = 0
        self._gallery_cols = 4
        self._relayout_after_id: str | None = None

        s = load_settings()
        autostart_on = bool(s.get("autostart")) or is_windows_autostart_enabled()
        self.var_watch = tk.StringVar(value=s["watch_dir"])
        self.var_url = tk.StringVar(value=s["crm_base_url"])
        self.var_key = tk.StringVar(value=s["crm_api_key"])
        self.var_autostart = tk.BooleanVar(value=autostart_on)
        self.var_status = tk.StringVar(value="Остановлено")
        self.show_key = tk.BooleanVar(value=False)

        self._build()
        self.root.protocol("WM_DELETE_WINDOW", self.on_close)
        self.root.after(120, self._drain_ui)
        self._load_gallery()
        if (
            autostart_on
            and s["watch_dir"]
            and s["crm_base_url"]
            and s["crm_api_key"]
        ):
            self.root.after(500, self._start_silent)

    # ── build ──

    def _build(self) -> None:
        top = ttk.Frame(self.root, padding=(10, 8))
        top.pack(fill=tk.X)
        ttk.Label(top, textvariable=self.var_status).pack(side=tk.LEFT)
        self.btn_start = ttk.Button(top, text="Начать работу", command=self._start)
        self.btn_start.pack(side=tk.RIGHT, padx=(6, 0))
        self.btn_stop = ttk.Button(
            top, text="Остановить", command=self._stop, state=tk.DISABLED
        )
        self.btn_stop.pack(side=tk.RIGHT)

        self.nb = ttk.Notebook(self.root)
        self.nb.pack(fill=tk.BOTH, expand=True, padx=8, pady=(0, 8))

        self.tab_gallery = ttk.Frame(self.nb)
        self.tab_settings = ttk.Frame(self.nb)
        self.nb.add(self.tab_gallery, text="Сканы")
        self.nb.add(self.tab_settings, text="Настройки")

        self._build_gallery(self.tab_gallery)
        self._build_settings(self.tab_settings)

    def _build_gallery(self, parent: ttk.Frame) -> None:
        self.gallery_hint = ttk.Label(
            parent,
            text=(
                "Над рамкой — номер наряда, пациент и врач. "
                "Зелёная рамка — ушло в заказ, красная — ошибка. "
                "Клик по фото — увеличить. ПКМ — повтор / ссылка / корректировка / удаление."
            ),
            wraplength=820,
        )
        self.gallery_hint.pack(anchor=tk.W, padx=8, pady=6)

        wrap = ttk.Frame(parent)
        wrap.pack(fill=tk.BOTH, expand=True, padx=4, pady=4)
        self.canvas = tk.Canvas(wrap, highlightthickness=0, bg="#ffffff")
        sb = ttk.Scrollbar(wrap, orient=tk.VERTICAL, command=self.canvas.yview)
        self.canvas.configure(yscrollcommand=sb.set)
        sb.pack(side=tk.RIGHT, fill=tk.Y)
        self.canvas.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        self.grid = ttk.Frame(self.canvas)
        self._grid_win = self.canvas.create_window((0, 0), window=self.grid, anchor=tk.NW)

        def _on_cfg(_e=None) -> None:
            cw = max(1, int(self.canvas.winfo_width()))
            self.canvas.itemconfigure(self._grid_win, width=cw)
            self.canvas.configure(scrollregion=self.canvas.bbox("all"))
            try:
                self.gallery_hint.configure(wraplength=max(320, cw - 24))
            except tk.TclError:
                pass
            self._schedule_gallery_fit()

        self.grid.bind("<Configure>", _on_cfg)
        self.canvas.bind("<Configure>", _on_cfg)

        def _wheel(e: tk.Event) -> None:
            self.canvas.yview_scroll(int(-1 * (e.delta / 120)), "units")

        def _wheel_on(_e=None) -> None:
            self.canvas.bind_all("<MouseWheel>", _wheel)

        def _wheel_off(_e=None) -> None:
            self.canvas.unbind_all("<MouseWheel>")

        self.canvas.bind("<Enter>", _wheel_on)
        self.canvas.bind("<Leave>", _wheel_off)

        self.empty_lbl = ttk.Label(
            self.grid,
            text="Пока нет сканов.\nЗаполните «Настройки» и нажмите «Начать работу».",
            justify=tk.CENTER,
        )
        self.empty_lbl.grid(row=0, column=0, padx=40, pady=40)

    def _gallery_cols_for_width(self, width: int) -> int:
        w = max(1, int(width))
        cols = max(COLS_MIN, w // CELL_SLOT_W)
        return min(COLS_MAX, cols)

    def _schedule_gallery_fit(self) -> None:
        if self._relayout_after_id is not None:
            try:
                self.root.after_cancel(self._relayout_after_id)
            except Exception:
                pass

        def _fit() -> None:
            self._relayout_after_id = None
            try:
                cw = max(1, int(self.canvas.winfo_width()))
            except tk.TclError:
                return
            cols = self._gallery_cols_for_width(cw)
            if cols != self._gallery_cols:
                self._gallery_cols = cols
                self._relayout()

        self._relayout_after_id = self.root.after(80, _fit)

    def _build_settings(self, parent: ttk.Frame) -> None:
        main = ttk.Frame(parent, padding=12)
        main.pack(fill=tk.BOTH, expand=True)

        ttk.Label(
            main,
            text=(
                "Эти три параметра нужны один раз. Потом можно только включить "
                "автозапуск и работать со вкладки «Сканы»."
            ),
            wraplength=760,
        ).pack(anchor=tk.W, pady=(0, 8))

        box1 = ttk.LabelFrame(main, text="1. Папка сканера", padding=10)
        box1.pack(fill=tk.X, pady=6)
        ttk.Label(
            box1,
            text="Куда книжный сканер сохраняет фото (папка вывода в настройках сканера).",
            wraplength=720,
        ).pack(anchor=tk.W)
        row1 = ttk.Frame(box1)
        row1.pack(fill=tk.X, pady=(8, 0))
        ttk.Entry(row1, textvariable=self.var_watch).pack(
            side=tk.LEFT, fill=tk.X, expand=True
        )
        ttk.Button(row1, text="Выбрать…", command=self._browse).pack(
            side=tk.LEFT, padx=(8, 0)
        )

        box2 = ttk.LabelFrame(main, text="2. Адрес CRM", padding=10)
        box2.pack(fill=tk.X, pady=6)
        ttk.Label(
            box2,
            text=(
                "Ссылка на CRM из адресной строки браузера, без /orders в конце.\n"
                "Пример: https://ваша-лаборатория.click-lab.online"
            ),
            wraplength=720,
        ).pack(anchor=tk.W)
        ttk.Entry(box2, textvariable=self.var_url).pack(fill=tk.X, pady=(8, 0))

        box3 = ttk.LabelFrame(main, text="3. Ключ доступа (API)", padding=10)
        box3.pack(fill=tk.X, pady=6)
        ttk.Label(
            box3,
            text=(
                "Не личный пароль. Владелец в CRM: Конфигурация → API → "
                "«Сгенерировать ключ» → вставить сюда."
            ),
            wraplength=720,
        ).pack(anchor=tk.W)
        self.entry_key = ttk.Entry(box3, textvariable=self.var_key, show="•")
        self.entry_key.pack(fill=tk.X, pady=(8, 0))
        ttk.Checkbutton(
            box3,
            text="Показать ключ",
            variable=self.show_key,
            command=lambda: self.entry_key.configure(
                show="" if self.show_key.get() else "•"
            ),
        ).pack(anchor=tk.W, pady=(4, 0))

        box4 = ttk.LabelFrame(main, text="4. Автозапуск", padding=10)
        box4.pack(fill=tk.X, pady=6)
        ttk.Label(
            box4,
            text=(
                "Программа откроется при входе в Windows и сразу начнёт ждать сканы "
                "(для текущего пользователя)."
            ),
            wraplength=720,
        ).pack(anchor=tk.W)
        ttk.Checkbutton(
            box4,
            text="Запускать вместе с Windows",
            variable=self.var_autostart,
            command=self._on_autostart_toggle,
        ).pack(anchor=tk.W, pady=(8, 0))

        ttk.Button(main, text="Сохранить настройки", command=self._save).pack(
            anchor=tk.W, pady=12
        )

    # ── settings actions ──

    def _browse(self) -> None:
        p = filedialog.askdirectory(title="Папка сканера")
        if p:
            self.var_watch.set(p)

    def _collect(self, *, quiet: bool = False) -> dict | None:
        watch = self.var_watch.get().strip()
        url = self.var_url.get().strip().rstrip("/")
        key = self.var_key.get().strip()
        if not quiet:
            if not watch:
                messagebox.showwarning(APP_TITLE, "Укажите папку сканера.")
                return None
            if not Path(watch).is_dir():
                messagebox.showwarning(APP_TITLE, f"Папка не найдена:\n{watch}")
                return None
            if not url or "://" not in url:
                messagebox.showwarning(APP_TITLE, "Укажите адрес CRM целиком (https://…).")
                return None
            if not key or len(key) < 16:
                messagebox.showwarning(
                    APP_TITLE, "Вставьте API-ключ из Конфигурация → API."
                )
                return None
        elif (
            not watch
            or not Path(watch).is_dir()
            or "://" not in url
            or len(key) < 16
        ):
            return None
        return {
            "watch_dir": watch,
            "crm_base_url": url,
            "crm_api_key": key,
            "autostart": bool(self.var_autostart.get()),
        }

    def _apply_autostart(self, enabled: bool, *, quiet: bool = False) -> bool:
        ok, err = set_windows_autostart(enabled)
        if not ok:
            if not quiet:
                messagebox.showerror(APP_TITLE, "Автозапуск:\n" + err)
            return False
        return True

    def _on_autostart_toggle(self) -> None:
        enabled = bool(self.var_autostart.get())
        cur = load_settings()
        cur["autostart"] = enabled
        save_settings(cur)
        if enabled:
            data = self._collect()
            if not data:
                self.var_autostart.set(False)
                cur["autostart"] = False
                save_settings(cur)
                return
            save_settings(data)
            self._apply_autostart(True)
        else:
            self._apply_autostart(False)

    def _save(self) -> None:
        data = self._collect()
        if not data:
            return
        save_settings(data)
        self._apply_autostart(bool(data["autostart"]))
        messagebox.showinfo(APP_TITLE, "Настройки сохранены.")

    # ── start / stop ──

    def _start_silent(self) -> None:
        if self.running:
            return
        if not self._collect(quiet=True):
            self.var_status.set("Автозапуск: дополните настройки")
            return
        self._start()

    def _start(self) -> None:
        if self.running:
            return
        data = self._collect()
        if not data:
            self.nb.select(self.tab_settings)
            return
        save_settings(data)
        self._apply_autostart(bool(data["autostart"]), quiet=True)

        watch_dir = Path(data["watch_dir"])
        for name in ("done", "error", "no-qr"):
            (watch_dir / name).mkdir(parents=True, exist_ok=True)

        self._watch_dir = watch_dir
        self._processed_ok = 0
        self._processed_fail = 0
        with self._pending_lock:
            self._pending.clear()
        self._path_attempts.clear()
        while True:
            try:
                self.job_q.get_nowait()
            except queue.Empty:
                break

        handler = ScanHandler(watch_dir, self._enqueue_path)
        obs = Observer()
        obs.schedule(handler, str(watch_dir), recursive=False)
        obs.start()
        self.observer = obs
        self.running = True
        self.btn_start.configure(state=tk.DISABLED)
        self.btn_stop.configure(state=tk.NORMAL)
        self._refresh_status(force=True)
        self.nb.select(self.tab_gallery)

        self._workers = []
        for i in range(WORKER_COUNT):
            t = threading.Thread(
                target=self._worker_loop, name=f"scan-worker-{i}", daemon=True
            )
            t.start()
            self._workers.append(t)
        self._sweep_thread = threading.Thread(
            target=self._sweep_loop, name="scan-sweep", daemon=True
        )
        self._sweep_thread.start()
        # сразу подхватить всё, что уже лежит в корне
        self._sweep_once()

    def _stop(self) -> None:
        self.running = False
        if self.observer is not None:
            try:
                self.observer.stop()
                self.observer.join(timeout=5)
            except Exception:
                pass
            self.observer = None
        # разбудить воркеров
        for _ in self._workers:
            try:
                self.job_q.put_nowait(None)
            except Exception:
                pass
        self._workers = []
        self._sweep_thread = None
        self._watch_dir = None
        with self._pending_lock:
            self._pending.clear()
        self.btn_start.configure(state=tk.NORMAL)
        self.btn_stop.configure(state=tk.DISABLED)
        self.var_status.set("Остановлено")

    def _attempt_key(self, path: Path) -> str:
        return path.name.lower()

    def _bump_path_attempts(self, path: Path) -> int:
        key = self._attempt_key(path)
        n = self._path_attempts.get(key, 0) + 1
        self._path_attempts[key] = n
        return n

    def _clear_path_attempts(self, path: Path) -> None:
        self._path_attempts.pop(self._attempt_key(path), None)

    def _schedule_auto_retry(self, uid: str) -> None:
        delay_ms = int(AUTO_RETRY_DELAY_SEC * 1000)

        def _fire() -> None:
            self._auto_retry_uid(uid)

        self.root.after(delay_ms, _fire)

    def _auto_retry_uid(self, uid: str) -> None:
        if not self.running:
            return
        item = next((i for i in self.items if i.uid == uid), None)
        if item is None or item.ok or item.give_up:
            return
        if item.attempts >= MAX_AUTO_ATTEMPTS:
            return
        if not item.path.is_file():
            return
        self.var_status.set(
            f"Автоповтор {item.attempts + 1}/{MAX_AUTO_ATTEMPTS}… {item.path.name}"
        )
        threading.Thread(
            target=self._retry_worker, args=(item, True), daemon=True
        ).start()

    def _mark_item_failed(
        self,
        item: ScanItem,
        *,
        path: Path,
        err: str,
        schedule_auto: bool,
        bump: bool = True,
    ) -> None:
        item.ok = False
        item.path = path
        item.error = err
        item.order_id = None
        item.order_number = None
        item.patient_name = None
        item.doctor_name = None
        item.attachment_id = None
        item.order_url = None
        item.caption = short_name(path.name)
        if bump:
            item.attempts = self._bump_path_attempts(path)
        else:
            item.attempts = self._path_attempts.get(
                self._attempt_key(path), max(1, item.attempts)
            )
        item.give_up = item.attempts >= MAX_AUTO_ATTEMPTS
        self._refresh_item_cell(item)
        self._persist_gallery()
        if item.give_up:
            self._clear_path_attempts(path)
            self._processed_fail += 1
            self.var_status.set(
                f"Сдались после {MAX_AUTO_ATTEMPTS} попыток: {path.name}"
            )
        elif schedule_auto:
            self.var_status.set(
                f"Ошибка, автоповтор {item.attempts}/{MAX_AUTO_ATTEMPTS}…"
            )
            self._schedule_auto_retry(item.uid)

    def _emit_new_fail_item(
        self,
        path: Path,
        err: str,
        *,
        watch: Path,
        attempts: int | None = None,
    ) -> ScanItem:
        if attempts is None:
            attempts = self._bump_path_attempts(path)
        give_up = attempts >= MAX_AUTO_ATTEMPTS
        low = err.lower()
        try:
            if path.parent.resolve() == watch.resolve():
                dest = move_to(
                    watch
                    / (
                        "no-qr"
                        if "no_text" in low or "no_qr" in low
                        else "error"
                    ),
                    path,
                )
            else:
                dest = path
        except OSError:
            dest = path
        item = ScanItem(
            uid=uuid.uuid4().hex,
            path=dest,
            ok=False,
            error=err[:200],
            caption=short_name(dest.name),
            attempts=attempts,
            give_up=give_up,
        )
        if give_up:
            self._clear_path_attempts(path)
            self._processed_fail += 1
        return item

    def _path_key(self, path: Path) -> str:
        try:
            return str(path.resolve()).lower()
        except OSError:
            return str(path).lower()

    def _enqueue_path(self, path: Path) -> None:
        if not self.running:
            return
        try:
            if not path.is_file():
                return
        except OSError:
            return
        if path.suffix.lower() not in IMAGE_EXTS:
            return
        key = self._path_key(path)
        with self._pending_lock:
            if key in self._pending:
                return
            self._pending.add(key)
        self.job_q.put(path)
        self._refresh_status(force=True)

    def _release_pending(self, path: Path) -> None:
        key = self._path_key(path)
        with self._pending_lock:
            self._pending.discard(key)

    def _refresh_status(self, *, force: bool = False) -> None:
        if not self.running or self._watch_dir is None:
            return
        self._status_tick += 1
        if not force and self._status_tick % 8 != 0:
            return
        qsize = self.job_q.qsize()
        with self._pending_lock:
            pending = len(self._pending)
        self.ui_q.put(
            (
                "toast",
                f"Работает — очередь {qsize} (в работе {pending}) · "
                f"ок {self._processed_ok} / ош {self._processed_fail} · "
                f"{self._watch_dir}",
            )
        )

    def _sweep_once(self) -> None:
        watch = self._watch_dir
        if watch is None or not self.running:
            return
        try:
            names = list(watch.iterdir())
        except OSError as e:
            logging.warning("sweep list: %s", e)
            return
        for p in names:
            if not self.running:
                break
            try:
                if p.is_file() and p.suffix.lower() in IMAGE_EXTS:
                    self._enqueue_path(p)
            except OSError:
                continue

    def _sweep_loop(self) -> None:
        # Windows иногда пропускает события watchdog — добираем файлы опросом.
        while self.running:
            self._sweep_once()
            time.sleep(SWEEP_INTERVAL_SEC)

    def _worker_loop(self) -> None:
        while True:
            try:
                item = self.job_q.get(timeout=0.6)
            except queue.Empty:
                if not self.running:
                    return
                continue
            if item is None:
                self.job_q.task_done()
                return
            path = item
            try:
                if not self.running:
                    self._release_pending(path)
                    continue
                time.sleep(PROCESS_DELAY_SEC)
                if not path.is_file():
                    self._release_pending(path)
                    continue
                if not wait_until_stable(path):
                    # ещё пишется — снимем с pending, sweep подхватит снова
                    self._release_pending(path)
                    continue
                outcome = self._process_path(path)
                if outcome == "retry":
                    n = self._bump_path_attempts(path)
                    self._release_pending(path)
                    if n < MAX_AUTO_ATTEMPTS and self.running and path.is_file():
                        self.ui_q.put(
                            (
                                "toast",
                                f"Повтор {n}/{MAX_AUTO_ATTEMPTS}… {path.name}",
                            )
                        )
                        time.sleep(RATE_LIMIT_BACKOFF_SEC)
                        if self.running and path.is_file():
                            self._enqueue_path(path)
                    elif path.is_file() and self._watch_dir is not None:
                        item = self._emit_new_fail_item(
                            path,
                            "CRM недоступен после 3 попыток",
                            watch=self._watch_dir,
                            attempts=n,
                        )
                        self.ui_q.put(("item", item))
                    else:
                        self._clear_path_attempts(path)
                elif outcome == "ok":
                    self._clear_path_attempts(path)
                    self._release_pending(path)
                else:
                    self._release_pending(path)
            except Exception:
                logging.exception("worker failed on %s", path)
                try:
                    if path.is_file() and self._watch_dir is not None:
                        item = self._emit_new_fail_item(
                            path, "внутренняя ошибка", watch=self._watch_dir
                        )
                        self.ui_q.put(("item", item))
                        if not item.give_up:
                            self.ui_q.put(("auto_retry", item.uid))
                except OSError:
                    pass
                self._release_pending(path)
            finally:
                try:
                    self.job_q.task_done()
                except Exception:
                    pass
                self._refresh_status(force=True)

    def on_close(self) -> None:
        self._stop()
        self._persist_gallery()
        for it in self.items:
            self._drop_thumb(it)
        try:
            self.canvas.unbind_all("<MouseWheel>")
        except tk.TclError:
            pass
        self.root.destroy()

    @staticmethod
    def _drop_thumb(item: ScanItem) -> None:
        tf = item.thumb_file
        item.thumb_file = None
        item.photo = None
        if tf is None:
            return
        try:
            if tf.is_file():
                tf.unlink()
        except OSError:
            pass

    # ── gallery persist ──

    def _persist_gallery(self) -> None:
        try:
            gallery_index_path().write_text(
                json.dumps(
                    [i.to_dict() for i in self.items[:GALLERY_MAX]],
                    ensure_ascii=False,
                    indent=2,
                )
                + "\n",
                encoding="utf-8",
            )
        except OSError:
            pass

    def _load_gallery(self) -> None:
        path = gallery_index_path()
        if not path.is_file():
            return
        try:
            raw = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            return
        if not isinstance(raw, list):
            return
        loaded: list[ScanItem] = []
        for d in raw:
            if not isinstance(d, dict):
                continue
            item = ScanItem.from_dict(d)
            if item:
                loaded.append(item)
        if not loaded:
            return
        self.empty_lbl.grid_remove()
        for item in loaded[:GALLERY_MAX]:
            thumb = make_thumb_png(item.path)
            if thumb and thumb.is_file():
                try:
                    photo = tk.PhotoImage(file=str(thumb))
                    item.photo = photo
                    item.thumb_file = thumb
                    self._thumb_keep.append(photo)
                except tk.TclError:
                    item.photo = None
            self.items.append(item)
        self._relayout()

    # ── process scan ──

    def _drain_ui(self) -> None:
        while True:
            try:
                msg = self.ui_q.get_nowait()
            except queue.Empty:
                break
            kind = msg[0]
            if kind == "item":
                self._add_item_ui(msg[1])
            elif kind == "auto_retry":
                self._schedule_auto_retry(str(msg[1]))
            elif kind == "refresh":
                self._relayout()
            elif kind == "toast":
                self.var_status.set(str(msg[1]))
        self.root.after(150, self._drain_ui)

    def _process_path(self, path: Path) -> str:
        """ok | fail | retry — retry при rate limit, файл остаётся на месте."""
        s = load_settings()
        crm = s["crm_base_url"]
        key = s["crm_api_key"]
        watch = Path(s["watch_dir"])
        if not path.is_file():
            return "fail"

        logging.info("process %s", path.name)
        self.ui_q.put(("toast", f"Разбор… {path.name}"))
        t0 = time.time()
        try:
            qr_hint, force_num = resolve_upload_hints(path)
            logging.info(
                "hints %s → qr=%s order=%s (%.1fs)",
                path.name,
                "yes" if qr_hint else "no",
                force_num or "-",
                time.time() - t0,
            )
            if not force_num and not qr_hint:
                logging.warning("no local hint %s — skip CRM", path.name)
                item = self._emit_new_fail_item(
                    path, "не распознан номер", watch=watch
                )
                self.ui_q.put(("item", item))
                if not item.give_up:
                    self.ui_q.put(("auto_retry", item.uid))
                return "fail"
            if force_num:
                self.ui_q.put(("toast", f"OCR: {force_num} → CRM… {path.name}"))
            else:
                self.ui_q.put(("toast", f"QR → CRM… {path.name}"))
            t_up = time.time()
            ok, status, parsed = upload_scan(
                crm_base=crm,
                api_key=key,
                path=path,
                qr_hint=qr_hint,
                force_order_number=force_num,
            )
            logging.info(
                "upload %s status=%s ok=%s (%.1fs)",
                path.name,
                status,
                ok,
                time.time() - t_up,
            )
        except Exception as e:
            logging.exception("upload %s", path.name)
            err_s = str(e)
            if "timed out" in err_s.lower() or "timeout" in err_s.lower():
                self.ui_q.put(("toast", f"Таймаут CRM, повторю: {path.name}"))
                return "retry"
            item = self._emit_new_fail_item(path, err_s[:200], watch=watch)
            self.ui_q.put(("item", item))
            if not item.give_up:
                self.ui_q.put(("auto_retry", item.uid))
            return "fail"

        if status == 0 and (
            "timed out" in str(parsed.get("error") or "").lower()
            or "timeout" in str(parsed.get("error") or "").lower()
        ):
            logging.warning("timeout on %s — retry", path.name)
            self.ui_q.put(("toast", f"Таймаут CRM, повторю: {path.name}"))
            return "retry"

        if status in {429, 502, 503, 504} or str(parsed.get("error") or "").lower() in {
            "rate_limited",
            "too_many_requests",
        }:
            logging.warning("HTTP %s on %s — retry", status, path.name)
            self.ui_q.put(("toast", f"CRM HTTP {status}, повторю: {path.name}"))
            return "retry"

        # Обрезанное тело на проде (после внутренних ретраев upload_scan)
        err_low = str(parsed.get("error") or "").lower()
        if status in {408, 415} and (
            "unsupported_type" in err_low or "body_incomplete" in err_low
        ):
            logging.warning("truncated body still on %s — queue retry", path.name)
            self.ui_q.put(("toast", f"Сеть обрезала файл, повторю: {path.name}"))
            return "retry"

        done_dir = watch / "done"

        if ok:
            dest = move_to(done_dir, path)
            oid = str(parsed.get("orderId") or "")
            onum = str(parsed.get("orderNumber") or "")
            aid = str(parsed.get("attachmentId") or "")
            opath = parsed.get("orderPath")
            opath_s = str(opath) if opath else None
            logging.info(
                "ok %s → %s (%s)", path.name, onum or oid, parsed.get("qrKind") or ""
            )
            self._clear_path_attempts(path)
            item = ScanItem(
                uid=uuid.uuid4().hex,
                path=dest,
                ok=True,
                order_id=oid or None,
                order_number=onum or None,
                patient_name=(
                    str(parsed["patientName"]).strip()
                    if parsed.get("patientName")
                    else None
                ),
                doctor_name=(
                    str(parsed["doctorName"]).strip()
                    if parsed.get("doctorName")
                    else None
                ),
                attachment_id=aid or None,
                order_url=order_url(crm, oid, opath_s) if oid else None,
                caption=short_name(dest.name),
                attempts=0,
                give_up=False,
            )
            self._processed_ok += 1
            self.ui_q.put(("item", item))
            self.ui_q.put(("toast", f"Ок → {onum or oid}: {path.name}"))
            return "ok"

        err = str(parsed.get("error") or parsed.get("detail") or "ошибка")
        logging.warning("fail %s: %s", path.name, err)
        item = self._emit_new_fail_item(path, err, watch=watch)
        self.ui_q.put(("item", item))
        if not item.give_up:
            self.ui_q.put(("auto_retry", item.uid))
        return "fail"

    def _schedule_persist(self) -> None:
        if self._persist_after_id is not None:
            try:
                self.root.after_cancel(self._persist_after_id)
            except Exception:
                pass
        self._persist_after_id = self.root.after(1500, self._persist_gallery)

    def _add_item_ui(self, item: ScanItem, *, persist: bool = True) -> None:
        self.empty_lbl.grid_remove()
        self.items.insert(0, item)
        dropped = self.items[GALLERY_MAX:]
        self.items = self.items[:GALLERY_MAX]
        for old in dropped:
            self._drop_thumb(old)
        thumb = make_thumb_png(item.path)
        if thumb and thumb.is_file():
            try:
                photo = tk.PhotoImage(file=str(thumb))
                item.photo = photo
                item.thumb_file = thumb
                self._thumb_keep.append(photo)
                self._thumb_keep = self._thumb_keep[-(GALLERY_MAX + 20) :]
            except tk.TclError:
                item.photo = None
                self._drop_thumb(item)
        self._relayout()
        if persist:
            self._schedule_persist()

    def _refresh_item_cell(self, item: ScanItem) -> None:
        """Обновить шапку/рамку без пересборки всей галереи (без мерцания)."""
        if item.frame is None:
            self._relayout()
            return
        try:
            if not item.frame.winfo_exists():
                self._relayout()
                return
        except tk.TclError:
            self._relayout()
            return
        border = "#1a7f37" if item.ok else "#c62828"
        fg = "#111111" if item.ok else "#8b0000"
        try:
            if item.head_lbl is not None and item.head_lbl.winfo_exists():
                item.head_lbl.configure(text=item.header_text(), fg=fg)
            else:
                self._relayout()
                return
            if item.border_frame is not None and item.border_frame.winfo_exists():
                item.border_frame.configure(bg=border)
            else:
                self._relayout()
                return
            if item.cap_lbl is not None and item.cap_lbl.winfo_exists():
                item.cap_lbl.configure(text=short_name(item.path.name))
        except tk.TclError:
            self._relayout()

    def _relayout(self) -> None:
        for child in self.grid.winfo_children():
            if child is self.empty_lbl:
                continue
            child.destroy()
        if not self.items:
            self.empty_lbl.grid(row=0, column=0, padx=40, pady=40)
            return
        self.empty_lbl.grid_remove()
        try:
            cw = max(1, int(self.canvas.winfo_width()))
        except tk.TclError:
            cw = 900
        cols = self._gallery_cols_for_width(cw)
        self._gallery_cols = cols
        for c in range(cols):
            self.grid.columnconfigure(c, weight=1, uniform="scan")
        for idx, item in enumerate(self.items):
            r, c = divmod(idx, cols)
            border = "#1a7f37" if item.ok else "#c62828"
            cell = tk.Frame(self.grid, bg="#ffffff")
            cell.grid(row=r, column=c, padx=8, pady=8, sticky=tk.N)

            head = tk.Label(
                cell,
                text=item.header_text(),
                bg="#ffffff",
                fg="#111111" if item.ok else "#8b0000",
                font=("Segoe UI", 9, "bold"),
                justify=tk.CENTER,
                wraplength=THUMB_SIZE + 12,
            )
            head.pack(pady=(0, 4))

            outer = tk.Frame(cell, bg=border, padx=3, pady=3)
            outer.pack()
            inner = tk.Frame(outer, bg="#f5f5f5")
            inner.pack()
            if item.photo is not None:
                lbl = tk.Label(inner, image=item.photo, bg="#f5f5f5", cursor="hand2")
            else:
                lbl = tk.Label(
                    inner,
                    text="нет\nпревью",
                    width=16,
                    height=8,
                    bg="#eee",
                    cursor="hand2",
                )
            lbl.pack()
            cap = tk.Label(
                inner,
                text=short_name(item.path.name),
                bg="#f5f5f5",
                fg="#555555",
                font=("Segoe UI", 7),
                justify=tk.CENTER,
                wraplength=THUMB_SIZE + 4,
            )
            cap.pack(pady=(2, 4))
            item.frame = cell
            item.head_lbl = head
            item.border_frame = outer
            item.cap_lbl = cap
            for w in (lbl, outer, inner):
                w.bind("<Button-1>", lambda e, it=item: self._expand(it))
            for w in (cell, head, outer, inner, lbl, cap):
                w.bind("<Button-3>", lambda e, it=item: self._context(e, it))
        try:
            self.canvas.configure(scrollregion=self.canvas.bbox("all"))
        except tk.TclError:
            pass

    # ── preview / context ──

    def _expand(self, item: ScanItem) -> None:
        if not item.path.is_file():
            messagebox.showwarning(APP_TITLE, f"Файл не найден:\n{item.path}")
            return
        win = tk.Toplevel(self.root)
        win.title(item.caption or item.path.name)
        win.configure(bg="#111111")
        win.transient(self.root)
        win.focus_set()

        screen_w = max(800, int(self.root.winfo_screenwidth() * 0.96))
        screen_h = max(600, int(self.root.winfo_screenheight() * 0.92))
        win.geometry(f"{screen_w}x{screen_h}+0+0")
        try:
            win.state("zoomed")
        except tk.TclError:
            pass

        img = imread_bgr(item.path)
        if img is None:
            ttk.Label(win, text="Не удалось открыть файл").pack(padx=20, pady=20)
            return
        h, w = img.shape[:2]
        # Чуть меньше окна — место под подпись; не увеличиваем сверх 1:1
        max_w = max(200, screen_w - 40)
        max_h = max(200, screen_h - 80)
        scale = min(max_w / w, max_h / h, 1.0)
        nw, nh = max(1, int(w * scale)), max(1, int(h * scale))
        resized = cv2.resize(img, (nw, nh), interpolation=cv2.INTER_AREA)
        rgb = cv2.cvtColor(resized, cv2.COLOR_BGR2RGB)
        tmp = Path(tempfile.gettempdir()) / f"clscan_full_{uuid.uuid4().hex}.ppm"
        try:
            header = f"P6\n{nw} {nh}\n255\n".encode("ascii")
            tmp.write_bytes(header + rgb.tobytes())
            photo = tk.PhotoImage(file=str(tmp))
        except (OSError, tk.TclError):
            ttk.Label(win, text="Превью недоступно").pack()
            return

        holder = tk.Frame(win, bg="#111111")
        holder.pack(fill=tk.BOTH, expand=True)
        lbl = tk.Label(holder, image=photo, bg="#111111", cursor="hand2")
        lbl.image = photo  # type: ignore[attr-defined]
        lbl.pack(expand=True)
        info = item.header_text() if item.ok else (item.error or "")
        tk.Label(
            win,
            text=f"{item.path.name}  ·  Esc / клик — закрыть\n{info}",
            bg="#111111",
            fg="#dddddd",
            font=("Segoe UI", 9),
            justify=tk.CENTER,
        ).pack(pady=(0, 10))

        def _cleanup() -> None:
            try:
                if tmp.is_file():
                    tmp.unlink()
            except OSError:
                pass

        def _close(_e=None) -> None:
            _cleanup()
            win.destroy()

        win.protocol("WM_DELETE_WINDOW", _close)
        win.bind("<Escape>", _close)
        lbl.bind("<Button-1>", _close)
        holder.bind("<Button-1>", _close)

    def _context(self, event: tk.Event, item: ScanItem) -> None:
        menu = tk.Menu(self.root, tearoff=0)
        if item.ok and item.order_url:
            menu.add_command(
                label="Скопировать ссылку на заказ",
                command=lambda: self._copy_link(item),
            )
        if not item.ok:
            menu.add_command(
                label="Попробовать ещё раз",
                command=lambda: self._retry(item),
            )
        menu.add_command(
            label="Корректировка (номер наряда)…",
            command=lambda: self._correct(item),
        )
        menu.add_separator()
        menu.add_command(
            label="Удалить фото (локально и из CRM)…",
            command=lambda: self._delete_item(item),
        )
        try:
            menu.tk_popup(event.x_root, event.y_root)
        finally:
            menu.grab_release()

    def _copy_link(self, item: ScanItem) -> None:
        if not item.order_url:
            return
        self.root.clipboard_clear()
        self.root.clipboard_append(item.order_url)
        self.var_status.set(f"Ссылка скопирована: {item.order_number or ''}")

    def _retry(self, item: ScanItem) -> None:
        if not item.path.is_file():
            messagebox.showwarning(
                APP_TITLE, f"Файл не найден:\n{item.path}"
            )
            return
        # Ручной повтор — новый цикл из 3 автопопыток
        item.give_up = False
        item.attempts = 0
        self._clear_path_attempts(item.path)
        self.var_status.set(f"Повтор… {item.path.name}")
        threading.Thread(
            target=self._retry_worker, args=(item, False), daemon=True
        ).start()

    def _retry_worker(self, item: ScanItem, auto: bool = False) -> None:
        s = load_settings()
        crm, key = s["crm_base_url"], s["crm_api_key"]
        watch = Path(s["watch_dir"])
        path = item.path
        label = "Автоповтор" if auto else "Повтор"
        self.ui_q.put(("toast", f"{label}… {path.name}"))
        try:
            qr_hint, force_num = resolve_upload_hints(path)
            if not force_num and not qr_hint:
                err = "не распознан номер"

                def fail_no_hint() -> None:
                    # файл уже в error/no-qr — не двигаем
                    self._mark_item_failed(
                        item, path=path, err=err, schedule_auto=True
                    )

                self.root.after(0, fail_no_hint)
                return
            ok, status, parsed = upload_scan(
                crm_base=crm,
                api_key=key,
                path=path,
                qr_hint=qr_hint,
                force_order_number=force_num,
            )
        except Exception as e:
            err = str(e)[:200]
            logging.exception("retry %s", path.name)

            def fail_ex() -> None:
                self._mark_item_failed(
                    item, path=path, err=err, schedule_auto=True
                )

            self.root.after(0, fail_ex)
            return

        if (
            status in {0, 429, 502, 503, 504}
            or "timed out" in str(parsed.get("error") or "").lower()
            or "timeout" in str(parsed.get("error") or "").lower()
        ):
            err = str(parsed.get("error") or f"HTTP {status}")

            def fail_retry() -> None:
                self._mark_item_failed(
                    item, path=path, err=err, schedule_auto=True
                )

            self.root.after(0, fail_retry)
            return

        if not ok:
            err = str(parsed.get("error") or parsed.get("detail") or "ошибка")
            low = err.lower()
            try:
                if path.parent.name not in {"error", "no-qr"}:
                    dest = move_to(
                        watch
                        / (
                            "no-qr"
                            if "no_text" in low or "no_qr" in low
                            else "error"
                        ),
                        path,
                    )
                    path = dest
            except OSError:
                pass

            def fail_biz() -> None:
                self._mark_item_failed(
                    item, path=path, err=err, schedule_auto=True
                )

            self.root.after(0, fail_biz)
            return

        oid = str(parsed.get("orderId") or "")
        onum = str(parsed.get("orderNumber") or "")
        aid = str(parsed.get("attachmentId") or "")
        op = parsed.get("orderPath")
        try:
            if path.parent.name != "done":
                path = move_to(watch / "done", path)
        except OSError:
            pass

        def apply_ok() -> None:
            item.ok = True
            item.path = path
            item.error = None
            item.order_id = oid or None
            item.order_number = onum or None
            item.patient_name = (
                str(parsed["patientName"]).strip()
                if parsed.get("patientName")
                else None
            )
            item.doctor_name = (
                str(parsed["doctorName"]).strip()
                if parsed.get("doctorName")
                else None
            )
            item.attachment_id = aid or None
            item.order_url = (
                order_url(crm, oid, str(op) if op else None) if oid else None
            )
            item.caption = short_name(path.name)
            item.attempts = 0
            item.give_up = False
            self._clear_path_attempts(path)
            self._processed_ok += 1
            self._refresh_item_cell(item)
            self._persist_gallery()
            self.var_status.set(f"Повтор ок → {item.order_number or oid}")

        self.root.after(0, apply_ok)

    def _correct(self, item: ScanItem) -> None:
        prompt = (
            "Введите номер наряда (например 2607-422).\n"
            "Файл будет отправлен в этот заказ"
            + (
                " и удалён из старого (нужно подтверждение)."
                if item.ok and item.attachment_id
                else "."
            )
        )
        num = simpledialog.askstring("Корректировка", prompt, parent=self.root)
        if not num:
            return
        num = num.strip()
        if not re.fullmatch(r"\d{4}-\d{3}", num):
            messagebox.showwarning(APP_TITLE, "Номер должен быть вида 2607-422")
            return
        if item.ok and item.order_id and item.attachment_id:
            if not messagebox.askyesno(
                APP_TITLE,
                f"Перенести фото из заказа {item.order_number or item.order_id} "
                f"в заказ {num}?\nСтарое вложение в CRM будет удалено.",
            ):
                return
        threading.Thread(
            target=self._correct_worker, args=(item, num), daemon=True
        ).start()

    def _correct_worker(self, item: ScanItem, order_number: str) -> None:
        s = load_settings()
        crm, key = s["crm_base_url"], s["crm_api_key"]
        old_order_id = item.order_id if item.ok else None
        old_attachment_id = item.attachment_id if item.ok else None

        # Сначала новое вложение — иначе при сбое upload старое уже стёрто.
        ok, _status, parsed = upload_scan(
            crm_base=crm,
            api_key=key,
            path=item.path,
            force_order_number=order_number,
        )
        if not ok:
            self.ui_q.put(
                ("toast", f"Корректировка не удалась: {parsed.get('error')}")
            )
            return

        new_aid = str(parsed.get("attachmentId") or "") or None
        warn_old = ""
        if (
            old_order_id
            and old_attachment_id
            and new_aid
            and old_attachment_id != new_aid
        ):
            dok, dparsed = delete_crm_attachment(
                crm_base=crm,
                api_key=key,
                order_id=old_order_id,
                attachment_id=old_attachment_id,
            )
            if not dok:
                warn_old = str(dparsed.get("error") or "старое вложение не удалено")
                logging.warning("correct: old attach left: %s", warn_old)

        def apply() -> None:
            item.ok = True
            item.order_id = str(parsed.get("orderId") or "") or None
            item.order_number = str(parsed.get("orderNumber") or order_number)
            item.patient_name = (
                str(parsed["patientName"]).strip()
                if parsed.get("patientName")
                else None
            )
            item.doctor_name = (
                str(parsed["doctorName"]).strip()
                if parsed.get("doctorName")
                else None
            )
            item.attachment_id = new_aid
            op = parsed.get("orderPath")
            item.order_url = (
                order_url(crm, item.order_id, str(op) if op else None)
                if item.order_id
                else None
            )
            item.error = None
            item.caption = short_name(item.path.name)
            item.attempts = 0
            item.give_up = False
            self._clear_path_attempts(item.path)
            watch = Path(s["watch_dir"])
            if item.path.parent.name != "done":
                try:
                    item.path = move_to(watch / "done", item.path)
                except OSError:
                    pass
            self._relayout()
            self._persist_gallery()
            if warn_old:
                self.var_status.set(
                    f"В заказ {item.order_number}, но старое вложение: {warn_old}"
                )
            else:
                self.var_status.set(f"Исправлено → {item.order_number}")

        self.root.after(0, apply)

    def _delete_item(self, item: ScanItem) -> None:
        msg = "Удалить фото с диска"
        if item.ok and item.attachment_id:
            msg += " и вложение из CRM"
        msg += "?\nЭто действие нельзя отменить."
        if not messagebox.askyesno(APP_TITLE, msg):
            return
        threading.Thread(
            target=self._delete_worker, args=(item,), daemon=True
        ).start()

    def _delete_worker(self, item: ScanItem) -> None:
        s = load_settings()
        if item.ok and item.order_id and item.attachment_id:
            dok, dparsed = delete_crm_attachment(
                crm_base=s["crm_base_url"],
                api_key=s["crm_api_key"],
                order_id=item.order_id,
                attachment_id=item.attachment_id,
            )
            if not dok:
                self.ui_q.put(
                    ("toast", f"CRM: {dparsed.get('error') or 'не удалено'}")
                )
                # всё равно спросим — удаляем локально? по ТЗ удаляет из папки и CRM
                # если CRM fail — не трогаем локальный файл
                return
        try:
            if item.path.is_file():
                item.path.unlink()
        except OSError as e:
            self.ui_q.put(("toast", f"Файл: {e}"))
            return

        def apply() -> None:
            self._drop_thumb(item)
            self.items = [i for i in self.items if i.uid != item.uid]
            self._relayout()
            self._persist_gallery()
            self.var_status.set("Фото удалено")

        self.root.after(0, apply)

    def run(self) -> None:
        self.root.mainloop()


def main() -> int:
    log_file = data_dir() / "watcher.log"
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(message)s",
        handlers=[logging.FileHandler(log_file, encoding="utf-8")],
    )
    if not acquire_single_instance():
        try:
            root = tk.Tk()
            root.withdraw()
            messagebox.showwarning(
                APP_TITLE,
                "Программа уже запущена.\nЗакройте другое окно Click Lab — сканер.",
            )
            root.destroy()
        except Exception:
            pass
        return 1
    if is_ephemeral_install():
        logging.warning("exe from Temp/ZIP — data dir %s", data_dir())
        try:
            root = tk.Tk()
            root.withdraw()
            messagebox.showwarning(
                APP_TITLE,
                "Похоже, программа запущена из архива (временная папка).\n\n"
                "Скопируйте ClickLab-Scanner.exe в обычную папку "
                "(например в папку сканера) и запускайте оттуда.",
            )
            root.destroy()
        except Exception:
            pass
    ScannerApp().run()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
