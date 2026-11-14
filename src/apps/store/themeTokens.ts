import { THEME_TOKEN_NAMES, type ThemeTokens } from "./protocol";

/**
 * Reads the active desktop theme from the page, so store apps can be given
 * the same colours, corner radius and fonts. Call it after the theme has been
 * applied to the document (for example from an effect).
 */
export const readThemeTokens = (): ThemeTokens => {
  const styles = getComputedStyle(document.documentElement);
  const tokens: ThemeTokens = {};
  for (const name of THEME_TOKEN_NAMES) {
    const value = styles.getPropertyValue(`--${name}`).trim();
    if (value) tokens[name] = value;
  }
  return tokens;
};
