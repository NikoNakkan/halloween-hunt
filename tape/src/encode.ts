// Encodes rendered frames + the mixed soundtrack into a WebM (VP9 + Opus), offline.
import { ArrayBufferTarget, Muxer } from "webm-muxer";
import { FPS } from "./timeline";
import { H, W } from "./vhs";

async function pickVideoCodec(): Promise<{ webcodecs: string; matroska: string }> {
  const vp9 = { codec: "vp09.00.10.08", width: W, height: H, bitrate: 6_000_000, framerate: FPS };
  if ((await VideoEncoder.isConfigSupported(vp9)).supported) return { webcodecs: vp9.codec, matroska: "V_VP9" };
  return { webcodecs: "vp8", matroska: "V_VP8" };
}

export async function encodeWebm(
  frames: number,
  drawFrame: (i: number) => Promise<HTMLCanvasElement>,
  sound: AudioBuffer,
  progress: (text: string) => void,
): Promise<ArrayBuffer> {
  const codec = await pickVideoCodec();
  const muxer = new Muxer({
    target: new ArrayBufferTarget(),
    video: { codec: codec.matroska, width: W, height: H, frameRate: FPS },
    audio: { codec: "A_OPUS", sampleRate: sound.sampleRate, numberOfChannels: 2 },
  });
  const fail = (e: DOMException) => {
    throw e;
  };

  const video = new VideoEncoder({ output: (c, m) => muxer.addVideoChunk(c, m), error: fail });
  video.configure({ codec: codec.webcodecs, width: W, height: H, bitrate: 6_000_000, framerate: FPS });
  for (let i = 0; i < frames; i++) {
    const canvas = await drawFrame(i);
    const frame = new VideoFrame(canvas, { timestamp: Math.round((i * 1e6) / FPS), duration: Math.round(1e6 / FPS) });
    video.encode(frame, { keyFrame: i % FPS === 0 });
    frame.close();
    while (video.encodeQueueSize > 8) await new Promise((r) => setTimeout(r, 5));
    if (i % 10 === 0) progress(`video ${i}/${frames} (${codec.matroska})`);
  }
  await video.flush();

  const audio = new AudioEncoder({ output: (c, m) => muxer.addAudioChunk(c, m), error: fail });
  audio.configure({ codec: "opus", sampleRate: sound.sampleRate, numberOfChannels: 2, bitrate: 160_000 });
  const block = 4800;
  const left = sound.getChannelData(0);
  const right = sound.getChannelData(1);
  for (let start = 0; start < sound.length; start += block) {
    const n = Math.min(block, sound.length - start);
    const data = new Float32Array(n * 2);
    data.set(left.subarray(start, start + n), 0);
    data.set(right.subarray(start, start + n), n);
    const chunk = new AudioData({
      format: "f32-planar",
      sampleRate: sound.sampleRate,
      numberOfFrames: n,
      numberOfChannels: 2,
      timestamp: Math.round((start * 1e6) / sound.sampleRate),
      data,
    });
    audio.encode(chunk);
    chunk.close();
  }
  await audio.flush();
  progress("muxing…");
  muxer.finalize();
  return muxer.target.buffer;
}
