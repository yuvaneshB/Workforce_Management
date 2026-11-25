/**
 * humanizeAgentOutput.js
 * Utility to parse and format agent findings, recommendations, and output blobs
 * into clean, human-readable structured data.
 */

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/**
 * Format ISO dates (e.g. 2026-08-01) into "Aug 1, 2026"
 */
export function formatDatesInText(text) {
  if (typeof text !== 'string') return text;
  return text.replace(/\b(\d{4})-(\d{2})-(\d{2})\b/g, (match, y, m, d) => {
    const monthIdx = parseInt(m, 10) - 1;
    if (monthIdx >= 0 && monthIdx < 12) {
      const day = parseInt(d, 10);
      return `${MONTH_NAMES[monthIdx]} ${day}, ${y}`;
    }
    return match;
  });
}

/**
 * Format standalone 4+ digit numbers with thousands separators (1312 -> 1,312).
 * Excludes numbers that are part of identifiers (e.g. EMP-10170, PLN-FND-01),
 * percentages (17.0%), or years following month names (e.g. Aug 1, 2026).
 */
export function formatNumbersInText(text) {
  if (typeof text !== 'string') return text;
  return text.replace(/(?<![\w-])(\d{4,})(?![\w%-])/g, (match, digits, offset, fullStr) => {
    const preceding = fullStr.slice(Math.max(0, offset - 25), offset);
    // Skip formatting if preceded by month name (e.g. "Aug 1, 2026" or "Nov 2026")
    if (
      /(\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},\s*|\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+)$/i.test(
        preceding
      )
    ) {
      return match;
    }
    // Skip if it looks like a year preceded by keywords like in, year, since, date
    if (/^(19|20)\d{2}$/.test(match) && /\b(?:year|in|since|until|date)\s+$/i.test(preceding)) {
      return match;
    }
    return Number(match).toLocaleString('en-US');
  });
}

/**
 * Sanitize words "None", "null", "undefined" to "Unassigned"
 */
export function sanitizeNoneWords(text) {
  if (typeof text !== 'string') return text;
  return text.replace(/\b(None|null|undefined)\b/g, 'Unassigned');
}

/**
 * Convert snake_case or kebab-case to Title Case
 */
