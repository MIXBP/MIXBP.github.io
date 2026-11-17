/** Three coupled joints per braid, integrated at a fixed small step. Angles in radians. */
export function createBraidPhysics() {
  const angles = new Float32Array(6),
    velocities = new Float32Array(6),
    pitch = new Float32Array(6),
    pitchVelocities = new Float32Array(6);
  const limits = [0.055, 0.095, 0.14];
  return {
    angles,
    pitch,
    get moving() {
      return (
        velocities.some((value) => Math.abs(value) > 0.008) ||
        pitchVelocities.some((value) => Math.abs(value) > 0.001)
      );
    },
    reset() {
      angles.fill(0);
      velocities.fill(0);
      pitch.fill(0);
      pitchVelocities.fill(0);
    },
    update(dt        , acceleration        , time        , ambient = 1, pitchDrive = 0) {
      if (dt <= 0) return;
      const steps = Math.max(1, Math.ceil(dt / (1 / 120))),
        h = dt / steps;
      for (let step = 0; step < steps; step++)
        for (let side = 0; side < 2; side++) {
          for (let joint = 0; joint < 3; joint++) {
            const i = side * 3 + joint;
            const parent = joint ? angles[i - 1] : 0;
            const drive = -acceleration * (0.018 + joint * 0.012) * (side ? 1 : 0.92);
            const breeze = Math.sin(time * 1.2 + side * 0.8 - joint * 0.55) * 0.004 * ambient;
            const stiffness = 52 - joint * 10,
              damping = 8.4 - joint * 0.7;
            velocities[i] +=
              ((parent * 0.7 + breeze - angles[i]) * stiffness + drive - velocities[i] * damping) *
              h;
            const limit = limits[joint];
            angles[i] = Math.max(-limit, Math.min(limit, angles[i] + velocities[i] * h));
            if (Math.abs(angles[i]) >= limit && angles[i] * velocities[i] > 0) velocities[i] = 0;
            // Nodding bends the braid in depth, independently of its lateral
            // pendulum. Roots settle first; tips retain a little more inertia.
            const pitchParent = joint ? pitch[i - 1] : 0;
            const pitchForce = -pitchDrive * (0.018 + joint * 0.009);
            pitchVelocities[i] +=
              ((pitchParent * 0.75 - pitch[i]) * (48 - joint * 8) +
                pitchForce -
                pitchVelocities[i] * (8.4 - joint * 0.6)) *
              h;
            pitch[i] = Math.max(-limit, Math.min(limit, pitch[i] + pitchVelocities[i] * h));
            if (Math.abs(pitch[i]) >= limit && pitch[i] * pitchVelocities[i] > 0)
              pitchVelocities[i] = 0;
          }
        }
    },
  };
}
