import Phaser from 'phaser';
import { LevelConfig } from './LevelData';

export class LevelRenderer {
  private scene: Phaser.Scene;
  private walls!: Phaser.Physics.Arcade.StaticGroup;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  createSprites(level: LevelConfig) {
    console.log(`Creating sprites for level ${level.id} with theme: ${level.theme}`);
    
    // Clear any existing graphics that might interfere
    this.scene.children.list.forEach(child => {
      if (child instanceof Phaser.GameObjects.Graphics && child.name === 'debug-graphics') {
        child.destroy();
      }
    });
    
    // Get list of textures needed for this level (only dungeon theme)
    const requiredTextures = [
      'player-enhanced',
      `enemy-goblin`, `enemy-orc`, `enemy-skeleton`, `enemy-boss`,
      `wall-dungeon`, `floor-dungeon`, // Only dungeon theme
      'loot-chest', 'loot-rare_chest', 'loot-legendary_chest'
    ];
    
    // Only destroy textures that will be recreated
    const texturesToDestroy = [
      'player-enhanced',
      `enemy-goblin`, `enemy-orc`, `enemy-skeleton`, `enemy-boss`,
      'loot-chest', 'loot-rare_chest', 'loot-legendary_chest',
      'wall-dungeon', 'floor-dungeon' // Only clean up dungeon textures
    ];
    
    // Safely destroy existing textures
    texturesToDestroy.forEach(textureKey => {
      if (this.scene.textures.exists(textureKey)) {
        try {
          this.scene.textures.remove(textureKey);
          console.log(`Removed existing texture: ${textureKey}`);
        } catch (error) {
          console.warn(`Failed to remove texture ${textureKey}:`, error);
        }
      }
    });
    
    try {
      // Create graphics object for texture generation
      const graphics = this.scene.add.graphics();
      
      // Create all textures in order
      console.log('Creating player texture...');
      this.createPlayerSprite(graphics);
      
      console.log('Creating enemy textures...');
      this.createEnemySprites(graphics, level.theme);
      
      console.log(`Creating wall texture for theme: ${level.theme}...`);
      this.createWallSprite(graphics, level.theme);
      
      console.log(`Creating floor texture for theme: ${level.theme}...`);
      this.createFloorSprite(graphics, level.theme);
      
      console.log('Creating loot textures...');
      this.createLootSprites(graphics);
      
      // Clean up graphics object
      graphics.destroy();
      
      // Verify all required textures exist
      const missingTextures = requiredTextures.filter(key => !this.scene.textures.exists(key));
      if (missingTextures.length > 0) {
        console.error('Missing textures after creation:', missingTextures);
        throw new Error(`Failed to create textures: ${missingTextures.join(', ')}`);
      }
      
      console.log(`Successfully created all sprites for level ${level.id} (${level.theme})`, {
        texturesCreated: requiredTextures.length,
        wallTexture: `wall-${level.theme}`,
        floorTexture: `floor-${level.theme}`,
        allTexturesExist: requiredTextures.every(key => this.scene.textures.exists(key))
      });
      
    } catch (error) {
      console.error('Error creating sprites:', error);
      throw error; // Re-throw to handle in calling code
    }
  }

  private createPlayerSprite(graphics: Phaser.GameObjects.Graphics) {
    graphics.clear();
    
    // Ensure graphics is set up properly
    if (!graphics.scene || !graphics.scene.textures) {
      console.error('Graphics object is not properly initialized');
      return;
    }
    
    // Create a more detailed player sprite
    graphics.fillStyle(0x2B4C8C); // Blue armor base
    graphics.fillRoundedRect(2, 2, 28, 28, 4);
    
    // Body armor
    graphics.fillStyle(0x4169E1); // Brighter blue armor
    graphics.fillRect(8, 12, 16, 18);
    
    // Head/helmet
    graphics.fillStyle(0xFFDBB3); // Skin tone
    graphics.fillCircle(16, 10, 6);
    graphics.fillStyle(0x8B4513); // Brown hair
    graphics.fillCircle(16, 8, 5);
    
    // Armor details
    graphics.fillStyle(0xC0C0C0); // Silver armor trim
    graphics.fillRect(7, 11, 18, 2);
    graphics.fillRect(7, 28, 18, 2);
    
    // Weapon (sword)
    graphics.fillStyle(0xC0C0C0); // Silver blade
    graphics.fillRect(26, 6, 4, 12);
    graphics.fillStyle(0x8B4513); // Brown handle
    graphics.fillRect(27, 18, 2, 6);
    
    try {
      graphics.generateTexture('player-enhanced', 32, 32);
      console.log('Player texture created successfully');
    } catch (error) {
      console.error('Failed to create player texture:', error);
      throw error;
    }
  }

