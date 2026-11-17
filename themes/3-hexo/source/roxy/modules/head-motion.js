/** Eyes acquire the target first; the head accelerates and brakes continuously. */
export function createHeadMotion() {
  const position = new Float32Array(2),
    velocity = new Float32Array(2);
  return {
    position,
    velocity,
    get moving() {
      return velocity.some((value) => Math.abs(value) > 0.003);
    },
    reset() {
      position.fill(0);
      velocity.fill(0);
    },
    update(dt        , x        , y        ) {
      // Eyes acquire nearby targets before the neck participates. Smooth gating
      // avoids a mode switch when a pointer crosses the edge of this quiet zone.
      const targets = [x, y].map((value, axis) => {
        const limit = axis === 0 ? 0.82 : 0.75;
        const normalized = Math.max(-1, Math.min(1, value / limit));
        const t = Math.max(0, Math.min(1, (Math.abs(normalized) - 0.12) / 0.6));
        return normalized * limit * t * t * (3 - 2 * t);
      });
      const steps = Math.max(1, Math.ceil(dt * 120)),
        h = dt / steps;
      for (let step = 0; step < steps; step++)
        for (let axis = 0; axis < 2; axis++) {
          const error = targets[axis] - position[axis];
          // Brake a moving head before steering it back. The blend is continuous
          // around zero, so small cursor corrections do not switch motion modes.
          const braking = Math.max(0, Math.min(1, -velocity[axis] * error * 8));
          const acceleration = Math.max(
            -8,
            Math.min(8, error * 64 - velocity[axis] * (16 + braking * 8)),
          );
          const limit = axis === 0 ? 1.6 : 1.4;
          velocity[axis] = Math.max(-limit, Math.min(limit, velocity[axis] + acceleration * h));
          position[axis] += velocity[axis] * h;
        }
    },
  };
}
