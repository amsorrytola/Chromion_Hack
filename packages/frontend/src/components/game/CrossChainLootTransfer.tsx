import React, { useState, useEffect } from 'react';
import { useAccount, usePublicClient, useWalletClient } from 'wagmi';
import { blockchainService } from '../../services/blockchainServiceFrontend';
import { mockDataService, MockEquipment } from '../../services/mockDataService';
import LoadingSpinner from '../LoadingSpinner';

interface Equipment {
  tokenId: string;
  name: string;
  equipmentType: string;
  rarity: string;
  attackPower: number;
}

const SUPPORTED_CHAINS = {
  11155111: { name: 'Ethereum Sepolia', icon: '⟠' },
  80001: { name: 'Polygon Mumbai', icon: '⬟' },
  421613: { name: 'Arbitrum Goerli', icon: '🔵' },
};

const CrossChainLootTransfer: React.FC = () => {
  const { address, chainId } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [selectedEquipment, setSelectedEquipment] = useState<string>('');
  const [destinationChain, setDestinationChain] = useState<number>(80001);
  const [receiverAddress, setReceiverAddress] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (address && publicClient && chainId) {
      loadPlayerEquipment();
    }
  }, [address, publicClient, chainId]);

  const loadPlayerEquipment = async () => {
    try {
      if (!address || !publicClient || !chainId) {
        // Load mock data when no wallet connected
        const mockEquipment = await mockDataService.getPlayerEquipment('mock-address');
        setEquipment(mockEquipment.map(eq => ({
          tokenId: eq.tokenId,
          name: eq.name,
          equipmentType: eq.equipmentType,
          rarity: eq.rarity,
          attackPower: eq.attackPower
        })));
        return;
      }

      const tokenIds = await blockchainService.getPlayerEquipment(publicClient, chainId, address);
      
      const equipmentDetails = await Promise.all(
        tokenIds.map(async (tokenId: bigint) => {
          try {
            const equipment = await blockchainService.getEquipment(publicClient, chainId, Number(tokenId));
            return {
              tokenId: tokenId.toString(),
              name: equipment.name,
              equipmentType: equipment.lootType,
              rarity: ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'][equipment.rarity] || 'common',
              attackPower: Number(equipment.attackPower || equipment.power),
            };
          } catch (err) {
            return null;
          }
        })
      );

      const validEquipment = equipmentDetails.filter(Boolean) as Equipment[];
      
      // If no blockchain equipment, use mock data
      if (validEquipment.length === 0) {
        const mockEquipment = await mockDataService.getPlayerEquipment(address);
        setEquipment(mockEquipment.map(eq => ({
          tokenId: eq.tokenId,
          name: eq.name,
          equipmentType: eq.equipmentType,
          rarity: eq.rarity,
          attackPower: eq.attackPower
        })));
      } else {
        setEquipment(validEquipment);
      }
      
    } catch (err) {
      console.error('Error loading equipment:', err);
      setError('Failed to load equipment. Loading mock data...');
      
      // Fallback to mock data
      try {
        const mockEquipment = await mockDataService.getPlayerEquipment(address || 'mock-address');
        setEquipment(mockEquipment.map(eq => ({
          tokenId: eq.tokenId,
          name: eq.name,
          equipmentType: eq.equipmentType,
          rarity: eq.rarity,
          attackPower: eq.attackPower
        })));
        setError(null);
      } catch (mockError) {
        setError('Failed to load equipment data');
      }
    }
  };

  const handleTransfer = async () => {
    if (!walletClient || !chainId || !selectedEquipment || !destinationChain || !receiverAddress) {
      setError('Please fill in all fields');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const destinationChainSelector = blockchainService.getChainSelector(destinationChain);
      
      const transactionHash = await blockchainService.sendLootCrossChain(
        walletClient,
        chainId,
        destinationChainSelector,
        receiverAddress as `0x${string}`,
        Number(selectedEquipment)
      );

      setSuccess(`Cross-chain transfer initiated! Transaction: ${transactionHash.slice(0, 10)}...`);
      
      // Clear form
      setSelectedEquipment('');
      setReceiverAddress('');
      
      // Reload equipment
      loadPlayerEquipment();

    } catch (err: any) {
      console.error('Error transferring loot:', err);
      setError(err.message || 'Failed to transfer loot');
    } finally {
      setLoading(false);
    }
  };

  const getChainInfo = (chainId: number) => {
    return SUPPORTED_CHAINS[chainId as keyof typeof SUPPORTED_CHAINS] || { name: `Chain ${chainId}`, icon: '🔗' };
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6 space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white mb-2">🌐 Cross-Chain Loot Transfer</h2>
        <p className="text-gray-400">Transfer your equipment to other blockchain networks</p>
      </div>

      <div className="bg-gray-700 rounded-lg p-4 space-y-4">
        <div>
          <label className="block text-white font-semibold mb-2">
            Select Equipment to Transfer
          </label>
          {equipment.length === 0 ? (
            <p className="text-gray-400 text-center py-4">No equipment available</p>
          ) : (
            <select
              value={selectedEquipment}
              onChange={(e) => setSelectedEquipment(e.target.value)}
              className="w-full px-3 py-2 bg-gray-600 text-white rounded-lg border border-gray-500 focus:border-blue-500"
            >
              <option value="">Choose equipment...</option>
              {equipment.map((item) => (
                <option key={item.tokenId} value={item.tokenId}>
                  {item.name} ({item.equipmentType}) - Power: {item.attackPower}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-white font-semibold mb-2">From Chain</label>
            <div className="px-3 py-2 bg-gray-600 text-white rounded-lg border border-gray-500">
              {getChainInfo(chainId || 11155111).icon} {getChainInfo(chainId || 11155111).name}
            </div>
          </div>

          <div>
            <label className="block text-white font-semibold mb-2">To Chain</label>
            <select
              value={destinationChain}
              onChange={(e) => setDestinationChain(Number(e.target.value))}
              className="w-full px-3 py-2 bg-gray-600 text-white rounded-lg border border-gray-500 focus:border-blue-500"
            >
              {Object.entries(SUPPORTED_CHAINS)
                .filter(([id]) => Number(id) !== chainId)
                .map(([id, info]) => (
                  <option key={id} value={id}>
                    {info.icon} {info.name}
                  </option>
                ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-white font-semibold mb-2">Receiver Address</label>
          <input
            type="text"
            value={receiverAddress}
            onChange={(e) => setReceiverAddress(e.target.value)}
            placeholder="0x..."
            className="w-full px-3 py-2 bg-gray-600 text-white rounded-lg border border-gray-500 focus:border-blue-500"
          />
          <button
            onClick={() => setReceiverAddress(address || '')}
            className="mt-2 text-sm text-blue-400 hover:text-blue-300"
          >
            Use my address
          </button>
        </div>

        <button
          onClick={handleTransfer}
          disabled={loading || !selectedEquipment || !receiverAddress}
          className="w-full px-6 py-3 bg-gradient-to-r from-green-600 to-blue-600 text-white font-bold rounded-lg hover:from-green-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {loading ? (
            <div className="flex items-center justify-center space-x-2">
              <LoadingSpinner size="sm" />
              <span>Transferring...</span>
            </div>
          ) : (
            'Transfer Cross-Chain'
          )}
        </button>

        {error && (
          <div className="bg-red-900/20 border border-red-600 rounded-lg p-3">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {success && (
          <div className="bg-green-900/20 border border-green-600 rounded-lg p-3">
            <p className="text-green-400">{success}</p>
          </div>
        )}
      </div>

      <div className="bg-yellow-900/20 border border-yellow-600 rounded-lg p-4">
        <h4 className="text-yellow-400 font-semibold mb-2">Important Notes:</h4>
        <ul className="text-sm text-yellow-300 space-y-1">
          <li>• Cross-chain transfers are powered by Chainlink CCIP</li>
          <li>• Equipment will be burned on the source chain and minted on destination</li>
          <li>• Ensure the receiver address is correct - transfers cannot be reversed</li>
        </ul>
      </div>
    </div>
  );
};

export default CrossChainLootTransfer;