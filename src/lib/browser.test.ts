import { describe, it, expect } from 'vitest';
import { websiteUrl, quadMatrix, browserViewport } from './browser';
import { initialProject, projectSchema } from './project';
describe('browser workspace', () => {
  it('normalizes HTTPS addresses and rejects executable or credential-bearing URLs', () => {
    expect(websiteUrl(' example.com/path ')).toBe('https://example.com/path');
    expect(websiteUrl('')).toBe('');
    expect(websiteUrl('localhost:5174/demo')).toBe('https://localhost:5174/demo');
    expect(websiteUrl('http://127.0.0.1:5174/')).toBe('http://127.0.0.1:5174/');
    for (const input of [
      'javascript:alert(1)',
      'data:text/html,x',
      'file:///tmp/a',
      'https://user:secret@example.com',
    ])
      expect(() => websiteUrl(input)).toThrow();
  });
  it('loads older projects into screenshot mode with a local demo', () => {
    const { workspace: _workspace, browser: _browser, ...old } = initialProject();
    const loaded = projectSchema.parse(old);
    expect(loaded.workspace).toBe('screenshots');
    expect(loaded.browser).toEqual({ url: '', pixelRatio: 3, interactive: true });
  });
  it('keeps logical iframe sizes independent of output composition size', () => {
    const p = initialProject();
    expect(browserViewport(p, true)).toMatchObject({ width: 951, height: 669 });
    expect(browserViewport(p, false)).toMatchObject({ width: 466, height: 678 });
    p.scene = 'portrait';
    expect(browserViewport(p, true)).toMatchObject({ width: 669, height: 951 });
  });
  it('maps all four iframe corners onto an arbitrary projected screen', () => {
    const q = [
      { x: 10, y: 30 },
      { x: 230, y: 15 },
      { x: 200, y: 190 },
      { x: 20, y: 160 },
    ];
    const matrix = quadMatrix(q, 400, 600).slice(9, -1).split(',').map(Number);
    for (const [i, [x, y]] of [
      [0, 0],
      [400, 0],
      [400, 600],
      [0, 600],
    ].entries()) {
      const divisor = matrix[3] * x + matrix[7] * y + matrix[15];
      expect((matrix[0] * x + matrix[4] * y + matrix[12]) / divisor).toBeCloseTo(q[i].x);
      expect((matrix[1] * x + matrix[5] * y + matrix[13]) / divisor).toBeCloseTo(q[i].y);
    }
    expect(quadMatrix(Array(4).fill({ x: 0, y: 0 }), 400, 600)).toBe('');
  });
});
