// Level data and configuration for the single-level dungeon crawler
export interface LevelConfig {
  id: number;
  name: string;
  width: number;
  height: number;
  playerStart: { x: number; y: number };
  enemies: Array<{ x: number; y: number; type: string }>;
  loot: Array<{ x: number; y: number; type: string }>;
  map: number[][];
  nextLevel?: number;
  backgroundColor: number;
  theme: 'dungeon' | 'cave' | 'temple';
}

// Single Level: Enhanced Dungeon
const level1Map = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,1],
  [1,0,1,1,0,1,1,1,0,1,1,0,1,1,1,0,1,1,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,1,0,1,1,1,0,1,1,1,0,1,1,1,0,1,0,1,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,1,1,0,1,0,1,1,1,0,0,1,1,1,0,1,0,1,1,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,1,1,0,1,1,1,0,1,1,0,1,1,1,0,1,1,0,1],
  [1,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,1],
  [1,0,1,0,1,1,1,0,1,1,1,0,1,1,1,0,1,0,1,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,1,1,1,0,1,1,1,0,0,1,1,1,0,1,1,1,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
];

// Level data and configuration for the single-level dungeon crawler
export interface LevelConfig {
  id: number;
  name: string;
  width: number;
  height: number;
  playerStart: { x: number; y: number };
  enemies: Array<{ x: number; y: number; type: string }>;
  loot: Array<{ x: number; y: number; type: string }>;
  map: number[][];
  nextLevel?: number;
  backgroundColor: number;
  theme: 'dungeon' | 'cave' | 'temple';
}

// Level data and configuration for the single-level dungeon crawler
export interface LevelConfig {
  id: number;
  name: string;
  width: number;
  height: number;
  playerStart: { x: number; y: number };
  enemies: Array<{ x: number; y: number; type: string }>;
  loot: Array<{ x: number; y: number; type: string }>;
  map: number[][];
  nextLevel?: number;
  backgroundColor: number;
  theme: 'dungeon' | 'cave' | 'temple';
}

// Level data and configuration for the single-level dungeon crawler
export interface LevelConfig {
  id: number;
  name: string;
  width: number;
  height: number;
  playerStart: { x: number; y: number };
  enemies: Array<{ x: number; y: number; type: string }>;
  loot: Array<{ x: number; y: number; type: string }>;
  map: number[][];
  nextLevel?: number;
  backgroundColor: number;
  theme: 'dungeon' | 'cave' | 'temple';
}


// Level data and configuration for the single-level dungeon crawler
export interface LevelConfig {
  id: number;
  name: string;
  width: number;
  height: number;
  playerStart: { x: number; y: number };
  enemies: Array<{ x: number; y: number; type: string }>;
  loot: Array<{ x: number; y: number; type: string }>;
  map: number[][];
  nextLevel?: number;
  backgroundColor: number;
  theme: 'dungeon' | 'cave' | 'temple';
}

export const LEVELS: LevelConfig[] = [
  {
    id: 1,
    name: "The Ancient Dungeon",
    width: 20,
    height: 15,
    playerStart: { x: 64, y: 64 },
    enemies: [
      { x: 160, y: 128, type: 'goblin' },
      { x: 320, y: 96, type: 'orc' },
      { x: 480, y: 160, type: 'goblin' },
      { x: 224, y: 288, type: 'skeleton' },
      { x: 416, y: 352, type: 'orc' },
      { x: 576, y: 224, type: 'goblin' },
      { x: 352, y: 192, type: 'skeleton' },
      { x: 288, y: 384, type: 'boss' },
      { x: 512, y: 320, type: 'orc' },
      { x: 192, y: 224, type: 'goblin' }
    ],
    loot: [
      { x: 128, y: 96, type: 'chest' },
      { x: 288, y: 128, type: 'rare_chest' },
      { x: 448, y: 224, type: 'chest' },
      { x: 352, y: 320, type: 'legendary_chest' },
      { x: 544, y: 160, type: 'rare_chest' },
      { x: 192, y: 352, type: 'chest' },
      { x: 480, y: 384, type: 'legendary_chest' }
    ],
    map: level1Map,
    backgroundColor: 0x0D0D0D, // Very dark background to complement stone textures
    theme: 'dungeon'
  }
];

// Helper functions
export function getLevel(id: number): LevelConfig | null {
  return LEVELS.find(level => level.id === id) || null;
}

export function getNextLevel(currentId: number): LevelConfig | null {
  return null;
}

export function getTotalLevels(): number {
  return LEVELS.length;
}