/** Loose fabric follows torso motion, then settles through independent joints.
 * Angles are radians; the final channel is a small vertical nod response.
 */
export function createClothMotion() {
  const values = new Float32Array(5),
    velocity = new Float32Array(5);
  const stiffness = [55, 24, 18, 21, 30],
    damping = [13, 7.4, 6.4, 6.8, 9];
  const limits = [0.018, 0.045, 0.052, 0.046, 2.2];
  let previousTurn = 0,
    previousNod = 0;
  let filteredSpeed = 0,
    filteredDip = 0;
  const drives = new Float32Array(4);
  const response = [24, 12, 8, 9.5];
  return {
    values,
    get moving() {
      return velocity.some((v, i) => Math.abs(v) > (i === 4 ? 0.025 : 0.0005));
    },
    reset() {
      values.fill(0);
      velocity.fill(0);
      previousTurn = previousNod = filteredSpeed = filteredDip = 0;
      drives.fill(0);
    },
    update(dt        , turn        , nod        ) {
      if (dt <= 0) return;
      const speed = Math.max(-1, Math.min(1, (turn - previousTurn) / dt));
      const dip = Math.max(-3, Math.min(3, (nod - previousNod) / dt));
      previousTurn = turn;
      previousNod = nod;
      const steps = Math.max(1, Math.ceil(dt * 120)),
        h = dt / steps;
      for (let step = 0; step < steps; step++) {
        // Briefly absorb changes of direction before the fabric receives them.
        // This avoids a sharp tug when the pointer stops or crosses the body.
        filteredSpeed += (speed - filteredSpeed) * (1 - Math.exp(-h * 13));
        filteredDip += (dip - filteredDip) * (1 - Math.exp(-h * 10));
        // Waist panels receive the impulse first. The skirt and the two long
        // cape tails absorb it later, each through its own material response.
        for (let i = 0; i < 4; i++)
          drives[i] += (filteredSpeed - drives[i]) * (1 - Math.exp(-h * response[i]));
        const targets = [
          -drives[0] * 0.055,
          -drives[1] * 0.18,
          -drives[2] * 0.23,
          -drives[3] * 0.2,
          filteredDip * 0.7,
        ];
        for (let i = 0; i < 5; i++) {
          // Ease toward the travel limit rather than hitting a hard target stop.
          const target = limits[i] * Math.tanh(targets[i] / limits[i]);
          velocity[i] += ((target - values[i]) * stiffness[i] - velocity[i] * damping[i]) * h;
          values[i] += velocity[i] * h;
          if (Math.abs(values[i]) > limits[i]) {
            values[i] = Math.sign(values[i]) * limits[i];
            if (values[i] * velocity[i] > 0) velocity[i] = 0;
          }
        }
      }
    },
  };
}
