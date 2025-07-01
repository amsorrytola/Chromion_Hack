// Real deployed contract addresses on Sepolia testnet
export const CONTRACT_ADDRESSES = {
  11155111: { // Sepolia
    PartyRegistry: '0x93fd309a0d457174bd94f4c7bce60c589e6be4d6',
    LootManager: '0xf755e942112584c0547c3f85392b2c2ee602161b', 
    RandomLootGenerator: '0xa19d323e6a4db37c0f0f85f8fc2f7410e4061ec3',
    CrossChainLootManager: '0x194cada5d03ef6cd9aa51c3bb36ef64f4de174bb'
  }
} as const;

export function getContractAddress(chainId: number, contractName: keyof typeof CONTRACT_ADDRESSES[11155111]) {
  const addresses = CONTRACT_ADDRESSES[chainId as keyof typeof CONTRACT_ADDRESSES];
  if (!addresses) {
    throw new Error(`Unsupported chain ID: ${chainId}`);
  }
  return addresses[contractName];
}
