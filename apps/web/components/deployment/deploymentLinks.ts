export function explorerContractUrl(base: string, contract: string) {
  return `${base.replace(/\/$/, "")}/address/${contract}`;
}

export function explorerNftUrl(base: string, contract: string, tokenId: number) {
  return `${base.replace(/\/$/, "")}/token/${contract}/instance/${tokenId}`;
}
