import { ethers, Contract, JsonRpcProvider } from 'ethers';
import { createPublicClient, createWalletClient, http, parseAbi } from 'viem';
import { sepolia, polygonMumbai, arbitrumGoerli } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { logger } from '../utils/logger';
import { config } from '../config/config';
import { abiLoader } from '@/utils/abiLoader';

interface ContractAddresses {
  lootManager: string;
  partyRegistry: string;
  crossChainLootManager: string;
  randomLootGenerator: string;
}

export class BlockchainService {
  private providers: Map<number, JsonRpcProvider> = new Map();
  private publicClients: Map<number, any> = new Map();
  private walletClients: Map<number, any> = new Map();
  private account: any;
  
  // Contract addresses per chain
  private contractAddresses: Map<number, ContractAddresses> = new Map();

  private lootManagerABI: any[];
  private partyRegistryABI: any[];
  private crossChainLootManagerABI: any[];
  private randomLootGeneratorABI: any[];

  
  

  constructor() {
    this.loadABIs();
    this.initializeClients();
    this.loadContractAddresses();
  }

  private loadABIs() {
    try {
      this.lootManagerABI = abiLoader.getABI('LootManager');
      this.partyRegistryABI = abiLoader.getABI('PartyRegistry');
      this.crossChainLootManagerABI = abiLoader.getABI('CrossChainLootManager');
      this.randomLootGeneratorABI = abiLoader.getABI('RandomLootGenerator');

      logger.info('ABIs loaded successfully');
    } catch (error) {
      logger.error('Failed to load ABIs:', error);
      throw new Error('ABI loading failed');
    }
  }

  private initializeClients() {
    const privateKey = config.blockchain.privateKey;
    if (!privateKey) {
      throw new Error('PRIVATE_KEY not provided in environment variables');
    }

    this.account = privateKeyToAccount(privateKey as `0x${string}`);

    // Sepolia (11155111)
    const sepoliaProvider = new JsonRpcProvider(config.blockchain.networks.sepolia);
    this.providers.set(11155111, sepoliaProvider);
    
    this.publicClients.set(11155111, createPublicClient({
      chain: sepolia,
      transport: http(config.blockchain.networks.sepolia)
    }));

    this.walletClients.set(11155111, createWalletClient({
      chain: sepolia,
      transport: http(config.blockchain.networks.sepolia),
      account: this.account
    }));

    // Polygon Mumbai (80001)
    if (config.blockchain.networks.polygonMumbai) {
      const mumbaiProvider = new JsonRpcProvider(config.blockchain.networks.polygonMumbai);
      this.providers.set(80001, mumbaiProvider);
      
      this.publicClients.set(80001, createPublicClient({
        chain: polygonMumbai,
        transport: http(config.blockchain.networks.polygonMumbai)
      }));

      this.walletClients.set(80001, createWalletClient({
        chain: polygonMumbai,
        transport: http(config.blockchain.networks.polygonMumbai),
        account: this.account
      }));
    }

    // Arbitrum Goerli (421613)
    if (config.blockchain.networks.arbitrumGoerli) {
      const arbitrumProvider = new JsonRpcProvider(config.blockchain.networks.arbitrumGoerli);
      this.providers.set(421613, arbitrumProvider);
      
      this.publicClients.set(421613, createPublicClient({
        chain: arbitrumGoerli,
        transport: http(config.blockchain.networks.arbitrumGoerli)
      }));

      this.walletClients.set(421613, createWalletClient({
        chain: arbitrumGoerli,
        transport: http(config.blockchain.networks.arbitrumGoerli),
        account: this.account
      }));
    }

    logger.info('Blockchain clients initialized');
  }

  private loadContractAddresses(): void {
    // Load from environment variables or config
    // Sepolia addresses
    this.contractAddresses.set(11155111, {
      lootManager: config.blockchain.contracts.lootManager || '',
      partyRegistry: config.blockchain.contracts.partyRegistry || '',
      crossChainLootManager: config.blockchain.contracts.crossChainLootManager || '',
      randomLootGenerator: config.blockchain.contracts.randomLootGenerator || ''
    });

    // Add other networks as needed
    logger.info('Contract addresses loaded');
  }

  async getPublicClient(chainId: number) {
    const client = this.publicClients.get(chainId);
    if (!client) throw new Error(`No public client found for chainId ${chainId}`);
    return client;
  }

