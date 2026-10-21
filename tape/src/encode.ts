// Encodes rendered frames + the mixed soundtrack offline with WebCodecs.
// One pass can feed several outputs (e.g. a big WebM master and a small web MP4).
import { ArrayBufferTarget as Mp4Target, Muxer as Mp4Muxer } from "mp4-muxer";
import { ArrayBufferTarget as WebmTarget, Muxer as WebmMuxer } from "webm-muxer";
import { FPS } from "./timeline";
import { H, W } from "./vhs";

export interface OutputSpec {
  format: "webm" | "mp4";
  videoBitrate: number;
  audioBitrate: number;
}

interface Output {
  spec: OutputSpec;
  video: VideoEncoder;
  audio: AudioEncoder;
  finish: () => ArrayBuffer;
}

const fail = (e: DOMException) => {
  throw e;
};

function createOutput(spec: OutputSpec, sampleRate: number): Output {
  // WebM: VP9 + Opus (desktop master). MP4: H.264 + AAC (plays on iPhones too).
  const webm = spec.format === "webm";
  const muxer = webm
    ? new WebmMuxer({
        target: new WebmTarget(),
        video: { codec: "V_VP9", width: W, height: H, frameRate: FPS },
        audio: { codec: "A_OPUS", sampleRate, numberOfChannels: 2 },
      })
    : new Mp4Muxer({
        target: new Mp4Target(),
        video: { codec: "avc", width: W, height: H },
        audio: { codec: "aac", sampleRate, numberOfChannels: 2 },
        fastStart: "in-memory", // index up front, so phones can start playing while loading
      });
  const video = new VideoEncoder({ output: (c, m) => muxer.addVideoChunk(c, m), error: fail });
  video.configure({
    codec: webm ? "vp09.00.10.08" : "avc1.4D401F",
    width: W,
    height: H,
    bitrate: spec.videoBitrate,
    framerate: FPS,
    ...(webm ? {} : { avc: { format: "avc" as const } }),
  });
  const audio = new AudioEncoder({ output: (c, m) => muxer.addAudioChunk(c, m), error: fail });
  audio.configure({ codec: webm ? "opus" : "mp4a.40.2", sampleRate, numberOfChannels: 2, bitrate: spec.audioBitrate });
  return {
    spec,
    video,
    audio,
    finish: () => {
      muxer.finalize();
      return muxer.target.buffer;
    },
  };
}

function* audioChunks(sound: AudioBuffer, block = 4800): Generator<AudioData> {
  const left = sound.getChannelData(0);
  const right = sound.getChannelData(1);
  for (let start = 0; start < sound.length; start += block) {
    const n = Math.min(block, sound.length - start);
    const data = new Float32Array(n * 2);
    data.set(left.subarray(start, start + n), 0);
    data.set(right.subarray(start, start + n), n);
    yield new AudioData({
      format: "f32-planar",
      sampleRate: sound.sampleRate,
      numberOfFrames: n,
      numberOfChannels: 2,
      timestamp: Math.round((start * 1e6) / sound.sampleRate),
      data,
    });
  }
}

/** Draw every frame once and encode it into each requested output. */
export async function encode(
  frames: number,
  drawFrame: (i: number) => Promise<HTMLCanvasElement>,
  sound: AudioBuffer,
  specs: OutputSpec[],
  progress: (text: string) => void,
): Promise<ArrayBuffer[]> {
  const outputs = specs.map((s) => createOutput(s, sound.sampleRate));
  for (let i = 0; i < frames; i++) {
    const canvas = await drawFrame(i);
    const frame = new VideoFrame(canvas, { timestamp: Math.round((i * 1e6) / FPS), duration: Math.round(1e6 / FPS) });
    for (const o of outputs) o.video.encode(frame, { keyFrame: i % FPS === 0 });
    frame.close();
    while (outputs.some((o) => o.video.encodeQueueSize > 8)) await new Promise((r) => setTimeout(r, 5));
    if (i % 10 === 0) progress(`video ${i}/${frames} → ${specs.map((s) => s.format).join(" + ")}`);
  }
  for (const o of outputs) {
    await o.video.flush();
    for (const chunk of audioChunks(sound)) {
      o.audio.encode(chunk);
      chunk.close();
    }
    await o.audio.flush();
  }
  progress("muxing…");
  return outputs.map((o) => o.finish());
}