  private createEnemySprites(graphics: Phaser.GameObjects.Graphics, theme: string) {
    // Goblin sprite - small green creature
    graphics.clear();
    graphics.fillStyle(0x228B22); // Forest green body
    graphics.fillRoundedRect(4, 4, 24, 24, 3);
    graphics.fillStyle(0x32CD32); // Lighter green for head
    graphics.fillCircle(16, 12, 8);
    graphics.fillStyle(0xFF0000); // Red eyes
    graphics.fillCircle(12, 10, 2);
    graphics.fillCircle(20, 10, 2);
    graphics.fillStyle(0xFFFFFF); // White teeth
    graphics.fillRect(14, 14, 4, 2);
    // Small weapon
    graphics.fillStyle(0x8B4513); // Brown club
    graphics.fillRect(26, 8, 4, 8);
    graphics.generateTexture('enemy-goblin', 32, 32);

    // Orc sprite - larger, more menacing
    graphics.clear();
    graphics.fillStyle(0x556B2F); // Dark olive green
    graphics.fillRoundedRect(2, 2, 28, 28, 4);
    graphics.fillStyle(0x6B8E23); // Olive drab for head
    graphics.fillCircle(16, 12, 10);
    graphics.fillStyle(0xFF4500); // Orange-red eyes
    graphics.fillCircle(10, 9, 3);
    graphics.fillCircle(22, 9, 3);
    graphics.fillStyle(0xFFFFFF); // White tusks
    graphics.fillRect(12, 18, 2, 6);
    graphics.fillRect(18, 18, 2, 6);
    // Armor
    graphics.fillStyle(0x696969); // Gray armor
    graphics.fillRect(6, 20, 20, 8);
    graphics.generateTexture('enemy-orc', 32, 32);

    // Skeleton sprite - undead
    graphics.clear();
    graphics.fillStyle(0xF5F5DC); // Beige bones
    graphics.fillRoundedRect(4, 4, 24, 24, 3);
    graphics.fillStyle(0xFFFFFF); // White skull
    graphics.fillCircle(16, 12, 8);
    graphics.fillStyle(0x000000); // Black eye sockets
    graphics.fillCircle(12, 10, 3);
    graphics.fillCircle(20, 10, 3);
    graphics.fillRect(14, 14, 4, 2); // Nasal cavity
    graphics.fillRect(12, 16, 8, 2); // Mouth
    // Rib cage
    graphics.fillStyle(0xF5F5DC);
    graphics.fillRect(10, 20, 12, 8);
    graphics.fillStyle(0x000000);
    for (let i = 0; i < 4; i++) {
      graphics.fillRect(10, 20 + i * 2, 12, 1);
    }
    graphics.generateTexture('enemy-skeleton', 32, 32);

    // Boss sprite - powerful and intimidating
    graphics.clear();
    graphics.fillStyle(0x4B0082); // Indigo base
    graphics.fillRoundedRect(0, 0, 32, 32, 6);
    graphics.fillStyle(0x8B0000); // Dark red for head
    graphics.fillCircle(16, 14, 12);
    graphics.fillStyle(0xFFD700); // Golden glowing eyes
    graphics.fillCircle(10, 12, 4);
    graphics.fillCircle(22, 12, 4);
    graphics.fillStyle(0xFF0000); // Red inner glow
    graphics.fillCircle(10, 12, 2);
    graphics.fillCircle(22, 12, 2);
    // Armor details
    graphics.fillStyle(0x2F4F4F); // Dark slate gray armor
    graphics.fillRect(4, 24, 24, 8);
    graphics.fillStyle(0xFFD700); // Gold trim
    graphics.fillRect(4, 24, 24, 2);
    graphics.fillRect(4, 30, 24, 2);
    // Horns
    graphics.fillStyle(0x000000);
    graphics.fillTriangle(8, 6, 12, 2, 10, 10);
    graphics.fillTriangle(24, 6, 20, 2, 22, 10);
    graphics.generateTexture('enemy-boss', 32, 32);
  }

