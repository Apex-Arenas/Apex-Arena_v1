/**
 * Generates a random string for idempotency keys
 */
const generateRandomString = (length: number = 10): string => {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

/**
 * Generate a basic idempotency key
 */
export const generateIdempotencyKey = (): string => {
  const timestamp = Date.now();
  const random = generateRandomString(10);
  return `idmp_${timestamp}_${random}`;
};

// Track used keys in memory (optional, for extra safety)
const usedKeys = new Set<string>();

/**
 * Generate a guaranteed unique idempotency key
 */
export const generateUniqueIdempotencyKey = (): string => {
  let key = generateIdempotencyKey();
  while (usedKeys.has(key)) {
    key = generateIdempotencyKey();
  }
  usedKeys.add(key);
  return key;
};