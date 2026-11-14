/**
 * Fixed dropdown option lists for Marble Master (Add Catalogue), each paired
 * with a short code used to build a marble/product code in other
 * components. The _OPTIONS arrays drive the dropdowns (label is what gets
 * stored on the CatalogueItem field, same as before); the _CODE_MAP that
 * follows each list is the label → code lookup for code generation.
 */

export interface CodedOption {
  label: string;
  code: string;
}

export const COLLECTION_OPTIONS: CodedOption[] = [
  { label: 'Luna - All white',            code: 'LUNA'  },
  { label: 'Obsidian - All Black',        code: 'OBSDA' },
  { label: 'Prism - All color',           code: 'PRSM'  },
  { label: 'Lumina - Onyx',               code: 'LUM'   },
  { label: 'Aurora - Semi precies',       code: 'AROR'  },
  { label: 'Dune - traventine, Sandstore', code: 'DUNE' },
  { label: 'Aleleir - CNC, water',        code: 'ART'   },
];

export const COUNTRY_OPTIONS: CodedOption[] = [
  { label: 'India',  code: 'IN' },
  { label: 'Iran',   code: 'IR' },
  { label: 'Turkey', code: 'TR' },
  { label: 'China',  code: 'CN' },
  { label: 'Spain',  code: 'SP' },
];

export const STONE_FAMILY_OPTIONS: CodedOption[] = [
  { label: 'Marble',              code: 'MAR' },
  { label: 'Granite',             code: 'GRA' },
  { label: 'Onyx',                code: 'ONY' },
  { label: 'Travertine',          code: 'TRA' },
  { label: 'Quartzite',           code: 'QTZ' },
  { label: 'Serpentine',          code: 'SER' },
  { label: 'Quartz',              code: 'QRT' },
  { label: 'Terrazzo',            code: 'TER' },
  { label: 'Artificial Marble',   code: 'ART' },
  { label: 'Semi Precious Stone', code: 'SPS' },
  { label: 'Gemstone',            code: 'GEM' },
  { label: 'Agate',               code: 'AGA' },
  { label: 'Italian Marble',      code: 'ITA' },
  { label: 'Indian Marble',       code: 'IND' },
  { label: 'Makrana Marble',      code: 'MAK' },
  { label: 'Carrara Marble',      code: 'CAR' },
  { label: 'Calacatta Marble',    code: 'CAL' },
  { label: 'Statuario Marble',    code: 'STA' },
];

function toCodeMap(options: CodedOption[]): Record<string, string> {
  return Object.fromEntries(options.map(o => [o.label, o.code]));
}

/** label → code lookups, for marble-code generation in other components. */
export const COLLECTION_CODE_MAP: Record<string, string> = toCodeMap(COLLECTION_OPTIONS);
export const COUNTRY_CODE_MAP: Record<string, string> = toCodeMap(COUNTRY_OPTIONS);
export const STONE_FAMILY_CODE_MAP: Record<string, string> = toCodeMap(STONE_FAMILY_OPTIONS);

/**
 * For slab/product-code generation specifically: every option's code is
 * shortened to its first 2 characters. If that 2-char prefix collides with
 * another option's in the same list, every option sharing that prefix
 * falls back to its first 3 characters instead (just those that collide —
 * the rest of the list stays at 2 characters).
 */
function toShortCodeMap(options: CodedOption[]): Record<string, string> {
  const twoChar = options.map(o => o.code.slice(0, 2).toUpperCase());
  const counts = new Map<string, number>();
  twoChar.forEach(c => counts.set(c, (counts.get(c) || 0) + 1));

  const map: Record<string, string> = {};
  options.forEach((o, i) => {
    const two = twoChar[i];
    map[o.label] = (counts.get(two) || 0) > 1 ? o.code.slice(0, 3).toUpperCase() : two;
  });
  return map;
}

/** label → short code lookups, used by Add Marble Master / Add Slab to build a product/slab code. */
export const COLLECTION_SHORT_CODE_MAP: Record<string, string> = toShortCodeMap(COLLECTION_OPTIONS);
export const COUNTRY_SHORT_CODE_MAP: Record<string, string> = toShortCodeMap(COUNTRY_OPTIONS);
export const STONE_FAMILY_SHORT_CODE_MAP: Record<string, string> = toShortCodeMap(STONE_FAMILY_OPTIONS);

/**
 * Abbreviates free-text fields that have no fixed code list (e.g. Color):
 * multi-word text becomes initials (e.g. "Statuario White" → "SW"), a
 * single word is truncated to its first 2 letters (e.g. "White" → "WH").
 */
export function abbreviate(text: string | undefined | null, fallbackLength = 2): string {
  const trimmed = (text || '').trim();
  if (!trimmed) return '';
  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length > 1) {
    return words.map(w => w.charAt(0).toUpperCase()).join('');
  }
  return trimmed.slice(0, fallbackLength).toUpperCase();
}
