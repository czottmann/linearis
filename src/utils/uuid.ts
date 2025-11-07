/**
 * Check if a string is a valid UUID (Universally Unique Identifier)
 * 
 * @param value - The string to validate
 * @returns true if the string is a valid UUID format, false otherwise
 * 
 * @example
 * ```typescript
 * isUuid("123e4567-e89b-12d3-a456-426614174000"); // true
 * isUuid("not-a-uuid"); // false
 * isUuid("ABC-123"); // false
 * ```
 */
export function isUuid(value: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}
