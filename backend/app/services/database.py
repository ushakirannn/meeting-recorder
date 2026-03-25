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
            tags TEXT DEFAULT '[]',
            speaker_map TEXT DEFAULT '{}',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    # Add columns if table already exists without them
    for col, default in [("audio_filename", None), ("tags", "'[]'"), ("speaker_map", "'{}'")]:
        try:
            if default:
                conn.execute(f"ALTER TABLE meetings ADD COLUMN {col} TEXT DEFAULT {default}")
            else:
                conn.execute(f"ALTER TABLE meetings ADD COLUMN {col} TEXT")
        except sqlite3.OperationalError:
            pass
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
    for col, default in [("audio_filename", None), ("tags", "[]"), ("speaker_map", "{}")]:
        try:
            val = row[col]
            d[col] = json.loads(val) if col in ("tags", "speaker_map") and val else val if col == "audio_filename" else json.loads(default)
        except (IndexError, KeyError):
            d[col] = json.loads(default) if col in ("tags", "speaker_map") else None
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


def get_all_meetings(search: str = None, date_from: str = None, date_to: str = None, tag: str = None) -> list[dict]:
    conn = get_db()
    query = "SELECT * FROM meetings WHERE 1=1"
    params = []

    if search:
        query += " AND (title LIKE ? OR summary LIKE ? OR transcript LIKE ?)"
        like = f"%{search}%"
        params.extend([like, like, like])

    if date_from:
        query += " AND created_at >= ?"
        params.append(date_from)

    if date_to:
        query += " AND created_at <= ?"
        params.append(date_to + " 23:59:59")

    if tag:
        query += " AND tags LIKE ?"
        params.append(f'%"{tag}"%')

    query += " ORDER BY created_at DESC"
    rows = conn.execute(query, params).fetchall()
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


def update_tags(meeting_id: int, tags: list[str]) -> bool:
    conn = get_db()
    cursor = conn.execute(
        "UPDATE meetings SET tags = ? WHERE id = ?", (json.dumps(tags), meeting_id)
    )
    conn.commit()
    updated = cursor.rowcount > 0
    conn.close()
    return updated


def update_speaker_map(meeting_id: int, speaker_map: dict) -> bool:
    conn = get_db()
    cursor = conn.execute(
        "UPDATE meetings SET speaker_map = ? WHERE id = ?", (json.dumps(speaker_map), meeting_id)
    )
    conn.commit()
    updated = cursor.rowcount > 0
    conn.close()
    return updated


def delete_meeting(meeting_id: int) -> bool:
    conn = get_db()
    row = conn.execute("SELECT audio_filename FROM meetings WHERE id = ?", (meeting_id,)).fetchone()
    cursor = conn.execute("DELETE FROM meetings WHERE id = ?", (meeting_id,))
    conn.commit()
    deleted = cursor.rowcount > 0
    conn.close()

    if deleted and row and row["audio_filename"]:
        audio_path = os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
            "recordings", row["audio_filename"]
        )
        if os.path.exists(audio_path):
            os.remove(audio_path)

    return deleted
