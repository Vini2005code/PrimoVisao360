"""Pseudonimizacao reversivel mantida somente durante um turno de voz."""

from __future__ import annotations

import re
from collections.abc import Iterable
from typing import Any


_PATTERNS: tuple[tuple[str, re.Pattern[str]], ...] = (
    ("EMAIL", re.compile(r"\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b", re.I)),
    ("CPF", re.compile(r"(?<!\d)\d{3}\.?\d{3}\.?\d{3}-?\d{2}(?!\d)")),
    ("CNS", re.compile(r"(?<!\d)\d{15}(?!\d)")),
    (
        "TELEFONE",
        re.compile(r"(?<!\d)(?:\+?55\s*)?\(?\d{2}\)?[\s.-]*9?\d{4}[\s.-]*\d{4}(?!\d)"),
    ),
    (
        "PESSOA",
        re.compile(
            r"(?<!\[)\b[A-ZÁÀÂÃÉÊÍÓÔÕÚÜÇ][a-záàâãéêíóôõúüç]{1,}"
            r"(?:\s+(?:(?:da|das|de|do|dos|e)\s+)?"
            r"[A-ZÁÀÂÃÉÊÍÓÔÕÚÜÇ][a-záàâãéêíóôõúüç]{1,}){1,3}\b"
        ),
    ),
)


class PseudonymizationSession:
    """Cofre efemero: nunca serializado, registrado ou armazenado."""

    def __init__(self, known_values: Iterable[tuple[str, str]] = ()) -> None:
        self._token_to_original: dict[str, str] = {}
        self._original_to_token: dict[str, str] = {}
        for category, value in known_values:
            self._register(category, value)

    def _register(self, category: str, value: str) -> str:
        original = value.strip()
        key = original.casefold()
        if not original:
            return ""
        existing = self._original_to_token.get(key)
        if existing:
            return existing
        safe_category = re.sub(r"[^A-Z0-9_]", "", category.upper()) or "DADO"
        token = f"[{safe_category}_{len(self._token_to_original) + 1:04d}]"
        self._original_to_token[key] = token
        self._token_to_original[token] = original
        return token

    def pseudonymize_text(self, value: str) -> str:
        result = value
        # Identificadores conhecidos recebem tokens semanticamente especificos.
        for original_key, token in sorted(
            self._original_to_token.items(), key=lambda item: len(item[0]), reverse=True
        ):
            original = self._token_to_original[token]
            result = re.sub(re.escape(original), token, result, flags=re.IGNORECASE)
        for category, pattern in _PATTERNS:
            result = pattern.sub(
                lambda match: self._register(category, match.group(0)),
                result,
            )
        return result

    def pseudonymize_value(self, value: Any) -> Any:
        if isinstance(value, str):
            return self.pseudonymize_text(value)
        if isinstance(value, dict):
            return {key: self.pseudonymize_value(item) for key, item in value.items()}
        if isinstance(value, list):
            return [self.pseudonymize_value(item) for item in value]
        return value

    def reidentify_text(self, value: str) -> str:
        result = value
        for token, original in self._token_to_original.items():
            result = result.replace(token, original)
        return result

    def clear(self) -> None:
        self._token_to_original.clear()
        self._original_to_token.clear()


def zeroize(buffer: bytearray) -> None:
    """Sobrescreve o buffer mutavel antes de liberar sua capacidade."""
    if buffer:
        buffer[:] = b"\x00" * len(buffer)
    buffer.clear()
