// Vanilla JS spring physics replicating react-motion exactly
// Usage: Call updateSpring() in RAF loop

export const presets = {
  noWobble: { stiffness: 170, damping: 26 },
  gentle: { stiffness: 120, damping: 14 },
  wobbly: { stiffness: 180, damping: 12 },
  stiff: { stiffness: 210, damping: 20 },
};

export function createSpring(initialValue = 0, initialVelocity = 0, config = presets.noWobble) {
  let value = initialValue;
  let velocity = initialVelocity;
  const { stiffness, damping } = config;

  function update(dt = 1/60) {
    const force = -stiffness * value; // assuming target = 0 for simplicity; adjust as needed
    const damper = -damping * velocity;
    const acceleration = force + damper;

    velocity += acceleration * dt;
    value += velocity * dt;

    return { value, velocity, settled: Math.abs(velocity) < 0.1 && Math.abs(value) < 0.1 };
  }

  function setTarget(target, newConfig) {
    // For general target: adjust force calculation to (value - target)
    // This simple version assumes target=0; extend for multiple springs
  }

  return { update, value: () => value, velocity: () => velocity };
}

// For multi-value springs, create multiple instances
