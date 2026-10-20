// Small seeded random generator (xorshift32): same seed, same sequence.

/** Seeded random numbers in [0, 1), e.g. for reproducible renders and tests. */
export function rng(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return (s >>> 0) / 4294967296;
  };
}

