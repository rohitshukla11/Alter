export type ProfessionBadgeVariant = "legal" | "finance" | "medical" | "web3" | "custom";

export function professionBadgeVariant(profession: string | null | undefined): ProfessionBadgeVariant {
  const p = (profession ?? "").trim().toLowerCase();
  if (!p) return "custom";
  if (p.includes("law")) return "legal";
  if (p.includes("trader") || p.includes("finance")) return "finance";
  if (p.includes("doctor") || p.includes("medical") || p.includes("health")) return "medical";
  if (p.includes("web3") || p.includes("architect") || p.includes("token")) return "web3";
  if (p.includes("developer") || p.includes("engineer")) return "finance";
  return "custom";
}
