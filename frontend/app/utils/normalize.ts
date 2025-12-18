// Utility to normalize ingredient names for matching and display

// Characters to strip for KEY MATCHING only (not display)
const STRIP_FOR_KEY = /[\(\)\[\]\{\}:,_\-–—]/g;

// Characters to strip for DISPLAY (keep hyphens!)
const STRIP_FOR_DISPLAY = /[\(\)\[\]\{\}:,_–—]/g;

// Map common variants -> CocktailDB *canonical* ingredient names (exact casing)
const ALIASES_TO_COCKTAILDB: Record<string, string> = {
  gin: 'Gin',
  'dry gin': 'Gin',
  'london dry gin': 'Gin',

  tequila: 'Tequila',
  'blanco tequila': 'Tequila',
  'silver tequila': 'Tequila',

  'white rum': 'White Rum',
  'light rum': 'White Rum',
  rum: 'Rum',
  'gold rum': 'Rum',
  'dark rum': 'Dark Rum',

  'triple sec': 'Triple Sec',
  cointreau: 'Triple Sec',
  curaçao: 'Triple Sec',
  'orange curaçao': 'Triple Sec',

  'sweet vermouth': 'Sweet Vermouth',
  'rosso vermouth': 'Sweet Vermouth',
  'dry vermouth': 'Dry Vermouth',

  'angostura bitters': 'Angostura Bitters',
  bitters: 'Bitters',

  'simple syrup': 'Sugar Syrup',
  'sugar syrup': 'Sugar Syrup',

  'club soda': 'Soda Water',
  soda: 'Soda Water',

  'fresh lime juice': 'Lime Juice',
  'lime juice': 'Lime Juice',
  'fresh lemon juice': 'Lemon Juice',
  'lemon juice': 'Lemon Juice',

  // Common hyphenated items - map to their CocktailDB canonical names
  '7 up': '7-Up',
  '7up': '7-Up',
  'coca cola': 'Coca-Cola',
  'coke': 'Coca-Cola',
};

export type NormalizedIngredient = {
  displayName: string; // what we show in UI
  canonicalName: string; // what we use for CocktailDB image URL / exact lookup
};

// Title Case helper for a nicer display when we don't have an alias
// Handles hyphenated words properly: "ice-cream" -> "Ice-Cream"
function titleCase(s: string) {
  return s
    .split(' ')
    .map((word) =>
      word
        .split('-')
        .map((part) =>
          part.length > 0
            ? part[0].toUpperCase() + part.slice(1).toLowerCase()
            : part
        )
        .join('-')
    )
    .join(' ');
}

// Full, non-truncating normalizer
export function normalizeIngredient(raw: string): NormalizedIngredient {
  if (!raw) return { displayName: '', canonicalName: '' };

  // For DISPLAY: keep hyphens, only remove other punctuation
  const displayCollapsed = raw.replace(STRIP_FOR_DISPLAY, ' ').replace(/\s+/g, ' ').trim();

  // For KEY LOOKUP: strip hyphens too for matching aliases
  const keyCollapsed = raw.replace(STRIP_FOR_KEY, ' ').replace(/\s+/g, ' ').trim();
  const lower = keyCollapsed.toLowerCase();

  // Remove filler/unit words only for the *key* we look up
  const key = lower
    .replace(/\b(fresh|house|homemade|of|the|and|a)\b/g, '')
    .replace(/\b(ml|oz|ounce|ounces|tsp|tbsp|dash|dashes)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  // Map to a known CocktailDB name when possible
  const aliasMatch = ALIASES_TO_COCKTAILDB[key] ?? ALIASES_TO_COCKTAILDB[lower];
  
  if (aliasMatch) {
    // Use the canonical CocktailDB name (preserves their exact casing/hyphens)
    return {
      displayName: aliasMatch,
      canonicalName: aliasMatch,
    };
  }

  // No alias found - use the original with hyphens preserved
  const displayName = titleCase(displayCollapsed);
  
  return { 
    displayName, 
    canonicalName: displayName, // Use display name which preserves hyphens
  };
}

/**
 * Lightweight key used for fuzzy matching/sets (keeps old behavior).
 * NOTE: This intentionally simplifies down to a single comparable token/phrase.
 */
export function normalizeKey(raw: string): string {
  if (!raw) return '';
  let s = raw.toLowerCase().trim();
  s = s.replace(STRIP_FOR_KEY, ' ').replace(/\s+/g, ' ');
  s = s
    .replace(/\b(fresh|house|homemade|of|the|and|a)\b/g, '')
    .replace(/\b(ml|oz|ounce|ounces|tsp|tbsp|dash|dashes)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  // very light singularization
  if (s.endsWith('ies')) s = s.slice(0, -3) + 'y';
  else if (s.endsWith('s') && s.length > 3) s = s.slice(0, -1);

  // prefer alias if available; otherwise return the simplified phrase
  return ALIASES_TO_COCKTAILDB[s]?.toLowerCase() ?? s;
}

export function normalizeSet(list: string[]): Set<string> {
  return new Set(list.map(normalizeKey));
}