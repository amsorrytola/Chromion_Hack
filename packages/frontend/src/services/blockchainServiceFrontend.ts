import { parseAbiItem, decodeEventLog, WalletClient, PublicClient, createPublicClient, http, Abi } from 'viem';
import { sepolia, polygonMumbai } from 'viem/chains';
import { CONTRACT_ADDRESSES } from '../config/contractAddresses';
import PartyRegistryJson from '../../../shared/src/abi/PartyRegistry.json';
import LootManagerJson from '../../../shared/src/abi/LootManager.json';
import CrossChainLootManagerJson from '../../../shared/src/abi/CrossChainLootManager.json';
import RandomLootGeneratorJson from '../../../shared/src/abi/RandomLootGenerator.json';

const partyRegistryAbi = PartyRegistryJson as Abi;
const lootManagerAbi = LootManagerJson as Abi;
const crossChainLootManagerAbi = CrossChainLootManagerJson as Abi;
const randomLootGeneratorAbi = RandomLootGeneratorJson as Abi;

const CHAINS = {
  11155111: sepolia,
  80001: polygonMumbai,
} as const;


export class BlockchainService {
  private getContractAbi(name: 'LootManager' | 'PartyRegistry' | 'CrossChainLootManager' | 'RandomLootGenerator') {
    if (name === 'LootManager') return lootManagerAbi;
    if (name === 'PartyRegistry') return partyRegistryAbi;
    if (name === 'CrossChainLootManager') return crossChainLootManagerAbi;
    if (name === 'RandomLootGenerator') return randomLootGeneratorAbi;
    throw new Error(`Unknown ABI: ${name}`);
  }

  private getContractAddress(chainId: number, contract: keyof typeof CONTRACT_ADDRESSES[11155111]) {
    const addresses = CONTRACT_ADDRESSES[chainId];
    if (!addresses) throw new Error(`No addresses for chain ${chainId}`);
    return addresses[contract];
  }

  // ------------------------- PARTY REGISTRY WRITE FUNCTIONS -------------------------

  async registerPlayer(walletClient: WalletClient, chainId: number) {
    return this.write(walletClient, chainId, 'PartyRegistry', 'registerPlayer', []);
  }

  async createParty(
    walletClient: WalletClient,
    chainId: number,
    maxSize: number
  ): Promise<{ transactionHash: `0x${string}`; onchainPartyId: number }> {
    const address = walletClient.account?.address;
    if (!address) throw new Error("Wallet not connected");
  
    console.log("[createParty] Starting writeContract...");
    const transactionHash = await walletClient.writeContract({
      address: this.getContractAddress(chainId, "PartyRegistry"),
      abi: this.getContractAbi("PartyRegistry"),
      functionName: "createParty",
      args: [BigInt(maxSize)],
      chain: CHAINS[chainId],
      account: address,
    });
  
    console.log("[createParty] Transaction submitted. Hash:", transactionHash);
  
    const publicClient = createPublicClient({
      chain: CHAINS[chainId],
      transport: http(),
    });
  
    console.log("[createParty] Waiting for receipt...");
    const receipt = await publicClient.waitForTransactionReceipt({
      hash: transactionHash,
    });
  
    console.log("[createParty] Transaction receipt received:", receipt);
  
    if (receipt.status !== "success") {
      throw new Error("Transaction reverted");
    }
  
    console.log("[createParty] Parsing logs to find PartyCreated...");
  
    const partyCreatedEvent = parseAbiItem(
      "event PartyCreated(uint256 indexed partyId, address indexed leader, uint256 chainId)"
    );
  
    const logs = receipt.logs;
    console.log("[createParty] Logs in receipt:", logs);
  
    let partyId: number | null = null;
  
    for (const log of logs) {
      try {
        const parsed = decodeEventLog({
          abi: [partyCreatedEvent],
          data: log.data,
          topics: log.topics,
        });
  
        console.log("[createParty] Found PartyCreated log:", parsed);
  
        if ((parsed as any).eventName === "PartyCreated") {
          partyId = Number((parsed as any).args.partyId);
          break;
        }
      } catch (e) {
        console.log("[createParty] Log not matching PartyCreated, skipping...", e);
      }
    }
  
    if (partyId === null) {
      throw new Error("PartyCreated event not found in logs");
    }
  
    return {
      transactionHash,
      onchainPartyId: partyId,
    };
  }
  
  
  

  async joinParty(walletClient: WalletClient, chainId: number, partyId: number) {
    return this.write(walletClient, chainId, 'PartyRegistry', 'joinParty', [BigInt(partyId)]);
  }

  async leaveParty(walletClient: WalletClient, chainId: number) {
    return this.write(walletClient, chainId, 'PartyRegistry', 'leaveParty', []);
  }

