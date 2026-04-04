/**
 * Strips known bad patterns from model output before persistence and HTTP responses.
 * Only plain reply text — never pass structured payloads (hashes, JSON) through this.
 */
export function cleanResponse(text: string): string {
  let s = text.trim();
  s = s.replace(/^As a professional advisor:\s*/i, "");
  s = s.replace(/^As a[n]?\s+[^:\n]+:\s*\n*/im, "");
  s = s.replace(/^\*?\*?Summary\*?\*?:?\s*\n/im, "");
  s = s.replace(/^\*?\*?Overview\*?\*?:?\s*\n/im, "");
  s = s.replace(/^\*?\*?Key [Pp]oints\*?\*?:?\s*\n/im, "");
  s = s.replace(/\*?General guidance only[^*]*\*?/gi, "");
  s = s.replace(/not formal professional advice[^.]*\./gi, "");
  s = s.replace(/consult a qualified professional[^.]*\./gi, "");
  s = s.replace(/For legal, tax, or investment decisions[^.]*\./gi, "");
  s = s.replace(/\n---\n/g, "\n");
  return s.trim();
}

/** OpenClaw: pass model text through sanitizer only (no role wrapper or disclaimer). */
export function formatProfessionalResponse(input: { reply: string; profession?: string }): string {
  return cleanResponse(input.reply);
}