  private createWallSprite(graphics: Phaser.GameObjects.Graphics, theme: string) {
    graphics.clear();
    
    // Ensure graphics is set up properly
    if (!graphics.scene || !graphics.scene.textures) {
      console.error('Graphics object is not properly initialized for wall texture');
      return;
    }
    
    switch (theme) {
      case 'dungeon':
        // Create realistic stone wall texture
        // Base stone color - brownish gray
        graphics.fillStyle(0x5D4E37); // Dark brown stone base
        graphics.fillRect(0, 0, 32, 32);
        
        // Add stone block pattern
        graphics.fillStyle(0x4A3C28); // Darker brown for mortar lines
        // Horizontal mortar lines
        graphics.fillRect(0, 10, 32, 1);
        graphics.fillRect(0, 21, 32, 1);
        // Vertical mortar lines
        graphics.fillRect(10, 0, 1, 10);
        graphics.fillRect(21, 0, 1, 10);
        graphics.fillRect(5, 11, 1, 10);
        graphics.fillRect(26, 11, 1, 10);
        graphics.fillRect(15, 22, 1, 10);
        
        // Add stone texture and highlights
        graphics.fillStyle(0x6B5B47); // Lighter brown for stone highlights
        graphics.fillRect(2, 2, 6, 6);
        graphics.fillRect(12, 3, 7, 5);
        graphics.fillRect(22, 1, 8, 7);
        graphics.fillRect(1, 13, 3, 6);
        graphics.fillRect(7, 12, 9, 7);
        graphics.fillRect(28, 14, 3, 5);
        graphics.fillRect(2, 24, 11, 6);
        graphics.fillRect(17, 23, 13, 7);
        
        // Add darker shadows for depth
        graphics.fillStyle(0x3E2F1F); // Very dark brown for shadows
        graphics.fillRect(8, 8, 1, 1);
        graphics.fillRect(19, 7, 1, 1);
        graphics.fillRect(29, 4, 1, 1);
        graphics.fillRect(3, 18, 1, 1);
        graphics.fillRect(14, 17, 1, 1);
        graphics.fillRect(25, 19, 1, 1);
        graphics.fillRect(9, 28, 1, 1);
        graphics.fillRect(24, 29, 1, 1);
        
        // Add small cracks and wear
        graphics.fillStyle(0x2E1F11); // Almost black for cracks
        graphics.fillRect(6, 5, 2, 1);
        graphics.fillRect(16, 15, 1, 3);
        graphics.fillRect(27, 25, 3, 1);
        break;
      
      case 'cave':
        // Natural rock cave walls
        graphics.fillStyle(0x2F2F2F); // Dark gray base
        graphics.fillRect(0, 0, 32, 32);
        graphics.fillStyle(0x404040); // Medium gray
        graphics.fillCircle(8, 8, 6);
        graphics.fillCircle(24, 12, 4);
        graphics.fillCircle(16, 24, 5);
        graphics.fillStyle(0x1F1F1F); // Very dark for shadows
        graphics.fillCircle(12, 20, 3);
        graphics.fillCircle(26, 26, 2);
        break;
      
      case 'temple':
        // Ancient temple walls with mystical elements
        graphics.fillStyle(0x483D8B); // Dark slate blue
        graphics.fillRect(0, 0, 32, 32);
        graphics.fillStyle(0x6A5ACD); // Slate blue highlights
        graphics.fillRect(2, 2, 28, 28);
        graphics.fillStyle(0xFFD700); // Gold decorative elements
        graphics.fillRect(4, 4, 24, 2);
        graphics.fillRect(4, 26, 24, 2);
        graphics.fillRect(4, 4, 2, 24);
        graphics.fillRect(26, 4, 2, 24);
        graphics.fillRect(14, 14, 4, 4); // Central gold detail
        break;
    }
    
    const textureKey = `wall-${theme}`;
    try {
      graphics.generateTexture(textureKey, 32, 32);
      console.log(`Wall texture created successfully: ${textureKey}`);
    } catch (error) {
      console.error(`Failed to create wall texture ${textureKey}:`, error);
      throw error;
    }
  }

