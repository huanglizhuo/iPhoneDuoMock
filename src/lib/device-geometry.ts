import type { BufferGeometry } from 'three';

/** Remove the two bezel halves' internal closing faces, not their visible rim. */
export function removeInternalBezelCaps(name: string, geometry: BufferGeometry) {
  if (!['jPmlOthRZKgKKHD', 'dSFhWkOicQjmvnq'].includes(name)) return;
  const positions = geometry.getAttribute('position');
  const indices = geometry.index;
  if (!indices) return;
  const retained: number[] = [];
  for (let i = 0; i < indices.count; i += 3) {
    const triangle = [indices.getX(i), indices.getX(i + 1), indices.getX(i + 2)];
    // Model-local coordinates: four triangles per half close the bezel across
    // the hinge (x = 0…±0.567). They intersect the continuous animated display
    // and appear as vertical black lines. Keep the top/bottom, curved corners,
    // and outer rim, whose triangles do not span the display's full height.
    const internal =
      triangle.every((v) => Math.abs(positions.getX(v)) < 0.57 && positions.getY(v) < 0.17) &&
      Math.max(...triangle.map((v) => positions.getZ(v))) -
        Math.min(...triangle.map((v) => positions.getZ(v))) >
        10;
    if (!internal) retained.push(...triangle);
  }
  geometry.setIndex(retained);
}
