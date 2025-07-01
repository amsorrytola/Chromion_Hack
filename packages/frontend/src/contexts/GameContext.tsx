import React, { createContext, useContext, useReducer, useEffect } from "react";
import { apiClient, GAME_PLAYER_REGISTER_ROUTE } from "../utils/routes";
import type { ReactNode } from "react";
import { useAccount } from "wagmi";

interface Player {
  id: string;
  address: string;
  name: string;
  level: number;
  experience: number;
  health: number;
  maxHealth: number;
  mana: number;
  maxMana: number;
  stats: {
    strength: number;
    defense: number;
    agility: number;
    intelligence: number;
  };
  location: {
    dungeon: string;
    floor: number;
    room: number;
  };
}

interface RegisterResponse {
  success: boolean;
  data: {
    id: string;
    wallet: string;
    username?: string;
    level?: number;
    experience?: number;
  };
  message?: string;
}

interface Equipment {
  id: string;
  name: string;
  type: "weapon" | "armor" | "accessory";
  rarity: "common" | "uncommon" | "rare" | "epic" | "legendary";
  stats: {
    attack?: number;
    defense?: number;
    agility?: number;
    intelligence?: number;
  };
  equipped: boolean;
}

interface Enemy {
  id: string;
  name: string;
  health: number;
  maxHealth: number;
  stats: {
    attack: number;
    defense: number;
    agility: number;
  };
  lootTable: string[];
}

interface GameState {
  isConnected: boolean;
  gameStarted: boolean;
  gameMode: "menu" | "dungeon" | "combat" | "inventory" | "party";
  player: Player | null;
  party: any;
  equipment: Equipment[];
  inventory: Equipment[];
  currentEnemy: Enemy | null;
  combatLog: string[];
  dungeonData: {
    currentFloor: number;
    currentRoom: number;
    roomsExplored: number[];
    floorComplete: boolean;
  };
  isLoading: boolean;
  error: string | null;
}

interface GameContextType {
  state: GameState;
  dispatch: React.Dispatch<any>;
  actions: {
    startGame: () => void;
    enterCombat: (enemy: Enemy) => void;
    attack: () => void;
    useSkill: (skill: string) => void;
    flee: () => void;
    equipItem: (itemId: string) => void;
    exploreRoom: () => void;
    nextFloor: () => void;
  };
}

const GameContext = createContext<GameContextType | undefined>(undefined);

const initialState: GameState = {
  isConnected: false,
  gameStarted: false,
  gameMode: "menu",
  player: null,
  party: null,
  equipment: [],
  inventory: [],
  currentEnemy: null,
  combatLog: [],
  dungeonData: {
    currentFloor: 1,
    currentRoom: 1,
    roomsExplored: [],
    floorComplete: false,
  },
  isLoading: false,
  error: null,
};

function gameReducer(state: GameState, action: any): GameState {
  switch (action.type) {
    case "SET_CONNECTED":
      return { ...state, isConnected: action.payload };
    case "START_GAME":
      return {
        ...state,
        gameStarted: true,
        gameMode: "dungeon",
        player: action.payload.player,
      };
    case "SET_GAME_MODE":
      return { ...state, gameMode: action.payload };
    case "SET_PLAYER":
      return { ...state, player: action.payload };
    case "SET_PARTY":
      return { ...state, party: action.payload };
    case "SET_EQUIPMENT":
      return { ...state, equipment: action.payload };
    case "SET_INVENTORY":
      return { ...state, inventory: action.payload };
    case "ENTER_COMBAT":
      return {
        ...state,
        gameMode: "combat",
        currentEnemy: action.payload,
        combatLog: [`A wild ${action.payload.name} appears!`],
      };
    case "ADD_COMBAT_LOG":
      return {
        ...state,
        combatLog: [...state.combatLog, action.payload],
      };
    case "UPDATE_PLAYER_HEALTH":
      return {
        ...state,
        player: state.player
          ? {
              ...state.player,
              health: Math.max(
                0,
                Math.min(state.player.maxHealth, action.payload)
              ),
            }
          : state.player,
      };
    case "UPDATE_ENEMY_HEALTH":
      return {
        ...state,
        currentEnemy: state.currentEnemy
          ? {
              ...state.currentEnemy,
              health: Math.max(0, action.payload),
            }
          : state.currentEnemy,
      };
    case "END_COMBAT":
      return {
        ...state,
        gameMode: "dungeon",
        currentEnemy: null,
        combatLog: [],
      };
    case "EXPLORE_ROOM":
      return {
        ...state,
        dungeonData: {
          ...state.dungeonData,
          currentRoom: state.dungeonData.currentRoom + 1,
          roomsExplored: [
            ...state.dungeonData.roomsExplored,
            state.dungeonData.currentRoom,
          ],
        },
      };
    case "NEXT_FLOOR":
      return {
        ...state,
        dungeonData: {
          currentFloor: state.dungeonData.currentFloor + 1,
          currentRoom: 1,
          roomsExplored: [],
          floorComplete: false,
        },
      };
    case "SET_LOADING":
      return { ...state, isLoading: action.payload };
    case "SET_ERROR":
      return { ...state, error: action.payload };
    default:
      return state;
  }
}

