import importlib
import sys
from pathlib import Path

import pytest


APP_PATH = Path(__file__).resolve().parents[1] / "app"
if str(APP_PATH) not in sys.path:
    sys.path.insert(0, str(APP_PATH))

db_manager = importlib.import_module("database.db_manager")


@pytest.fixture()
def isolated_db(tmp_path, monkeypatch):
    db_file = tmp_path / "test_textwaves.db"
    monkeypatch.setattr(db_manager, "DB_PATH", str(db_file))
    db_manager._ensure_instance_dir()
    db_manager.create_db()
    try:
        yield db_file
    finally:
        if db_file.exists():
            db_file.unlink()


def _fetch_user(user_id):
    with db_manager.get_conn() as conn:
        row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
        return dict(row) if row else None


def test_create_and_authenticate_user(isolated_db):
    user_id = db_manager.create_user("alice", "password123")
    user_row = _fetch_user(user_id)

    assert user_row["username"] == "alice"
    assert user_row["password_hash"] != "password123"  # hashed

    authenticated = db_manager.authenticate_user("alice", "password123")
    assert authenticated is not None

    assert db_manager.authenticate_user("alice", "wrong") is None


def test_save_video_and_listings(isolated_db):
    owner_id = db_manager.create_user("owner", "secret")
    other_id = db_manager.create_user("viewer", "secret")

    video_id = db_manager.save_video_data(owner_id, "hash123", "video.mp4", "subs.str")
    video = db_manager.get_video_by_hash("hash123")

    assert video["id"] == video_id
    assert video["video_path"] == "video.mp4"
    assert video["str_file_path"] == "subs.str"

    # update same hash should keep ID and overwrite paths
    updated_video_id = db_manager.save_video_data(owner_id, "hash123", "video2.mp4", None)
    assert updated_video_id == video_id

    all_owned = db_manager.list_owned_videos(owner_id)
    assert len(all_owned) == 1
    assert all_owned[0]["video_path"] == "video2.mp4"

    user_videos = db_manager.list_user_videos(owner_id)
    assert len(user_videos) == 1

    # grant access to another user
    db_manager.grant_video_access(other_id, video_id, role="editor")
    shared_videos = db_manager.list_user_videos(other_id)
    assert len(shared_videos) == 1
    assert shared_videos[0]["id"] == video_id

    db_manager.revoke_video_access(other_id, video_id)
    assert db_manager.list_user_videos(other_id) == []


def test_delete_user_and_video(isolated_db):
    user_id = db_manager.create_user("deleteme", "pass")
    video_id = db_manager.save_video_data(user_id, "hash", "v.mp4")

    db_manager.delete_video(video_id)
    assert db_manager.get_video_by_hash("hash") is None

    db_manager.delete_user(user_id)
    assert _fetch_user(user_id) is None