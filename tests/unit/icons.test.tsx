// The Settings gear (Denis, 25 Oct 2026): the old icon was a ring with eight
// loose spokes and read as a sun. The new one is one closed outline with
// eight square teeth around a round hole, which is what a gear looks like.

import { render } from '@testing-library/react-native';
import { GEAR_OUTLINE, IconGear } from '../../src/components/icons';

function outlinePoints(path: string): [number, number][] {
  const numbers = path.match(/-?\d+(\.\d+)?/g)?.map(Number) ?? [];
  const points: [number, number][] = [];
  for (let i = 0; i + 1 < numbers.length; i += 2) points.push([numbers[i], numbers[i + 1]]);
  return points;
}

test('the gear is one closed outline, not loose spokes', () => {
  expect(GEAR_OUTLINE.startsWith('M')).toBe(true);
  expect(GEAR_OUTLINE.trim().endsWith('Z')).toBe(true);
  expect((GEAR_OUTLINE.match(/M/g) ?? []).length).toBe(1);
});

test('the gear has eight teeth: every corner sits on the tooth ring or the root ring', () => {
  const points = outlinePoints(GEAR_OUTLINE);
  expect(points).toHaveLength(32);
  const radii = points.map(([x, y]) => Math.hypot(x - 12, y - 12));
  const outer = radii.filter((radius) => radius > 9);
  const inner = radii.filter((radius) => radius < 8);
  expect(outer).toHaveLength(16);
  expect(inner).toHaveLength(16);
  // Teeth stand out clearly from the body, so the shape cannot read as a ring.
  expect(Math.min(...outer) - Math.max(...inner)).toBeGreaterThan(2);
});

test('the gear renders inside the 24 point icon box', async () => {
  const { toJSON } = await render(<IconGear size={24} />);
  expect(JSON.stringify(toJSON())).toContain(GEAR_OUTLINE.slice(0, 12));
  for (const [x, y] of outlinePoints(GEAR_OUTLINE)) {
    expect(x).toBeGreaterThanOrEqual(0);
    expect(x).toBeLessThanOrEqual(24);
    expect(y).toBeGreaterThanOrEqual(0);
    expect(y).toBeLessThanOrEqual(24);
  }
});
