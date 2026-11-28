"""Local-only transcription and selective instrumental replacement for PulsePad."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import sys
import urllib.request

sys.stdout.reconfigure(encoding="utf-8", errors="backslashreplace")

MODEL_URL = "https://github.com/TRvlvr/model_repo/releases/download/all_public_uvr_models/UVR-MDX-NET-Inst_HQ_3.onnx"
MODEL_SHA256 = "317554b07fe1ea5279a77f2b1520a41ea4b93432560c4ffd08792c30fddf9adc"


def progress(value):
    print(json.dumps({"progress": round(value, 1)}), flush=True)


def instrumental_model(cache):
    target = cache / "instrumental.onnx"
    if not target.exists():
        cache.mkdir(parents=True, exist_ok=True)
        temporary = cache / "instrumental.download"
        urllib.request.urlretrieve(MODEL_URL, temporary)
        if hashlib.sha256(temporary.read_bytes()).hexdigest() != MODEL_SHA256:
            temporary.unlink(missing_ok=True)
            raise ValueError("Instrumental model checksum mismatch.")
        temporary.replace(target)
    if hashlib.sha256(target.read_bytes()).hexdigest() != MODEL_SHA256:
        raise ValueError("Instrumental model checksum mismatch.")
    return target


def whisper_model(cache):
    from faster_whisper import WhisperModel

    local = cache / "whisper-small"
    return WhisperModel(str(local) if (local / "model.bin").exists() else "small", device="cpu", compute_type="int8", cpu_threads=4,
                        download_root=str(cache / "whisper"))


def transcribe(args):
    from faster_whisper.audio import decode_audio

    audio = decode_audio(args.input, sampling_rate=16000)
    duration = len(audio) / 16000
    model = whisper_model(args.cache)
    segments, _ = model.transcribe(audio, language=None if args.language == "auto" else args.language,
                                   beam_size=3, word_timestamps=True,
                                   condition_on_previous_text=False, temperature=0.0,
                                   no_speech_threshold=None, log_prob_threshold=None,
                                   compression_ratio_threshold=None)
    words = []
    uncertain = []
    for segment in segments:
        tokens = segment.text.lower().split()
        repeated = len(tokens) > 12 and len(set(tokens)) / len(tokens) < 0.22
        if repeated:
            uncertain.append({"start": segment.start, "end": segment.end})
        else:
            for word in segment.words or []:
                if word.end > word.start and word.word.strip():
                    words.append({"start": word.start, "end": word.end,
                                  "word": word.word.strip(), "confidence": word.probability})
        progress(100 * segment.end / max(duration, 1))
    Path(args.output).write_text(json.dumps({"words": words, "uncertain": uncertain,
                                           "duration": duration}, ensure_ascii=False), encoding="utf-8")


def render(args):
    import av
    import numpy as np
    import onnxruntime as ort

    plan = json.loads(Path(args.plan).read_text(encoding="utf-8"))
    # Keep float precision when rendering; transcription's 16-bit decoder is not used here.
    frames = []
    with av.open(args.input) as container:
        resampler = av.AudioResampler(format="fltp", layout="stereo", rate=44100)
        for frame in container.decode(audio=0):
            frames.extend(output.to_ndarray() for output in resampler.resample(frame))
        frames.extend(output.to_ndarray() for output in resampler.resample(None))
    if not frames:
        raise ValueError("The source contains no audio frames.")
    original = np.concatenate(frames, axis=1).astype(np.float32)
    mask = np.zeros(original.shape[1], np.float32)
    fade = round(float(plan.get("fadeMs", 40)) * 44.1)
    padding = float(plan.get("paddingMs", 60)) / 1000
    for index in plan["selected"]:
        word = plan["words"][index]
        start = max(0, int((word["start"] - padding) * 44100))
        end = min(len(mask), int((word["end"] + padding) * 44100))
        if end <= start:
            continue
        mask[start:end] = 1
        before = max(0, start - fade)
        after = min(len(mask), end + fade)
        if start > before:
            mask[before:start] = np.maximum(mask[before:start], np.linspace(0, 1, start - before))
        if after > end:
            mask[end:after] = np.maximum(mask[end:after], np.linspace(1, 0, after - end))
    replacement = original.copy()
    if np.any(mask):
        model_path = instrumental_model(args.cache)
        options = ort.SessionOptions()
        options.intra_op_num_threads = 4
        options.inter_op_num_threads = 1
        session = ort.InferenceSession(str(model_path), sess_options=options,
                                      providers=["CPUExecutionProvider"])
        n_fft, hop, frames = 6144, 1024, 256
        chunk = hop * (frames - 1)
        trim = n_fft // 2
        generated = chunk - 2 * trim
        window = np.hanning(n_fft + 1)[:-1].astype(np.float32)
        starts = [s for s in range(0, len(mask), generated)
                  if np.any(mask[s:min(len(mask), s + generated)])]
        for count, start in enumerate(starts):
            part = original[:, max(0, start - trim):min(len(mask), start + generated + trim)]
            part = np.pad(part, ((0, 0), (max(0, trim - start),
                          max(0, start + generated + trim - len(mask)))))
            padded = np.pad(part, ((0, 0), (trim, trim)), mode="reflect")
            views = np.lib.stride_tricks.sliding_window_view(padded, n_fft, axis=-1)[:, ::hop, :]
            spectrum = np.fft.rfft(views * window, axis=-1).transpose(0, 2, 1)
            tensor = np.stack([spectrum[0].real, spectrum[0].imag,
                               spectrum[1].real, spectrum[1].imag])[:, :3072, :].astype(np.float32)[None]
            tensor[:, :, :3, :] = 0
            prediction = session.run(None, {"input": tensor})[0][0]
            spectrum = np.stack([prediction[0] + 1j * prediction[1],
                                 prediction[2] + 1j * prediction[3]])
            spectrum = np.pad(spectrum, ((0, 0), (0, 1), (0, 0)))
            blocks = np.fft.irfft(spectrum.transpose(0, 2, 1), n=n_fft, axis=-1) * window
            output = np.zeros((2, chunk + n_fft), np.float32)
            normalization = np.zeros(chunk + n_fft, np.float32)
            for frame in range(frames):
                position = frame * hop
                output[:, position:position + n_fft] += blocks[:, frame, :]
                normalization[position:position + n_fft] += window ** 2
            output /= np.maximum(normalization, 1e-8)
            output = output[:, trim:-trim]
            length = min(generated, len(mask) - start)
            replacement[:, start:start + length] = output[:, trim:trim + length] * 1.022
            progress(100 * (count + 1) / len(starts))
    result = original * (1 - mask) + replacement * mask
    if not np.isfinite(result).all():
        raise ValueError("Non-finite samples in clean audio.")
    # WAV float preserves source dynamics; only attenuate if headroom is needed.
    peak = float(np.max(np.abs(result))) if result.size else 0
    gain = min(1, 0.97 / max(peak, 1e-9))
    result *= gain
    import struct

    data = result.T.astype("<f4").tobytes()
    header = b"RIFF" + struct.pack("<I", len(data) + 36) + b"WAVEfmt "
    header += struct.pack("<IHHIIHH", 16, 3, 2, 44100, 44100 * 8, 8, 32)
    header += b"data" + struct.pack("<I", len(data))
    Path(args.output).write_bytes(header + data)
    plan["render"] = {"gain": gain, "editedSeconds": float(np.sum(mask > 0.5) / 44100),
                      "sampleRate": 44100, "reviewRequired": True}
    Path(args.plan).write_text(json.dumps(plan, ensure_ascii=False), encoding="utf-8")
    progress(100)


parser = argparse.ArgumentParser()
parser.add_argument("action", choices=["prepare", "transcribe", "render"])
parser.add_argument("--cache", required=True, type=Path)
parser.add_argument("--input")
parser.add_argument("--output")
parser.add_argument("--plan")
parser.add_argument("--language", choices=["auto", "es", "en"], default="auto")
arguments = parser.parse_args()
arguments.cache.mkdir(parents=True, exist_ok=True)
if arguments.action == "prepare":
    instrumental_model(arguments.cache)
    whisper_model(arguments.cache)
    progress(100)
elif arguments.action == "transcribe":
    transcribe(arguments)
else:
    render(arguments)
