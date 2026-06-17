from __future__ import annotations

import base64
import json
import mimetypes
import os
import re
import shutil
import subprocess
import sys
import threading
import time
import webbrowser
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, unquote, urlparse


APP_ROOT = Path(__file__).resolve().parent
WEB_ROOT = APP_ROOT / "web"
SITE_ROOT = APP_ROOT.parent / "natural-field-institute"
HOST = "127.0.0.1"
PORT = 8788


def desktop_directory() -> Path:
    home = Path.home()
    onedrive = Path(os.environ.get("OneDrive", home / "OneDrive"))
    candidates = [
        onedrive / "Escritorio",
        onedrive / "Desktop",
        home / "Desktop",
        home / "Escritorio",
    ]
    return next((path for path in candidates if path.exists()), candidates[0])


DATA_ROOT = desktop_directory() / "IAE Research Log"
LOG_ROOT = DATA_ROOT / "research-log"
ASSET_ROOT = DATA_ROOT / "assets"
MANIFEST_PATH = LOG_ROOT / "manifest.json"


def json_write(path: Path, data: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    temporary.replace(path)


def slugify(value: str) -> str:
    value = value.lower().strip()
    value = re.sub(r"[^a-z0-9]+", "-", value)
    return value.strip("-") or "experiment"


def safe_name(value: str) -> str:
    name = Path(value).name
    stem = slugify(Path(name).stem)
    suffix = Path(name).suffix.lower()
    if not re.fullmatch(r"\.[a-z0-9]{1,6}", suffix):
        suffix = ".bin"
    return stem + suffix


def entry_filename(entry: dict) -> str:
    return f"{int(entry['number']):03d}-{slugify(str(entry['title']))}.json"


def read_entry(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def entry_files() -> list[Path]:
    return sorted(
        (path for path in LOG_ROOT.glob("*.json") if path.name not in {"manifest.json", "_template.json"}),
        key=lambda path: path.name,
    )


def regenerate_manifest() -> list[str]:
    records: list[tuple[int, str]] = []
    for path in entry_files():
        try:
            records.append((int(read_entry(path).get("number", 0)), path.name))
        except (OSError, ValueError, json.JSONDecodeError):
            continue
    entries = [name for _, name in sorted(records, key=lambda item: (item[0], item[1]))]
    json_write(MANIFEST_PATH, {"entries": entries})
    return entries


def seed_data() -> None:
    LOG_ROOT.mkdir(parents=True, exist_ok=True)
    ASSET_ROOT.mkdir(parents=True, exist_ok=True)
    if entry_files():
        regenerate_manifest()
        return

    source_log = SITE_ROOT / "research-log"
    if not source_log.exists():
        regenerate_manifest()
        return

    for source in source_log.glob("*.json"):
        shutil.copy2(source, LOG_ROOT / source.name)
    for extra in ("README.md",):
        if (source_log / extra).exists():
            shutil.copy2(source_log / extra, LOG_ROOT / extra)

    for path in entry_files():
        try:
            entry = read_entry(path)
        except (OSError, json.JSONDecodeError):
            continue
        for image in entry.get("images", []):
            relative = str(image.get("src", ""))
            if relative.startswith("assets/"):
                source = SITE_ROOT / relative
                if source.exists():
                    shutil.copy2(source, ASSET_ROOT / source.name)
    regenerate_manifest()


def validate_entry(entry: dict) -> dict:
    required = ["number", "date", "status", "visibility", "title", "summary"]
    missing = [field for field in required if str(entry.get(field, "")).strip() == ""]
    if missing:
        raise ValueError("Required fields: " + ", ".join(missing))

    number = int(entry["number"])
    if number < 1:
        raise ValueError("Experiment number must be greater than zero")

    normalized = {
        "number": number,
        "date": str(entry["date"]).strip(),
        "status": str(entry["status"]).strip(),
        "visibility": str(entry["visibility"]).strip(),
        "title": str(entry["title"]).strip(),
        "summary": str(entry["summary"]).strip(),
        "tags": [str(tag).strip() for tag in entry.get("tags", []) if str(tag).strip()],
        "images": [],
        "objective": str(entry.get("objective", "")).strip(),
        "apparatus": str(entry.get("apparatus", "")).strip(),
        "observations": str(entry.get("observations", "")).strip(),
        "next": str(entry.get("next", "")).strip(),
        "measurements": [],
    }
    for image in entry.get("images", []):
        if str(image.get("src", "")).strip():
            normalized["images"].append({
                "src": str(image.get("src", "")).strip(),
                "alt": str(image.get("alt", "")).strip(),
                "caption": str(image.get("caption", "")).strip(),
            })
    for measurement in entry.get("measurements", []):
        if str(measurement.get("label", "")).strip() or str(measurement.get("value", "")).strip():
            normalized["measurements"].append({
                "label": str(measurement.get("label", "")).strip(),
                "value": str(measurement.get("value", "")).strip(),
            })
    return normalized


def save_upload(upload: dict) -> str:
    raw_name = safe_name(str(upload.get("name", "image.bin")))
    encoded = str(upload.get("data", ""))
    if "," in encoded:
        encoded = encoded.split(",", 1)[1]
    content = base64.b64decode(encoded, validate=True)
    if len(content) > 20 * 1024 * 1024:
        raise ValueError("Images must be smaller than 20 MB")

    destination = ASSET_ROOT / raw_name
    counter = 2
    while destination.exists() and destination.read_bytes() != content:
        destination = ASSET_ROOT / f"{Path(raw_name).stem}-{counter}{Path(raw_name).suffix}"
        counter += 1
    destination.write_bytes(content)
    return f"assets/{destination.name}"


def app_state() -> dict:
    entries = []
    for path in entry_files():
        try:
            entry = read_entry(path)
            entries.append({"file": path.name, **entry})
        except (OSError, json.JSONDecodeError):
            continue
    entries.sort(key=lambda item: (str(item.get("date", "")), int(item.get("number", 0))), reverse=True)
    return {
        "entries": entries,
        "dataRoot": str(DATA_ROOT),
        "logRoot": str(LOG_ROOT),
        "assetRoot": str(ASSET_ROOT),
        "nextNumber": max((int(item.get("number", 0)) for item in entries), default=0) + 1,
    }


class AppHandler(BaseHTTPRequestHandler):
    server_version = "IAEStudio/1.0"

    def log_message(self, format: str, *args: object) -> None:
        return

    def send_json(self, data: object, status: int = 200) -> None:
        payload = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(payload)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(payload)

    def read_json(self) -> dict:
        length = int(self.headers.get("Content-Length", "0"))
        return json.loads(self.rfile.read(length).decode("utf-8")) if length else {}

    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        if parsed.path == "/api/state":
            self.send_json(app_state())
            return
        if parsed.path == "/api/entry":
            filename = Path(parse_qs(parsed.query).get("file", [""])[0]).name
            path = LOG_ROOT / filename
            if not filename or not path.exists():
                self.send_json({"error": "Entry not found"}, 404)
                return
            self.send_json({"file": filename, "entry": read_entry(path)})
            return
        if parsed.path.startswith("/data/assets/"):
            self.send_file(ASSET_ROOT / Path(unquote(parsed.path)).name)
            return
        relative = "index.html" if parsed.path in {"", "/"} else unquote(parsed.path).lstrip("/")
        self.send_file(WEB_ROOT / relative)

    def send_file(self, path: Path) -> None:
        try:
            path = path.resolve()
            if WEB_ROOT.resolve() not in path.parents and ASSET_ROOT.resolve() not in path.parents:
                raise FileNotFoundError
            content = path.read_bytes()
        except OSError:
            self.send_error(404)
            return
        content_type = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(content)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(content)

    def do_POST(self) -> None:
        try:
            payload = self.read_json()
            if self.path == "/api/save":
                self.handle_save(payload)
            elif self.path == "/api/delete":
                self.handle_delete(payload)
            elif self.path == "/api/open-folder":
                os.startfile(DATA_ROOT)  # type: ignore[attr-defined]
                self.send_json({"ok": True})
            else:
                self.send_json({"error": "Unknown endpoint"}, 404)
        except (ValueError, json.JSONDecodeError, base64.binascii.Error) as error:
            self.send_json({"error": str(error)}, 400)
        except Exception as error:
            self.send_json({"error": f"Unexpected error: {error}"}, 500)

    def handle_save(self, payload: dict) -> None:
        entry = payload.get("entry", {})
        uploads = payload.get("uploads", [])
        upload_paths = {str(item.get("id")): save_upload(item) for item in uploads}
        for image in entry.get("images", []):
            upload_id = str(image.pop("uploadId", ""))
            if upload_id in upload_paths:
                image["src"] = upload_paths[upload_id]

        normalized = validate_entry(entry)
        filename = entry_filename(normalized)
        old_filename = Path(str(payload.get("file", ""))).name

        for path in entry_files():
            if path.name == old_filename:
                continue
            try:
                if int(read_entry(path).get("number", 0)) == normalized["number"]:
                    raise ValueError(f"Experiment #{normalized['number']:03d} already exists")
            except json.JSONDecodeError:
                continue

        json_write(LOG_ROOT / filename, normalized)
        if old_filename and old_filename != filename:
            old_path = LOG_ROOT / old_filename
            if old_path.exists():
                old_path.unlink()
        manifest = regenerate_manifest()
        self.send_json({"ok": True, "file": filename, "entry": normalized, "manifest": manifest})

    def handle_delete(self, payload: dict) -> None:
        filename = Path(str(payload.get("file", ""))).name
        path = LOG_ROOT / filename
        if not filename or not path.exists():
            raise ValueError("Entry not found")
        path.unlink()
        manifest = regenerate_manifest()
        self.send_json({"ok": True, "manifest": manifest})


def main() -> None:
    seed_data()
    server = ThreadingHTTPServer((HOST, PORT), AppHandler)
    url = f"http://{HOST}:{PORT}"
    print(f"IAE Research Log Studio: {url}")
    print(f"Research files: {DATA_ROOT}")
    threading.Timer(0.7, lambda: webbrowser.open(url)).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