  private createFloorSprite(graphics: Phaser.GameObjects.Graphics, theme: string) {
    graphics.clear();
    
    // Ensure graphics is set up properly
    if (!graphics.scene || !graphics.scene.textures) {
      console.error('Graphics object is not properly initialized for floor texture');
      return;
    }
    
    switch (theme) {
      case 'dungeon':
        // Create realistic stone floor with flagstone pattern
        // Base floor color - darker brown stone
        graphics.fillStyle(0x3E2723); // Dark brown stone base
        graphics.fillRect(0, 0, 32, 32);
        
        // Create flagstone tile pattern
        graphics.fillStyle(0x4E342E); // Medium brown for individual stones
        // Main flagstone areas
        graphics.fillRect(2, 2, 12, 12);
        graphics.fillRect(16, 2, 14, 8);
        graphics.fillRect(16, 12, 14, 8);
        graphics.fillRect(2, 16, 12, 14);
        graphics.fillRect(16, 22, 14, 8);
        
        // Add stone texture variation
        graphics.fillStyle(0x5D4037); // Lighter brown for highlights
        graphics.fillRect(3, 3, 4, 4);
        graphics.fillRect(9, 5, 3, 3);
        graphics.fillRect(17, 3, 5, 2);
        graphics.fillRect(25, 4, 3, 3);
        graphics.fillRect(18, 13, 4, 2);
        graphics.fillRect(26, 14, 2, 3);
        graphics.fillRect(4, 18, 3, 4);
        graphics.fillRect(8, 24, 4, 3);
        graphics.fillRect(17, 24, 6, 2);
        graphics.fillRect(25, 26, 3, 2);
        
        // Mortar lines between stones (darker)
        graphics.fillStyle(0x2E1A14); // Very dark brown for mortar
        graphics.fillRect(14, 0, 1, 32); // Vertical mortar line
        graphics.fillRect(0, 14, 32, 1); // Horizontal mortar line
        graphics.fillRect(30, 10, 1, 12); // Additional vertical line
        graphics.fillRect(16, 10, 14, 1); // Additional horizontal line
        graphics.fillRect(16, 20, 14, 1); // Another horizontal line
        
        // Add some dirt/wear spots
        graphics.fillStyle(0x1B0000); // Dark spots for dirt/stains
        graphics.fillRect(7, 8, 1, 1);
        graphics.fillRect(22, 6, 1, 1);
        graphics.fillRect(28, 16, 1, 1);
        graphics.fillRect(6, 25, 1, 1);
        graphics.fillRect(19, 28, 1, 1);
        break;
      
      case 'cave':
        // Natural rocky cave floor
        graphics.fillStyle(0x1C1C1C); // Very dark base
        graphics.fillRect(0, 0, 32, 32);
        graphics.fillStyle(0x2A2A2A); // Medium dark
        graphics.fillRect(4, 4, 24, 24);
        graphics.fillStyle(0x333333); // Lighter patches
        graphics.fillRect(8, 8, 16, 16);
        // Add some rocky texture
        graphics.fillStyle(0x404040);
        graphics.fillCircle(12, 12, 2);
        graphics.fillCircle(20, 20, 3);
        graphics.fillCircle(8, 24, 1);
        break;
      
      case 'temple':
        // Ornate temple floor with mystical patterns
        graphics.fillStyle(0x2F1B69); // Dark purple base
        graphics.fillRect(0, 0, 32, 32);
        graphics.fillStyle(0x483D8B); // Medium purple
        graphics.fillRect(2, 2, 28, 28);
        graphics.fillStyle(0x6A5ACD); // Lighter purple highlights
        graphics.fillRect(4, 4, 24, 24);
        // Golden mystical pattern
        graphics.fillStyle(0xFFD700); // Gold
        graphics.fillRect(15, 4, 2, 24); // Vertical line
        graphics.fillRect(4, 15, 24, 2); // Horizontal line
        graphics.fillCircle(16, 16, 3); // Center circle
        break;
    }
    
    const textureKey = `floor-${theme}`;
    try {
      graphics.generateTexture(textureKey, 32, 32);
      console.log(`Floor texture created successfully: ${textureKey}`);
    } catch (error) {
      console.error(`Failed to create floor texture ${textureKey}:`, error);
      throw error;
    }
  }

