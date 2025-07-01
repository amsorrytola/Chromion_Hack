import React, { useState, useEffect } from 'react';import { useAccount, useWalletClient } from 'wagmi';import { mockDataService, MockLootRequest } from '../../services/mockDataService';import LoadingSpinner from '../LoadingSpinner';export const RandomLootGenerator: React.FC = () => {  const { address, chainId } = useAccount();  const { data: walletClient } = useWalletClient();  const [dungeonLevel, setDungeonLevel] = useState(1);  const [loading, setLoading] = useState(false);  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [requests, setRequests] = useState<MockLootRequest[]>([]);

  useEffect(() => {
    loadLootRequests();
  }, [address]);

  const loadLootRequests = async () => {
    try {
      const savedRequests = localStorage.getItem('lootRequests');
      if (savedRequests) {
        setRequests(JSON.parse(savedRequests));
        return;
      }

      const mockRequests = await mockDataService.getLootRequests(address || 'mock-address');
      setRequests(mockRequests || []);
    } catch (err) {
      console.error('Error loading loot requests:', err);
      setRequests([]);
    }
  };

  const handleRequestRandomLoot = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const newRequest = await mockDataService.requestRandomLoot(chainId || 11155111);
      const updatedRequests = [newRequest, ...(requests || [])];
      
      setRequests(updatedRequests);
      localStorage.setItem('lootRequests', JSON.stringify(updatedRequests));

      setSuccess(`Random loot request submitted! Request ID: ${newRequest.requestId.slice(0, 10)}...`);

    } catch (err: any) {
      console.error('Error requesting random loot:', err);
      setError('Failed to request random loot');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-400';
      case 'fulfilled': return 'text-green-400';
      case 'failed': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6 space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white mb-2">🎲 Random Loot Generator</h2>
        <p className="text-gray-400">Generate random loot for testing</p>
      </div>

      <div className="bg-gray-700 rounded-lg p-4 space-y-4">
        <div>
          <label className="block text-white font-semibold mb-2">
            Dungeon Level
          </label>
          <div className="flex space-x-2">
            {[1, 2, 3, 4, 5].map(level => (
              <button
                key={level}
                onClick={() => setDungeonLevel(level)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  dungeonLevel === level
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                }`}
              >
                {level}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleRequestRandomLoot}
          disabled={loading}
          className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-lg hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {loading ? (
            <div className="flex items-center justify-center space-x-2">
              <LoadingSpinner size="sm" />
              <span>Generating...</span>
            </div>
          ) : (
            '🎲 Generate Random Loot'
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

      <div className="bg-gray-700 rounded-lg p-4">
        <h3 className="text-lg font-bold text-white mb-4">Generation History</h3>
        
        {Array.isArray(requests) && requests.length === 0 ? (
          <p className="text-gray-400 text-center py-4">No loot requests yet</p>
        ) : (
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {Array.isArray(requests) && requests.map((request) => (
              <div key={request.id} className="bg-gray-600 rounded-lg p-3">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="text-white font-medium">
                      Request #{request.requestId.slice(0, 8)}...
                    </p>
                    <p className="text-sm text-gray-400">
                      Chain: {request.chainId}
                    </p>
                  </div>
                  
                  <span className={`font-semibold ${getStatusColor(request.status)}`}>
                    {request.status.toUpperCase()}
                  </span>
                </div>

                {request.status === 'fulfilled' && request.result && (
                  <div className="mt-3 p-2 bg-green-900/20 border border-green-600 rounded">
                    <p className="text-green-400 font-semibold">🎉 Loot Generated!</p>
                    <p className="text-white">{request.result.name}</p>
                    <p className="text-gray-400">
                      {request.result.rarity} {request.result.equipmentType}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RandomLootGenerator;
