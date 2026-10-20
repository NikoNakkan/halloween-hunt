// One AudioContext for the whole app. Browsers only allow sound after a tap,
// so `unlock()` must run inside a click handler.

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let muted = false;
const samples = new Map<string, Promise<AudioBuffer | null>>();

export function audio(): { ctx: AudioContext; out: GainNode } {
  if (!ctx || !master) {
    ctx = new AudioContext();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 1;
    master.connect(ctx.destination);
  }
  return { ctx, out: master };
}

export async function unlock(): Promise<void> {
  await audio().ctx.resume();
}

export function isMuted(): boolean {
  return muted;
}

export function setMuted(value: boolean): void {
  muted = value;
  const { ctx: c, out } = audio();
  out.gain.setTargetAtTime(value ? 0 : 1, c.currentTime, 0.05);
}

/** Site root relative to this page: pages in subfolders declare <meta name="app-root" content="../">. */
function appRoot(): string {
  return document.querySelector<HTMLMetaElement>('meta[name="app-root"]')?.content ?? "./";
}

async function fetchSample(name: string): Promise<AudioBuffer | null> {
  for (const ext of ["ogg", "mp3"]) {
    try {
      const res = await fetch(`${appRoot()}sounds/${name}.${ext}`);
      const type = res.headers.get("content-type") ?? "";
      // Dev servers answer missing files with index.html, so skip HTML responses.
      if (!res.ok || type.includes("html")) continue;
      return await audio().ctx.decodeAudioData(await res.arrayBuffer());
    } catch {
      // Missing or undecodable on this browser: try the next format, then the synth.
    }
  }
  return null;
}

/** Real recording at public/sounds/<name>.ogg|.mp3; null if absent or undecodable. */
export function loadSample(name: string): Promise<AudioBuffer | null> {
  let pending = samples.get(name);
  if (!pending) {
    pending = fetchSample(name);
    samples.set(name, pending);
  }
  return pending;
}

export interface Clip {
  volume?: number;
  /** Seconds into the file to start from. */
  offset?: number;
  /** Seconds to play before fading out; whole file when omitted. */
  duration?: number;
  /** Seconds from now before it starts. */
  delay?: number;
  /** Playback speed; below 1 is slower and deeper. */
  rate?: number;
}

export function playBuffer(buffer: AudioBuffer, { volume = 1, offset = 0, duration, delay = 0, rate = 1 }: Clip = {}): void {
  const { ctx: c, out } = audio();
  const src = c.createBufferSource();
  const gain = c.createGain();
  const t = c.currentTime + delay;
  gain.gain.setValueAtTime(volume, t);
  src.buffer = buffer;
  src.playbackRate.value = rate;
  src.connect(gain).connect(out);
  src.start(t, offset);
  if (duration !== undefined) {
    // stop() is only allowed after start().
    gain.gain.setTargetAtTime(0, t + duration - 1, 0.4);
    src.stop(t + duration + 1);
  }
}

/** White noise buffer, reused by thunder, wind and screams. */
export function noiseBuffer(seconds: number): AudioBuffer {
  const { ctx: c } = audio();
  const buf = c.createBuffer(1, Math.floor(c.sampleRate * seconds), c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buf;
}
