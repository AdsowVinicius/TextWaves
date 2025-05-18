import sqlite3

def create_db():
    conn = sqlite3.connect('videos.db')
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS videos
                 (video_hash TEXT PRIMARY KEY, video_path TEXT, str_file_path TEXT)''')
    conn.commit()
    conn.close()

def save_video_data(video_hash, video_path, str_file_path):
    conn = sqlite3.connect('videos.db')
    c = conn.cursor()
    c.execute("INSERT OR REPLACE INTO videos (video_hash, video_path, str_file_path) VALUES (?, ?, ?)",
              (video_hash, video_path, str_file_path))
    conn.commit()
    conn.close()
