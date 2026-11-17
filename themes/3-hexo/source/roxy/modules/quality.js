/** Adapt pixel density and mesh size only after sustained load, never one slow frame. */
export function createMascotQuality() {
  const ceiling = 2;
  let level = ceiling,
    average = 1 / 60,
    samples = 0,
    fastSamples = 0,
    cooldown = 0;
  return {
    get level() {
      return level;
    },
    get scale() {
      // Supersample small line art by default. Under load, return toward
      // native device density instead of rendering below the physical screen.
      return [1, 1.5, 2][level];
    },
    get coarse() {
      return level === 0;
    },
    observe(delta        , active         ) {
      if (!active || delta <= 0 || delta > 0.15) {
        samples = fastSamples = 0;
        return;
      }
      average = average * 0.93 + delta * 0.07;
      cooldown = Math.max(0, cooldown - delta);
      samples++;
      if (cooldown) return;
      if (samples >= 45 && average > 0.027 && level > 0) {
        level--;
        cooldown = 5;
        samples = fastSamples = 0;
      } else if (average < 0.019) {
        if (++fastSamples >= 180 && level < ceiling) {
          level++;
          cooldown = 8;
          fastSamples = samples = 0;
        }
      } else fastSamples = 0;
    },
  };
}
