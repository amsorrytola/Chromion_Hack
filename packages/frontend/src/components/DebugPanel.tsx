import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { apiService } from '../services/api';
import Loading from './Loading';

interface DebugInfo {
  backendHealth: boolean;
  playerCreated: boolean;
  npcList: any[];
  equipmentList: any[];
  error?: string;
}

const DebugPanel: React.FC = () => {
  const { address } = useAccount();
  const [isOpen, setIsOpen] = useState(false);
  const [debug, setDebug] = useState<DebugInfo>({
    backendHealth: false,
    playerCreated: false,
    npcList: [],
    equipmentList: []
  });
  const [loading, setLoading] = useState(false);

  const runDiagnostics = async () => {
    if (!address) {
      setDebug(prev => ({ ...prev, error: 'No wallet connected' }));
      return;
    }

    setLoading(true);
    try {
      // Test backend health
      const healthResponse = await fetch('http://localhost:3001/api/health');
      const backendHealth = healthResponse.ok;

      // Test player creation/retrieval
      let playerCreated = false;
      try {
        const playerResponse = await apiService.getPlayer(address);
        if (!playerResponse.success) {
          const createResponse = await apiService.createPlayer(address);
          playerCreated = createResponse.success;
        } else {
          playerCreated = true;
        }
      } catch (error) {
        console.error('Player test failed:', error);
      }

      // Test NPC list
      let npcList: any[] = [];
      try {
        const npcResponse = await apiService.getNPCs();
        npcList = npcResponse.success ? npcResponse.data : [];
      } catch (error) {
        console.error('NPC test failed:', error);
      }

      // Test equipment list
      let equipmentList: any[] = [];
      try {
        const equipmentResponse = await apiService.getPlayerEquipment(address);
        equipmentList = equipmentResponse.success ? equipmentResponse.data : [];
      } catch (error) {
        console.error('Equipment test failed:', error);
      }

      setDebug({
        backendHealth,
        playerCreated,
        npcList,
        equipmentList,
        error: undefined
      });
    } catch (error) {
      setDebug(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && address) {
      runDiagnostics();
    }
  }, [isOpen, address]);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 right-4 bg-green-600 hover:bg-green-700 text-white p-3 rounded-full shadow-lg transition-colors z-50"
        title="Debug Panel"
      >
        🔧
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="glass-morphism p-6 rounded-lg max-w-2xl max-h-96 overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-white">🔧 Debug Panel</h2>
          <button
            onClick={() => setIsOpen(false)}
            className="text-white hover:text-gray-300 text-2xl"
          >
            ×
          </button>
        </div>
        
        {loading ? (
          <Loading message="Running diagnostics..." />
        ) : (
          <div className="space-y-4 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-300">Backend Connection:</span>
              <span className={debug.backendHealth ? 'text-green-400' : 'text-red-400'}>
                {debug.backendHealth ? '✅ Connected' : '❌ Failed'}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-gray-300">Player System:</span>
              <span className={debug.playerCreated ? 'text-green-400' : 'text-red-400'}>
                {debug.playerCreated ? '✅ Working' : '❌ Failed'}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-gray-300">NPC System:</span>
              <span className={debug.npcList.length > 0 ? 'text-green-400' : 'text-yellow-400'}>
                {debug.npcList.length > 0 ? `✅ ${debug.npcList.length} NPCs` : '⚠️ No NPCs'}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-gray-300">Equipment System:</span>
              <span className="text-blue-400">
                📦 {debug.equipmentList.length} items
              </span>
            </div>
            
            {debug.error && (
              <div className="p-3 bg-red-900/20 border border-red-500/30 rounded">
                <p className="text-red-400 text-xs">{debug.error}</p>
              </div>
            )}
            
            <div className="flex space-x-2 mt-4">
              <button
                onClick={runDiagnostics}
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
              >
                🔄 Re-run Tests
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DebugPanel;