  private createLootSprites(graphics: Phaser.GameObjects.Graphics) {
    // Regular chest - realistic wooden chest with iron fittings
    graphics.clear();
    // Chest base - dark wood
    graphics.fillStyle(0x5D4E37); // Dark brown wood base
    graphics.fillRoundedRect(4, 12, 24, 14, 2);
    
    // Wood planks pattern
    graphics.fillStyle(0x6B5B47); // Medium brown for wood grain
    graphics.fillRect(6, 14, 20, 2);
    graphics.fillRect(6, 17, 20, 1);
    graphics.fillRect(6, 20, 20, 2);
    graphics.fillRect(6, 23, 20, 1);
    
    // Iron bands and fittings
    graphics.fillStyle(0x2F2F2F); // Dark iron
    graphics.fillRect(4, 12, 24, 1); // Top band
    graphics.fillRect(4, 25, 24, 1); // Bottom band
    graphics.fillRect(11, 12, 1, 14); // Left vertical band
    graphics.fillRect(20, 12, 1, 14); // Right vertical band
    
    // Iron lock
    graphics.fillStyle(0x404040); // Medium iron
    graphics.fillRect(14, 18, 4, 4);
    graphics.fillStyle(0x1F1F1F); // Very dark for keyhole
    graphics.fillRect(15, 19, 2, 2);
    
    // Chest lid (slightly angled)
    graphics.fillStyle(0x4E342E); // Darker wood for lid
    graphics.fillRoundedRect(5, 8, 22, 6, 2);
    graphics.fillStyle(0x5D4E37); // Medium wood highlights
    graphics.fillRect(7, 10, 18, 1);
    graphics.fillRect(7, 12, 18, 1);
    
    // Iron hinges on lid
    graphics.fillStyle(0x2F2F2F);
    graphics.fillRect(8, 9, 2, 4);
    graphics.fillRect(22, 9, 2, 4);
    
    graphics.generateTexture('loot-chest', 32, 32);

    // Rare chest - ornate chest with silver and gems
    graphics.clear();
    // Base - higher quality wood
    graphics.fillStyle(0x3E2723); // Rich dark wood
    graphics.fillRoundedRect(4, 12, 24, 14, 3);
    
    // Ornate wood panels
    graphics.fillStyle(0x4E342E); // Medium wood
    graphics.fillRoundedRect(6, 14, 20, 10, 2);
    graphics.fillStyle(0x5D4037); // Lighter wood accents
    graphics.fillRect(8, 16, 16, 1);
    graphics.fillRect(8, 19, 16, 1);
    graphics.fillRect(8, 22, 16, 1);
    
    // Silver metalwork
    graphics.fillStyle(0x708090); // Silver base
    graphics.fillRect(4, 12, 24, 1); // Top silver band
    graphics.fillRect(4, 25, 24, 1); // Bottom silver band
    graphics.fillRect(10, 12, 1, 14); // Left silver band
    graphics.fillRect(21, 12, 1, 14); // Right silver band
    
    // Silver lock with sapphire
    graphics.fillStyle(0xC0C0C0); // Bright silver lock
    graphics.fillRoundedRect(13, 17, 6, 5, 1);
    graphics.fillStyle(0x0000CD); // Sapphire gem
    graphics.fillCircle(16, 19, 1);
    
    // Ornate lid
    graphics.fillStyle(0x2E1A14); // Dark wood lid
    graphics.fillRoundedRect(5, 8, 22, 6, 3);
    graphics.fillStyle(0x3E2723); // Medium wood
    graphics.fillRect(7, 10, 18, 2);
    
    // Silver decorative elements on lid
    graphics.fillStyle(0x708090);
    graphics.fillRect(9, 9, 14, 1);
    graphics.fillRect(12, 11, 8, 1);
    graphics.fillCircle(16, 10, 1); // Center ornament
    
    // Silver hinges
    graphics.fillStyle(0xC0C0C0);
    graphics.fillRoundedRect(7, 8, 3, 5, 1);
    graphics.fillRoundedRect(22, 8, 3, 5, 1);
    
    graphics.generateTexture('loot-rare_chest', 32, 32);

    // Legendary chest - golden chest with magical aura
    graphics.clear();
    // Base - exotic dark wood
    graphics.fillStyle(0x1A0A00); // Very dark, almost black wood
    graphics.fillRoundedRect(4, 12, 24, 14, 4);
    
    // Rich inner panels
    graphics.fillStyle(0x2E1A14); // Dark brown panels
    graphics.fillRoundedRect(6, 14, 20, 10, 3);
    graphics.fillStyle(0x3E2723); // Medium accents
    graphics.fillRect(8, 16, 16, 1);
    graphics.fillRect(8, 20, 16, 1);
    
    // Golden metalwork
    graphics.fillStyle(0xB8860B); // Dark gold base
    graphics.fillRect(4, 12, 24, 2); // Top gold band
    graphics.fillRect(4, 24, 24, 2); // Bottom gold band
    graphics.fillRect(9, 12, 2, 14); // Left gold band
    graphics.fillRect(21, 12, 2, 14); // Right gold band
    
    // Bright gold highlights
    graphics.fillStyle(0xFFD700); // Bright gold
    graphics.fillRect(5, 13, 22, 1);
    graphics.fillRect(5, 25, 22, 1);
    graphics.fillRect(10, 13, 1, 12);
    graphics.fillRect(22, 13, 1, 12);
    
    // Magical lock with multiple gems
    graphics.fillStyle(0xFFD700); // Gold lock
    graphics.fillRoundedRect(12, 16, 8, 6, 2);
    graphics.fillStyle(0xDC143C); // Ruby
    graphics.fillCircle(14, 18, 1);
    graphics.fillStyle(0x00FF00); // Emerald
    graphics.fillCircle(16, 19, 1);
    graphics.fillStyle(0x8A2BE2); // Amethyst
    graphics.fillCircle(18, 18, 1);
    
    // Ornate golden lid
    graphics.fillStyle(0x0F0500); // Very dark lid base
    graphics.fillRoundedRect(5, 7, 22, 7, 4);
    graphics.fillStyle(0xB8860B); // Dark gold lid pattern
    graphics.fillRoundedRect(7, 9, 18, 3, 2);
    graphics.fillStyle(0xFFD700); // Bright gold details
    graphics.fillRect(8, 10, 16, 1);
    graphics.fillCircle(16, 10, 2); // Central golden ornament
    
    // Golden hinges with gems
    graphics.fillStyle(0xFFD700);
    graphics.fillRoundedRect(6, 7, 4, 6, 2);
    graphics.fillRoundedRect(22, 7, 4, 6, 2);
    graphics.fillStyle(0xFF1493); // Pink gems on hinges
    graphics.fillCircle(8, 9, 1);
    graphics.fillCircle(24, 9, 1);
    
    // Magical sparkle effects
    graphics.fillStyle(0xFFFFFF); // White sparkles
    graphics.fillCircle(8, 15, 1);
    graphics.fillCircle(24, 17, 1);
    graphics.fillCircle(12, 24, 1);
    graphics.fillCircle(20, 12, 1);
    
    // Additional magical glow spots
    graphics.fillStyle(0x00FFFF); // Cyan magical glow
    graphics.fillCircle(6, 20, 1);
    graphics.fillCircle(26, 22, 1);
    
    graphics.generateTexture('loot-legendary_chest', 32, 32);
  }