  // Loot Management Functions
  async mintLoot(
    chainId: number,
    playerAddress: string,
    name: string,
    lootType: string,
    rarity: number,
    power: number,
    attributes: string[]
  ): Promise<{ tokenId: bigint; transactionHash: string }> {
    try {
      const walletClient = this.walletClients.get(chainId);
      const publicClient = this.publicClients.get(chainId);
      const addresses = this.contractAddresses.get(chainId);

      if (!walletClient || !publicClient || !addresses?.lootManager) {
        throw new Error(`Chain ${chainId} not supported or contract address missing`);
      }

      const hash = await walletClient.writeContract({
        address: addresses.lootManager as `0x${string}`,
        abi: this.lootManagerABI,
        functionName: 'mintLoot',
        args: [
          playerAddress as `0x${string}`,
          name,
          lootType,
          BigInt(rarity),
          BigInt(power),
          attributes
        ]
      });

      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      
      // Extract tokenId from logs
      const tokenId = this.extractTokenIdFromLogs(receipt.logs);

      logger.info(`Loot minted: ${name} for ${playerAddress}`, {
        chainId,
        tokenId: tokenId.toString(),
        transactionHash: hash
      });

      return {
        tokenId,
        transactionHash: hash
      };
    } catch (error) {
      logger.error('Error minting loot:', error);
      throw error;
    }
  }

  async getLootDetails(chainId: number, tokenId: bigint): Promise<any> {
    try {
      const publicClient = this.publicClients.get(chainId);
      const addresses = this.contractAddresses.get(chainId);

      if (!publicClient || !addresses?.lootManager) {
        throw new Error(`Chain ${chainId} not supported`);
      }

      const lootData = await publicClient.readContract({
        address: addresses.lootManager as `0x${string}`,
        abi: this.lootManagerABI,
        functionName: 'getLoot',
        args: [tokenId]
      });

      return {
        name: lootData[0],
        lootType: lootData[1],
        rarity: Number(lootData[2]),
        power: Number(lootData[3]),
        attributes: lootData[4]
      };
    } catch (error) {
      logger.error('Error getting loot details:', error);
      throw error;
    }
  }

  async getPlayerEquipment(chainId: number, playerAddress: string): Promise<bigint[]> {
    try {
      const publicClient = this.publicClients.get(chainId);
      const addresses = this.contractAddresses.get(chainId);

      if (!publicClient || !addresses?.lootManager) {
        throw new Error(`Chain ${chainId} not supported`);
      }

      const tokenIds = await publicClient.readContract({
        address: addresses.lootManager as `0x${string}`,
        abi: this.lootManagerABI,
        functionName: 'getPlayerEquipment',
        args: [playerAddress as `0x${string}`]
      });

      return tokenIds as bigint[];
    } catch (error) {
      logger.error('Error getting player equipment:', error);
      throw error;
    }
  }

  // Party Management Functions
  async registerPlayer(chainId: number, playerAddress: string): Promise<string> {
    try {
      const walletClient = this.walletClients.get(chainId);
      const addresses = this.contractAddresses.get(chainId);

      if (!walletClient || !addresses?.partyRegistry) {
        throw new Error(`Chain ${chainId} not supported`);
      }

      const hash = await walletClient.writeContract({
        address: addresses.partyRegistry as `0x${string}`,
        abi: this.partyRegistryABI,
        functionName: 'registerPlayer'
      });

      logger.info(`Player registered: ${playerAddress}`, { chainId, transactionHash: hash });
      return hash;
    } catch (error) {
      logger.error('Error registering player:', error);
      throw error;
    }
  }

  async createParty(chainId: number, maxSize: number): Promise<{ partyId: bigint; transactionHash: string }> {
    try {
      const walletClient = this.walletClients.get(chainId);
      const publicClient = this.publicClients.get(chainId);
      const addresses = this.contractAddresses.get(chainId);

      if (!walletClient || !publicClient || !addresses?.partyRegistry) {
        throw new Error(`Chain ${chainId} not supported`);
      }

      const hash = await walletClient.writeContract({
        address: addresses.partyRegistry as `0x${string}`,
        abi: this.partyRegistryABI,
        functionName: 'createParty',
        args: [BigInt(maxSize)]
      });

      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      const partyId = this.extractPartyIdFromLogs(receipt.logs);

      logger.info(`Party created with ID: ${partyId}`, { chainId, transactionHash: hash });

      return {
        partyId,
        transactionHash: hash
      };
    } catch (error) {
      logger.error('Error creating party:', error);
      throw error;
    }
  }