export const GameProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const { address, isConnected } = useAccount();

  // Game actions
  const actions = {
    startGame: async () => {
      if (!address) {
        dispatch({ type: "SET_ERROR", payload: "Wallet not connected" });
        return;
      }
      try {
        dispatch({ type: "SET_LOADING", payload: true });

        const response = await apiClient.post<RegisterResponse>(
          GAME_PLAYER_REGISTER_ROUTE,
          {
            wallet: address,
          }
        );

        if (response.data.success) {
          const playerFromDB = response.data.data;

          const mappedPlayer: Player = {
            id: playerFromDB.id,
            address: playerFromDB.wallet,
            name: playerFromDB.username || "Adventurer",
            level: playerFromDB.level || 1,
            experience: playerFromDB.experience || 0,
            health: 100, // Customize based on game logic
            maxHealth: 100,
            mana: 50,
            maxMana: 50,
            stats: {
              strength: 10,
              defense: 8,
              agility: 12,
              intelligence: 6,
            },
            location: {
              dungeon: "Mystic Caverns",
              floor: 1,
              room: 1,
            },
          };
          dispatch({
            type: "START_GAME",
            payload: { player: mappedPlayer },
          });
          dispatch({ type: "SET_CONNECTED", payload: true });
          
        } else {
          dispatch({
            type: "SET_ERROR",
            payload: response.data.message || "Failed to start game",
          });
        }
      } catch (error: any) {
        console.error("Error starting game:", error);
        dispatch({
          type: "SET_ERROR",
          payload: "An error occurred while starting the game",
        });
      } finally {
        dispatch({ type: "SET_LOADING", payload: false });
      }
    },

    enterCombat: (enemy: Enemy) => {
      dispatch({ type: "ENTER_COMBAT", payload: enemy });
    },

    attack: () => {
      if (!state.player || !state.currentEnemy) return;

      const damage =
        Math.floor(Math.random() * state.player.stats.strength) + 5;
      const newEnemyHealth = state.currentEnemy.health - damage;

      dispatch({
        type: "ADD_COMBAT_LOG",
        payload: `You attack for ${damage} damage!`,
      });
      dispatch({ type: "UPDATE_ENEMY_HEALTH", payload: newEnemyHealth });

      if (newEnemyHealth <= 0) {
        dispatch({
          type: "ADD_COMBAT_LOG",
          payload: `${state.currentEnemy.name} is defeated!`,
        });
        setTimeout(() => {
          dispatch({ type: "END_COMBAT" });
        }, 2000);
        return;
      }

      // Enemy attacks back
      setTimeout(() => {
        const enemyDamage =
          Math.floor(Math.random() * state.currentEnemy!.stats.attack) + 3;
        const newPlayerHealth = state.player!.health - enemyDamage;

        dispatch({
          type: "ADD_COMBAT_LOG",
          payload: `${state.currentEnemy!.name} attacks for ${enemyDamage} damage!`,
        });
        dispatch({ type: "UPDATE_PLAYER_HEALTH", payload: newPlayerHealth });

        if (newPlayerHealth <= 0) {
          dispatch({
            type: "ADD_COMBAT_LOG",
            payload: "You have been defeated!",
          });
          setTimeout(() => {
            dispatch({ type: "SET_GAME_MODE", payload: "menu" });
          }, 2000);
        }
      }, 1000);
    },

    useSkill: (skill: string) => {
      if (!state.player || !state.currentEnemy) return;

      let damage = 0;
      let manaCost = 0;

      switch (skill) {
        case "fireball":
          damage =
            Math.floor(Math.random() * state.player.stats.intelligence * 2) +
            10;
          manaCost = 15;
          break;
        case "heal":
          const healAmount =
            Math.floor(state.player.stats.intelligence * 1.5) + 5;
          dispatch({
            type: "UPDATE_PLAYER_HEALTH",
            payload: state.player.health + healAmount,
          });
          dispatch({
            type: "ADD_COMBAT_LOG",
            payload: `You heal for ${healAmount} HP!`,
          });
          manaCost = 10;
          return;
        default:
          return;
      }

      if (state.player.mana < manaCost) {
        dispatch({ type: "ADD_COMBAT_LOG", payload: "Not enough mana!" });
        return;
      }

      const newEnemyHealth = state.currentEnemy.health - damage;
      dispatch({
        type: "ADD_COMBAT_LOG",
        payload: `You cast ${skill} for ${damage} damage!`,
      });
      dispatch({ type: "UPDATE_ENEMY_HEALTH", payload: newEnemyHealth });

      if (newEnemyHealth <= 0) {
        dispatch({
          type: "ADD_COMBAT_LOG",
          payload: `${state.currentEnemy.name} is defeated!`,
        });
        setTimeout(() => {
          dispatch({ type: "END_COMBAT" });
        }, 2000);
      }
    },

    flee: () => {
      if (Math.random() < 0.7) {
        dispatch({ type: "ADD_COMBAT_LOG", payload: "You successfully fled!" });
        setTimeout(() => {
          dispatch({ type: "END_COMBAT" });
        }, 1000);
      } else {
        dispatch({ type: "ADD_COMBAT_LOG", payload: "Could not escape!" });
      }
    },

    equipItem: (itemId: string) => {
      const item = state.inventory.find((i) => i.id === itemId);
      if (item) {
        dispatch({
          type: "SET_EQUIPMENT",
          payload: [...state.equipment, { ...item, equipped: true }],
        });
        dispatch({
          type: "SET_INVENTORY",
          payload: state.inventory.filter((i) => i.id !== itemId),
        });
      }
    },

    exploreRoom: () => {
      dispatch({ type: "EXPLORE_ROOM" });

      // Random encounter chance
      if (Math.random() < 0.6) {
        const enemies = [
          {
            id: "1",
            name: "Goblin",
            health: 30,
            maxHealth: 30,
            stats: { attack: 8, defense: 3, agility: 5 },
            lootTable: ["sword", "potion"],
          },
          {
            id: "2",
            name: "Orc",
            health: 50,
            maxHealth: 50,
            stats: { attack: 12, defense: 6, agility: 3 },
            lootTable: ["armor", "gold"],
          },
          {
            id: "3",
            name: "Skeleton",
            health: 25,
            maxHealth: 25,
            stats: { attack: 10, defense: 4, agility: 7 },
            lootTable: ["bone", "scroll"],
          },
        ];

        const randomEnemy = enemies[Math.floor(Math.random() * enemies.length)];
        setTimeout(() => {
          actions.enterCombat(randomEnemy);
        }, 1000);
      }
    },

    nextFloor: () => {
      dispatch({ type: "NEXT_FLOOR" });
    },
  };

  return (
    <GameContext.Provider value={{ state, dispatch, actions }}>
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error("useGame must be used within a GameProvider");
  }
  return context;
};