  async kickPlayer(walletClient: WalletClient, chainId: number, partyId: number, playerAddress: string) {
    return this.write(walletClient, chainId, 'PartyRegistry', 'kickPlayer', [BigInt(partyId), playerAddress]);
  }

  async setDungeonSeed(walletClient: WalletClient, chainId: number, partyId: number, seed: string) {
    return this.write(walletClient, chainId, 'PartyRegistry', 'setDungeonSeed', [BigInt(partyId), seed]);
  }

  async deleteParty(walletClient: WalletClient, chainId: number, partyId: bigint) {
    console.log("📝 deleteParty called with:", {
      chainId,
      partyId,
    });
  
    const hash = await this.write(walletClient, chainId, 'PartyRegistry', 'deleteParty', [partyId]);
    console.log("🕒 Transaction hash obtained from write():", hash);
  
    const publicClient = createPublicClient({
      chain: CHAINS[chainId],
      transport: http(),
    });
    console.log("🌐 Created public client for chain:", chainId);
  
    console.log("⏳ Waiting for transaction receipt...");
    const receipt = await publicClient.waitForTransactionReceipt({ hash: hash as `0x${string}` });
  
    console.log("📜 Transaction receipt received:", receipt);
  
    if (receipt.status !== 'success') {
      console.error("❌ Transaction failed with receipt status:", receipt.status);
      throw new Error('deleteParty transaction failed');
    }
  
    console.log("✅ deleteParty transaction succeeded");
    return receipt;
  }
  
  

  async updatePlayerStats(walletClient: WalletClient, chainId: number, player: string, level: number, xp: number) {
    return this.write(walletClient, chainId, 'PartyRegistry', 'updatePlayerStats', [
      player,
      BigInt(level),
      BigInt(xp),
    ]);
  }

  // ------------------------- PARTY REGISTRY READ FUNCTIONS -------------------------

  async getParty(publicClient: PublicClient, chainId: number, partyId: number) {
    return this.read(publicClient, chainId, 'PartyRegistry', 'getParty', [BigInt(partyId)]);
  }

  async getPlayer(publicClient: PublicClient, chainId: number, playerAddress: string) {
    return this.read(publicClient, chainId, 'PartyRegistry', 'getPlayer', [playerAddress]);
  }

  async getPartyCount(publicClient: PublicClient, chainId: number) {
    return this.read(publicClient, chainId, 'PartyRegistry', 'getPartyCount', []);
  }

  async isPlayerInParty(publicClient: PublicClient, chainId: number, partyId: number, playerAddress: string) {
    return this.read(publicClient, chainId, 'PartyRegistry', 'isPlayerInParty', [BigInt(partyId), playerAddress]);
  }

  // ------------------------- HELPER WRITE + READ METHODS -------------------------

  private async write(
    walletClient: WalletClient,
    chainId: number,
    contractName: 'PartyRegistry' | 'LootManager' | 'CrossChainLootManager' | 'RandomLootGenerator',
    functionName: string,
    args: any[]
  ): Promise<string> {
    const address = walletClient.account?.address;
    if (!address) throw new Error('Wallet not connected');

    return await walletClient.writeContract({
      address: this.getContractAddress(chainId, this.toContractKey(contractName)),
      abi: this.getContractAbi(contractName),
      functionName,
      args,
      chain: CHAINS[chainId as keyof typeof CHAINS],
      account: address,
    });
  }

  private async read(
    publicClient: PublicClient,
    chainId: number,
    contractName: 'PartyRegistry' | 'LootManager' | 'CrossChainLootManager' | 'RandomLootGenerator',
    functionName: string,
    args: any[]
  ): Promise<any> {
    return await publicClient.readContract({
      address: this.getContractAddress(chainId, this.toContractKey(contractName)),
      abi: this.getContractAbi(contractName),
      functionName,
      args,
    });
  }

  private toContractKey(contractName: 'PartyRegistry' | 'LootManager' | 'CrossChainLootManager' | 'RandomLootGenerator') {
    return contractName; // Return as-is since our contract addresses file uses PascalCase
  }

  // ------------------------- LOOT MANAGER FUNCTIONS -------------------------

  async mintLoot(
    walletClient: WalletClient,
    chainId: number,
    playerAddress: string,
    name: string,
    lootType: string,
    rarity: number,
    power: number,
    attributes: string[]
  ) {
    return this.write(walletClient, chainId, 'LootManager', 'mintLoot', [
      playerAddress,
      name,
      lootType,
      BigInt(rarity),
      BigInt(power),
      attributes,
    ]);
  }

