// Charter T4 acceptance: at least 15 classifyCode() cases, including the
// charter's list (LinkedIn profile, lnkd.in, Instagram with ?igsh=,
// instagr.am, other URL, plain text, empty string, URL with spaces, uppercase
// host) plus the edge cases the classifier exists for.

import { classifyCode } from '../../src/qr/classifyCode';

describe('classifyCode', () => {
  test('linkedin profile url keeps the vanity', () => {
    expect(classifyCode('https://www.linkedin.com/in/ada-lovelace/')).toEqual({
      kind: 'linkedin',
      url: 'https://www.linkedin.com/in/ada-lovelace/',
      vanity: 'ada-lovelace',
    });
  });

  test('linkedin profile without trailing slash still has the vanity', () => {
    expect(classifyCode('https://www.linkedin.com/in/ada-lovelace')).toEqual({
      kind: 'linkedin',
      url: 'https://www.linkedin.com/in/ada-lovelace',
      vanity: 'ada-lovelace',
    });
  });

  test('linkedin profile with a tracking query keeps the vanity', () => {
    const payload = classifyCode('https://www.linkedin.com/in/ada/?trk=people_like_profile');
    expect(payload).toMatchObject({ kind: 'linkedin', vanity: 'ada' });
  });

  test('lnkd.in share link is linkedin with no vanity', () => {
    expect(classifyCode('https://lnkd.in/abc123')).toEqual({
      kind: 'linkedin',
      url: 'https://lnkd.in/abc123',
      vanity: null,
    });
  });

  test('m.linkedin.com subdomain is linkedin', () => {
    expect(classifyCode('https://m.linkedin.com/in/ada/').kind).toBe('linkedin');
  });

  test('the /in/me placeholder has no vanity', () => {
    expect(classifyCode('https://www.linkedin.com/in/me/')).toMatchObject({
      kind: 'linkedin',
      vanity: null,
    });
  });

  test('the linkedin feed path is linkedin with no vanity', () => {
    expect(classifyCode('https://www.linkedin.com/feed/')).toMatchObject({
      kind: 'linkedin',
      vanity: null,
    });
  });

  test('uppercase host is accepted', () => {
    expect(classifyCode('HTTPS://WWW.LINKEDIN.COM/IN/ADA/')).toMatchObject({
      kind: 'linkedin',
      vanity: 'ada',
    });
  });

  test('a url with surrounding spaces is trimmed', () => {
    expect(classifyCode('  https://www.linkedin.com/in/ada/  ')).toMatchObject({
      kind: 'linkedin',
      vanity: 'ada',
    });
  });

  test('instagram profile with ?igsh= query is instagram', () => {
    expect(classifyCode('https://www.instagram.com/denisp/?igsh=MWabc123')).toEqual({
      kind: 'instagram',
      url: 'https://www.instagram.com/denisp/?igsh=MWabc123',
    });
  });

  test('instagr.am is instagram', () => {
    expect(classifyCode('https://instagr.am/p/abc/').kind).toBe('instagram');
  });

  test('a subdomain of instagram.com is instagram', () => {
    expect(classifyCode('https://help.instagram.com/').kind).toBe('instagram');
  });

  test('any other https url opens in the browser', () => {
    expect(classifyCode('https://example.com/page')).toEqual({
      kind: 'url',
      url: 'https://example.com/page',
    });
  });

  test('plain text is text', () => {
    expect(classifyCode('HELLO-UNFEED-1234')).toEqual({ kind: 'text', text: 'HELLO-UNFEED-1234' });
  });

  test('empty string is empty text', () => {
    expect(classifyCode('')).toEqual({ kind: 'text', text: '' });
  });

  test('whitespace only is empty text', () => {
    expect(classifyCode('   ')).toEqual({ kind: 'text', text: '' });
  });

  test('a non url string with spaces is text', () => {
    expect(classifyCode('not a url at all')).toEqual({ kind: 'text', text: 'not a url at all' });
  });

  test('javascript urls are treated as text, never openable', () => {
    expect(classifyCode('javascript:alert(1)')).toEqual({
      kind: 'text',
      text: 'javascript:alert(1)',
    });
  });

  test('ftp urls on the linkedin host are treated as text', () => {
    expect(classifyCode('ftp://linkedin.com/x').kind).toBe('text');
  });

  test('a bare host without a scheme is text', () => {
    expect(classifyCode('www.linkedin.com/in/ada/').kind).toBe('text');
  });
});
