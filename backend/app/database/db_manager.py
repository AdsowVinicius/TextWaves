import sqlite3
import hashlib
from contextlib import contextmanager
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = str((BASE_DIR / "instance" / "textwaves.db").resolve())


def _ensure_instance_dir():
    db_file = Path(DB_PATH)
    db_file.parent.mkdir(parents=True, exist_ok=True)

_ensure_instance_dir()


@contextmanager
def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def create_db():
    with get_conn() as conn:
        c = conn.cursor()
        c.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        c.execute(
            """
            CREATE TABLE IF NOT EXISTS videos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                video_hash TEXT UNIQUE NOT NULL,
                owner_id INTEGER NOT NULL,
                video_path TEXT NOT NULL,
                str_file_path TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
            )
            """
        )
        c.execute(
            """
            CREATE TABLE IF NOT EXISTS video_access (
                user_id INTEGER NOT NULL,
                video_id INTEGER NOT NULL,
                role TEXT DEFAULT 'owner',
                PRIMARY KEY (user_id, video_id),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE
            )
            """
        )


def _hash_password(password: str) -> str:
    return hashlib.sha256(password.encode("utf-8")).hexdigest()


def create_user(username: str, password: str) -> int:
    with get_conn() as conn:
        c = conn.cursor()
        c.execute(
            "INSERT INTO users (username, password_hash) VALUES (?, ?)",
            (username, _hash_password(password)),
        )
        return c.lastrowid


def get_user_by_username(username: str):
    with get_conn() as conn:
        c = conn.cursor()
        c.execute("SELECT * FROM users WHERE username = ?", (username,))
        row = c.fetchone()
        return dict(row) if row else None


def authenticate_user(username: str, password: str):
    with get_conn() as conn:
        c = conn.cursor()
        c.execute(
            "SELECT * FROM users WHERE username = ? AND password_hash = ?",
            (username, _hash_password(password)),
        )
        return c.fetchone()


def save_video_data(
    owner_id: int,
    video_hash: str,
    video_path: str,
    str_file_path: str | None = None,
) -> int:
    with get_conn() as conn:
        c = conn.cursor()
        c.execute(
            """
            INSERT INTO videos (video_hash, owner_id, video_path, str_file_path)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(video_hash) DO UPDATE SET
                owner_id = excluded.owner_id,
                video_path = excluded.video_path,
                str_file_path = excluded.str_file_path
            """,
            (video_hash, owner_id, video_path, str_file_path),
        )
        video_id = c.execute(
            "SELECT id FROM videos WHERE video_hash = ?", (video_hash,)
        ).fetchone()["id"]
        c.execute(
            """
            INSERT OR IGNORE INTO video_access (user_id, video_id, role)
            VALUES (?, ?, 'owner')
            """,
            (owner_id, video_id),
        )
        return video_id


def list_user_videos(user_id: int):
    with get_conn() as conn:
        c = conn.cursor()
        c.execute(
            """
            SELECT v.*
            FROM videos v
            JOIN video_access va ON va.video_id = v.id
            WHERE va.user_id = ?
            """,
            (user_id,),
        )
        return [dict(row) for row in c.fetchall()]


def list_owned_videos(owner_id: int):
    with get_conn() as conn:
        c = conn.cursor()
        c.execute(
            "SELECT * FROM videos WHERE owner_id = ?",
            (owner_id,),
        )
        return [dict(row) for row in c.fetchall()]


def get_video_by_hash(video_hash: str):
    with get_conn() as conn:
        c = conn.cursor()
        c.execute("SELECT * FROM videos WHERE video_hash = ?", (video_hash,))
        row = c.fetchone()
        return dict(row) if row else None


def grant_video_access(user_id: int, video_id: int, role: str = "viewer"):
    with get_conn() as conn:
        c = conn.cursor()
        c.execute(
            """
            INSERT OR REPLACE INTO video_access (user_id, video_id, role)
            VALUES (?, ?, ?)
            """,
            (user_id, video_id, role),
        )


def revoke_video_access(user_id: int, video_id: int):
    with get_conn() as conn:
        c = conn.cursor()
        c.execute(
            "DELETE FROM video_access WHERE user_id = ? AND video_id = ?",
            (user_id, video_id),
        )


def delete_video(video_id: int):
    with get_conn() as conn:
        c = conn.cursor()
        c.execute("DELETE FROM videos WHERE id = ?", (video_id,))


def delete_user(user_id: int):
    with get_conn() as conn:
        c = conn.cursor()
        c.execute("DELETE FROM users WHERE id = ?", (user_id,))
