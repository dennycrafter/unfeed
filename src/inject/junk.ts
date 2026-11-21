// Junk the pages never need (Denis, 21 Nov 2026): tracking and ad calls
// that common ad blockers (EasyPrivacy) also stop. Bot protection
// (protechts, recaptcha, merchantpool) is never listed here: stopping it
// makes the sites ask for captchas. Pure and browser safe: the injected
// script and the native host share it.

const JUNK: RegExp[] = [
  // Instagram's own event logging ("banzai").
  /^https:\/\/(www\.)?instagram\.com\/ajax\/bz\b/,
  /^https:\/\/(www\.)?instagram\.com\/logging\//,
  /^https:\/\/graph\.instagram\.com\/logging_client_events\b/,
  // LinkedIn ad tags and tracking pixels.
  /^https:\/\/(www\.)?linkedin\.com\/tscp-serving\//,
  /^https:\/\/(www\.)?linkedin\.com\/li\/track\b/,
  /^https:\/\/px\.ads\.linkedin\.com\//,
  /^https:\/\/snap\.licdn\.com\/li\.lms-analytics\//,
];

/** True for a request the page can do without. Relative addresses are
 * read against the given origin. */
export function isJunk(url: string, origin?: string): boolean {
  let absolute: string;
  try {
    absolute = new URL(url, origin).href;
  } catch {
    return false;
  }
  return JUNK.some((pattern) => pattern.test(absolute));
}
