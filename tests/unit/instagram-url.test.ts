// Charter stretch S1: the Instagram My code QR encodes the profile URL built
// from the saved username. The builder is the only new logic, so these cover
// its contract: clean values, the @ and whitespace forms the settings row
// allows, and everything that must fall back to the empty state.

import { buildInstagramProfileUrl } from '../../src/qr/instagramUrl';

test.each([
  ['denis', 'https://www.instagram.com/denis/'],
  ['denis.popov', 'https://www.instagram.com/denis.popov/'],
  ['denis_popov', 'https://www.instagram.com/denis_popov/'],
  ['@denis', 'https://www.instagram.com/denis/'],
  ['  denis  ', 'https://www.instagram.com/denis/'],
  ['/denis/', 'https://www.instagram.com/denis/'],
  ['Denis', 'https://www.instagram.com/Denis/'],
  ['a', 'https://www.instagram.com/a/'],
])('builds the profile URL from %s', (username, expected) => {
  expect(buildInstagramProfileUrl(username)).toBe(expected);
});

test.each([
  ['', 'empty'],
  ['   ', 'whitespace only'],
  ['@@denis', 'double @'],
  ['de/nis', 'slash inside'],
  ['den is', 'space inside'],
  ['denis?', 'query mark'],
  ['averyveryverylongusernamethatiswayoverthirtychars', 'over 30 chars'],
])('returns null for an unusable username: %s (%s)', (username) => {
  expect(buildInstagramProfileUrl(username)).toBeNull();
});

test('returns null when the username is null or undefined', () => {
  expect(buildInstagramProfileUrl(null)).toBeNull();
  expect(buildInstagramProfileUrl(undefined)).toBeNull();
});
