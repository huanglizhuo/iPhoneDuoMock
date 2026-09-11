import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

test('downloaded device retains the official rig, screen meshes and local texture dependencies', async () => {
  const model = JSON.parse(await readFile('public/models/apple-duo/duo.gltf', 'utf8'));
  expect(model.meshes).toHaveLength(62);
  expect(model.animations.map((a: { name: string }) => a.name)).toEqual(['Intro', 'Slider']);
  expect(
    model.nodes.some((n: { name: string }) => n.name === 'skeleton_0_3_screenTexture_geo'),
  ).toBe(true);
  expect(
    model.nodes.some(
      (n: { name: string }) => n.name === 'skeleton_0_7_outerDisplayScreenTexture_geo',
    ),
  ).toBe(true);
  for (const file of [...model.images, ...model.buffers]) {
    expect(file.uri).not.toContain('://');
    expect((await readFile('public/models/apple-duo/' + file.uri)).length).toBeGreaterThan(0);
  }
});
