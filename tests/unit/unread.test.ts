// Unit tests for the unread count parsed from the document title (charter
// section 8.5: both sites put (3) at the start when there are unread
// messages; no count means 0). More title shapes arrive with T5.

import { parseUnreadCount } from '../../src/inject/unread';

describe('parseUnreadCount', () => {
  test.each([
    ['(3) Instagram', 3],
    ['(12) Messaging | LinkedIn', 12],
    ['(1) Instagram', 1],
    ['(0) Instagram', 0],
    ['  (7) Instagram', 7],
    ['Inbox • Direct', 0],
    ['', 0],
    ['Instagram', 0],
    ['Instagram (3)', 0],
    ['(3) Instagram (5)', 3],
  ])('%s', (title, expected) => {
    expect(parseUnreadCount(title)).toBe(expected);
  });

  test('a three digit count still parses', () => {
    expect(parseUnreadCount('(999) Instagram')).toBe(999);
  });

  test('a four digit run is not a count', () => {
    // Four digits at the start of a title is not a message count shape.
    expect(parseUnreadCount('(1234) Instagram')).toBe(0);
  });

  test('a null or undefined title is safe', () => {
    expect(parseUnreadCount(null as unknown as string)).toBe(0);
    expect(parseUnreadCount(undefined as unknown as string)).toBe(0);
  });
});
