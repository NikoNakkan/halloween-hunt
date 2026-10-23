// Cuts short web excerpts of the Greek records for the app's 📻 radio sound
// (mono AAC .m4a: small, and plays on every phone including iPhones).
import { ArrayBufferTarget, Muxer } from "mp4-muxer";
import { save } from "./footage";
import { RADIO_FILES } from "./radio";

const START = 12; // skip the record's intro
const LENGTH = 25;

async function encodeM4a(samples: Float32Array, sampleRate: number): Promise<ArrayBuffer> {
  const muxer = new Muxer({
    target: new ArrayBufferTarget(),
    audio: { codec: "aac", sampleRate, numberOfChannels: 1 },
    fastStart: "in-memory",
  });
  const encoder = new AudioEncoder({
    output: (c, m) => muxer.addAudioChunk(c, m),
    error: (e) => {
      throw e;
    },
  });
  encoder.configure({ codec: "mp4a.40.2", sampleRate, numberOfChannels: 1, bitrate: 96_000 }); // lowest AAC rate the encoder accepts
  const block = 4096;
  for (let i = 0; i < samples.length; i += block) {
    const data = samples.subarray(i, Math.min(samples.length, i + block));
    const chunk = new AudioData({
      format: "f32-planar",
      sampleRate,
      numberOfFrames: data.length,
      numberOfChannels: 1,
      timestamp: Math.round((i * 1e6) / sampleRate),
      data: new Float32Array(data),
    });
    encoder.encode(chunk);
    chunk.close();
  }
  await encoder.flush();
  muxer.finalize();
  return muxer.target.buffer;
}

/** Writes tape/out/radio-1.m4a … radio-N.m4a; returns their sizes. */
export async function exportRadioExcerpts(): Promise<string[]> {
  const ctx = new OfflineAudioContext(1, 1, 44100);
  const report: string[] = [];
  for (const [i, name] of RADIO_FILES.entries()) {
    const buf = await ctx.decodeAudioData(await (await fetch(`./footage/${name}`)).arrayBuffer());
    const from = Math.min(Math.floor(START * buf.sampleRate), Math.max(0, buf.length - LENGTH * buf.sampleRate));
    const n = Math.min(Math.floor(LENGTH * buf.sampleRate), buf.length - from);
    const mono = new Float32Array(n);
    for (let ch = 0; ch < buf.numberOfChannels; ch++) {
      const d = buf.getChannelData(ch);
      for (let j = 0; j < n; j++) mono[j] += d[from + j] / buf.numberOfChannels;
    }
    // Short fades so the cut points don't click.
    const fade = Math.floor(0.05 * buf.sampleRate);
    for (let j = 0; j < fade; j++) {
      mono[j] *= j / fade;
      mono[n - 1 - j] *= j / fade;
    }
    const bytes = await encodeM4a(mono, buf.sampleRate);
    const out = `radio-${i + 1}.m4a`;
    await save(out, bytes);
    report.push(`${out} ${(bytes.byteLength / 1024).toFixed(0)} KB`);
  }
  return report;
}
