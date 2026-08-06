"""
Вотчер папки книжного сканера: читает QR и шлёт фото в CRM (вложения заказа).

Конфиг: скопируйте config.example.env → config.env
Ключ API: Конфигурация → API в CRM (показывается один раз).
"""

from __future__ import annotations

import logging
import mimetypes
import os
import shutil
import sys
import time
from pathlib import Path

try:
    import cv2
except ImportError:
    print("Установите зависимости: pip install -r requirements.txt", file=sys.stderr)
    raise

try:
    from watchdog.events import FileSystemEventHandler
    from watchdog.observers import Observer
except ImportError:
    print("Установите зависимости: pip install -r requirements.txt", file=sys.stderr)
    raise

IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".tif", ".tiff", ".webp"}
STABLE_CHECKS = 4
STABLE_INTERVAL_SEC = 0.4
PROCESS_DELAY_SEC = 0.8


def load_env_file(path: Path) -> None:
    if not path.is_file():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        s = line.strip()
        if not s or s.startswith("#") or "=" not in s:
            continue
        key, _, val = s.partition("=")
        key = key.strip()
        val = val.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = val


def setup_logging(log_path: Path) -> None:
    log_path.parent.mkdir(parents=True, exist_ok=True)
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(message)s",
        handlers=[
            logging.FileHandler(log_path, encoding="utf-8"),
            logging.StreamHandler(sys.stdout),
        ],
    )


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


