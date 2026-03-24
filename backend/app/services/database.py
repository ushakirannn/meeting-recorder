import sqlite3
import json
import os

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "meetings.db")


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS meetings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            summary TEXT NOT NULL,
            key_points TEXT NOT NULL,
            action_items TEXT NOT NULL,
            transcript TEXT NOT NULL,
            duration_seconds INTEGER NOT NULL DEFAULT 0,
            audio_filename TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    # Add audio_filename column if table already exists without it
    try:
        conn.execute("ALTER TABLE meetings ADD COLUMN audio_filename TEXT")
    except sqlite3.OperationalError:
        pass  # column already exists
    conn.commit()
    conn.close()


def _row_to_dict(row) -> dict:
    d = {
        "id": row["id"],
        "title": row["title"],
        "summary": row["summary"],
        "key_points": json.loads(row["key_points"]),
        "action_items": json.loads(row["action_items"]),
        "transcript": row["transcript"],
        "duration_seconds": row["duration_seconds"],
        "created_at": row["created_at"],
    }
    try:
        d["audio_filename"] = row["audio_filename"]
    except (IndexError, KeyError):
        d["audio_filename"] = None
    return d


def save_meeting(title: str, summary: str, key_points: list[str],
                 action_items: list[str], transcript: str,
                 duration_seconds: int, audio_filename: str = None) -> int:
    conn = get_db()
    cursor = conn.execute(
        """INSERT INTO meetings (title, summary, key_points, action_items, transcript, duration_seconds, audio_filename)
           VALUES (?, ?, ?, ?, ?, ?, ?)""",
        (title, summary, json.dumps(key_points), json.dumps(action_items),
         transcript, duration_seconds, audio_filename)
    )
    meeting_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return meeting_id


def get_all_meetings() -> list[dict]:
    conn = get_db()
    rows = conn.execute(
        "SELECT * FROM meetings ORDER BY created_at DESC"
    ).fetchall()
    conn.close()
    return [_row_to_dict(row) for row in rows]


def get_meeting(meeting_id: int) -> dict | None:
    conn = get_db()
    row = conn.execute(
        "SELECT * FROM meetings WHERE id = ?", (meeting_id,)
    ).fetchone()
    conn.close()
    if not row:
        return None
    return _row_to_dict(row)


def rename_meeting(meeting_id: int, title: str) -> bool:
    conn = get_db()
    cursor = conn.execute(
        "UPDATE meetings SET title = ? WHERE id = ?", (title, meeting_id)
    )
    conn.commit()
    updated = cursor.rowcount > 0
    conn.close()
    return updated


def delete_meeting(meeting_id: int) -> bool:
    conn = get_db()
    # Get audio filename before deleting
    row = conn.execute("SELECT audio_filename FROM meetings WHERE id = ?", (meeting_id,)).fetchone()
    cursor = conn.execute("DELETE FROM meetings WHERE id = ?", (meeting_id,))
    conn.commit()
    deleted = cursor.rowcount > 0
    conn.close()

    # Delete audio file if exists
    if deleted and row and row["audio_filename"]:
        audio_path = os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
            "recordings", row["audio_filename"]
        )
        if os.path.exists(audio_path):
            os.remove(audio_path)

    return deleted
