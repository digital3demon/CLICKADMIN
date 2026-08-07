"""
Click Lab — загрузка сканов в заказ по QR.

Окно настроек для обычных пользователей: всё заполняется внутри программы.
"""

from __future__ import annotations

import json
import logging
import mimetypes
import queue
import shutil
import sys
import threading
import time
import tkinter as tk
from pathlib import Path
from tkinter import filedialog, messagebox, scrolledtext, ttk

try:
    import cv2
except ImportError:
    print("Установите зависимости: pip install -r requirements.txt", file=sys.stderr)
    raise

from watchdog.events import FileSystemEventHandler
from watchdog.observers import Observer

IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".tif", ".tiff", ".webp"}
STABLE_CHECKS = 4
STABLE_INTERVAL_SEC = 0.4
PROCESS_DELAY_SEC = 0.8

APP_TITLE = "Click Lab — сканер в заказ"
AUTOSTART_REG_NAME = "ClickLabScanner"


def app_dir() -> Path:
    if getattr(sys, "frozen", False):
        return Path(sys.executable).resolve().parent
    return Path(__file__).resolve().parent


def launch_command() -> str:
    """Команда для автозапуска Windows (путь к exe или python+скрипт)."""
    if getattr(sys, "frozen", False):
        return f'"{Path(sys.executable).resolve()}"'
    py = Path(sys.executable).resolve()
    script = Path(__file__).resolve()
    return f'"{py}" "{script}"'


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
    """Включить/выключить автозапуск текущего пользователя Windows."""
    if sys.platform != "win32":
        return False, "Автозапуск доступен только в Windows"
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
                    key,
                    AUTOSTART_REG_NAME,
                    0,
                    winreg.REG_SZ,
                    launch_command(),
                )
                return True, "ok"
            try:
                winreg.DeleteValue(key, AUTOSTART_REG_NAME)
            except FileNotFoundError:
                pass
            return True, "ok"
    except OSError as e:
        return False, str(e)


def settings_path() -> Path:
    return app_dir() / "settings.json"


