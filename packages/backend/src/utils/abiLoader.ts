import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { logger } from './logger';
// import "../../../shared/src/abi"

export class ABILoader {
  private static instance: ABILoader;
  private abis: Map<string, any[]> = new Map();
  private abiPath: string;

  constructor() {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);

    this.abiPath = join(__dirname, '../../../shared/src/abi');
    this.loadABIs();
  }

  static getInstance(): ABILoader {
    if (!ABILoader.instance) {
      ABILoader.instance = new ABILoader();
    }
    return ABILoader.instance;
  }

  private loadABIs(): void {
    const contracts = [
      'LootManager',
      'PartyRegistry', 
      'CrossChainLootManager',
      'RandomLootGenerator'
    ];

    try {
      contracts.forEach(contractName => {
        const abiPath = join(this.abiPath, `${contractName}.json`);
        const abiContent = readFileSync(abiPath, 'utf8');
        const abi = JSON.parse(abiContent);
        
        // Handle different ABI formats
        const contractABI = abi.abi || abi;
        this.abis.set(contractName, contractABI);
        
        logger.info(`Loaded ABI for ${contractName}`, {
          functions: contractABI.filter((item: any) => item.type === 'function').length,
          events: contractABI.filter((item: any) => item.type === 'event').length
        });
      });

      logger.info(`Successfully loaded ${this.abis.size} contract ABIs`);
    } catch (error) {
      logger.error('Failed to load ABIs:', error);
      throw new Error('ABI loading failed');
    }
  }

  getABI(contractName: string): any[] {
    const abi = this.abis.get(contractName);
    if (!abi) {
      throw new Error(`ABI not found for contract: ${contractName}`);
    }
    return abi;
  }

  getAllABIs(): Map<string, any[]> {
    return this.abis;
  }

  // Get specific function signatures for viem
  getFunctionSignatures(contractName: string): string[] {
    const abi = this.getABI(contractName);
    return abi
      .filter(item => item.type === 'function')
      .map(func => this.generateFunctionSignature(func));
  }

  // Get event signatures
  getEventSignatures(contractName: string): string[] {
    const abi = this.getABI(contractName);
    return abi
      .filter(item => item.type === 'event')
      .map(event => this.generateEventSignature(event));
  }

  private generateFunctionSignature(func: any): string {
    const inputs = func.inputs.map((input: any) => input.type).join(',');
    const outputs = func.outputs && func.outputs.length > 0 
      ? ` returns (${func.outputs.map((output: any) => output.type).join(',')})`
      : '';
    
    return `function ${func.name}(${inputs}) ${func.stateMutability}${outputs}`;
  }

  private generateEventSignature(event: any): string {
    const inputs = event.inputs.map((input: any) => 
      `${input.type}${input.indexed ? ' indexed' : ''} ${input.name}`
    ).join(',');
    
    return `event ${event.name}(${inputs})`;
  }
}

export const abiLoader = ABILoader.getInstance();