  async requestLoot(walletClient: WalletClient, chainId: number, player: string, partyId: number, dungeonLevel: number) {
    return this.write(walletClient, chainId, 'LootManager', 'requestLoot', [
      player,
      BigInt(partyId),
      BigInt(dungeonLevel),
    ]);
  }

  async setLendingStatus(walletClient: WalletClient, chainId: number, tokenId: number, isLendable: boolean) {
    return this.write(walletClient, chainId, 'LootManager', 'setLendingStatus', [
      BigInt(tokenId),
      isLendable,
    ]);
  }

  async getEquipment(publicClient: PublicClient, chainId: number, tokenId: number) {
    return this.read(publicClient, chainId, 'LootManager', 'getEquipment', [BigInt(tokenId)]);
  }

  async getPlayerEquipment(publicClient: PublicClient, chainId: number, playerAddress: string) {
    return this.read(publicClient, chainId, 'LootManager', 'getPlayerEquipment', [playerAddress]);
  }

  async getLoot(publicClient: PublicClient, chainId: number, tokenId: number) {
    return this.read(publicClient, chainId, 'LootManager', 'getLoot', [BigInt(tokenId)]);
  }

  async burnLoot(walletClient: WalletClient, chainId: number, tokenId: number) {
    return this.write(walletClient, chainId, 'LootManager', 'burnLoot', [BigInt(tokenId)]);
  }

  // ------------------------- RANDOM LOOT GENERATOR FUNCTIONS -------------------------

  async requestRandomLoot(walletClient: WalletClient, chainId: number, player: string, dungeonLevel: number) {
    return this.write(walletClient, chainId, 'RandomLootGenerator', 'requestRandomLoot', [
      player,
      BigInt(dungeonLevel),
    ]);
  }

  async getRequestStatus(publicClient: PublicClient, chainId: number, requestId: string) {
    return this.read(publicClient, chainId, 'RandomLootGenerator', 'getRequestStatus', [requestId]);
  }

  async updateVRFConfig(
    walletClient: WalletClient,
    chainId: number,
    keyHash: string,
    callbackGasLimit: number,
    requestConfirmations: number
  ) {
    return this.write(walletClient, chainId, 'RandomLootGenerator', 'updateVRFConfig', [
      keyHash,
      callbackGasLimit,
      requestConfirmations,
    ]);
  }

  // ------------------------- CROSS-CHAIN LOOT FUNCTIONS -------------------------

  async sendLootCrossChain(
    walletClient: WalletClient,
    chainId: number,
    destinationChainSelector: bigint,
    receiverAddress: string,
    lootId: number
  ) {
    return this.write(walletClient, chainId, 'CrossChainLootManager', 'sendLootCrossChain', [
      destinationChainSelector,
      receiverAddress,
      BigInt(lootId),
    ]);
  }

  async allowlistDestinationChain(
    walletClient: WalletClient,
    chainId: number,
    destinationChainSelector: bigint,
    allowed: boolean
  ) {
    return this.write(walletClient, chainId, 'CrossChainLootManager', 'allowlistDestinationChain', [
      destinationChainSelector,
      allowed,
    ]);
  }

  async allowlistSourceChain(
    walletClient: WalletClient,
    chainId: number,
    sourceChainSelector: bigint,
    allowed: boolean
  ) {
    return this.write(walletClient, chainId, 'CrossChainLootManager', 'allowlistSourceChain', [
      sourceChainSelector,
      allowed,
    ]);
  }

  async getCrossChainFee(
    publicClient: PublicClient,
    chainId: number,
    destinationChainSelector: bigint,
    receiver: string,
    data: string
  ) {
    return this.read(publicClient, chainId, 'CrossChainLootManager', 'getFee', [
      destinationChainSelector,
      receiver,
      data,
    ]);
  }

  async withdrawToken(walletClient: WalletClient, chainId: number, beneficiary: string, token: string) {
    return this.write(walletClient, chainId, 'CrossChainLootManager', 'withdrawToken', [beneficiary, token]);
  }

  async withdraw(walletClient: WalletClient, chainId: number, beneficiary: string) {
    return this.write(walletClient, chainId, 'CrossChainLootManager', 'withdraw', [beneficiary]);
  }

  getChainSelector(chainId: number): bigint {
    const selectors = {
      11155111: BigInt('16015286601757825753'), // Ethereum Sepolia
      80001: BigInt('12532609583862916517'),    // Polygon Mumbai
      421613: BigInt('6101244977088475029'),    // Arbitrum Goerli
    };
    const selector = selectors[chainId as keyof typeof selectors];
    if (!selector) throw new Error(`No chain selector for chain ${chainId}`);
    return selector;
  }
}

export const blockchainService = new BlockchainService();
