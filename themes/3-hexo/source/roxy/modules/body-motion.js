/** Authored left/centre/right body poses, interpolated through separate damped joints.
 * These drive rigid upper-body/arm transforms, not a whole-image stretch.
 */
const poses = [
  [-0.028, -10, -0.065, -0.015, -2],
  [0, 0, 0, 0, 0],
  [0.025, 10, 0.055, 0.018, -1.5],
];
export function createBodyMotion() {
  const values = new Float32Array(5),
    velocity = new Float32Array(5);
  const stiffness = [23, 13, 30, 20, 17],
    damping = [9, 7, 10, 8, 8];
  let weight = 0;
  return {
    values,
    get weight() {
      return weight;
    },
    get moving() {
      return velocity.some((v, i) => Math.abs(v) > (i === 1 || i === 4 ? 0.3 : 0.003));
    },
    reset() {
      values.fill(0);
      velocity.fill(0);
      weight = 0;
    },
    update(dt        , x        , y        ) {
      const side = x < 0 ? 0 : 2,
        // Small gaze corrections belong to the eyes/head, with no waist travel.
        t = Math.max(0, Math.min(1, (Math.abs(x) - 0.24) / 0.76)),
        blend = t * t * (3 - 2 * t);
      weight = blend;
      const targets = poses[side].map(
        (value, i) => (value + (i === 4 ? Math.max(-1, Math.min(1, y)) * 3 : 0)) * blend,
      );
      const steps = Math.max(1, Math.ceil(dt * 120)),
        h = dt / steps;
      for (let step = 0; step < steps; step++)
        for (let i = 0; i < 5; i++) {
          velocity[i] += ((targets[i] - values[i]) * stiffness[i] - velocity[i] * damping[i]) * h;
          values[i] += velocity[i] * h;
        }
    },
  };
}
