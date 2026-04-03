/** Default: OpenClaw on unless explicitly disabled in 0G config JSON. */
export function isOpenClawEnabled(cfg: { openClaw?: { enabled?: boolean } }): boolean {
  if (cfg.openClaw && cfg.openClaw.enabled === false) return false;
  return true;
}
