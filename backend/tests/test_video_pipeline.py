import importlib
import sys
from pathlib import Path

APP_DIR = Path(__file__).resolve().parents[1] / "app"

for path in (APP_DIR,):
    path_str = str(path)
    if path_str not in sys.path:
        sys.path.insert(0, path_str)


generate_module = importlib.import_module("utils.generateStrFileVideo")


def test_generate_pipeline_masks_profanity_and_beeps(monkeypatch, tmp_path):
    captured = {}
    input_video = tmp_path / "input.mp4"
    input_video.write_bytes(b"fake video content")

    def fake_extract_audio(video_path: str, audio_path: str):
        Path(audio_path).write_bytes(b"fake")

    def fake_transcribe(audio_path: str):
        return {
            "segments": [
                {"start": 0.0, "end": 1.0, "text": "A abelha chegou aqui"},
                {"start": 1.0, "end": 2.5, "text": "Texto limpo"},
            ]
        }

    def fake_create_video(video_path, subtitles, output_video_path, subtitle_options, beep_intervals=None, **kwargs):
        captured["subtitles"] = list(subtitles)
        captured["beep_intervals"] = list(beep_intervals or [])
        Path(output_video_path).write_bytes(b"")
        return output_video_path

    monkeypatch.setattr(generate_module, "extract_audio_from_video", fake_extract_audio)
    monkeypatch.setattr(generate_module, "transcribe_audio", fake_transcribe)
    monkeypatch.setattr(generate_module, "create_video_with_subtitles", fake_create_video)

    backend_dir = tmp_path / "backend"
    backend_dir.mkdir()

    str_path, output_video_path, video_hash = generate_module.generate_str_file_and_video(
        str(input_video),
        str(backend_dir),
        "output.mp4",
    )

    assert Path(str_path).exists()
    assert Path(output_video_path).exists()
    assert video_hash

    contents = Path(str_path).read_text(encoding="utf-8")
    assert "******" in contents

    # Beeps agora são precisos por palavra, não por segmento inteiro
    assert len(captured["beep_intervals"]) == 1  # Uma ocorrência de "abelha"
    beep_start, beep_end = captured["beep_intervals"][0]
    # O beep deve estar dentro do segmento (0.0, 1.0)
    assert 0.0 <= beep_start < beep_end <= 1.0
    
    assert captured["subtitles"][0][2] == "A ****** chegou aqui"