  async getPartyDetails(chainId: number, partyId: bigint): Promise<any> {
    try {
      const publicClient = this.publicClients.get(chainId);
      const addresses = this.contractAddresses.get(chainId);

      if (!publicClient || !addresses?.partyRegistry) {
        throw new Error(`Chain ${chainId} not supported`);
      }

      const partyData = await publicClient.readContract({
        address: addresses.partyRegistry as `0x${string}`,
        abi: this.partyRegistryABI,
        functionName: 'getParty',
        args: [partyId]
      });

      return {
        id: Number(partyData[0]),
        leader: partyData[1],
        members: partyData[2],
        maxSize: Number(partyData[3]),
        chainId: Number(partyData[4]),
        isActive: partyData[5],
        createdAt: Number(partyData[6]),
        dungeonSeed: partyData[7]
      };
    } catch (error) {
      logger.error('Error getting party details:', error);
      throw error;
    }
  }

  // Cross-Chain Functions
  async transferLootCrossChain(
    sourceChainId: number,
    destinationChainSelector: string,
    receiverAddress: string,
    tokenId: bigint,
    feeTokenAddress?: string
  ): Promise<string> {
    try {
      const walletClient = this.walletClients.get(sourceChainId);
      const addresses = this.contractAddresses.get(sourceChainId);

      if (!walletClient || !addresses?.crossChainLootManager) {
        throw new Error(`Chain ${sourceChainId} not supported`);
      }

      const hash = await walletClient.writeContract({
        address: addresses.crossChainLootManager as `0x${string}`,
        abi: this.crossChainLootManagerABI,
        functionName: 'transferCrossChain',
        args: [
          destinationChainSelector as `0x${string}`,
          receiverAddress as `0x${string}`,
          tokenId,
          (feeTokenAddress || '0x0000000000000000000000000000000000000000') as `0x${string}`
        ],
        value: BigInt('100000000000000000') // 0.1 ETH for fees
      });

      logger.info(`Cross-chain transfer initiated`, {
        sourceChainId,
        destinationChainSelector,
        tokenId: tokenId.toString(),
        transactionHash: hash
      });

      return hash;
    } catch (error) {
      logger.error('Error transferring loot cross-chain:', error);
      throw error;
    }
  }

  // Random Loot Generation Functions
  async requestRandomLoot(chainId: number, playerAddress: string, dungeonLevel: number): Promise<{ requestId: string; transactionHash: string }> {
    try {
      const walletClient = this.walletClients.get(chainId);
      const publicClient = this.publicClients.get(chainId);
      const addresses = this.contractAddresses.get(chainId);

      if (!walletClient || !publicClient || !addresses?.randomLootGenerator) {
        throw new Error(`Chain ${chainId} not supported or RandomLootGenerator address missing`);
      }

      const hash = await walletClient.writeContract({
        address: addresses.randomLootGenerator as `0x${string}`,
        abi: this.randomLootGeneratorABI,
        functionName: 'requestRandomLoot',
        args: [playerAddress as `0x${string}`, BigInt(dungeonLevel)]
      });

      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      
      // Extract requestId from logs (simplified for now)
      const requestId = Math.floor(Math.random() * 1000000).toString();

      logger.info(`Random loot requested for player: ${playerAddress}`, {
        chainId,
        dungeonLevel,
        requestId,
        transactionHash: hash
      });

      return {
        requestId,
        transactionHash: hash
      };
    } catch (error) {
      logger.error('Error requesting random loot:', error);
      throw error;
    }
  }

  async getRequestStatus(chainId: number, requestId: string): Promise<{ fulfilled: boolean; randomWords: bigint[] }> {
    try {
      const publicClient = this.publicClients.get(chainId);
      const addresses = this.contractAddresses.get(chainId);

      if (!publicClient || !addresses?.randomLootGenerator) {
        throw new Error(`Chain ${chainId} not supported`);
      }

      const result = await publicClient.readContract({
        address: addresses.randomLootGenerator as `0x${string}`,
        abi: this.randomLootGeneratorABI,
        functionName: 'getRequestStatus',
        args: [requestId]
      });

      return {
        fulfilled: result[0] as boolean,
        randomWords: result[1] as bigint[]
      };
    } catch (error) {
      logger.error('Error getting request status:', error);
      throw error;
    }
  }

