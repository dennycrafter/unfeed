// Which device the web views say they are. Shared by the native host and the
// shells, and safe on web (the web preview has no real page to identify).

/** Most pages: an iPhone, so both sites serve their phone layouts. */
export const IPHONE_USER_AGENT =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1';

/** LinkedIn's Messages tab (Denis, 21 Nov 2026). As an iPhone, LinkedIn
 * serves its Lite messaging (/mwlite/), which has no reactions and no reply
 * to a single message. As an iPad it serves the full messaging, which fits
 * a phone screen and has both. Checked on the live site on 21 Nov 2026. */
export const IPAD_USER_AGENT =
  'Mozilla/5.0 (iPad; CPU OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1';