def load_settings() -> dict:
    path = settings_path()
    defaults = {
        "watch_dir": "",
        "crm_base_url": "",
        "crm_api_key": "",
        "autostart": False,
    }
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
    h = img.shape[0]
    top = img[0 : max(1, h // 2), :]
    data2, _p2, _ = detector.detectAndDecode(top)
    return (data2 or "").strip() or None


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
        headers["x-scanner-qr"] = quote(qr_hint, safe=":/?&=#%")

    req = urllib.request.Request(url, data=data, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=300) as resp:
            body = resp.read().decode("utf-8", errors="replace")
            return True, f"HTTP {resp.status}: {body[:400]}"
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        return False, f"HTTP {e.code}: {body[:400]}"
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
        on_log,
    ) -> None:
        super().__init__()
        self.watch_dir = watch_dir
        self.done_dir = done_dir
        self.error_dir = error_dir
        self.no_qr_dir = no_qr_dir
        self.crm_base = crm_base
        self.api_key = api_key
        self.on_log = on_log
        self._seen: set[str] = set()

    def on_created(self, event):  # type: ignore[no-untyped-def]
        if not event.is_directory:
            self._maybe_process(Path(event.src_path))

    def on_modified(self, event):  # type: ignore[no-untyped-def]
        if not event.is_directory:
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
        time.sleep(PROCESS_DELAY_SEC)
        try:
            self._process(path)
        finally:
            self._seen.discard(key)

    def _process(self, path: Path) -> None:
        if not path.is_file():
            return
        if not wait_until_stable(path):
            self.on_log(f"⚠ Файл не дописался: {path.name} → папка error")
            move_to(self.error_dir, path)
            return

        qr = decode_qr(path)
        if qr:
            self.on_log(f"QR найден на {path.name}, отправляю в CRM…")
        else:
            self.on_log(
                f"QR не прочитан на {path.name} — отправляю в CRM, "
                "там попробуют узнать заказ по тексту наряда (номер)…"
            )
        ok, detail = upload_scan(
            crm_base=self.crm_base,
            api_key=self.api_key,
            path=path,
            qr_hint=qr,
        )
        if ok:
            self.on_log(f"✓ Готово: {path.name} → вложение заказа")
            move_to(self.done_dir, path)
        else:
            low = detail.lower()
            if "no_text_match" in low or "no_qr" in low:
                self.on_log(
                    f"⚠ Не удалось определить заказ по QR и по тексту: {path.name} → no-qr"
                )
                move_to(self.no_qr_dir, path)
            else:
                self.on_log(f"✗ Ошибка загрузки {path.name}: {detail}")
                move_to(self.error_dir, path)


class GuiLogHandler(logging.Handler):
    def __init__(self, q: queue.Queue[str]) -> None:
        super().__init__()
        self.q = q

    def emit(self, record: logging.LogRecord) -> None:
        try:
            self.q.put(self.format(record))
        except Exception:
            pass


class ScannerApp:
    def __init__(self) -> None:
        self.root = tk.Tk()
        self.root.title(APP_TITLE)
        self.root.minsize(640, 560)
        self.root.geometry("720x620")

        self.log_q: queue.Queue[str] = queue.Queue()
        self.observer: Observer | None = None
        self.running = False

        settings = load_settings()
        # Синхронизируем галочку с реальной записью в автозагрузке Windows
        autostart_on = bool(settings.get("autostart")) or is_windows_autostart_enabled()
        self.var_watch = tk.StringVar(value=settings["watch_dir"])
        self.var_url = tk.StringVar(value=settings["crm_base_url"])
        self.var_key = tk.StringVar(value=settings["crm_api_key"])
        self.var_autostart = tk.BooleanVar(value=autostart_on)
        self.var_status = tk.StringVar(
            value="Остановлено — заполните настройки и нажмите «Начать работу»"
        )

        self._build_ui()
        self.root.protocol("WM_DELETE_WINDOW", self.on_close)
        self.root.after(200, self._drain_log)
        # После входа в Windows сразу начинаем слежение, если всё уже настроено
        if autostart_on and settings["watch_dir"] and settings["crm_base_url"] and settings["crm_api_key"]:
            self.root.after(600, self._start_silent)

    def _build_ui(self) -> None:
        pad = {"padx": 14, "pady": 4}
        main = ttk.Frame(self.root, padding=12)
        main.pack(fill=tk.BOTH, expand=True)

        intro = (
            "Программа сама забирает фото со сканера книг, читает QR с наряда "
            "или этикетки и кладёт снимок во вложения нужного заказа в CRM.\n"
            "Вам нужно один раз указать три настройки ниже — и нажать «Начать работу»."
        )
        ttk.Label(main, text=intro, wraplength=680, justify=tk.LEFT).pack(
            anchor=tk.W, **pad
        )

        # --- Папка сканера ---
        box1 = ttk.LabelFrame(main, text="1. Папка сканера", padding=10)
        box1.pack(fill=tk.X, pady=6)
        ttk.Label(
            box1,
            text=(
                "Сюда книжный сканер сохраняет готовые фото (обычно это папка "
                "в настройках сканера / «папка вывода»). Программа будет ждать "
                "новые файлы именно здесь."
            ),
            wraplength=640,
            justify=tk.LEFT,
        ).pack(anchor=tk.W)
        row1 = ttk.Frame(box1)
        row1.pack(fill=tk.X, pady=(8, 0))
        ttk.Entry(row1, textvariable=self.var_watch).pack(
            side=tk.LEFT, fill=tk.X, expand=True
        )
        ttk.Button(row1, text="Выбрать…", command=self._browse_folder).pack(
            side=tk.LEFT, padx=(8, 0)
        )

        # --- URL CRM ---
        box2 = ttk.LabelFrame(main, text="2. Адрес CRM", padding=10)
        box2.pack(fill=tk.X, pady=6)
        ttk.Label(
            box2,
            text=(
                "Ссылка на вашу CRM в браузере, без лишнего в конце. "
                "Пример: https://clicklab.example или https://ваша-лаборатория.click-lab.online\n"
                "Скопируйте из адресной строки, когда открыта CRM (только сайт, без /orders)."
            ),
            wraplength=640,
            justify=tk.LEFT,
        ).pack(anchor=tk.W)
        ttk.Entry(box2, textvariable=self.var_url).pack(fill=tk.X, pady=(8, 0))

        # --- API key ---
        box3 = ttk.LabelFrame(main, text="3. Ключ доступа (API)", padding=10)
        box3.pack(fill=tk.X, pady=6)
        ttk.Label(
            box3,
            text=(
                "Это «пароль программы», не ваш личный логин.\n"
                "Владелец в CRM: Конфигурация → API → «Сгенерировать ключ» "
                "(например «Сканер основной») → скопировать ключ один раз сюда.\n"
                "Ключ нужен, чтобы компьютер со сканером мог безопасно "
                "отправлять фото в заказы. Без ключа загрузка не работает."
            ),
            wraplength=640,
            justify=tk.LEFT,
        ).pack(anchor=tk.W)
        ttk.Entry(box3, textvariable=self.var_key, show="•").pack(
            fill=tk.X, pady=(8, 0)
        )
        self.entry_key: ttk.Entry | None = None
        for child in box3.winfo_children():
            if isinstance(child, ttk.Entry):
                self.entry_key = child
        self.show_key = tk.BooleanVar(value=False)
        ttk.Checkbutton(
            box3,
            text="Показать ключ",
            variable=self.show_key,
            command=self._toggle_key,
        ).pack(anchor=tk.W, pady=(4, 0))

        # --- Автозапуск ---
        box4 = ttk.LabelFrame(main, text="4. Автозапуск", padding=10)
        box4.pack(fill=tk.X, pady=6)
        ttk.Label(
            box4,
            text=(
                "Если включено — программа сама откроется при включении компьютера "
                "(входе в Windows) и сразу начнёт ждать сканы. Удобно: не нужно "
                "каждый день запускать вручную. Работает только для текущего "
                "пользователя Windows."
            ),
            wraplength=640,
            justify=tk.LEFT,
        ).pack(anchor=tk.W)
        ttk.Checkbutton(
            box4,
            text="Запускать вместе с Windows",
            variable=self.var_autostart,
            command=self._on_autostart_toggle,
        ).pack(anchor=tk.W, pady=(8, 0))

        # Buttons
        actions = ttk.Frame(main)
        actions.pack(fill=tk.X, pady=8)
        self.btn_save = ttk.Button(
            actions, text="Сохранить настройки", command=self._save
        )
        self.btn_save.pack(side=tk.LEFT)
        self.btn_start = ttk.Button(
            actions, text="Начать работу", command=self._start
        )
        self.btn_start.pack(side=tk.LEFT, padx=(8, 0))
        self.btn_stop = ttk.Button(
            actions, text="Остановить", command=self._stop, state=tk.DISABLED
        )
        self.btn_stop.pack(side=tk.LEFT, padx=(8, 0))

        ttk.Label(
            main,
            textvariable=self.var_status,
            foreground="#1a5f2a",
            wraplength=680,
        ).pack(anchor=tk.W, pady=(0, 4))

        ttk.Label(
            main,
            text=(
                "Журнал: что происходит со сканами. Успешные уходят в подпапку done, "
                "без QR — в no-qr, ошибки сети — в error (рядом с папкой сканера)."
            ),
            wraplength=680,
        ).pack(anchor=tk.W)

        self.log_box = scrolledtext.ScrolledText(
            main, height=10, state=tk.DISABLED, wrap=tk.WORD, font=("Segoe UI", 9)
        )
        self.log_box.pack(fill=tk.BOTH, expand=True, pady=(4, 0))

        tip = (
            "Подсказка: окно можно свернуть — слежение продолжается, пока программа "
            "не остановлена и не закрыта. С галочкой автозапуска достаточно один раз "
            "настроить и оставить как есть."
        )
        ttk.Label(main, text=tip, wraplength=680, foreground="#555").pack(
            anchor=tk.W, pady=(8, 0)
        )

    def _toggle_key(self) -> None:
        if self.entry_key is None:
            return
        self.entry_key.configure(show="" if self.show_key.get() else "•")

    def _browse_folder(self) -> None:
        path = filedialog.askdirectory(title="Папка, куда сканер сохраняет фото")
        if path:
            self.var_watch.set(path)

    def _ui_log(self, msg: str) -> None:
        self.log_q.put(msg)

    def _drain_log(self) -> None:
        while True:
            try:
                msg = self.log_q.get_nowait()
            except queue.Empty:
                break
            self.log_box.configure(state=tk.NORMAL)
            self.log_box.insert(tk.END, msg + "\n")
            self.log_box.see(tk.END)
            self.log_box.configure(state=tk.DISABLED)
        self.root.after(200, self._drain_log)

    def _collect(self) -> dict | None:
        watch = self.var_watch.get().strip()
        url = self.var_url.get().strip().rstrip("/")
        key = self.var_key.get().strip()
        if not watch:
            messagebox.showwarning(
                APP_TITLE,
                "Укажите папку сканера.\n\n"
                "Это папка, куда устройство сохраняет фото после сканирования.",
            )
            return None
        if not Path(watch).is_dir():
            messagebox.showwarning(
                APP_TITLE,
                f"Папка не найдена:\n{watch}\n\nВыберите существующую папку кнопкой «Выбрать…».",
            )
            return None
        if not url or "://" not in url:
            messagebox.showwarning(
                APP_TITLE,
                "Укажите адрес CRM целиком, например:\nhttps://ваша-лаборатория.click-lab.online",
            )
            return None
        if not key or len(key) < 16:
            messagebox.showwarning(
                APP_TITLE,
                "Вставьте API-ключ из CRM (Конфигурация → API).\n"
                "Его выдаёт владелец организации один раз при создании ключа.",
            )
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
                messagebox.showerror(
                    APP_TITLE,
                    "Не удалось изменить автозапуск Windows:\n" + err,
                )
            self._ui_log(f"Автозапуск: ошибка — {err}")
            return False
        if enabled:
            self._ui_log("Автозапуск с Windows включён.")
        else:
            self._ui_log("Автозапуск с Windows выключен.")
        return True

    def _on_autostart_toggle(self) -> None:
        enabled = bool(self.var_autostart.get())
        # Сначала сохраняем флаг; реестр — если настройки уже валидны или выключаем
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
        if not self._apply_autostart(bool(data["autostart"])):
            return
        self._ui_log("Настройки сохранены.")
        messagebox.showinfo(
            APP_TITLE,
            "Настройки сохранены.\n"
            + (
                "Автозапуск включён: после перезагрузки Windows программа "
                "откроется сама и начнёт работу.\n\n"
                if data["autostart"]
                else ""
            )
            + "Можно нажать «Начать работу».",
        )

    def _start_silent(self) -> None:
        """Старт без лишних окон (после автозагрузки Windows)."""
        if self.running:
            return
        watch = self.var_watch.get().strip()
        url = self.var_url.get().strip().rstrip("/")
        key = self.var_key.get().strip()
        if not watch or not Path(watch).is_dir() or "://" not in url or len(key) < 16:
            self._ui_log(
                "Автозапуск: настройки неполные — заполните поля и сохраните."
            )
            self.var_status.set(
                "Остановлено — дополните настройки после автозапуска"
            )
            return
        self._start()

    def _start(self) -> None:
        if self.running:
            return
        data = self._collect()
        if not data:
            return
        save_settings(data)
        self._apply_autostart(bool(data["autostart"]), quiet=True)

        watch_dir = Path(data["watch_dir"])
        done_dir = watch_dir / "done"
        error_dir = watch_dir / "error"
        no_qr_dir = watch_dir / "no-qr"
        for d in (done_dir, error_dir, no_qr_dir):
            d.mkdir(parents=True, exist_ok=True)

        def on_log(msg: str) -> None:
            self.log_q.put(msg)

        handler = ScanHandler(
            watch_dir=watch_dir,
            done_dir=done_dir,
            error_dir=error_dir,
            no_qr_dir=no_qr_dir,
            crm_base=data["crm_base_url"],
            api_key=data["crm_api_key"],
            on_log=on_log,
        )

        observer = Observer()
        observer.schedule(handler, str(watch_dir), recursive=False)
        observer.start()
        self.observer = observer
        self.running = True
        self.btn_start.configure(state=tk.DISABLED)
        self.btn_stop.configure(state=tk.NORMAL)
        self.var_status.set(f"Работает — слежу за папкой: {watch_dir}")
        self._ui_log(f"Старт. Папка: {watch_dir}")
        self._ui_log(f"CRM: {data['crm_base_url']}")

        def catch_up() -> None:
            for p in sorted(watch_dir.iterdir()):
                if not self.running:
                    break
                if p.is_file() and p.suffix.lower() in IMAGE_EXTS:
                    handler._maybe_process(p)

        threading.Thread(target=catch_up, daemon=True).start()

    def _stop(self) -> None:
        self.running = False
        if self.observer is not None:
            try:
                self.observer.stop()
                self.observer.join(timeout=5)
            except Exception:
                pass
            self.observer = None
        self.btn_start.configure(state=tk.NORMAL)
        self.btn_stop.configure(state=tk.DISABLED)
        self.var_status.set("Остановлено")
        self._ui_log("Остановлено.")

    def on_close(self) -> None:
        self._stop()
        self.root.destroy()

    def run(self) -> None:
        self.root.mainloop()


def main() -> int:
    # Лог в файл рядом с программой (на случай поддержки)
    log_file = app_dir() / "watcher.log"
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(message)s",
        handlers=[logging.FileHandler(log_file, encoding="utf-8")],
    )
    ScannerApp().run()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