  // Enhanced Loot Management Functions
  async requestLoot(chainId: number, playerAddress: string, partyId: bigint, dungeonLevel: number): Promise<{ requestId: string; transactionHash: string }> {
    try {
      const walletClient = this.walletClients.get(chainId);
      const publicClient = this.publicClients.get(chainId);
      const addresses = this.contractAddresses.get(chainId);

      if (!walletClient || !publicClient || !addresses?.lootManager) {
        throw new Error(`Chain ${chainId} not supported or LootManager address missing`);
      }

      const hash = await walletClient.writeContract({
        address: addresses.lootManager as `0x${string}`,
        abi: this.lootManagerABI,
        functionName: 'requestLoot',
        args: [playerAddress as `0x${string}`, partyId, BigInt(dungeonLevel)]
      });

      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      
      // Extract requestId from logs (simplified for now)
      const requestId = Math.floor(Math.random() * 1000000).toString();

      logger.info(`Loot requested for player: ${playerAddress}`, {
        chainId,
        partyId: partyId.toString(),
        dungeonLevel,
        requestId,
        transactionHash: hash
      });

      return {
        requestId,
        transactionHash: hash
      };
    } catch (error) {
      logger.error('Error requesting loot:', error);
      throw error;
    }
  }

  async setLendingStatus(chainId: number, tokenId: bigint, isLendable: boolean): Promise<string> {
    try {
      const walletClient = this.walletClients.get(chainId);
      const addresses = this.contractAddresses.get(chainId);

      if (!walletClient || !addresses?.lootManager) {
        throw new Error(`Chain ${chainId} not supported`);
      }

      const hash = await walletClient.writeContract({
        address: addresses.lootManager as `0x${string}`,
        abi: this.lootManagerABI,
        functionName: 'setLendingStatus',
        args: [tokenId, isLendable]
      });

      logger.info(`Lending status updated for token: ${tokenId}`, {
        chainId,
        tokenId: tokenId.toString(),
        isLendable,
        transactionHash: hash
      });

      return hash;
    } catch (error) {
      logger.error('Error setting lending status:', error);
      throw error;
    }
  }

  async burnLoot(chainId: number, tokenId: bigint): Promise<string> {
    try {
      const walletClient = this.walletClients.get(chainId);
      const addresses = this.contractAddresses.get(chainId);

      if (!walletClient || !addresses?.lootManager) {
        throw new Error(`Chain ${chainId} not supported`);
      }

      const hash = await walletClient.writeContract({
        address: addresses.lootManager as `0x${string}`,
        abi: this.lootManagerABI,
        functionName: 'burnLoot',
        args: [tokenId]
      });

      logger.info(`Loot burned: ${tokenId}`, {
        chainId,
        tokenId: tokenId.toString(),
        transactionHash: hash
      });

      return hash;
    } catch (error) {
      logger.error('Error burning loot:', error);
      throw error;
    }
  }

  // Enhanced Cross-Chain Functions
  async getCrossChainFee(
    sourceChainId: number,
    destinationChainSelector: string,
    receiverAddress: string,
    lootData: any
  ): Promise<bigint> {
    try {
      const publicClient = this.publicClients.get(sourceChainId);
      const addresses = this.contractAddresses.get(sourceChainId);

      if (!publicClient || !addresses?.crossChainLootManager) {
        throw new Error(`Chain ${sourceChainId} not supported`);
      }

      const fee = await publicClient.readContract({
        address: addresses.crossChainLootManager as `0x${string}`,
        abi: this.crossChainLootManagerABI,
        functionName: 'getFee',
        args: [
          destinationChainSelector as `0x${string}`,
          receiverAddress as `0x${string}`,
          JSON.stringify(lootData)
        ]
      });

      return fee as bigint;
    } catch (error) {
      logger.error('Error getting cross-chain fee:', error);
      throw error;
    }
  }

  async allowlistDestinationChain(chainId: number, destinationChainSelector: string, allowed: boolean): Promise<string> {
    try {
      const walletClient = this.walletClients.get(chainId);
      const addresses = this.contractAddresses.get(chainId);

      if (!walletClient || !addresses?.crossChainLootManager) {
        throw new Error(`Chain ${chainId} not supported`);
      }

      const hash = await walletClient.writeContract({
        address: addresses.crossChainLootManager as `0x${string}`,
        abi: this.crossChainLootManagerABI,
        functionName: 'allowlistDestinationChain',
        args: [destinationChainSelector as `0x${string}`, allowed]
      });

      logger.info(`Destination chain allowlist updated`, {
        chainId,
        destinationChainSelector,
        allowed,
        transactionHash: hash
      });

      return hash;
    } catch (error) {
      logger.error('Error updating destination chain allowlist:', error);
      throw error;
    }
  }

