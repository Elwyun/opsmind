#!/usr/bin/env node
/**
 * Adds a voice-over to the recorded demo.
 *
 *   npm run demo:voiceover
 *
 * Timing comes from the SRT that `npm run demo:record` wrote, so re-recording
 * re-times the narration automatically. The spoken lines live in
 * `submission/video/voiceover-en.json`, keyed by the caption title; a caption
 * without an entry is read as-is.
 *
 * Each line is synthesised with the Windows speech engine and fitted into its
 * caption window (tempo-up, then an earlier start if it still overflows). The
 * narration is assembled as silence + speech segments and concatenated, then
 * muxed into the video without re-encoding the picture. The assembled track is
 * checked for actual audio before the mux, so a silent cut cannot ship.
 *
 * Outputs:
 *   submission/video/OpsMind_Demo_Narrated_EN.mp4  video + narration
 *   submission/video/VOICEOVER_EN.md               human script with timings
 *
 * Requirements: Windows (System.Speech), ffmpeg/ffprobe on PATH. Override with
 * OPSMIND_TTS_VOICE, OPSMIND_TTS_MAX_TEMPO, OPSMIND_VO_SRT, OPSMIND_VO_LINES.
 */
import { spawnSync } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const videoDir = path.join(root, "submission", "video");
const workDir = path.join(root, ".demo-recording", "voiceover");

const SAMPLE_RATE = 22050;
const CHANNELS = 1;

const srtFile = path.join(videoDir, process.env.OPSMIND_VO_SRT ?? "OpsMind_Demo_Draft_EN.srt");
const linesFile = path.join(videoDir, process.env.OPSMIND_VO_LINES ?? "voiceover-en.json");
const sourceVideo = path.join(videoDir, process.env.OPSMIND_VO_VIDEO ?? "OpsMind_Demo_Draft_EN.mp4");
const outputVideo = path.join(videoDir, process.env.OPSMIND_VO_OUT ?? "OpsMind_Demo_Narrated_EN.mp4");
const scriptFile = path.join(videoDir, "VOICEOVER_EN.md");

const maxTempo = Number.parseFloat(process.env.OPSMIND_TTS_MAX_TEMPO ?? "1.45");
const maxEarlierStartMs = 900;

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { encoding: "utf8", ...options });
  if (result.status !== 0) {
    throw new Error(
      `${command} failed:\n${result.stderr?.slice(-1500) ?? result.error?.message ?? ""}`,
    );
  }
  return result.stdout ?? "";
}

function probeDuration(file) {
  return Number.parseFloat(
    run("ffprobe", [
      "-v", "error",
      "-show_entries", "format=duration",
      "-of", "default=nw=1:nk=1",
      file,
    ]).trim(),
  );
}

function meanVolumeDb(file) {
  const result = spawnSync("ffmpeg", [
    "-hide_banner", "-i", file, "-af", "volumedetect", "-f", "null", "-",
  ], { encoding: "utf8" });
  const text = `${result.stderr ?? ""}${result.stdout ?? ""}`;
  const match = text.match(/mean_volume:\s*(-?[\d.]+)\s*dB/);
  return match ? Number.parseFloat(match[1]) : null;
}

