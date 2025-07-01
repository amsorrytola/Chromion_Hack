export { default as LootManagerABI } from './LootManager.json';
export { default as PartyRegistryABI } from './PartyRegistry.json';
export { default as RandomLootGeneratorABI } from './RandomLootGenerator.json';
export { default as CrossChainLootManagerABI } from './CrossChainLootManager.json';

export interface ContractABI {
    inputs: any[];
    name: string;
    outputs: any[];
    stateMutability: string;
    type: string;
}

export interface ContractABIs {
    LootManager: ContractABI[];
    PartyRegistry: ContractABI[];
    RandomLootGenerator: ContractABI[];
    CrossChainLootManager: ContractABI[];
}