import { findLink, readPastedLink } from '../../src/link/pastedLink';

describe('readPastedLink', () => {
  test.each([
    ['https://www.instagram.com/p/ABC123/', 'https://www.instagram.com/p/ABC123/'],
    ['https://www.instagram.com/reel/XYZ/?igsh=abc123', 'https://www.instagram.com/reel/XYZ/?igsh=abc123'],
    ['https://instagram.com/p/ABC123', 'https://www.instagram.com/p/ABC123'],
    ['instagram.com/p/ABC123/', 'https://www.instagram.com/p/ABC123/'],
    ['https://instagr.am/p/ABC123/', 'https://www.instagram.com/p/ABC123/'],
    ['Look at this https://www.instagram.com/p/ABC123/ haha', 'https://www.instagram.com/p/ABC123/'],
    ['https://www.instagram.com/p/ABC123/.', 'https://www.instagram.com/p/ABC123/'],
    ['  https://www.instagram.com/someone/  ', 'https://www.instagram.com/someone/'],
    ['HTTPS://WWW.INSTAGRAM.COM/p/ABC/', 'https://www.instagram.com/p/ABC/'],
  ])('Instagram: %s', (text, url) => {
    expect(readPastedLink(text)).toEqual({ kind: 'instagram', url });
  });

  test.each([
    ['https://www.linkedin.com/posts/someone_activity-123/', 'https://www.linkedin.com/posts/someone_activity-123/'],
    ['https://www.linkedin.com/in/someone/', 'https://www.linkedin.com/in/someone/'],
    ['https://lnkd.in/abc', 'https://lnkd.in/abc'],
    ['linkedin.com/in/someone', 'https://linkedin.com/in/someone'],
  ])('LinkedIn: %s', (text, url) => {
    expect(readPastedLink(text)).toEqual({ kind: 'linkedin', url });
  });

  test.each(['', 'hello there', 'https://example.com/page', 'javascript:alert(1)', 'instagram'])(
    'not a link Unfeed opens: %s',
    (text) => {
      expect(readPastedLink(text)).toEqual({ kind: 'none' });
    },
  );
});

test('findLink takes the first link in the text', () => {
  expect(findLink('one https://a.com/x two https://b.com/y')).toBe('https://a.com/x');
  expect(findLink('nothing here')).toBeNull();
});
