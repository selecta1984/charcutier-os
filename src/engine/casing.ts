/** Approximate cylinder volume of a stuffed link. */
export function linkVolumeCm3(diameterMm: number, lengthCm: number): number {
  if (!(diameterMm > 0) || !(lengthCm > 0)) throw new RangeError('diameter and length must be positive');
  const r = diameterMm / 10 / 2;
  return Math.PI * r * r * lengthCm;
}

export const DEFAULT_DENSITY_G_PER_CM3 = 1.0;

export function linkWeightG(diameterMm: number, lengthCm: number, density = DEFAULT_DENSITY_G_PER_CM3): number {
  if (!(density > 0)) throw new RangeError('density must be positive');
  return linkVolumeCm3(diameterMm, lengthCm) * density;
}

/** calibrate density from a real weighed link */
export function calibrateDensity(diameterMm: number, lengthCm: number, measuredWeightG: number): number {
  if (!(measuredWeightG > 0)) throw new RangeError('weight must be positive');
  return measuredWeightG / linkVolumeCm3(diameterMm, lengthCm);
}

/** how many whole links from an available mass */
export function linksFromMass(availableG: number, gramsEach: number): number {
  if (!(gramsEach > 0)) throw new RangeError('gramsEach must be positive');
  return Math.floor(availableG / gramsEach + 1e-9);
}
