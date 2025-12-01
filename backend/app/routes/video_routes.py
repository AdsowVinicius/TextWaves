from __future__ import annotations

from pathlib import Path

from flask import Blueprint, jsonify, send_file
from flask_jwt_extended import get_jwt_identity, jwt_required

from config import settings
from models.video_model import VideoTask

videos_bp = Blueprint("videos", __name__)


def _resolve_path(path_str: str) -> Path:
    path = Path(path_str)
    if not path.is_absolute():
        path = settings.base_dir / path
    return path


@videos_bp.route("/videos", methods=["GET"])
@jwt_required()
def list_videos():
    """Retorna o histórico de vídeos do usuário autenticado."""
    user_id = str(get_jwt_identity())
    tasks = (
        VideoTask.query.filter_by(user_id=user_id, is_deleted=False)
        .order_by(VideoTask.created_at.desc())
        .all()
    )
    return jsonify({"videos": [task.to_dict() for task in tasks]})


@videos_bp.route("/videos/<string:video_hash>", methods=["GET"])
@jwt_required()
def get_video_task(video_hash: str):
    """Recupera um vídeo específico do usuário."""
    user_id = str(get_jwt_identity())
    task = VideoTask.get_for_user(video_hash, user_id)
    if task is None:
        return jsonify({"error": "Vídeo não encontrado"}), 404
    return jsonify({"video": task.to_dict()})


@videos_bp.route("/videos/<string:video_hash>/download", methods=["GET"])
@jwt_required()
def download_final_video(video_hash: str):
    """Permite baixar o vídeo finalizado."""
    user_id = str(get_jwt_identity())
    task = VideoTask.get_for_user(video_hash, user_id)
    if task is None or not task.final_video_path:
        return jsonify({"error": "Vídeo indisponível"}), 404

    file_path = _resolve_path(task.final_video_path)
    if not file_path.exists():
        return jsonify({"error": "Arquivo não encontrado"}), 404

    download_name = f"{Path(task.original_filename).stem}_textwaves.mp4"
    return send_file(file_path, as_attachment=True, download_name=download_name, mimetype="video/mp4")


@videos_bp.route("/videos/<string:video_hash>", methods=["DELETE"])
@jwt_required()
def delete_video_task(video_hash: str):
    """Marca um vídeo como excluído do histórico do usuário."""
    user_id = str(get_jwt_identity())
    task = VideoTask.get_for_user(video_hash, user_id, include_deleted=True)
    if task is None:
        return jsonify({"error": "Vídeo não encontrado"}), 404

    if VideoTask.mark_deleted(video_hash, user_id):
        return jsonify({"message": "Vídeo removido do histórico."}), 200

    return jsonify({"error": "Não foi possível remover o vídeo."}), 500
