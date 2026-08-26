"""Inicializa todo o Primordial DATA local em um unico processo."""

from __future__ import annotations

import argparse
import os
import shutil
import socket
import subprocess
import sys
import threading
import time
import urllib.error
import urllib.request
import webbrowser
from pathlib import Path

import uvicorn


PROJECT_ROOT = Path(__file__).resolve().parent
DEFAULT_ENV_FILE = PROJECT_ROOT / ".env"
FRONTEND_DIR = PROJECT_ROOT / "primordial-frontend-main"
HOST = "127.0.0.1"


def _arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Inicia o FastAPI e abre a interface local automaticamente.",
    )
    parser.add_argument(
        "--env-file",
        type=Path,
        default=DEFAULT_ENV_FILE,
        help="Arquivo de ambiente. Padrao: .env",
    )
    parser.add_argument("--port", type=int, default=8000)
    parser.add_argument("--frontend-port", type=int, default=5173)
    parser.add_argument(
        "--no-browser",
        action="store_true",
        help="Nao abre o navegador automaticamente.",
    )
    parser.add_argument(
        "--no-reload",
        action="store_true",
        help="Desativa o recarregamento durante alteracoes no codigo Python.",
    )
    parser.add_argument(
        "--no-frontend",
        action="store_true",
        help="Inicia somente o FastAPI, sem o Vite.",
    )
    return parser.parse_args()


def _read_environment(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    for raw_line in path.read_text(encoding="utf-8-sig").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        name, value = line.split("=", 1)
        values[name.strip()] = value.strip().strip('"').strip("'")
    return values


def _validate_environment(path: Path) -> None:
    if not path.is_file():
        raise RuntimeError(
            f"Arquivo de ambiente nao encontrado: {path}. "
            "Copie .env.example para .env antes de iniciar."
        )
    values = _read_environment(path)
    if len(values.get("GROQ_API_KEY", "")) < 20:
        raise RuntimeError("GROQ_API_KEY esta vazia ou incompleta no arquivo .env.")
    if len(values.get("INTERNAL_API_KEY", "")) < 32:
        raise RuntimeError(
            "INTERNAL_API_KEY deve possuir pelo menos 32 caracteres no arquivo .env."
        )
    database_enabled = values.get(
        "DATABASE_ENABLED", bool(values.get("DATABASE_URL", ""))
    )
    if str(database_enabled).strip().casefold() in {"1", "true", "sim", "yes"}:
        database_url = values.get("DATABASE_URL", "")
        if not database_url.startswith(("postgresql://", "postgres://")):
            raise RuntimeError(
                "DATABASE_URL deve ser preenchida com um endereco PostgreSQL valido."
            )


def _validate_port(port: int) -> None:
    if not 1 <= port <= 65535:
        raise RuntimeError("A porta deve estar entre 1 e 65535.")
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as probe:
            probe.bind((HOST, port))
    except OSError as exc:
        raise RuntimeError(
            f"A porta {port} ja esta em uso. Encerre o servidor anterior e tente novamente."
        ) from exc


def _start_frontend(port: int) -> subprocess.Popen[bytes]:
    npm = shutil.which("npm.cmd") or shutil.which("npm")
    if not npm or not (FRONTEND_DIR / "package.json").is_file():
        raise RuntimeError(
            "Frontend ou npm nao encontrado. Instale as dependencias antes de iniciar."
        )
    flags = subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0
    process = subprocess.Popen(
        [npm, "run", "dev", "--", "--host", HOST, "--port", str(port)],
        cwd=FRONTEND_DIR,
        stdin=subprocess.DEVNULL,
        stdout=None,
        stderr=None,
        creationflags=flags,
    )
    deadline = time.monotonic() + 60
    while time.monotonic() < deadline:
        if process.poll() is not None:
            raise RuntimeError(
                "O frontend encerrou durante a inicializacao. Execute npm.cmd run dev "
                "na pasta primordial-frontend-main para consultar o erro."
            )
        try:
            with socket.create_connection((HOST, port), timeout=0.25):
                return process
        except OSError:
            time.sleep(0.2)
    process.terminate()
    raise RuntimeError("O frontend nao ficou pronto dentro de 60 segundos.")


def _stop_frontend(process: subprocess.Popen[bytes] | None) -> None:
    if process is None or process.poll() is not None:
        return
    if os.name == "nt":
        subprocess.run(
            ["taskkill", "/PID", str(process.pid), "/T", "/F"],
            check=False,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        return
    process.terminate()
    try:
        process.wait(timeout=5)
    except subprocess.TimeoutExpired:
        process.kill()
        process.wait(timeout=2)


def _open_browser_when_ready(url: str) -> None:
    deadline = time.monotonic() + 30
    while time.monotonic() < deadline:
        try:
            with urllib.request.urlopen(url, timeout=1) as response:
                if response.status == 200:
                    webbrowser.open_new_tab(url)
                    return
        except (OSError, urllib.error.URLError):
            time.sleep(0.25)


def main() -> int:
    args = _arguments()
    env_file = args.env_file.expanduser().resolve()
    try:
        _validate_environment(env_file)
        _validate_port(args.port)
        if not args.no_frontend:
            _validate_port(args.frontend_port)
    except RuntimeError as exc:
        print(f"\nNao foi possivel iniciar: {exc}\n", file=sys.stderr)
        return 1

    backend_url = f"http://{HOST}:{args.port}/"
    url = backend_url if args.no_frontend else f"http://{HOST}:{args.frontend_port}/"
    print(f"\nPrimordial DATA sera aberto em {url}")
    print(f"FastAPI: {backend_url}")
    print("Use Ctrl+C para encerrar.\n")

    if not args.no_browser:
        threading.Thread(
            target=_open_browser_when_ready,
            args=(url,),
            daemon=True,
        ).start()

    run_options: dict[str, object] = {
        "host": HOST,
        "port": args.port,
        "env_file": str(env_file),
        "reload": not args.no_reload,
        "server_header": False,
    }
    if not args.no_reload:
        run_options["reload_dirs"] = [str(PROJECT_ROOT / "app")]
    frontend_process: subprocess.Popen[bytes] | None = None
    try:
        if not args.no_frontend:
            frontend_process = _start_frontend(args.frontend_port)
        uvicorn.run("app.main:app", **run_options)
    except RuntimeError as exc:
        print(f"\nNao foi possivel iniciar: {exc}\n", file=sys.stderr)
        return 1
    finally:
        _stop_frontend(frontend_process)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
