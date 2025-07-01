import axios from 'axios';

export const HOST = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const apiClient = axios.create({
  baseURL: HOST,
  timeout: 10000,
});

export const GAME_ROUTE = 'api/game';
export const GAME_STATE_ROUTE = `${GAME_ROUTE}/state/{playerId}`;
export const GAME_LEAVE_ROUTE = `${GAME_ROUTE}/leave`;
export const GAME_LEADERBOARD_ROUTE = `${GAME_ROUTE}/leaderboard`;
export const GAME_PLAYER_REGISTER_ROUTE = `${GAME_ROUTE}/player/connect`;
export const GAME_PLAYER_GET_ROUTE = `${GAME_ROUTE}/player/{wallet}`;
export const GAME_PLAYER_UPDATE_ROUTE = `${GAME_ROUTE}/player/{playerId}`;

export const PARTY_ROUTE = 'api/party';
export const PARTY_CREATE_ROUTE = `${PARTY_ROUTE}/create`;
export const PARTY_JOIN_ROUTE = `${PARTY_ROUTE}/join`;
export const PARTY_LEAVE_ROUTE = `${PARTY_ROUTE}/leave`;
export const PARTY_AVAILABLE_ROUTE = `${PARTY_ROUTE}/available`;
export const PARTY_GET_ROUTE = `${PARTY_ROUTE}/{partyId}`;
export const PARTY_PLAYER_GET_ROUTE = `${PARTY_ROUTE}/player/{address}`;
export const PARTY_UPDATE_ROUTE = `${PARTY_ROUTE}/{partyId}`;
export const PARTY_DISBAND_ROUTE = `${PARTY_ROUTE}/{partyId}`;

export const LOOT_ROUTE = 'api/loot';
export const LOOT_GENERATE_ROUTE = `${LOOT_ROUTE}/generate`;
export const LOOT_PLAYER_GET_ROUTE = `${LOOT_ROUTE}/player/{playerId}`;
export const LOOT_EQUIPMENT_GET_ROUTE = `${LOOT_ROUTE}/equipment/{tokenId}`;
export const LOOT_LEND_ROUTE = `${LOOT_ROUTE}/lend`;
export const LOOT_BORROW_ROUTE = `${LOOT_ROUTE}/borrow`;
export const LOOT_MARKETPLACE_ROUTE = `${LOOT_ROUTE}/marketplace`;
export const LOOT_LENDING_UPDATE_ROUTE = `${LOOT_ROUTE}/lending/{orderId}`;

export const AI_ROUTE = 'api/ai';
export const AI_INTERACT_ROUTE = `${AI_ROUTE}/interact`;
export const AI_NPCS_ROUTE = `${AI_ROUTE}/npcs`;
export const AI_HISTORY_ROUTE = `${AI_ROUTE}/history/{playerId}`;
export const AI_QUEST_ROUTE = `${AI_ROUTE}/quest/{npcId}`;
