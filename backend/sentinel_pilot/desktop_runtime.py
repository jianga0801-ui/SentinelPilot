import argparse
import os
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import uvicorn

from sentinel_pilot.config import Settings


@dataclass(frozen=True)
class RuntimePaths:
    user_data_dir: Path
    database_url: str
    service_log_path: Path


def default_user_data_dir() -> Path:
    if sys.platform == "win32":
        base = os.environ.get("APPDATA")
        if base:
            return Path(base) / "SentinelPilot"
        return Path.home() / "AppData" / "Roaming" / "SentinelPilot"

    base = os.environ.get("XDG_DATA_HOME")
    if base:
        return Path(base) / "SentinelPilot"
    return Path.home() / ".local" / "share" / "SentinelPilot"


def resolve_runtime_paths(settings: Settings) -> RuntimePaths:
    user_data_dir = (
        Path(settings.user_data_dir).expanduser()
        if settings.user_data_dir
        else default_user_data_dir()
    )
    user_data_dir.mkdir(parents=True, exist_ok=True)

    database_url = settings.database_url
    if not database_url:
        database_url = f"sqlite:///{user_data_dir / 'sentinel_pilot.db'}"

    service_log_path = (
        Path(settings.service_log_path).expanduser()
        if settings.service_log_path
        else user_data_dir / "logs" / "app.log"
    )
    service_log_path.parent.mkdir(parents=True, exist_ok=True)

    return RuntimePaths(
        user_data_dir=user_data_dir,
        database_url=database_url,
        service_log_path=service_log_path,
    )


def build_uvicorn_options(argv: list[str] | None = None) -> dict[str, Any]:
    parser = argparse.ArgumentParser(prog="sentinel-pilot-backend")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, required=True)
    parser.add_argument("--log-level", default="info")
    args = parser.parse_args(argv)

    return {
        "app": "sentinel_pilot.main:app",
        "host": args.host,
        "port": args.port,
        "log_level": args.log_level,
        "reload": False,
    }


def main(argv: list[str] | None = None) -> None:
    uvicorn.run(**build_uvicorn_options(argv))
