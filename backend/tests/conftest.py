import os
import sys
from pathlib import Path

import pytest


BACKEND_ROOT = Path(__file__).resolve().parents[1]
APP_PATH = BACKEND_ROOT / "app"

for path in (BACKEND_ROOT, APP_PATH):
    path_str = str(path)
    if path_str not in sys.path:
        sys.path.insert(0, path_str)


@pytest.fixture(autouse=True)
def _restore_environment(monkeypatch):
    """Ensure environment variables set during tests don't leak."""
    for key in ("DATABASE_URL", "JWT_SECRET_KEY"):
        if key in os.environ:
            monkeypatch.delenv(key, raising=False)
    monkeypatch.setenv("JWT_SECRET_KEY", "test-secret-key")