def decode_qr(path: Path) -> str | None:
    img = cv2.imread(str(path))
    if img is None:
        return None
    detector = cv2.QRCodeDetector()
    data, _points, _ = detector.detectAndDecode(img)
    text = (data or "").strip()
    if text:
        return text
    # Верхняя половина — обычно наряд
    h = img.shape[0]
    top = img[0 : max(1, h // 2), :]
    data2, _p2, _ = detector.detectAndDecode(top)
    text2 = (data2 or "").strip()
    return text2 or None


def move_to(subdir: Path, path: Path) -> Path:
    subdir.mkdir(parents=True, exist_ok=True)
    dest = subdir / path.name
    if dest.exists():
        stem = path.stem
        suffix = path.suffix
        i = 1
        while dest.exists():
            dest = subdir / f"{stem}_{i}{suffix}"
            i += 1
    shutil.move(str(path), str(dest))
    return dest


def upload_scan(
    *,
    crm_base: str,
    api_key: str,
    path: Path,
    qr_hint: str | None,
) -> tuple[bool, str]:
    import urllib.error
    import urllib.request
    from urllib.parse import quote

    url = crm_base.rstrip("/") + "/api/scanner/ingest"
    data = path.read_bytes()
    mime = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/octet-stream",
        "x-upload-filename": quote(path.name),
        "x-upload-mime": mime,
    }
    if qr_hint:
        # Подсказка для TIFF; для JPEG/PNG сервер читает QR сам.
        headers["x-scanner-qr"] = quote(qr_hint, safe=":/?&=#%")

    req = urllib.request.Request(url, data=data, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=300) as resp:
            body = resp.read().decode("utf-8", errors="replace")
            return True, f"HTTP {resp.status}: {body[:500]}"
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        return False, f"HTTP {e.code}: {body[:500]}"
    except Exception as e:
        return False, str(e)


class ScanHandler(FileSystemEventHandler):
    def __init__(
        self,
        watch_dir: Path,
        done_dir: Path,
        error_dir: Path,
        no_qr_dir: Path,
        crm_base: str,
        api_key: str,
    ) -> None:
        super().__init__()
        self.watch_dir = watch_dir
        self.done_dir = done_dir
        self.error_dir = error_dir
        self.no_qr_dir = no_qr_dir
        self.crm_base = crm_base
        self.api_key = api_key
        self._seen: set[str] = set()

    def on_created(self, event):  # type: ignore[no-untyped-def]
        if event.is_directory:
            return
        self._maybe_process(Path(event.src_path))

    def on_modified(self, event):  # type: ignore[no-untyped-def]
        if event.is_directory:
            return
        self._maybe_process(Path(event.src_path))

    def _maybe_process(self, path: Path) -> None:
        try:
            path = path.resolve()
        except OSError:
            return
        if path.parent.resolve() != self.watch_dir.resolve():
            return
        if path.suffix.lower() not in IMAGE_EXTS:
            return
        key = str(path)
        if key in self._seen:
            return
        self._seen.add(key)
        # Отложить, чтобы дописать файл
        time.sleep(PROCESS_DELAY_SEC)
        try:
            self._process(path)
        finally:
            self._seen.discard(key)

    def _process(self, path: Path) -> None:
        log = logging.getLogger("scanner")
        if not path.is_file():
            return
        if not wait_until_stable(path):
            log.warning("файл не стабилизировался: %s", path.name)
            move_to(self.error_dir, path)
            return

        qr = decode_qr(path)
        if not qr:
            log.warning("нет QR: %s", path.name)
            move_to(self.no_qr_dir, path)
            return

        log.info("QR %s → %s", path.name, qr[:120])
        ok, detail = upload_scan(
            crm_base=self.crm_base,
            api_key=self.api_key,
            path=path,
            qr_hint=qr,
        )
        if ok:
            log.info("ok %s: %s", path.name, detail)
            move_to(self.done_dir, path)
        else:
            log.error("ошибка %s: %s", path.name, detail)
            move_to(self.error_dir, path)


def app_dir() -> Path:
    """Папка рядом с .exe (PyInstaller) или со скриптом."""
    if getattr(sys, "frozen", False):
        return Path(sys.executable).resolve().parent
    return Path(__file__).resolve().parent


def main() -> int:
    here = app_dir()
    load_env_file(here / "config.env")
    load_env_file(here / ".env")

    watch_dir_raw = os.environ.get("WATCH_DIR", "").strip()
    crm_base = os.environ.get("CRM_BASE_URL", "").strip()
    api_key = os.environ.get("CRM_API_KEY", "").strip()
    log_path = Path(os.environ.get("LOG_FILE", str(here / "watcher.log")))

    if not watch_dir_raw:
        print(
            f"Создайте {here / 'config.env'} (см. config.example.env) и укажите WATCH_DIR.",
            file=sys.stderr,
        )
        return 1
    watch_dir = Path(watch_dir_raw).expanduser()
    if not watch_dir.is_dir():
        print(f"WATCH_DIR не найден: {watch_dir}", file=sys.stderr)
        return 1
    if not crm_base or not api_key:
        print(
            f"Задайте CRM_BASE_URL и CRM_API_KEY в {here / 'config.env'}",
            file=sys.stderr,
        )
        return 1

    setup_logging(log_path)
    log = logging.getLogger("scanner")

    done_dir = watch_dir / "done"
    error_dir = watch_dir / "error"
    no_qr_dir = watch_dir / "no-qr"
    for d in (done_dir, error_dir, no_qr_dir):
        d.mkdir(parents=True, exist_ok=True)

    handler = ScanHandler(
        watch_dir=watch_dir,
        done_dir=done_dir,
        error_dir=error_dir,
        no_qr_dir=no_qr_dir,
        crm_base=crm_base,
        api_key=api_key,
    )
    observer = Observer()
    observer.schedule(handler, str(watch_dir), recursive=False)
    observer.start()
    log.info("слежение за %s → %s", watch_dir, crm_base)

    # Догнать уже лежащие файлы
    for p in sorted(watch_dir.iterdir()):
        if p.is_file() and p.suffix.lower() in IMAGE_EXTS:
            handler._maybe_process(p)

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        log.info("остановка")
    finally:
        observer.stop()
        observer.join()
    return 0


if __name__ == "__main__":
    code = main()
    if code != 0 and getattr(sys, "frozen", False):
        try:
            input("\nНажмите Enter, чтобы закрыть…")
        except EOFError:
            pass
    raise SystemExit(code)