  renderLevel(level: LevelConfig): Phaser.Physics.Arcade.StaticGroup {
    this.walls = this.scene.physics.add.staticGroup();
    
    console.log(`Rendering level ${level.id} (${level.theme}) with map size ${level.map.length}x${level.map[0].length}`);
    
    // Verify required textures exist before rendering
    const requiredTextures = [`wall-${level.theme}`, `floor-${level.theme}`];
    const missingTextures = requiredTextures.filter(key => !this.scene.textures.exists(key));
    
    if (missingTextures.length > 0) {
      console.error(`Cannot render level - missing textures:`, missingTextures);
      throw new Error(`Missing required textures for level rendering: ${missingTextures.join(', ')}`);
    }
    
    // Set background color
    this.scene.cameras.main.setBackgroundColor(level.backgroundColor);
    
    let wallCount = 0;
    let floorCount = 0;
    
    // Clear any existing debug graphics that might cause green lines
    this.scene.children.list.forEach(child => {
      if (child instanceof Phaser.GameObjects.Graphics) {
        // Check if this graphics object might be drawing unwanted lines
        if (child.name === 'wall-debug' || child.name === 'level-debug') {
          console.log('Destroying debug graphics:', child.name);
          child.destroy();
        }
      }
    });
    
    // Render the map
    for (let y = 0; y < level.map.length; y++) {
      for (let x = 0; x < level.map[y].length; x++) {
        const tileX = x * 32;
        const tileY = y * 32;
        
        if (level.map[y][x] === 1) {
          // Wall tile - verify texture exists before creating sprite
          const wallTextureKey = `wall-${level.theme}`;
          if (!this.scene.textures.exists(wallTextureKey)) {
            console.error(`Wall texture ${wallTextureKey} does not exist!`);
            continue;
          }
          
          const wall = this.scene.physics.add.staticSprite(
            tileX + 16, 
            tileY + 16, 
            wallTextureKey
          );
          wall.setDepth(2); // Walls above floor but below entities
          wall.setName(`wall-${x}-${y}`); // Add name for debugging
          
          // Ensure the wall sprite is visible and has the correct texture
          wall.setVisible(true);
          wall.setAlpha(1.0);
          
          this.walls.add(wall);
          wallCount++;
        } else {
          // Floor tile - verify texture exists before creating sprite
          const floorTextureKey = `floor-${level.theme}`;
          if (!this.scene.textures.exists(floorTextureKey)) {
            console.error(`Floor texture ${floorTextureKey} does not exist!`);
            continue;
          }
          
          const floor = this.scene.add.sprite(tileX + 16, tileY + 16, floorTextureKey);
          floor.setDepth(0); // Floor at the bottom
          floor.setName(`floor-${x}-${y}`); // Add name for debugging
          floor.setVisible(true);
          floor.setAlpha(1.0);
          floorCount++;
        }
      }
    }
    
    console.log(`Level ${level.id} rendered successfully: ${wallCount} walls, ${floorCount} floor tiles`);
    console.log(`Wall texture key: wall-${level.theme}, Floor texture key: floor-${level.theme}`);
    
    return this.walls;
  }

