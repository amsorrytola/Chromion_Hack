import React, { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { useNavigate } from "react-router-dom";
import { PartyStatus, PartyRole } from "../../../shared/src/types";
import type { Party, PartyMember } from "../../../shared/src/types";
import { useGame } from "../contexts/GameContext";
import {
  apiClient,
  PARTY_CREATE_ROUTE,
  PARTY_PLAYER_GET_ROUTE,
  PARTY_AVAILABLE_ROUTE,
  GAME_PLAYER_REGISTER_ROUTE,
  PARTY_DISBAND_ROUTE,
} from "../utils/routes";
import { useWalletClient } from "wagmi";
import { blockchainService } from "../services/blockchainServiceFrontend";

import { getChainName } from "../utils/marketplaceUtils";
import { createPublicClient, http } from "viem";
import { sepolia } from "viem/chains"; // or polygonMumbai/arbitrumGoerli depending on your chainId

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

interface PartyInvite {
  id: string;
  partyId: string;
  partyName: string;
  leaderName: string;
  memberCount: number;
  maxSize: number;
}

interface PartyRequest {
  id: string;
  partyId: string;
  playerId: string;
  message?: string;
  status: string;
  createdAt: string;
  player: {
    id: string;
    username?: string;
    wallet: string;
    level?: number;
  };
}

const PartyPage: React.FC = () => {
  const { address } = useAccount();
  const { state } = useGame();
  const navigate = useNavigate();
  const [currentParty, setCurrentParty] = useState<Party | null>(null);
  const [partyInvites, setPartyInvites] = useState<PartyInvite[]>([]);
  const [partyRequests, setPartyRequests] = useState<PartyRequest[]>([]);
  const [availableParties, setAvailableParties] = useState<Party[]>([]);
  const [isLoadingAvailableParties, setIsLoadingAvailableParties] =
    useState(false);
  const [isCreatingParty, setIsCreatingParty] = useState(false);
  const [newPartyName, setNewPartyName] = useState("");
  const [maxSize, setMaxSize] = useState(4); // Default max size
  const [chainId, setChainId] = useState(11155111); // Default to Sepolia testnet
  const [playerRole, setPlayerRole] = useState<PartyRole | null>(null);
  const [BlockChainPartyId, setBlockChainPartyId] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<"current" | "browse" | "invites">(
    "current"
  );
  const { data: walletClient } = useWalletClient();
  const [createPartytTxHash, setCreatePartytTxHash] = useState<string | null>(
    null
  );

  // Mock data for demonstration
  const fetchPlayerParty = async () => {
    if (!address) return;

    try {
      console.log("Fetching party for player:", address);
      const response = await apiClient.get(
        PARTY_PLAYER_GET_ROUTE.replace("{address}", address)
      );
      console.log("Player party response:", response);
      const apiResponse = response.data as ApiResponse<any>;
      if (!apiResponse.data) {
        console.warn("No party data found for player:", address);
        return;
      }

      const data = apiResponse.data;
      if (!data) return;

      const updatedParty: Party = {
        id: data.id,
        name: data.name,
        leaderId:
          data.members.find((m: any) => m.role === "leader")?.player.wallet ||
          "",
        members: data.members.map((m: any) => ({
          playerId: m.playerId,
          walletAddress: m.player.wallet,
          chainId: data.chainId,
          role: m.role,
          joinedAt: new Date(m.createdAt),
          isOnline: true,
        })),
        maxSize: data.maxSize,
        createdChainId: data.chainId,
        status: PartyStatus.FORMING,
        createdAt: new Date(data.createdAt),
        updatedAt: new Date(data.updatedAt),
        onchainPartyId: data.onchainPartyId || null,
      };

      setCurrentParty(updatedParty);
      setPlayerRole(
        updatedParty.members.find((m) => m.walletAddress === address)?.role ||
          null
      );
    } catch (err) {
      console.error("Error fetching player party:", err);
    }
  };

  const fetchAvailableParties = async () => {
    if (!address) return;

    setIsLoadingAvailableParties(true);
    try {
      console.log("Fetching available parties...");

      let playerId = "";
      try {
        // Get the current player's ID first
        const playerResponse = await apiClient.get(
          `/api/game/player/${address}`
        );
        const playerData = playerResponse.data as ApiResponse<any>;
        playerId = playerData?.data?.id || "";
      } catch (err) {
        console.warn("Could not get player ID, fetching all parties:", err);
        // Continue without player ID - we'll get all parties
      }

      const response = await apiClient.get(
        `${PARTY_AVAILABLE_ROUTE}?excludePlayerId=${playerId}&limit=20`
      );
      console.log("Available parties response:", response);

      const apiResponse = response.data as ApiResponse<any[]>;
      if (!apiResponse.success || !apiResponse.data) {
        console.warn("No available parties found");
        setAvailableParties([]);
        return;
      }

      const transformedParties: Party[] = apiResponse.data.map(
        (partyData: any) => ({
          id: partyData.id,
          name: partyData.name,
          leaderId:
            partyData.members.find((m: any) => m.role === "leader")?.player
              .wallet || "",
          members: partyData.members.map((m: any) => ({
            playerId: m.playerId,
            walletAddress: m.player.wallet,
            chainId: partyData.chainId,
            role: m.role,
            joinedAt: new Date(m.createdAt),
            isOnline: true,
          })),
          maxSize: partyData.maxSize,
          createdChainId: partyData.chainId,
          status: PartyStatus.FORMING,
          createdAt: new Date(partyData.createdAt),
          updatedAt: new Date(partyData.updatedAt),
          onchainPartyId: partyData.onchainPartyId || null,
        })
      );

      setAvailableParties(transformedParties);
      console.log("Available parties loaded:", transformedParties.length);
    } catch (err) {
      console.error("Error fetching available parties:", err);
      setAvailableParties([]);
    } finally {
      setIsLoadingAvailableParties(false);
    }
  };

  const fetchPartyRequests = async () => {
    if (!currentParty) return;

    try {
      const response = await apiClient.get(
        `/api/party/${currentParty.id}/requests`
      );
      const apiResponse = response.data as ApiResponse<PartyRequest[]>;

      if (apiResponse.success && apiResponse.data) {
        setPartyRequests(apiResponse.data);
      }
    } catch (err) {
      console.error("Error fetching party requests:", err);
    }
  };

  useEffect(() => {
    fetchPlayerParty();
    fetchAvailableParties();
  }, [address]);

  useEffect(() => {
    if (currentParty && currentParty.leaderId === address) {
      fetchPartyRequests();
    }
  }, [currentParty, address]);

  const handleCreateParty = async () => {
    if (!newPartyName.trim() || !address || !walletClient) {
      alert("Please enter a party name and connect your wallet.");
      return;
    }

    setIsCreatingParty(true);

    try {
      // Step 0: Register player in backend (safe to call even if already exists)
      try {
        await apiClient.post(GAME_PLAYER_REGISTER_ROUTE, { wallet: address });
        console.log("Player registration successful or already exists");
      } catch (err) {
        console.error("Player registration failed:", err);
        throw new Error("Failed to register player");
      }

      // Step 1: Register player on-chain (non-blocking)
      try {
        await blockchainService.registerPlayer(walletClient, chainId);
      } catch (err) {
        console.warn("Player may already be registered on-chain:", err);
      }

      const result = await blockchainService.createParty(
        walletClient,
        chainId,
        maxSize
      );

      console.log("Result from createParty:", result);
      console.log("Tx Hash:", result.transactionHash);
      console.log("Onchain Party ID:", result.onchainPartyId);

      // ✅ No need to call `createPublicClient` or wait manually
      console.log(
        "Party confirmed:",
        result.transactionHash,
        result.onchainPartyId
      );
      setCreatePartytTxHash(result.transactionHash);

      // Step 4: Sync with backend
      const response = await apiClient.post(PARTY_CREATE_ROUTE, {
        name: newPartyName,
        playerAddress: address,
        maxSize,
        chainId,
        onchainPartyId: result.onchainPartyId,
      });

      const apiResponse = response.data as ApiResponse<any>;
      if (!apiResponse.success || !apiResponse.data) {
        throw new Error("Failed to create party in backend");
      }

      const data = apiResponse.data;

      const newParty: Party = {
        id: data.id,
        name: data.name,
        leaderId: address,
        onchainPartyId: data.onchainPartyId, // ✅ include it
        members: data.members.map((m: any) => ({
          playerId: m.playerId,
          walletAddress: m.player.wallet,
          chainId: data.chainId,
          role: m.role,
          joinedAt: new Date(m.createdAt),
          isOnline: true,
        })),
        maxSize: data.maxSize,
        createdChainId: data.chainId,
        status: PartyStatus.FORMING,
        createdAt: new Date(data.createdAt),
        updatedAt: new Date(data.updatedAt),
      };

      console.log("New party created:", newParty);
      setBlockChainPartyId(data.onchainPartyId); // Store on-chain ID
      setCurrentParty(newParty);
      setNewPartyName("");
      setActiveTab("current");

      // Optional: Refetch for good UI sync
      setTimeout(() => {
        fetchPlayerParty();
        fetchAvailableParties();
      }, 1000);
    } catch (error: any) {
      console.error("Error creating party:", error);
      console.log(error?.message || "Failed to create party");
    } finally {
      setIsCreatingParty(false);
    }
  };

  const handleJoinParty = async (partyId: string) => {
    if (!address) {
      alert("Please connect your wallet first.");
      return;
    }

    try {
      // Get player ID
      const playerResponse = await apiClient.get(`/api/game/player/${address}`);
      const playerData = playerResponse.data as ApiResponse<any>;
      const playerId = playerData?.data?.id;

      if (!playerId) {
        alert("Player not found. Please register first.");
        return;
      }

      // Send join request
      const response = await apiClient.post("/api/party/request", {
        partyId,
        playerId,
        message: "I'd like to join your party!",
      });

      const apiResponse = response.data as ApiResponse<any>;

      if (apiResponse.success) {
        alert(
          "Request sent successfully! The party leader will review your request."
        );
        // Refresh available parties to update UI
        fetchAvailableParties();
      } else {
        alert(apiResponse.message || "Failed to send request");
      }
    } catch (error: any) {
      console.error("Error requesting to join party:", error);
      alert(error.response?.data?.message || "Failed to send request");
    }
  };

  const handleAcceptInvite = (inviteId: string) => {
    console.log("Accepting invite:", inviteId);
    // Implement accept invite logic
  };

  const handleLeaveParty = () => {
    if (window.confirm("Are you sure you want to leave the party?")) {
      setCurrentParty(null);
    }
  };

  const handleDisbandParty = async () => {
    if (!currentParty || !address || !walletClient) {
      console.warn("Missing required data for disbanding party:", {
        currentParty,
        address,
        walletClient,
      });
      return;
    }
    console.log("Attempting to disband party:", currentParty);
    if (!BlockChainPartyId) {
      alert("Cannot disband party: missing on-chain party ID.");
      console.error("Missing on-chain party ID in BlockChainPartyId:", BlockChainPartyId);
      return;
    }
  
    const confirmed = window.confirm("Are you sure you want to disband this party?");
    console.log("Disband confirmation prompt result:", confirmed);
    if (!confirmed) return;
  
    try {
      console.log("Starting on-chain disband for party ID:", BlockChainPartyId);
  
      const receipt = await blockchainService.deleteParty(
        walletClient,
        currentParty.createdChainId,
        BigInt(BlockChainPartyId)
      );
  
      console.log("✅ On-chain disband transaction confirmed");
      console.log("Transaction Receipt:", receipt);
  
      console.log("Sending DELETE request to backend to disband party:", currentParty.id);
      await apiClient.delete(
        PARTY_DISBAND_ROUTE.replace("{partyId}", currentParty.id)
      );
      console.log("✅ Party successfully deleted in backend");
  
      setCurrentParty(null);
      console.log("UI state reset: currentParty set to null");
  
      alert("Party disbanded successfully!");
      console.log("Triggering fetchAvailableParties()");
      fetchAvailableParties();
    } catch (error: any) {
      console.error("❌ Disband failed:", error);
      alert(error?.message || "Failed to disband party");
    }
  };
  
  

  const handleEnterDungeon = () => {
    if (!currentParty) {
      alert("You need to be in a party to enter the dungeon!");
      return;
    }

    // Navigate to the game page for multiplayer gameplay
    navigate("/game", {
      state: {
        partyMode: true,
        partyId: currentParty.id,
        partyMembers: currentParty.members,
        autoStartInteractive: true, // Auto-start in interactive mode for multiplayer
      },
    });
  };

  const handleVisitMarketplace = () => {
    // Navigate to the marketplace page
    navigate("/marketplace");
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const renderCurrentParty = () => {
    if (!currentParty) {
      return (
        <div className="game-card text-center py-12">
          <div className="mb-6">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gray-700 flex items-center justify-center">
              <span className="text-3xl">👥</span>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">
              No Active Party
            </h3>
            <p className="text-gray-400 mb-6">
              Create a new party or join an existing one to start your
              adventure!
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <div className="flex flex-col sm:flex-row gap-4">
                <input
                  type="text"
                  placeholder="Enter party name..."
                  value={newPartyName}
                  onChange={(e) => setNewPartyName(e.target.value)}
                  className="px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
                />
                <input
                  type="number"
                  placeholder="Enter max size..."
                  value={maxSize}
                  onChange={(e) => setMaxSize(Number(e.target.value))}
                  className="px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 w-20"
                />
                <select
                  value={chainId}
                  onChange={(e) => setChainId(Number(e.target.value))}
                  className="px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                >
                  <option value={11155111}>Sepolia Testnet</option>
                  <option value={1}>Ethereum Mainnet</option>
                  <option value={137}>Polygon</option>
                  <option value={42161}>Arbitrum</option>
                </select>
              </div>
              <button
                onClick={handleCreateParty}
                disabled={isCreatingParty || !newPartyName.trim()}
                className="game-button px-6 py-2 disabled:opacity-50"
              >
                {isCreatingParty ? "Creating..." : "Create Party"}
              </button>
              {createPartytTxHash && (
                <div className="text-sm text-gray-400">
                  Transaction Hash:{" "}
                  <a
                    href={`https://sepolia.etherscan.io/tx/${createPartytTxHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-purple-400 hover:text-purple-300"
                  >
                    {createPartytTxHash.slice(0, 6)}...
                    {createPartytTxHash.slice(-4)}
                  </a>
                </div>
              )}
            </div>

            <div className="flex gap-4 justify-center">
              <button
                onClick={() => {
                  setActiveTab("browse");
                  fetchAvailableParties();
                }}
                className="text-purple-400 hover:text-purple-300 underline"
              >
                Browse Available Parties
              </button>
              <span className="text-gray-600">|</span>
              <button
                onClick={() => setActiveTab("invites")}
                className="text-purple-400 hover:text-purple-300 underline"
              >
                Check Invites ({partyInvites.length})
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Party Header */}
        <div className="game-card">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">
                {currentParty.name}
              </h2>
              <div className="flex items-center gap-4 text-sm text-gray-400">
                <span>
                  Members: {currentParty.members.length}/{currentParty.maxSize}
                </span>
                <span>
                  Status:{" "}
                  <span className="text-purple-400 capitalize">
                    {currentParty.status.replace("_", " ")}
                  </span>
                </span>
                <span>Chain: {getChainName(currentParty.createdChainId)}</span>
              </div>
            </div>

            <div className="flex gap-2 mt-4 sm:mt-0">
              <button className="game-button px-4 py-2">Invite Players</button>
              {playerRole === "leader" ? (
                <button
                  onClick={handleDisbandParty}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                >
                  Delete Party
                </button>
              ) : (
                <button
                  onClick={handleLeaveParty}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                >
                  Leave Party
                </button>
              )}
            </div>
          </div>

          {/* Party Members */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-white mb-3">
              Party Members
            </h3>
            {currentParty.members.map((member, index) => (
              <div
                key={member.playerId}
                className="flex items-center justify-between p-3 bg-gray-800 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                      {member.role === PartyRole.LEADER ? "👑" : "⚔️"}
                    </div>
                    <div
                      className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-gray-800 ${
                        member.isOnline ? "bg-green-500" : "bg-gray-500"
                      }`}
                    />
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium">
                        {formatAddress(member.walletAddress)}
                      </span>
                      {member.role === PartyRole.LEADER && (
                        <span className="text-xs bg-yellow-600 text-yellow-100 px-2 py-1 rounded">
                          Leader
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-400">
                      {getChainName(member.chainId)} • Joined{" "}
                      {member.joinedAt.toLocaleDateString()}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs px-2 py-1 rounded ${
                      member.isOnline
                        ? "bg-green-800 text-green-200"
                        : "bg-gray-700 text-gray-400"
                    }`}
                  >
                    {member.isOnline ? "Online" : "Offline"}
                  </span>

                  {member.walletAddress === address &&
                    member.role !== PartyRole.LEADER && (
                      <button className="text-xs text-red-400 hover:text-red-300">
                        Leave
                      </button>
                    )}
                </div>
              </div>
            ))}
          </div>

          {/* Party Actions */}
          {currentParty.status === PartyStatus.FORMING && (
            <div className="mt-6 pt-6 border-t border-gray-700">
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={handleEnterDungeon}
                  className="game-button flex-1 py-3"
                >
                  🏰 Enter Dungeon
                </button>
                <button
                  onClick={handleVisitMarketplace}
                  className="game-button flex-1 py-3"
                >
                  🛒 Visit Marketplace
                </button>
                <button className="game-button flex-1 py-3">
                  ⚙️ Party Settings
                </button>
              </div>
            </div>
          )}

          {/* Party Requests (for leaders) */}
          {currentParty.leaderId === address && partyRequests.length > 0 && (
            <div className="mt-6 pt-6 border-t border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-3">
                Join Requests ({partyRequests.length})
              </h3>
              <div className="space-y-3">
                {partyRequests.map((request) => (
                  <div
                    key={request.id}
                    className="flex items-center justify-between p-4 bg-gray-800 rounded-lg"
                  >
                    <div>
                      <h4 className="text-white font-medium">
                        {request.player.username ||
                          formatAddress(request.player.wallet)}
                      </h4>
                      <div className="text-sm text-gray-400">
                        Level: {request.player.level || 1} • Requested:{" "}
                        {new Date(request.createdAt).toLocaleDateString()}
                      </div>
                      {request.message && (
                        <div className="text-sm text-gray-300 mt-1 italic">
                          "{request.message}"
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() =>
                          handleRespondToRequest(request.id, "approve")
                        }
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() =>
                          handleRespondToRequest(request.id, "reject")
                        }
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderBrowseParties = () => (
    <div className="space-y-4">
      <div className="game-card">
        <h3 className="text-xl font-bold text-white mb-4">Available Parties</h3>

        {isLoadingAvailableParties ? (
          <div className="text-center py-8">
            <div
              className="animate-spin inline-block w-6 h-6 border-[3px] border-current border-t-transparent text-purple-400 rounded-full"
              role="status"
              aria-label="loading"
            ></div>
            <p className="text-gray-400 mt-2">Loading available parties...</p>
          </div>
        ) : availableParties.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-400">
              No parties available to join at the moment.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {availableParties.map((party) => (
              <div
                key={party.id}
                className="flex items-center justify-between p-4 bg-gray-800 rounded-lg"
              >
                <div>
                  <h4 className="text-white font-medium">{party.name}</h4>
                  <div className="text-sm text-gray-400">
                    Members: {party.members.length}/{party.maxSize} • Chain:{" "}
                    {getChainName(party.createdChainId)} • Status:{" "}
                    <span className="capitalize">
                      {party.status.replace("_", " ")}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => handleJoinParty(party.id)}
                  className="game-button px-4 py-2"
                >
                  Request to Join
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderInvites = () => (
    <div className="space-y-4">
      <div className="game-card">
        <h3 className="text-xl font-bold text-white mb-4">Party Invitations</h3>

        {partyInvites.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-400">No pending invitations.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {partyInvites.map((invite) => (
              <div
                key={invite.id}
                className="flex items-center justify-between p-4 bg-gray-800 rounded-lg"
              >
                <div>
                  <h4 className="text-white font-medium">{invite.partyName}</h4>
                  <div className="text-sm text-gray-400">
                    Leader: {invite.leaderName} • Members: {invite.memberCount}/
                    {invite.maxSize}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAcceptInvite(invite.id)}
                    className="game-button px-4 py-2"
                  >
                    Accept
                  </button>
                  <button className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors">
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const handleRespondToRequest = async (
    requestId: string,
    action: "approve" | "reject"
  ) => {
    if (!address || !currentParty) return;

    try {
      // Get player ID
      const playerResponse = await apiClient.get(`/api/game/player/${address}`);
      const playerData = playerResponse.data as ApiResponse<any>;
      const playerId = playerData?.data?.id;

      if (!playerId) {
        alert("Player not found. Please register first.");
        return;
      }

      const response = await apiClient.post(
        `/api/party/requests/${requestId}/respond`,
        {
          action,
          responderId: playerId,
        }
      );

      const apiResponse = response.data as ApiResponse<any>;

      if (apiResponse.success) {
        // Refresh party data and requests
        fetchPlayerParty();
        fetchPartyRequests();
        alert(apiResponse.message);
      } else {
        alert(apiResponse.message || "Failed to respond to request");
      }
    } catch (error: any) {
      console.error("Error responding to request:", error);
      alert(error.response?.data?.message || "Failed to respond to request");
    }
  };

  return (
    <div className="text-white max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-4 font-['Orbitron']">
          ⚔️ Party Management
        </h1>
        <p className="text-gray-400">
          Form parties, explore dungeons, and share adventures across multiple
          chains!
        </p>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setActiveTab("current")}
          className={`px-4 py-2 rounded-lg transition-colors ${
            activeTab === "current"
              ? "bg-purple-600 text-white"
              : "bg-gray-800 text-gray-400 hover:bg-gray-700"
          }`}
        >
          Current Party
        </button>
        <button
          onClick={() => {
            setActiveTab("browse");
            fetchAvailableParties(); // Refresh available parties when browse tab is clicked
          }}
          className={`px-4 py-2 rounded-lg transition-colors ${
            activeTab === "browse"
              ? "bg-purple-600 text-white"
              : "bg-gray-800 text-gray-400 hover:bg-gray-700"
          }`}
        >
          Browse Parties
        </button>
        <button
          onClick={() => setActiveTab("invites")}
          className={`px-4 py-2 rounded-lg transition-colors relative ${
            activeTab === "invites"
              ? "bg-purple-600 text-white"
              : "bg-gray-800 text-gray-400 hover:bg-gray-700"
          }`}
        >
          Invitations
          {partyInvites.length > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {partyInvites.length}
            </span>
          )}
        </button>
      </div>

      {/* Content */}
      {activeTab === "current" && renderCurrentParty()}
      {activeTab === "browse" && renderBrowseParties()}
      {activeTab === "invites" && renderInvites()}
    </div>
  );
};

export default PartyPage;