export function toTitleCase(str) {
  if (!str || typeof str !== 'string') return '';
  return str
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .trim()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Comprehensive text cleaner applying date formatting, number formatting,
 * sanitizing 'None' words, stripping dangling backslashes, and trimming.
 */
export function cleanText(val) {
  if (val === null || val === undefined) return 'Unassigned';
  if (typeof val === 'number') {
    return val >= 1000 ? val.toLocaleString('en-US') : String(val);
  }
  if (typeof val !== 'string') {
    return String(val);
  }

  let cleaned = val.trim();
  // Strip outer quotes if enclosed
  if (
    (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
    (cleaned.startsWith("'") && cleaned.endsWith("'"))
  ) {
    cleaned = cleaned.slice(1, -1).trim();
  }

  // Strip JSON escape backslashes
  cleaned = cleaned.replace(/\\"/g, '"').replace(/\\\\/g, '\\');

  // Format dates first so years (e.g. 2026) are formatted as "Aug 1, 2026"
  cleaned = formatDatesInText(cleaned);
  // Format standalone numbers (preserves "Aug 1, 2026")
  cleaned = formatNumbersInText(cleaned);
  // Replace None/null/undefined
  cleaned = sanitizeNoneWords(cleaned);

  return cleaned.trim();
}

/**
 * Safely parse JSON from string or object, supporting double-encoded JSON strings.
 * Returns parsed object/array or null if invalid.
 */
export function safeParseJson(input) {
  if (!input) return null;
  if (typeof input === 'object') return input;
  if (typeof input !== 'string') return null;

  let str = input.trim();
  // Check if string could be JSON (starts with {, [, or quotes containing them)
  if (!str.startsWith('{') && !str.startsWith('[') && !str.startsWith('"')) {
    return null;
  }

  try {
    let parsed = JSON.parse(str);
    // Handle double-encoded JSON string
    if (typeof parsed === 'string') {
      const secondTrimmed = parsed.trim();
      if (secondTrimmed.startsWith('{') || secondTrimmed.startsWith('[')) {
        try {
          parsed = JSON.parse(secondTrimmed);
        } catch {
          // keep parsed as string
        }
      }
    }
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Checks if a string looks like a JSON blob (object or array).
 */
export function isJsonBlob(str) {
  if (typeof str !== 'string') return false;
  const trimmed = str.trim();
  if (
    (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
    (trimmed.startsWith('[') && trimmed.endsWith(']'))
  ) {
    const parsed = safeParseJson(trimmed);
    return parsed !== null && typeof parsed === 'object';
  }
  return false;
}

const KNOWN_FIELD_KEYS = new Set([
  'id', 'finding_id', 'code', 'rec_id',
  'title', 'name', 'headline', 'summary', 'header',
  'severity', 'priority', 'level',
  'metric', 'observed_gap', 'turnover', 'exposure', 'verified_metric',
  'affected', 'scope', 'location', 'where', 'line',
  'evidence', 'detail', 'details', 'description', 'what',
  'operational_impact', 'impact', 'root_cause', 'why',
  'recommendation', 'action', 'remedy', 'suggested_action', 'next_step',
  'category', 'status', 'timestamp', 'created_at',
  'isstructured', 'is_structured', 'unknownfields', 'unknown_fields', 'raw', 'schema', 'version', 'debug',
]);

/**
 * Filter out internal, debug, boolean flags, and empty extra fields.
 */
function shouldIgnoreField(key, val) {
  if (val === null || val === undefined) return true;
  if (typeof val === 'function') return true;

  const lowerKey = key.toLowerCase();

  // Hide keys starting with underscore
  if (key.startsWith('_')) return true;

  // Hide known/internal metadata keys
  if (KNOWN_FIELD_KEYS.has(lowerKey)) return true;
  if (
    lowerKey === 'isstructured' ||
    lowerKey === 'is_structured' ||
    lowerKey === 'unknownfields' ||
    lowerKey === 'unknown_fields' ||
    lowerKey === 'text' ||
    lowerKey.includes('schema') ||
    lowerKey.includes('version') ||
    lowerKey.includes('debug') ||
    lowerKey.includes('raw')
  ) {
    return true;
  }

  // Hide boolean flags named is_* or has_* (or camelCase isX / hasX)
  if (
    lowerKey.startsWith('is_') ||
    lowerKey.startsWith('has_') ||
    /^is[A-Z]/.test(key) ||
    /^has[A-Z]/.test(key)
  ) {
    return true;
  }

  // Hide empty values: "", [], or {}
  if (typeof val === 'string' && val.trim() === '') return true;
  if (Array.isArray(val) && val.length === 0) return true;
  if (typeof val === 'object' && !Array.isArray(val) && Object.keys(val).length === 0) return true;

  return false;
}

/**
 * Parses an individual finding item (object, JSON string, double-encoded string, or plain text).
 * Returns a standardized structured object:
 * {
 *   isStructured: boolean,
 *   id: string | null,
 *   title: string,
 *   severity: 'HIGH' | 'MODERATE' | 'LOW',
 *   metric: string | null,
 *   where: string | null,
 *   what: string | null,
 *   why: string | null,
 *   action: string | null,
 *   unknownFields: Array<{ label: string, value: string }>,
 *   text?: string
 * }
 */
export function parseAgentFinding(item) {
  if (item === null || item === undefined) {
    return null;
  }

  const parsed = safeParseJson(item);

  // If parsed successfully into a non-array object
  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
    const id = parsed.id || parsed.finding_id || parsed.code || parsed.rec_id || null;
    const title =
      parsed.title ||
      parsed.name ||
      parsed.headline ||
      parsed.summary ||
      parsed.header ||
      (id ? `Finding ${id}` : 'Observed Finding');

    const rawSeverity = String(parsed.severity || parsed.priority || parsed.level || 'MODERATE').toUpperCase();
    const severity =
      rawSeverity === 'HIGH' || rawSeverity === 'CRITICAL'
        ? 'HIGH'
        : rawSeverity === 'LOW' || rawSeverity === 'MINOR'
        ? 'LOW'
        : 'MODERATE';

    const metric =
      parsed.metric ||
      parsed.observed_gap ||
      parsed.turnover ||
      parsed.exposure ||
      parsed.verified_metric ||
      null;

    const where =
      parsed.affected ||
      parsed.scope ||
      parsed.location ||
      parsed.where ||
      parsed.line ||
      null;

    const what =
      parsed.evidence ||
      parsed.detail ||
      parsed.details ||
      parsed.description ||
      parsed.what ||
      null;

    const why =
      parsed.operational_impact ||
      parsed.impact ||
      parsed.root_cause ||
      parsed.why ||
      null;

    const action =
      parsed.recommendation ||
      parsed.action ||
      parsed.remedy ||
      parsed.suggested_action ||
      parsed.next_step ||
      null;

    // Collect any other useful unknown fields (ignoring internal flags, debug, and empty values)
    const unknownFields = [];

    // If item was already structured and had existing unknownFields, carry them over sanitized
    if (Array.isArray(parsed.unknownFields)) {
      for (const uf of parsed.unknownFields) {
        if (uf && uf.label && uf.value) {
          const l = uf.label.toLowerCase();
          if (
            !l.startsWith('is ') &&
            !l.startsWith('has ') &&
            !l.startsWith('_') &&
            !['is structured', 'unknown fields', 'raw', 'schema', 'version', 'debug'].includes(l) &&
            uf.value !== '[]' &&
            uf.value !== '{}' &&
            uf.value !== 'Unassigned'
          ) {
            unknownFields.push(uf);
          }
        }
      }
    }

    for (const [key, val] of Object.entries(parsed)) {
      if (shouldIgnoreField(key, val)) continue;

      let displayVal = '';
      if (typeof val === 'object') {
        if (Array.isArray(val)) {
          if (val.length === 0) continue;
          displayVal = val
            .map((v) => (typeof v === 'object' ? JSON.stringify(v) : cleanText(String(v))))
            .join(', ');
        } else {
          if (Object.keys(val).length === 0) continue;
          displayVal = JSON.stringify(val);
        }
      } else {
        displayVal = cleanText(String(val));
      }

      if (displayVal && displayVal !== 'Unassigned' && displayVal !== '[]' && displayVal !== '{}') {
        const label = toTitleCase(key);
        // Avoid duplicate labels
        if (!unknownFields.some((uf) => uf.label === label)) {
          unknownFields.push({
            label,
            value: displayVal,
          });
        }
      }
    }

    return {
      isStructured: true,
      id: id ? cleanText(String(id)) : null,
      title: cleanText(String(title)),
      severity,
      metric: metric ? cleanText(String(metric)) : null,
      where: where ? cleanText(String(where)) : null,
      what: what ? cleanText(String(what)) : null,
      why: why ? cleanText(String(why)) : null,
      action: action ? cleanText(String(action)) : null,
      unknownFields,
    };
  }

  // Fallback for plain text or strings where parsing failed
  const rawStr = typeof item === 'string' ? item : JSON.stringify(item);
  let displayText = cleanText(rawStr);

  // If raw string starts with or contains broken JSON braces, strip them
  displayText = displayText.replace(/^\{+/, '').replace(/\}+$/, '').trim();

  return {
    isStructured: false,
    text: displayText,
  };
}

/**
 * Normalizes an array or single item of findings into an array of parsed findings.
 */
export function normalizeFindings(findings) {
  if (!findings) return [];
  const list = Array.isArray(findings) ? findings : [findings];
  return list
    .map((item) => parseAgentFinding(item))
    .filter(Boolean);
}