  spawnEnemies(level: LevelConfig, enemyGroup: Phaser.Physics.Arcade.Group): void {
    console.log(`Spawning ${level.enemies.length} enemies for level ${level.id}`);
    
    level.enemies.forEach((enemyData, index) => {
      const textureKey = `enemy-${enemyData.type}`;
      
      // Verify enemy texture exists before creating sprite
      if (!this.scene.textures.exists(textureKey)) {
        console.error(`Enemy texture ${textureKey} does not exist! Skipping enemy ${index}`);
        return;
      }
      
      try {
        const enemy = this.scene.physics.add.sprite(enemyData.x, enemyData.y, textureKey);
        enemy.setCollideWorldBounds(true);
        enemy.body.setSize(24, 24);
        enemy.setDrag(300);
        
        // Set proper depth for enemies
        enemy.setDepth(5);
        enemy.setVisible(true);
        
        // Set enemy stats based on type
        const stats = this.getEnemyStats(enemyData.type);
        enemy.setData('health', stats.health);
        enemy.setData('maxHealth', stats.health);
        enemy.setData('damage', stats.damage);
        enemy.setData('inCombat', false);
        enemy.setData('combatCooldown', 0);
        enemy.setData('type', enemyData.type);
        
        // Create health bar
        const healthBar = this.scene.add.graphics();
        healthBar.setDepth(15); // Health bars above everything
        enemy.setData('healthBar', healthBar);
        
        // Add AI movement
        this.addEnemyAI(enemy, enemyData.type);
        
        enemyGroup.add(enemy);
        console.log(`Created enemy ${enemyData.type} at (${enemyData.x}, ${enemyData.y})`);
        
      } catch (error) {
        console.error(`Failed to create enemy ${enemyData.type}:`, error);
      }
    });
    
    console.log(`Successfully spawned ${enemyGroup.children.size} enemies`);
  }

