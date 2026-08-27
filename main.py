"""Entrypoint de compatibilidade para execução do FastAPI pela raiz."""

from app.main import app, create_app

__all__ = ["app", "create_app"]
