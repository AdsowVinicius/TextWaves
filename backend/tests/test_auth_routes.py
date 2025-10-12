import importlib
import importlib.util
from pathlib import Path

import pytest


APP_DIR = Path(__file__).resolve().parents[1] / "app"


def _load_module(module_name: str, file_name: str):
    spec = importlib.util.spec_from_file_location(module_name, APP_DIR / file_name)
    module = importlib.util.module_from_spec(spec)
    assert spec and spec.loader, f"Unable to load module {module_name}"
    spec.loader.exec_module(module)
    return module


app_module = _load_module("app_app_module", "app.py")
user_model_module = importlib.import_module("models.user_model")

db = importlib.import_module("database.db_config").db
User = user_model_module.User
TokenBlacklist = user_model_module.TokenBlacklist
app = app_module.app


@pytest.fixture()
def client(tmp_path):
    test_db = tmp_path / "auth_test.db"

    app.config.update(
        TESTING=True,
        SQLALCHEMY_DATABASE_URI=f"sqlite:///{test_db}",
        JWT_SECRET_KEY="test-secret",
    )

    with app.app_context():
        db.session.remove()
        db.drop_all()
        db.create_all()

    with app.test_client() as client:
        yield client

    with app.app_context():
        db.session.remove()
        db.drop_all()


def test_register_first_user_becomes_admin(client):
    resp = client.post(
        "/api/auth/register",
        json={"username": "admin", "email": "admin@example.com", "password": "Secret123"},
    )
    assert resp.status_code == 201
    data = resp.get_json()
    assert data["user"]["role"] == "admin"
    assert data["is_first_user"] is True

    # second user should default to role 'user'
    resp2 = client.post(
        "/api/auth/register",
        json={"username": "user", "email": "user@example.com", "password": "Secret123"},
    )
    assert resp2.status_code == 201
    assert resp2.get_json()["user"]["role"] == "user"


def test_login_with_username_and_email_case_insensitive(client):
    client.post(
        "/api/auth/register",
        json={"username": "Tester", "email": "tester@example.com", "password": "Secret123"},
    )

    login_username = client.post(
        "/api/auth/login",
        json={"login": "tester", "password": "Secret123"},
    )
    assert login_username.status_code == 200

    login_email = client.post(
        "/api/auth/login",
        json={"login": "TESTER@EXAMPLE.COM", "password": "Secret123"},
    )
    assert login_email.status_code == 200

    wrong_password = client.post(
        "/api/auth/login",
        json={"login": "tester", "password": "wrong"},
    )
    assert wrong_password.status_code == 401


def test_refresh_and_logout_flow(client):
    client.post(
        "/api/auth/register",
        json={"username": "TokenUser", "email": "token@example.com", "password": "Secret123"},
    )
    login_resp = client.post(
        "/api/auth/login",
        json={"login": "tokenuser", "password": "Secret123"},
    )
    tokens = login_resp.get_json()

    refresh_resp = client.post(
        "/api/auth/refresh",
        headers={"Authorization": f"Bearer {tokens['refresh_token']}"},
    )
    assert refresh_resp.status_code == 200
    assert "access_token" in refresh_resp.get_json()

    logout_resp = client.post(
        "/api/auth/logout",
        headers={"Authorization": f"Bearer {tokens['access_token']}"},
    )
    assert logout_resp.status_code == 200

    with app.app_context():
        blacklisted = TokenBlacklist.query.all()
    assert len(blacklisted) == 1
    assert blacklisted[0].token_type == "access"