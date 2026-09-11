import * as THREE from 'three';
import type { Project } from './project';
import { SPECS, screenSlots } from './project';
import { t } from '../i18n';
import { screenMotion } from './projected-screen';

export function websiteUrl(input: string) {
  const value = input.trim();
  if (!value) return '';
  const hostWithPort = /^[^/?#:]+:\d+(?:[/?#]|$)/.test(value);
  const url = new URL(
    !hostWithPort && /^[a-z][a-z\d+.-]*:/i.test(value) ? value : `https://${value}`,
  );
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password)
    throw new Error(t('errors.urlScheme'));
  return url.href;
}
export type Point = { x: number; y: number };
export type BrowserSurface = {
  id: 'inner' | 'outer' | 'inner-left';
  mask?: string;
  maskMode?: 'alpha' | 'luminance';
  clip: string;
  matrix: string;
  width: number;
  height: number;
  blur: number;
  visible: boolean;
};

/** Homography: one live document projected onto the same fixed artwork plane. */
export function quadMatrix(q: Point[], width: number, height: number) {
  const [p0, p1, p2, p3] = q;
  const dx1 = p1.x - p2.x,
    dx2 = p3.x - p2.x,
    dx3 = p0.x - p1.x + p2.x - p3.x;
  const dy1 = p1.y - p2.y,
    dy2 = p3.y - p2.y,
    dy3 = p0.y - p1.y + p2.y - p3.y;
  const den = dx1 * dy2 - dx2 * dy1;
  if (Math.abs(den) < 1e-7) return '';
  const g = (dx3 * dy2 - dx2 * dy3) / den,
    j = (dx1 * dy3 - dx3 * dy1) / den;
  const a = p1.x - p0.x + g * p1.x,
    b = p3.x - p0.x + j * p3.x;
  const d = p1.y - p0.y + g * p1.y,
    e = p3.y - p0.y + j * p3.y;
  const m = [
    a / width,
    d / width,
    0,
    g / width,
    b / height,
    e / height,
    0,
    j / height,
    0,
    0,
    1,
    0,
    p0.x,
    p0.y,
    0,
    1,
  ];
  return m.every(Number.isFinite) ? `matrix3d(${m.join(',')})` : '';
}
export function browserViewport(p: Project, inner: boolean) {
  const slot = screenSlots(p.scene)[inner ? 'inner' : 'outer'];
  const spec = SPECS[slot];
  return {
    slot,
    width: Math.round(spec.width / p.browser.pixelRatio),
    height: Math.round(spec.height / p.browser.pixelRatio),
  };
}
export function screenSurface(
  mesh: THREE.SkinnedMesh,
  camera: THREE.Camera,
  frame: THREE.Vector4,
  p: Project,
  width: number,
  height: number,
  inner: boolean,
  leaf?: 0 | 1,
): BrowserSurface {
  const project = (v: THREE.Vector3) => {
    v.applyMatrix4(mesh.matrixWorld).project(camera);
    return { x: ((v.x + 1) * width) / 2, y: ((1 - v.y) * height) / 2 };
  };
  const pos = mesh.geometry.getAttribute('position'),
    index = mesh.geometry.index;
  const vertices = Array.from({ length: pos.count }, (_, i) =>
    mesh.getVertexPosition(i, new THREE.Vector3()),
  );
  const eye = camera.getWorldPosition(new THREE.Vector3());
  const sets = [new Set<number>(), new Set<number>()];
  const count = index?.count ?? pos.count;
  for (let i = 0; i < count; i += 3) {
    const ids = [0, 1, 2].map((n) => (index ? index.getX(i + n) : i + n));
    const [a, b, c] = ids.map((n) => vertices[n].clone().applyMatrix4(mesh.matrixWorld));
    if (b.clone().sub(a).cross(c.clone().sub(a)).dot(eye.clone().sub(a)) <= 0) continue;
    for (const n of ids) sets[inner && pos.getX(n) < 0 ? 0 : 1].add(n);
  }
  const points = [...(leaf === undefined ? new Set([...sets[0], ...sets[1]]) : sets[leaf])].map(
    (i) => project(vertices[i].clone()),
  );
  // Static poses follow the actual skinned leaf; the animated viewer keeps its fixed artwork plane.
  const physical = p.scene !== 'fold';
  const bounds = new THREE.Box3().setFromBufferAttribute(pos as THREE.BufferAttribute);
  const rect =
    !inner && physical
      ? new THREE.Vector4(
          bounds.min.x,
          bounds.min.z,
          bounds.max.x - bounds.min.x,
          bounds.max.z - bounds.min.z,
        )
      : frame;
  let anchor = 0,
    distance = Infinity;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    if (inner && (leaf === 0 ? x > -2 : x < 2)) continue;
    const d = Math.abs(pos.getZ(i)) + Math.abs(x - (leaf === 0 ? -4 : 4));
    if (d < distance) {
      anchor = i;
      distance = d;
    }
  }
  const place = (x: number, z: number) => {
    const v = new THREE.Vector3(x, physical ? pos.getY(anchor) : 0.2492995, z);
    if (physical) mesh.applyBoneTransform(anchor, v);
    return project(v);
  };
  let q = [
    [rect.x, rect.y],
    [rect.x + rect.z, rect.y],
    [rect.x + rect.z, rect.y + rect.w],
    [rect.x, rect.y + rect.w],
  ].map(([x, z]) => place(x, z));
  if (!inner && physical) q = [q[1], q[0], q[3], q[2]];
  const { slot, width: w, height: h } = browserViewport(p, inner);
  if (slot === 'portrait') q = [q[1], q[2], q[3], q[0]];
  if (slot === 'seated' || slot === 'standing') q = [q[3], q[0], q[1], q[2]];
  if (!physical && points.length) {
    // Keep the artwork's top/bottom plane, but cover the full horizontal glass extent.
    const raw = new THREE.Matrix4().fromArray(
      quadMatrix(q, 1, 1).slice(9, -1).split(',').map(Number),
    );
    const inverse = new THREE.Matrix3()
      .set(
        raw.elements[0],
        raw.elements[4],
        raw.elements[12],
        raw.elements[1],
        raw.elements[5],
        raw.elements[13],
        raw.elements[3],
        raw.elements[7],
        raw.elements[15],
      )
      .invert();
    const us = points
      .map((v) => {
        const uv = new THREE.Vector3(v.x, v.y, 1).applyMatrix3(inverse);
        return uv.x / uv.z;
      })
      .filter(Number.isFinite);
    const left = Math.min(0, ...us) - 0.002,
      right = Math.max(1, ...us) + 0.002;
    const at = (u: number, v: number) => {
      const point = new THREE.Vector4(u, v, 0, 1).applyMatrix4(raw);
      return { x: point.x / point.w, y: point.y / point.w };
    };
    q = [at(left, 0), at(right, 0), at(right, 1), at(left, 1)];
  }
  const matrix = quadMatrix(q, w, h);
  return {
    id: inner ? (leaf === 0 ? 'inner-left' : 'inner') : 'outer',
    clip: 'none',
    matrix,
    width: w,
    height: h,
    visible: points.length >= 3 && !!matrix,
    blur:
      p.scene === 'fold'
        ? ((THREE.MathUtils.smoothstep(screenMotion(inner, p.view.open), 0, 1) * 72) / 2670) * w
        : 0,
  };
}
