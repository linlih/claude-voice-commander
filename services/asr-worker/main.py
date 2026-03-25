from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any


def transcribe_with_faster_whisper(
    input_path: str,
    model_size: str,
    language: str | None,
    beam_size: int,
) -> dict[str, Any]:
    from faster_whisper import WhisperModel  # type: ignore

    model = WhisperModel(model_size, device="cpu", compute_type="int8")
    segments, info = model.transcribe(
        input_path,
        language=language,
        beam_size=beam_size,
        vad_filter=True,
    )

    segment_list: list[dict[str, Any]] = []
    texts: list[str] = []

    for seg in segments:
        text = (seg.text or "").strip()
        if not text:
            continue
        texts.append(text)
        segment_list.append(
            {
                "start": round(float(seg.start), 3),
                "end": round(float(seg.end), 3),
                "text": text,
            }
        )

    return {
        "ok": True,
        "engine": "faster-whisper",
        "text": " ".join(texts).strip(),
        "segments": segment_list,
        "language": language or info.language,
        "language_probability": getattr(info, "language_probability", None),
    }


def transcribe_stub(input_path: str) -> dict[str, Any]:
    file = Path(input_path)
    if not file.exists():
        raise FileNotFoundError(f"Audio file not found: {input_path}")

    return {
        "ok": True,
        "engine": "stub",
        "text": "这是一个 ASR 占位结果，请安装 faster-whisper 后进行真实识别。",
        "segments": [
            {"start": 0.0, "end": 2.0, "text": "这是一个 ASR 占位结果"}
        ],
        "language": "zh",
    }


def transcribe(
    input_path: str,
    model_size: str,
    language: str | None,
    beam_size: int,
) -> dict[str, Any]:
    file = Path(input_path)
    if not file.exists():
        raise FileNotFoundError(f"Audio file not found: {input_path}")

    try:
        return transcribe_with_faster_whisper(input_path, model_size, language, beam_size)
    except ModuleNotFoundError:
        # 在未安装 faster-whisper 时提供可运行的免费占位链路
        return transcribe_stub(input_path)


def main() -> None:
    parser = argparse.ArgumentParser(description="ASR worker for claude-voice-commander")
    parser.add_argument("--input", required=True, help="Path to input audio file")
    parser.add_argument("--model", default="small", help="Whisper model size")
    parser.add_argument("--language", default=None, help="Language code, e.g. zh")
    parser.add_argument("--beam-size", type=int, default=3, help="Beam size")
    args = parser.parse_args()

    try:
        result = transcribe(args.input, args.model, args.language, args.beam_size)
    except Exception as error:  # noqa: BLE001
        result = {"ok": False, "error": str(error)}

    print(json.dumps(result, ensure_ascii=False))


if __name__ == "__main__":
    main()