  async allowlistSourceChain(chainId: number, sourceChainSelector: string, allowed: boolean): Promise<string> {
    try {
      const walletClient = this.walletClients.get(chainId);
      const addresses = this.contractAddresses.get(chainId);

      if (!walletClient || !addresses?.crossChainLootManager) {
        throw new Error(`Chain ${chainId} not supported`);
      }

      const hash = await walletClient.writeContract({
        address: addresses.crossChainLootManager as `0x${string}`,
        abi: this.crossChainLootManagerABI,
        functionName: 'allowlistSourceChain',
        args: [sourceChainSelector as `0x${string}`, allowed]
      });

      logger.info(`Source chain allowlist updated`, {
        chainId,
        sourceChainSelector,
        allowed,
        transactionHash: hash
      });

      return hash;
    } catch (error) {
      logger.error('Error updating source chain allowlist:', error);
      throw error;
    }
  }

  async withdrawToken(chainId: number, beneficiary: string, tokenAddress: string): Promise<string> {
    try {
      const walletClient = this.walletClients.get(chainId);
      const addresses = this.contractAddresses.get(chainId);

      if (!walletClient || !addresses?.crossChainLootManager) {
        throw new Error(`Chain ${chainId} not supported`);
      }

      const hash = await walletClient.writeContract({
        address: addresses.crossChainLootManager as `0x${string}`,
        abi: this.crossChainLootManagerABI,
        functionName: 'withdrawToken',
        args: [beneficiary as `0x${string}`, tokenAddress as `0x${string}`]
      });

      logger.info(`Token withdrawal initiated`, {
        chainId,
        beneficiary,
        tokenAddress,
        transactionHash: hash
      });

      return hash;
    } catch (error) {
      logger.error('Error withdrawing token:', error);
      throw error;
    }
  }

  async withdraw(chainId: number, beneficiary: string): Promise<string> {
    try {
      const walletClient = this.walletClients.get(chainId);
      const addresses = this.contractAddresses.get(chainId);

      if (!walletClient || !addresses?.crossChainLootManager) {
        throw new Error(`Chain ${chainId} not supported`);
      }

      const hash = await walletClient.writeContract({
        address: addresses.crossChainLootManager as `0x${string}`,
        abi: this.crossChainLootManagerABI,
        functionName: 'withdraw',
        args: [beneficiary as `0x${string}`]
      });

      logger.info(`ETH withdrawal initiated`, {
        chainId,
        beneficiary,
        transactionHash: hash
      });

      return hash;
    } catch (error) {
      logger.error('Error withdrawing ETH:', error);
      throw error;
    }
  }

  // Utility Functions
  private extractTokenIdFromLogs(logs: any[]): bigint {
    // Look for Transfer event or EquipmentCreated event
    for (const log of logs) {
      try {
        // This is a simplified version - in production, you'd parse the actual event logs
        // For now, we'll return a mock value
        return BigInt(Math.floor(Math.random() * 1000000));
      } catch (error) {
        continue;
      }
    }
    return BigInt(0);
  }

  private extractPartyIdFromLogs(logs: any[]): bigint {
    // Look for PartyCreated event
    for (const log of logs) {
      try {
        // This is a simplified version - in production, you'd parse the actual event logs
        return BigInt(Math.floor(Math.random() * 1000000));
      } catch (error) {
        continue;
      }
    }
    return BigInt(0);
  }

  // Health check
  async checkConnection(chainId: number): Promise<boolean> {
    try {
      const publicClient = this.publicClients.get(chainId);
      if (!publicClient) return false;

      const blockNumber = await publicClient.getBlockNumber();
      return blockNumber > 0;
    } catch (error) {
      logger.error(`Connection check failed for chain ${chainId}:`, error);
      return false;
    }
  }

  // Get supported chains
  getSupportedChains(): number[] {
    return Array.from(this.publicClients.keys());
  }

  // Update contract addresses (for deployment)
  updateContractAddresses(chainId: number, addresses: Partial<ContractAddresses>) {
    const existing = this.contractAddresses.get(chainId) || {
      lootManager: '',
      partyRegistry: '',
      crossChainLootManager: '',
      randomLootGenerator: ''
    };

    this.contractAddresses.set(chainId, { ...existing, ...addresses });
    logger.info(`Contract addresses updated for chain ${chainId}`, addresses);
  }
}

// Singleton instance
export const blockchainService = new BlockchainService();
