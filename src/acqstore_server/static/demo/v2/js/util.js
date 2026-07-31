// Numeric clamp helper shared across modules.
export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