  spawnLoot(level: LevelConfig, lootGroup: Phaser.Physics.Arcade.Group): void {
    console.log(`Spawning ${level.loot.length} loot items for level ${level.id}`);
    
    level.loot.forEach((lootData, index) => {
      const textureKey = `loot-${lootData.type}`;
      
      // Verify loot texture exists before creating sprite
      if (!this.scene.textures.exists(textureKey)) {
        console.error(`Loot texture ${textureKey} does not exist! Skipping loot ${index}`);
        return;
      }
      
      try {
        const loot = this.scene.physics.add.sprite(lootData.x, lootData.y, textureKey);
        loot.setData('type', lootData.type);
        
        // Set proper depth for loot
        loot.setDepth(3);
        loot.setVisible(true);
        
        // Add sparkle effect
        this.scene.tweens.add({
          targets: loot,
          alpha: 0.7,
          duration: 2000,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut'
        });
        
        lootGroup.add(loot);
        console.log(`Created loot ${lootData.type} at (${lootData.x}, ${lootData.y})`);
        
      } catch (error) {
        console.error(`Failed to create loot ${lootData.type}:`, error);
      }
    });
    
    console.log(`Successfully spawned ${lootGroup.children.size} loot items`);
  }

  private getEnemyStats(type: string): { health: number; damage: number; experience: number } {
    switch (type) {
      case 'goblin':
        return { health: 30, damage: 15, experience: 25 };
      case 'orc':
        return { health: 50, damage: 25, experience: 40 };
      case 'skeleton':
        return { health: 40, damage: 20, experience: 35 };
      case 'boss':
        return { health: 100, damage: 35, experience: 100 };
      default:
        return { health: 30, damage: 15, experience: 25 };
    }
  }

  private addEnemyAI(enemy: Phaser.Physics.Arcade.Sprite, type: string): void {
    const baseX = enemy.x;
    const baseY = enemy.y;
    
    // Different AI patterns based on enemy type
    switch (type) {
      case 'goblin':
        // Quick, erratic movement
        this.scene.tweens.add({
          targets: enemy,
          x: baseX + Phaser.Math.Between(-60, 60),
          y: baseY + Phaser.Math.Between(-60, 60),
          duration: Phaser.Math.Between(2000, 4000),
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut'
        });
        break;
        
      case 'orc':
        // Slower, more predictable movement
        this.scene.tweens.add({
          targets: enemy,
          x: baseX + Phaser.Math.Between(-80, 80),
          y: baseY + Phaser.Math.Between(-80, 80),
          duration: Phaser.Math.Between(5000, 8000),
          yoyo: true,
          repeat: -1,
          ease: 'Power2'
        });
        break;
        
      case 'skeleton':
        // Medium speed, angular movement
        this.scene.tweens.add({
          targets: enemy,
          x: baseX + Phaser.Math.Between(-70, 70),
          y: baseY + Phaser.Math.Between(-70, 70),
          duration: Phaser.Math.Between(3000, 6000),
          yoyo: true,
          repeat: -1,
          ease: 'Back.easeInOut'
        });
        break;
        
      case 'boss':
        // Minimal movement, stays in area
        this.scene.tweens.add({
          targets: enemy,
          x: baseX + Phaser.Math.Between(-40, 40),
          y: baseY + Phaser.Math.Between(-40, 40),
          duration: Phaser.Math.Between(6000, 10000),
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut'
        });
        break;
    }
  }
}
