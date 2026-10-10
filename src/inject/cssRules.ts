// Parser for the named CSS files under src/inject/css. A rule is introduced
// by a marker comment and owns every CSS block after it until the next
// marker:
//
//     /* @unfeed-rule <id> [scope=token,tokens] -- Title */
//     selector { display: none !important; }
//
// Pure and browser safe: the injected runtime, scripts/build-inject.ts and
// the tests all share this parser, so rule ids, scopes and css text can
// never drift between the app, the injected bundle and the userscripts.
// Note: bodies must not contain braces, so no @media blocks in these files.

export interface CssRuleBlock {
  selectors: string[];
  body: string;
}

export interface CssRule {
  id: string;
  title: string;
  /** Scope tokens the rule is limited to. Empty list: the rule always applies. */
  scopes: string[];
  blocks: CssRuleBlock[];
}

const RULE_MARKER = /\/\*\s*@unfeed-rule\s+([A-Za-z0-9_-]+)\s+([^*]*)\*\//g;

function splitBlocks(css: string): CssRuleBlock[] {
  const blocks: CssRuleBlock[] = [];
  let index = 0;
  while (index < css.length) {
    const open = css.indexOf('{', index);
    if (open === -1) break;
    const close = css.indexOf('}', open);
    if (close === -1) break;
    const selectorText = css.slice(index, open).trim();
    const body = css.slice(open + 1, close).trim();
    if (selectorText) {
      blocks.push({
        selectors: selectorText.split(',').map((selector) => selector.trim()).filter(Boolean),
        body,
      });
    }
    index = close + 1;
  }
  return blocks;
}

export function parseNamedCss(css: string): CssRule[] {
  const rules: CssRule[] = [];
  const markers = [...css.matchAll(RULE_MARKER)];
  for (let i = 0; i < markers.length; i += 1) {
    const marker = markers[i];
    const meta = marker[2].trim();
    const dash = meta.indexOf('--');
    const optionText = dash === -1 ? meta : meta.slice(0, dash).trim();
    const title = dash === -1 ? meta : meta.slice(dash + 2).trim();
    let scopes: string[] = [];
    const scopeMatch = /(?:^|\s)scope=([\w,-]+)/.exec(optionText);
    if (scopeMatch) {
      scopes = scopeMatch[1].split(',').map((token) => token.trim()).filter(Boolean);
    }
    const bodyStart = (marker.index ?? 0) + marker[0].length;
    const bodyEnd = i + 1 < markers.length ? (markers[i + 1].index ?? css.length) : css.length;
    rules.push({ id: marker[1], title, scopes, blocks: splitBlocks(css.slice(bodyStart, bodyEnd)) });
  }
  return rules;
}

/** The rule as one plain css fragment, for a style element's text. */
export function ruleCss(rule: CssRule): string {
  return rule.blocks
    .map((block) => `${block.selectors.join(', ')} { ${block.body} }`)
    .join('\n');
}

/** All selectors of a rule, for counting what it hides on a page. */
export function ruleSelectors(rule: CssRule): string[] {
  return rule.blocks.flatMap((block) => block.selectors);
}
