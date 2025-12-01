from __future__ import annotations

from datetime import datetime
from pathlib import Path

from database.db_config import db
from config import settings


class VideoTask(db.Model):
    """Representa o histórico de processamento de vídeos por usuário."""

    __tablename__ = "video_tasks"

    id = db.Column(db.Integer, primary_key=True)
    video_hash = db.Column(db.String(64), unique=True, nullable=False, index=True)
    user_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=False, index=True)
    original_filename = db.Column(db.String(255), nullable=False)
    status = db.Column(db.String(32), nullable=False, default="processing")
    stage = db.Column(db.String(64))
    progress = db.Column(db.Float, nullable=False, default=0.0)
    message = db.Column(db.String(255))
    duration_seconds = db.Column(db.Float)
    final_video_path = db.Column(db.String(255))
    session_file_path = db.Column(db.String(255))
    last_error = db.Column(db.String(255))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    completed_at = db.Column(db.DateTime)
    is_deleted = db.Column(db.Boolean, nullable=False, default=False, index=True)
    deleted_at = db.Column(db.DateTime)

    user = db.relationship("User", backref=db.backref("video_tasks", lazy=True))

    @classmethod
    def create_or_reset(cls, *, video_hash: str, user_id: str, filename: str, session_path: str) -> "VideoTask":
        """Cria ou reinicia o registro de processamento para um vídeo."""
        task = cls.query.filter_by(video_hash=video_hash).first()
        now = datetime.utcnow()
        if task is None:
            task = cls(
                video_hash=video_hash,
                user_id=user_id,
                original_filename=filename,
                session_file_path=session_path,
                status="processing",
                stage="uploading",
                progress=0.0,
                message="Arquivo recebido",
                last_error=None,
                is_deleted=False,
            )
            db.session.add(task)
        else:
            task.user_id = user_id
            task.original_filename = filename
            task.session_file_path = session_path
            task.status = "processing"
            task.stage = "uploading"
            task.progress = 0.0
            task.message = "Arquivo recebido"
            task.final_video_path = None
            task.last_error = None
            task.completed_at = None
            task.duration_seconds = None
            task.is_deleted = False
            task.deleted_at = None
        task.created_at = now
        task.updated_at = now
        db.session.commit()
        return task

    @classmethod
    def record_progress(
        cls,
        video_hash: str,
        *,
        stage: str,
        progress: float,
        message: str | None = None,
        status: str | None = None,
    ) -> None:
        """Atualiza informações de progresso do vídeo."""
        task = cls.query.filter_by(video_hash=video_hash).first()
        if not task:
            return
        task.stage = stage
        task.progress = max(0.0, min(100.0, float(progress)))
        if message is not None:
            task.message = message
        if status is not None:
            task.status = status
        task.updated_at = datetime.utcnow()
        db.session.commit()

    @classmethod
    def update_metadata(cls, video_hash: str, *, duration_seconds: float | None = None) -> None:
        """Atualiza metadados adicionais do processamento."""
        task = cls.query.filter_by(video_hash=video_hash).first()
        if not task:
            return
        if duration_seconds is not None:
            task.duration_seconds = float(duration_seconds)
        task.updated_at = datetime.utcnow()
        db.session.commit()

    @classmethod
    def mark_completed(cls, video_hash: str, final_path: str, message: str | None = None) -> None:
        """Marca o vídeo como concluído para download."""
        task = cls.query.filter_by(video_hash=video_hash).first()
        if not task:
            return
        task.status = "completed"
        task.stage = "completed"
        task.progress = 100.0
        task.message = message or "Vídeo pronto para download!"
        task.final_video_path = final_path
        task.completed_at = datetime.utcnow()
        task.last_error = None
        task.updated_at = datetime.utcnow()
        db.session.commit()

    @classmethod
    def mark_error(cls, video_hash: str, error_message: str) -> None:
        """Marca o processamento com erro."""
        task = cls.query.filter_by(video_hash=video_hash).first()
        if not task:
            return
        task.status = "error"
        task.stage = "error"
        task.progress = max(0.0, float(task.progress or 0.0))
        task.message = "Falha no processamento"
        task.last_error = error_message[:250]
        task.updated_at = datetime.utcnow()
        db.session.commit()

    @classmethod
    def clear_session_reference(cls, video_hash: str) -> None:
        """Remove referência à sessão temporária após limpeza."""
        task = cls.query.filter_by(video_hash=video_hash).first()
        if not task:
            return
        task.session_file_path = None
        task.updated_at = datetime.utcnow()
        db.session.commit()

    @classmethod
    def get_for_user(
        cls,
        video_hash: str,
        user_id: str,
        *,
        include_deleted: bool = False,
    ) -> "VideoTask" | None:
        """Retorna o registro de vídeo pertencente ao usuário."""
        query = cls.query.filter_by(video_hash=video_hash, user_id=user_id)
        if not include_deleted:
            query = query.filter_by(is_deleted=False)
        return query.first()

    @classmethod
    def mark_deleted(cls, video_hash: str, user_id: str) -> bool:
        """Marca o vídeo como excluído pelo usuário."""
        task = cls.query.filter_by(
            video_hash=video_hash,
            user_id=user_id,
        ).first()
        if not task:
            return False
        if task.is_deleted:
            return True
        task.is_deleted = True
        task.deleted_at = datetime.utcnow()
        task.updated_at = datetime.utcnow()
        db.session.commit()
        return True

    def to_dict(self) -> dict[str, object]:
        """Serializa o registro para consumo no frontend."""
        base_dir = settings.base_dir
        final_available = False
        if self.final_video_path:
            final_path = Path(self.final_video_path)
            if not final_path.is_absolute():
                final_path = base_dir / final_path
            final_available = final_path.exists()
        can_resume = False
        if self.session_file_path:
            session_path = Path(self.session_file_path)
            if not session_path.is_absolute():
                session_path = base_dir / session_path
            can_resume = session_path.exists()
        return {
            "video_hash": self.video_hash,
            "filename": self.original_filename,
            "status": self.status,
            "stage": self.stage,
            "progress": float(self.progress or 0.0),
            "message": self.message,
            "duration_seconds": float(self.duration_seconds) if self.duration_seconds else None,
            "final_available": final_available,
            "can_resume": can_resume,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "last_error": self.last_error,
            "is_deleted": bool(self.is_deleted),
            "deleted_at": self.deleted_at.isoformat() if self.deleted_at else None,
        }
