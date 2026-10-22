/**
 * Phone number normalization utilities for church member records.
 * Handles common Indonesian phone formats (+62, 62, 08, hyphens, spaces).
 */

export function cleanPhoneDigits(phone?: string | null): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 8) return null;
  return digits;
}

export function canonicalPhone(phone?: string | null): string | null {
  const digits = cleanPhoneDigits(phone);
  if (!digits) return null;

  // Convert international 62 to standard 08
  if (digits.startsWith('628')) {
    return '0' + digits.slice(2);
  }
  if (digits.startsWith('08')) {
    return digits;
  }
  if (digits.startsWith('8')) {
    return '0' + digits;
  }
  return digits;
}

/**
 * Returns an array of phone format variants for database lookup.
 * This guarantees finding existing records regardless of how they were previously stored
 * (e.g., '081234567890', '+6281234567890', '6281234567890', formatted with dashes, etc.)
 */
export function getPhoneLookupVariants(phone?: string | null): string[] {
  if (!phone) return [];
  const set = new Set<string>();

  const trimmed = phone.trim();
  if (trimmed) set.add(trimmed);

  const digits = cleanPhoneDigits(phone);
  if (digits) {
    set.add(digits);

    // If starts with 628...
    if (digits.startsWith('628')) {
      const local = '0' + digits.slice(2);
      set.add(local);
      set.add('+' + digits);
    } else if (digits.startsWith('08')) {
      const intl = '62' + digits.slice(1);
      set.add(intl);
      set.add('+' + intl);
    } else if (digits.startsWith('8')) {
      const local = '0' + digits;
      const intl = '62' + digits;
      set.add(local);
      set.add(intl);
      set.add('+' + intl);
    }
  }

  return Array.from(set);
}

