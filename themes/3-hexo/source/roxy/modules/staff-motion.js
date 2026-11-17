/** A heavy held prop follows slowly while the wrist absorbs most torso turn.
 * The renderer adds this small residual around the same painted grip used by
 * the fist and sleeve. This never changes the prop's shape or resting angle.
 */
export function createStaffMotion() {
  let angle = 0,
    velocity = 0,
    lag = 0;
  return {
    get lag() {
      return lag;
    },
    get moving() {
      return Math.abs(velocity) > 0.0005 || Math.abs(lag) > 0.0005;
    },
    reset() {
      angle = velocity = lag = 0;
    },
    update(dt        , parentTurn        , lateralAcceleration        ) {
      if (dt <= 0) return;
      const inertia = Math.max(-0.003, Math.min(0.003, -lateralAcceleration * 0.001));
      const target = parentTurn * 0.28 + inertia;
      const steps = Math.max(1, Math.ceil(dt * 120)),
        h = dt / steps;
      for (let i = 0; i < steps; i++) {
        velocity += ((target - angle) * 20 - velocity * 9) * h;
        angle += velocity * h;
      }
      // Keep a long staff clear of the feet even through a fast reversal.
      lag = Math.max(-0.01, Math.min(0.01, angle - parentTurn * 0.28));
    },
  };
}
