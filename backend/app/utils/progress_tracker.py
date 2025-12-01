"""
Real-time progress tracking for video processing using Server-Sent Events (SSE)
"""
import json
from typing import Dict, Callable
from threading import Lock

# Global progress storage with thread-safe access
_progress_state: Dict[str, Dict] = {}
_progress_lock = Lock()

def initialize_progress(session_id: str) -> None:
    """Initialize progress tracking for a session"""
    with _progress_lock:
        _progress_state[session_id] = {
            'stage': 'starting',
            'progress': 0,
            'message': 'Iniciando processamento...',
            'error': None
        }

def update_progress(session_id: str, stage: str, progress: float, message: str) -> None:
    """Update progress for a session (0-100)"""
    with _progress_lock:
        if session_id not in _progress_state:
            initialize_progress(session_id)
        
        _progress_state[session_id] = {
            'stage': stage,
            'progress': max(0, min(100, progress)),
            'message': message,
            'error': None
        }

def set_error(session_id: str, error: str) -> None:
    """Mark session as errored"""
    with _progress_lock:
        if session_id in _progress_state:
            _progress_state[session_id]['error'] = error

def get_progress(session_id: str) -> Dict:
    """Get current progress state for a session"""
    with _progress_lock:
        return _progress_state.get(session_id, {
            'stage': 'unknown',
            'progress': 0,
            'message': 'Estado desconhecido',
            'error': None
        })

def cleanup_progress(session_id: str) -> None:
    """Clean up progress tracking for a session"""
    with _progress_lock:
        _progress_state.pop(session_id, None)

def generate_sse_message(session_id: str) -> str:
    """Generate SSE formatted message for current progress"""
    progress = get_progress(session_id)
    return f"data: {json.dumps(progress)}\n\n"
