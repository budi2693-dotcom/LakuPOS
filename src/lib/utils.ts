/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Generates a standard RFC 4122 version 4 compliant UUID.
 * Works both in modern environments (using Web Crypto API) and has a bulletproof fallback.
 */
export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback RFC4122 version 4 compliant UUID generator
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
