import type { Project } from './project';
type Animation = Project['animation'];
export const totalDuration = (a: Animation) => a.duration + a.startHold + a.endHold;
export function openingAt(seconds: number, a: Animation) {
  const t = Math.max(0, Math.min(1, (seconds - a.startHold) / a.duration));
  let p = a.kind === 'loop' ? (t <= 0.5 ? t * 2 : (1 - t) * 2) : a.kind === 'close' ? 1 - t : t;
  if (a.easing === 'smooth') p = p * p * (3 - 2 * p);
  return p;
}

/** Shared preview/export frame: animation changes opening, never the selected pose. */
export function projectAt(p: Project, seconds: number): Project {
  return p.mode === 'animation'
    ? { ...p, view: { ...p.view, open: openingAt(seconds, p.animation) } }
    : p;
}