function clock(ms) {
  const total = Math.round(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

function parseSrtTime(value) {
  const match = value.trim().match(/^(\d+):(\d{2}):(\d{2}),(\d{3})$/);
  if (!match) throw new Error(`Unparsable SRT timestamp: ${value}`);
  const [, h, m, s, ms] = match;
  return Number(h) * 3_600_000 + Number(m) * 60_000 + Number(s) * 1000 + Number(ms);
}

/** Reads the SRT written by the recorder: one cue per caption, title + text. */
function parseSrt(contents) {
  return contents
    .trim()
    .split(/\r?\n\r?\n/)
    .map((block) => {
      const rows = block.split(/\r?\n/);
      const [start, end] = rows[1].split("-->");
      return {
        startMs: parseSrtTime(start),
        endMs: parseSrtTime(end),
        title: rows[2] ?? "",
        text: rows.slice(3).join(" ").trim(),
      };
    });
}

/** Synthesises one line to a mono PCM WAV with the Windows speech engine. */
function synthesise(text, wavPath, textPath, voice) {
  const escape = (value) => value.replace(/'/g, "''");
  const script = [
    "Add-Type -AssemblyName System.Speech",
    "$s = New-Object System.Speech.Synthesis.SpeechSynthesizer",
    `$s.SelectVoice('${escape(voice)}')`,
    "$s.Rate = 0",
    "$s.Volume = 100",
    `$s.SetOutputToWaveFile('${escape(wavPath)}')`,
    `$s.Speak([System.IO.File]::ReadAllText('${escape(textPath)}'))`,
    "$s.Dispose()",
  ].join("; ");
  run("powershell.exe", ["-NoProfile", "-Command", script]);
}

/** Re-encodes a clip at the track format, optionally speeding it up. */
function fitClip(input, output, tempo) {
  const args = ["-y", "-i", input];
  if (tempo > 1.001) args.push("-filter:a", `atempo=${tempo.toFixed(4)}`);
  args.push("-ar", String(SAMPLE_RATE), "-ac", String(CHANNELS), "-c:a", "pcm_s16le", output);
  run("ffmpeg", args);
}

function silence(seconds, output) {
  run("ffmpeg", [
    "-y",
    "-f", "lavfi",
    "-i", `anullsrc=r=${SAMPLE_RATE}:cl=mono`,
    "-t", seconds.toFixed(3),
    "-c:a", "pcm_s16le",
    output,
  ]);
}

async function main() {
  await rm(workDir, { recursive: true, force: true });
  await mkdir(workDir, { recursive: true });

  const config = JSON.parse(await readFile(linesFile, "utf8"));
  const voice = process.env.OPSMIND_TTS_VOICE ?? config.voice ?? "Microsoft Zira Desktop";
  const lines = config.lines ?? {};

  const cues = parseSrt(await readFile(srtFile, "utf8"));
  if (cues.length === 0) throw new Error(`No cues found in ${srtFile}`);

  const videoDuration = probeDuration(sourceVideo);
  console.log(
    `[voiceover] ${path.basename(sourceVideo)} · ${videoDuration.toFixed(1)}s · ` +
      `${cues.length} cues · voice: ${voice}`,
  );

  const segments = [];
  const prepared = [];
  let cursorMs = 0;
  let segmentIndex = 0;

  for (const [index, cue] of cues.entries()) {
    const id = String(index + 1).padStart(2, "0");
    const line = lines[cue.title] ?? cue.text;
    if (!(cue.title in lines)) {
      console.log(`[voiceover] ${id} no custom line, reading the caption text`);
    }

    const wavPath = path.join(workDir, `cue-${id}.wav`);
    const fitPath = path.join(workDir, `cue-${id}-fit.wav`);
    const textPath = path.join(workDir, `cue-${id}.txt`);
    await writeFile(textPath, line, "utf8");
    synthesise(line, wavPath, textPath, voice);

    const speechSeconds = probeDuration(wavPath);
    const windowSeconds = (cue.endMs - cue.startMs) / 1000;

    let tempo = 1;
    let startMs = cue.startMs;
    if (speechSeconds > windowSeconds) {
      tempo = Math.min(maxTempo, speechSeconds / windowSeconds);
      const overflowSeconds = speechSeconds / tempo - windowSeconds;
      if (overflowSeconds > 0) {
        startMs = Math.max(0, cue.startMs - Math.min(maxEarlierStartMs, overflowSeconds * 1000));
      }
    }

    fitClip(wavPath, fitPath, tempo);
    const fittedSeconds = probeDuration(fitPath);

    const gapMs = startMs - cursorMs;
    if (gapMs > 10) {
      const gapPath = path.join(workDir, `gap-${String(segmentIndex).padStart(2, "0")}.wav`);
      await silence(gapMs / 1000, gapPath);
      segments.push(gapPath);
      segmentIndex += 1;
    }

    segments.push(fitPath);
    cursorMs = startMs + fittedSeconds * 1000;

    prepared.push({ ...cue, line, startMs, speechSeconds, fittedSeconds, windowSeconds, tempo });
    console.log(
      `[voiceover] ${id} ${clock(cue.startMs)}-${clock(cue.endMs)} ` +
        `speech ${speechSeconds.toFixed(1)}s fit ${fittedSeconds.toFixed(1)}s ` +
        `window ${windowSeconds.toFixed(1)}s tempo ${tempo.toFixed(2)} start ${clock(startMs)} · ${cue.title}`,
    );
  }

  if (videoDuration * 1000 - cursorMs > 100) {
    const tailPath = path.join(workDir, "tail.wav");
    await silence((videoDuration * 1000 - cursorMs) / 1000, tailPath);
    segments.push(tailPath);
  }

  const narrationPath = path.join(workDir, "narration.wav");
  const listPath = path.join(workDir, "concat.txt");
  await writeFile(
    listPath,
    segments.map((file) => `file '${file.replace(/\\/g, "/").replace(/'/g, "'\\''")}'`).join("\n"),
    "utf8",
  );
  run("ffmpeg", ["-y", "-f", "concat", "-safe", "0", "-i", listPath, "-c:a", "pcm_s16le", narrationPath]);

  const narrationSeconds = probeDuration(narrationPath);
  const narrationDb = meanVolumeDb(narrationPath);
  console.log(
    `[voiceover] narration ${narrationSeconds.toFixed(1)}s · mean volume ${narrationDb ?? "unknown"} dB`,
  );
  if (narrationDb === null || narrationDb < -60) {
    throw new Error(
      `The assembled narration is silent (${narrationDb ?? "unmeasurable"} dB); refusing to mux it.`,
    );
  }

  run("ffmpeg", [
    "-y",
    "-i", sourceVideo,
    "-i", narrationPath,
    "-map", "0:v",
    "-map", "1:a",
    "-c:v", "copy",
    "-c:a", "aac",
    "-b:a", "160k",
    "-movflags", "+faststart",
    "-t", videoDuration.toFixed(3),
    outputVideo,
  ]);

  const finalDuration = probeDuration(outputVideo);
  const finalDb = meanVolumeDb(outputVideo);
  const streams = run("ffprobe", [
    "-v", "error",
    "-show_entries", "stream=codec_type,codec_name,channels",
    "-of", "default=nw=1",
    outputVideo,
  ]);
  if (finalDb === null || finalDb < -60) {
    throw new Error(`The muxed video has no audible track (${finalDb ?? "unmeasurable"} dB).`);
  }

  const table = [
    "# OpsMind demo — voice-over script",
    "",
    `Voice used for this cut: **${voice}** (Windows speech engine).`,
    `Video: \`${path.basename(outputVideo)}\` · ${clock(finalDuration * 1000)} · captions burned in, narrated.`,
    "",
    "Re-record with a human voice by reading the *Line* column inside its window. Timing comes from",
    "the recording's SRT; lines come from `voiceover-en.json`, keyed by the caption title.",
    "",
    "| Window | Section | Line |",
    "| --- | --- | --- |",
    ...prepared.map(
      (cue) => `| ${clock(cue.startMs)}–${clock(cue.endMs)} | ${cue.title} | ${cue.line} |`,
    ),
    "",
  ].join("\n");
  await writeFile(scriptFile, table, "utf8");

  console.log(`[voiceover] wrote ${outputVideo}`);
  console.log(
    `[voiceover] duration ${finalDuration.toFixed(1)}s · mean volume ${finalDb} dB · streams:\n${streams.trim()}`,
  );
  console.log(`[voiceover] script ${scriptFile}`);
}

main().catch((error) => {
  console.error(`[voiceover] ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
