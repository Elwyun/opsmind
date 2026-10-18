#!/usr/bin/env node
/**
 * Adds a voice-over to the recorded demo.
 *
 *   npm run demo:voiceover
 *
 * Reads the timed narration in `submission/video/voiceover-en.json`, synthesises
 * each line with the Windows speech engine, fits every line into the caption
 * window it belongs to (slight tempo-up and, if needed, an earlier start), mixes
 * the lines into one track and muxes that track into the recorded MP4 without
 * re-encoding the video.
 *
 * Outputs:
 *   submission/video/OpsMind_Demo_Narrated_EN.mp4  video + narration
 *   submission/video/VOICEOVER_EN.md               human script with timings
 *
 * Requirements: Windows (System.Speech), ffmpeg/ffprobe on PATH. Override the
 * voice with OPSMIND_TTS_VOICE, the tempo ceiling with OPSMIND_TTS_MAX_TEMPO.
 */
import { spawnSync } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const videoDir = path.join(root, "submission", "video");
const workDir = path.join(root, ".demo-recording", "voiceover");

const cuesFile = path.join(videoDir, process.env.OPSMIND_VO_CUES ?? "voiceover-en.json");
const sourceVideo = path.join(videoDir, process.env.OPSMIND_VO_VIDEO ?? "OpsMind_Demo_Draft_EN.mp4");
const outputVideo = path.join(videoDir, process.env.OPSMIND_VO_OUT ?? "OpsMind_Demo_Narrated_EN.mp4");
const scriptFile = path.join(videoDir, "VOICEOVER_EN.md");

const voice = process.env.OPSMIND_TTS_VOICE ?? "Microsoft Zira Desktop";
const maxTempo = Number.parseFloat(process.env.OPSMIND_TTS_MAX_TEMPO ?? "1.45");
const maxEarlierStartMs = 900;

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { encoding: "utf8", ...options });
  if (result.status !== 0) {
    throw new Error(`${command} failed:\n${result.stderr?.slice(-1500) ?? result.error?.message ?? ""}`);
  }
  return result.stdout ?? "";
}

function probeDuration(file) {
  const out = run("ffprobe", [
    "-v", "error",
    "-show_entries", "format=duration",
    "-of", "default=nw=1:nk=1",
    file,
  ]);
  return Number.parseFloat(out.trim());
}

function clock(ms) {
  const total = Math.round(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

/** Synthesises one line to a mono PCM WAV with the Windows speech engine. */
function synthesise(text, wavPath, textPath) {
  const script = [
    "Add-Type -AssemblyName System.Speech",
    "$s = New-Object System.Speech.Synthesis.SpeechSynthesizer",
    `$s.SelectVoice('${voice.replace(/'/g, "''")}')`,
    "$s.Rate = 0",
    "$s.Volume = 100",
    `$s.SetOutputToWaveFile('${wavPath.replace(/'/g, "''")}')`,
    `$s.Speak([System.IO.File]::ReadAllText('${textPath.replace(/'/g, "''")}'))`,
    "$s.Dispose()",
  ].join("; ");
  run("powershell.exe", ["-NoProfile", "-Command", script]);
}

async function main() {
  await mkdir(workDir, { recursive: true });
  await rm(workDir, { recursive: true, force: true });
  await mkdir(workDir, { recursive: true });

  const config = JSON.parse(await readFile(cuesFile, "utf8"));
  const cues = config.cues ?? [];
  if (cues.length === 0) throw new Error(`No cues found in ${cuesFile}`);

  const videoDuration = probeDuration(sourceVideo);
  console.log(`[voiceover] source video ${path.basename(sourceVideo)} · ${videoDuration.toFixed(1)}s`);
  console.log(`[voiceover] voice: ${voice} · ${cues.length} lines`);

  const prepared = [];
  for (const [index, cue] of cues.entries()) {
    const id = String(index + 1).padStart(2, "0");
    const wavPath = path.join(workDir, `cue-${id}.wav`);
    const textPath = path.join(workDir, `cue-${id}.txt`);
    await writeFile(textPath, cue.line, "utf8");
    synthesise(cue.line, wavPath, textPath);

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

    prepared.push({ ...cue, wavPath, speechSeconds, windowSeconds, tempo, startMs });
    console.log(
      `[voiceover] ${id} ${clock(cue.startMs)}–${clock(cue.endMs)} ` +
        `speech ${speechSeconds.toFixed(1)}s window ${windowSeconds.toFixed(1)}s ` +
        `tempo ${tempo.toFixed(2)} start ${clock(startMs)}`,
    );
  }

  // Input 0 is the recorded video; the narration clips follow, so the audio
  // stream of clip `index` lives at input `index + 1`.
  const inputs = ["-i", sourceVideo, ...prepared.flatMap((cue) => ["-i", cue.wavPath])];
  const filters = prepared
    .map((cue, index) => {
      const chain = [`atempo=${cue.tempo.toFixed(4)}`];
      if (cue.startMs > 0) chain.push(`adelay=${Math.round(cue.startMs)}:all=1`);
      return `[${index + 1}:a]${chain.join(",")}[a${index}]`;
    })
    .join(";");
  const mixInputs = prepared.map((_, index) => `[a${index}]`).join("");
  const filterComplex = `${filters};${mixInputs}amix=inputs=${prepared.length}:normalize=0:dropout_transition=0[aout]`;

  run("ffmpeg", [
    "-y",
    ...inputs,
    "-filter_complex", filterComplex,
    "-map", "0:v",
    "-map", "[aout]",
    "-c:v", "copy",
    "-c:a", "aac",
    "-b:a", "160k",
    "-ar", "44100",
    "-movflags", "+faststart",
    "-t", videoDuration.toFixed(3),
    outputVideo,
  ]);

  const finalDuration = probeDuration(outputVideo);
  const streams = run("ffprobe", [
    "-v", "error",
    "-show_entries", "stream=codec_type,codec_name,channels",
    "-of", "default=nw=1",
    outputVideo,
  ]);

  const table = [
    "# OpsMind demo — voice-over script",
    "",
    `Voice used for this cut: **${voice}** (Windows speech engine).`,
    `Video: \`${path.basename(outputVideo)}\` · ${clock(finalDuration * 1000)} · captions burned in, narrated.`,
    "",
    "Re-record with a human voice by reading the *Line* column inside its window; the timing comes from",
    "`voiceover-en.json`. `npm run demo:voiceover` rebuilds the audio track.",
    "",
    "| Window | Section | Line |",
    "| --- | --- | --- |",
    ...prepared.map(
      (cue) => `| ${clock(cue.startMs)}–${clock(cue.endMs)} | ${cue.section} | ${cue.line} |`,
    ),
    "",
  ].join("\n");
  await writeFile(scriptFile, table, "utf8");

  console.log(`[voiceover] wrote ${outputVideo}`);
  console.log(`[voiceover] duration ${finalDuration.toFixed(1)}s · streams:\n${streams.trim()}`);
  console.log(`[voiceover] script ${scriptFile}`);
}

main().catch((error) => {
  console.error(`[voiceover] ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
