// =============================================================================
// DATE UTILITIES (US 06.1)
// TIMEZONE-INVARIANT: Normalize backend ISO strings to UTC to prevent local skew.
// =============================================================================

/**
 * Ensures an ISO datetime string has explicit UTC 'Z' timezone if omitted.
 *
 * @param {string|Date|number|null} dateInput
 * @returns {string} UTC ISO string
 */
export function ensureUtcIso(dateInput) {
  // Phase 1: Precondition Gate
  if (!dateInput) {
    return '';
  }
  if (dateInput instanceof Date) {
    return isNaN(dateInput.getTime()) ? '' : dateInput.toISOString();
  }

  // Phase 2: Linear Compute
  const str = String(dateInput).trim();
  if (!str) {
    return '';
  }
  if (str.endsWith('Z') || /[+-]\d{2}:?\d{2}$/.test(str)) {
    return str;
  }

  // Phase 3: Exit Return
  return `${str}Z`;
}
