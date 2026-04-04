/** Short SHA-256 fingerprint for UI display (not an on-chain proof). */
export async function contentFingerprint(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  const hex = Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 6)}…${hex.slice(-4)}`;
}
