// A typed in profile link must become a full URL for the QR code, and the
// new page messages must survive the wire format check.

import { normalizeProfileUrl } from '../../src/hosts/linkedinUrl';
import { parsePageMessage } from '../../src/inject/protocol';

describe('normalizeProfileUrl', () => {
  test('keeps a full https link', () => {
    expect(normalizeProfileUrl('https://www.linkedin.com/in/ada/')).toBe('https://www.linkedin.com/in/ada/');
  });

  test('adds https to a link typed without it', () => {
    expect(normalizeProfileUrl('linkedin.com/in/ada')).toBe('https://linkedin.com/in/ada');
    expect(normalizeProfileUrl('  www.linkedin.com/in/ada/  ')).toBe('https://www.linkedin.com/in/ada/');
  });

  test('keeps http as typed', () => {
    expect(normalizeProfileUrl('http://linkedin.com/in/ada')).toBe('http://linkedin.com/in/ada');
  });

  test('returns null for blank text', () => {
    expect(normalizeProfileUrl('   ')).toBeNull();
  });
});

describe('new page messages', () => {
  test('li-own-profile needs a url', () => {
    expect(parsePageMessage('{"type":"li-own-profile","url":"https://www.linkedin.com/in/ada/"}')).toEqual({
      type: 'li-own-profile',
      url: 'https://www.linkedin.com/in/ada/',
    });
    expect(parsePageMessage('{"type":"li-own-profile"}')).toBeNull();
  });

  test('ig-create-missing parses', () => {
    expect(parsePageMessage('{"type":"ig-create-missing"}')).toEqual({ type: 'ig-create-missing' });
  });
});
