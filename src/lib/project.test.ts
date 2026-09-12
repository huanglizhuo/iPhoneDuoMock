import { describe, expect, it } from 'vitest';
import {
  initialProject,
  projectSchema,
  safeName,
  missingSlots,
  SPECS,
  dimensions,
} from './project';
import { openingAt, totalDuration } from './timeline';
import { fitRect } from './assets';
describe('project boundary', () => {
  it('accepts initial versioned project and rejects bad active IDs', () => {
    const p = initialProject();
    expect(projectSchema.safeParse(p).success).toBe(true);
    p.activePageId = 'missing';
    expect(projectSchema.safeParse(p).success).toBe(false);
  });
  it('rejects remote images and out of range or NaN view values', () => {
    const p = initialProject();
    p.view.open = NaN;
    expect(projectSchema.safeParse(p).success).toBe(false);
    p.view.open = 2;
    expect(projectSchema.safeParse(p).success).toBe(false);
    p.view.open = 1;
    p.pages[0].slots.outer.asset = {
      name: 'x',
      data: 'https://tracking.test/p.png',
      width: 1,
      height: 1,
      source: 'design',
    };
    expect(projectSchema.safeParse(p).success).toBe(false);
  });
  it('rejects duplicate page IDs, versions, too many pages', () => {
    const p = initialProject();
    p.pages.push(p.pages[0]);
    expect(projectSchema.safeParse(p).success).toBe(false);
    expect(projectSchema.safeParse({ ...initialProject(), schemaVersion: 2 }).success).toBe(false);
  });
  it('requires real content when no inner fallback exists', () => {
    const p = initialProject();
    expect(missingSlots(p)).toEqual(['outer', 'landscape']);
    p.scene = 'standing';
    expect(missingSlots(p)).toEqual(['standing']);
  });
  it('preserves Chinese names but strips unsafe path components', () => {
    expect(safeName('../山野/a:b')).toBe('--山野-a-b');
  });
  it('keeps scene output sizing through capture and respects fixed-size overrides', () => {
    const p = initialProject();
    p.workspace = 'browser';
    p.output.size = 'scene';
    p.scene = 'closed';
    expect(dimensions(p)).toMatchObject({ width: 1398, height: 2034 });
    const captured = projectSchema.parse({ ...p, workspace: 'screenshots' });
    expect(dimensions(captured)).toEqual(dimensions(p));
    captured.scene = 'landscape';
    expect(dimensions(captured)).toMatchObject({ width: 2853, height: 2007 });
    captured.output.size = 'square';
    expect(dimensions(captured)).toMatchObject({ width: 1200, height: 1200 });
  });
  it('keeps official inner and outer dimensions distinct', () => {
    expect(SPECS.outer.width).toBe(1398);
    expect(SPECS.landscape.width).toBe(2853);
    expect(SPECS.portrait.height).toBe(2853);
  });
  it('fills custom background defaults for legacy projects and validates them', () => {
    const legacy = JSON.parse(JSON.stringify(initialProject()));
    delete legacy.view.backgroundColor;
    delete legacy.view.backgroundImage;
    const parsed = projectSchema.parse(legacy);
    expect(parsed.view.backgroundColor).toMatch(/^#[0-9a-f]{6}$/i);
    expect(parsed.view.backgroundImage).toBeNull();
    parsed.view.backgroundColor = 'red';
    expect(projectSchema.safeParse(parsed).success).toBe(false);
    parsed.view.backgroundColor = '#232a36';
    parsed.view.backgroundImage = { name: 'x', data: 'https://site/bg.png', width: 10, height: 10 };
    expect(projectSchema.safeParse(parsed).success).toBe(false);
  });
});
describe('deterministic timeline', () => {
  const a = {
    kind: 'open' as const,
    duration: 4,
    startHold: 1,
    endHold: 1,
    easing: 'smooth' as const,
  };
  it('holds endpoints and clamps out of bounds time', () => {
    expect(totalDuration(a)).toBe(6);
    expect(openingAt(-4, a)).toBe(0);
    expect(openingAt(1, a)).toBe(0);
    expect(openingAt(3, a)).toBe(0.5);
    expect(openingAt(8, a)).toBe(1);
  });
  it('returns closed on both loop ends, open at midpoint', () => {
    const loop = { ...a, kind: 'loop' as const };
    expect(openingAt(0, loop)).toBe(0);
    expect(openingAt(3, loop)).toBe(1);
    expect(openingAt(6, loop)).toBe(0);
  });
  it('close reverses the trajectory', () => {
    expect(openingAt(0, { ...a, kind: 'close' })).toBe(1);
    expect(openingAt(6, { ...a, kind: 'close' })).toBe(0);
  });
});
describe('fit geometry', () => {
  it('contains a square without stretching', () => {
    expect(fitRect(100, 100, 200, 100, { fit: 'contain', x: 0, y: 0, zoom: 2 })).toEqual({
      x: 50,
      y: 0,
      width: 100,
      height: 100,
    });
  });
  it('fills and pans using source proportions', () => {
    expect(fitRect(100, 100, 200, 100, { fit: 'cover', x: 0.5, y: 1, zoom: 1 })).toEqual({
      x: 0,
      y: -100,
      width: 200,
      height: 200,
    });
  });
});

describe('retired store mode compatibility', () => {
  it('opens legacy store projects as images without losing uploads or settings', () => {
    const p = initialProject();
    const old = { ...p, mode: 'store' };
    const migrated = projectSchema.parse(old);
    expect(migrated.mode).toBe('image');
    expect(migrated.pages).toEqual(p.pages);
    expect(migrated.output).toEqual(p.output);
  });
});

describe('animation scene parity', () => {
  it('animation requires the inner and outer slots for its selected pose', () => {
    const p = initialProject();
    p.mode = 'animation';
    p.scene = 'seated';
    expect(missingSlots(p)).toEqual(['seated', 'outer']);
    p.scene = 'standing';
    expect(missingSlots(p)).toEqual(['landscape', 'standing']);
  });
});
