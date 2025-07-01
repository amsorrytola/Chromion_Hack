# Cross-Chain AI Dungeon Crawler (DungeonX)

> A blockchain-based multiplayer dungeon crawler with cross-chain party formation, AI-powered NPCs, and real-time gameplay using Phaser.js

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.25+-blue.svg)](https://soliditylang.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)

## 🎯 Project Overview

Cross-Chain AI Dungeon Crawler is a revolutionary blockchain-based multiplayer RPG that combines traditional gaming with Web3 technology. Players can form parties across different blockchain networks, explore dungeons with AI-powered NPCs, and participate in a decentralized equipment marketplace.

### 🌟 Key Features

- **🎮 Real-time Multiplayer Gameplay**: Phaser.js-based dungeon crawler with WebSocket synchronization
- **🌐 Cross-Chain Party Formation**: Create and join parties across Ethereum Sepolia and other testnets
- **🤖 AI-Powered NPCs**: ElizaOS integration for dynamic dialogue and intelligent companions
- **⚔️ Combat System**: Turn-based combat with equipment bonuses and special abilities
- **💰 Equipment Marketplace**: Lend/borrow NFT equipment with collateral management
- **🎲 Verifiable Randomness**: Chainlink VRF for fair loot generation
- **📊 Persistent Player Progression**: Level up, gain experience, and build your character

## 🏗️ Architecture

### System Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Ethereum      │    │   Polygon       │    │   Arbitrum      │
│   Sepolia       │    │   Mumbai        │    │   Goerli        │
├─────────────────┤    ├─────────────────┤    ├─────────────────┤
│ PartyRegistry   │◄──►│ PartyRegistry   │◄──►│ PartyRegistry   │
│ LootManager     │    │ LootManager     │    │ LootManager     │
│ CrossChainMgr   │    │ CrossChainMgr   │    │ CrossChainMgr   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         ▲                       ▲                       ▲
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │ Chainlink CCIP  │
                    │ Message Router  │
                    └─────────────────┘
                                 │
                    ┌─────────────────┐
                    │ Backend API     │
                    │ (Node.js)       │
                    ├─────────────────┤
                    │ • Game Engine   │
                    │ • Party Manager │
                    │ • Socket.IO     │
                    │ • PostgreSQL    │
                    └─────────────────┘
                                 │
                    ┌─────────────────┐
                    │ Frontend        │
                    │ (React/Vite)    │
                    ├─────────────────┤
                    │ • Phaser.js     │
                    │ • Wagmi/Viem    │
                    │ • RainbowKit    │
                    └─────────────────┘
```

### Package Structure

```
cross-chain-ai-dungeon-crawler/
├── packages/
│   ├── contracts/           # Smart contracts (Solidity + Foundry)
│   │   ├── src/
│   │   │   ├── PartyRegistry.sol       # Party formation & management
│   │   │   ├── LootManager.sol         # NFT equipment & VRF loot
│   │   │   ├── CrossChainLootManager.sol # Cross-chain equipment CCIP
│   │   │   └── RandomLootGenerator.sol  # Chainlink VRF integration
│   │   ├── test/
│   │   ├── script/
│   │   └── foundry.toml
│   ├── backend/             # Node.js API server
│   │   ├── src/
│   │   │   ├── app.ts                  # Express server setup
│   │   │   ├── controllers/            # API controllers
│   │   │   ├── services/               # Business logic
│   │   │   │   ├── elizaService.ts     # AI NPC integration
│   │   │   │   ├── socketService.ts    # Real-time multiplayer
│   │   │   │   └── blockchainService.ts # Web3 interactions
│   │   │   └── routes/                 # API routes
│   │   ├── prisma/
│   │   │   ├── schema.prisma           # Database schema
│   │   │   └── migrations/
│   │   └── package.json
│   ├── frontend/            # React frontend
│   │   ├── src/
│   │   │   ├── components/             # React components
│   │   │   ├── pages/                  # Page components
│   │   │   ├── game/                   # Phaser.js game engine
│   │   │   │   ├── MultiplayerGame.tsx # Multiplayer game wrapper
│   │   │   │   ├── MultiplayerScene.ts # Phaser scene
│   │   │   │   └── levels/             # Level system
│   │   │   ├── services/               # API clients
│   │   │   ├── contexts/               # React contexts
│   │   │   └── utils/
│   │   └── package.json
│   └── shared/              # Shared types and utilities
│       ├── src/
│       │   ├── types.ts                # TypeScript definitions
│       │   └── abi/                    # Contract ABIs
│       └── package.json
├── docs/                    # Documentation
└── package.json            # Root package.json
```

## 🚀 Technology Stack

### Blockchain Layer
- **Smart Contracts**: Solidity 0.8.25+ with Foundry framework
- **Cross-Chain**: Chainlink CCIP for multi-chain messaging
- **Randomness**: Chainlink VRF v2 for provable random loot generation
- **Networks**: Ethereum Sepolia, Polygon Mumbai, Arbitrum Goerli (testnets)
- **Security**: OpenZeppelin contracts for battle-tested implementations

### Backend Services
- **Runtime**: Node.js 18+ with TypeScript
- **Framework**: Express.js for RESTful API
- **Database**: PostgreSQL with Prisma ORM
- **Real-time**: Socket.IO for multiplayer communication
- **AI Integration**: ElizaOS for NPC personalities and dialogue
- **Authentication**: JWT-based auth with wallet signature verification

### Frontend Application
- **Framework**: React 18+ with TypeScript
- **Build Tool**: Vite for fast development and building
- **Styling**: Tailwind CSS for responsive design
- **Game Engine**: Phaser.js 3.70+ for 2D game rendering
- **Web3**: Wagmi + Viem for blockchain interactions
- **Wallet**: RainbowKit for wallet connectivity
- **State Management**: React Context + custom hooks

### Development Tools
- **Contracts**: Foundry for testing and deployment
- **Backend**: tsx for TypeScript execution
- **Frontend**: ESLint + Prettier for code quality
- **Database**: Prisma Studio for database management
- **Testing**: Vitest for unit testing

## 🛠️ Development Setup

### Prerequisites

- Node.js 18+ and npm
- Git
- PostgreSQL (for backend)
- A Web3 wallet (MetaMask recommended)
- Testnet ETH for transactions

### Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-repo/cross-chain-ai-dungeon-crawler.git
   cd cross-chain-ai-dungeon-crawler
   ```

2. **Install dependencies**
   ```bash
   npm install
   npm run install:all
   ```

3. **Set up environment variables**
   ```bash
   # Copy example files
   cp packages/backend/.env.example packages/backend/.env
   cp packages/frontend/.env.example packages/frontend/.env
   ```

   Edit the `.env` files with your configuration:
   ```bash
   # Backend (.env)
   DATABASE_URL="postgresql://user:password@localhost:5432/dungeon_crawler"
   PRIVATE_KEY="your-ethereum-private-key"
   INFURA_API_KEY="your-infura-key"
   
   # Contract addresses (already deployed on Sepolia)
   PARTY_REGISTRY_ADDRESS="0x93Fd309A0D457174bD94F4c7BCe60c589e6bE4D6"
   LOOT_MANAGER_ADDRESS="0xf755e942112584C0547C3f85392B2c2Ee602161B"
   CROSS_CHAIN_LOOT_MANAGER_ADDRESS="0x194CadA5D03EF6Cd9AA51C3BB36EF64F4De174bB"
   RANDOM_LOOT_GENERATOR_ADDRESS="0xA19D323E6A4dB37c0f0F85F8FC2F7410e4061EC3"
   ```

4. **Set up the database**
   ```bash
   cd packages/backend
   npm run db:push
   npm run db:seed
   ```

5. **Start development servers**
   ```bash
   # From root directory
   npm run dev
   ```

   This will start:
   - Backend API server: http://localhost:3001
   - Frontend React app: http://localhost:5173

6. **Access the application**
   - Open http://localhost:5173 in your browser
   - Connect your wallet (make sure you have Sepolia testnet configured)
   - Get some Sepolia ETH from a faucet if needed

## 🎮 Game Features

### Core Gameplay

#### 1. Player Registration & Character Creation
- Connect your Web3 wallet (MetaMask, WalletConnect, etc.)
- Register your player profile on-chain
- Choose your starting chain (Ethereum Sepolia recommended)
- Begin with basic equipment and stats

#### 2. Party Formation System
- **Create Party**: Form a new party and invite friends across chains
- **Join Party**: Browse available parties or join via invitation
- **Cross-Chain Support**: Party members can be on different blockchains
- **Role Assignment**: Assign roles (Leader, Tank, DPS, Healer, Support)
- **Real-time Sync**: Party state synchronized across all networks

#### 3. Dungeon Exploration
- **Procedural Generation**: Each dungeon run features unique layouts
- **Multiplayer Coordination**: Real-time movement and action synchronization
- **Interactive Environment**: Collect loot, trigger events, discover secrets
- **Dynamic Difficulty**: Scales based on party size and average level

#### 4. Combat System
- **Turn-based Combat**: Strategic battle system with equipment bonuses
- **Skill System**: Use abilities based on your equipment and level
- **AI Enemies**: Intelligent opponents with varied behaviors
- **Loot Drops**: Chainlink VRF ensures fair and random rewards

#### 5. Equipment & NFT System
- **NFT Equipment**: All equipment is represented as ERC-721 tokens
- **Rarity Tiers**: Common, Uncommon, Rare, Epic, Legendary, Mythic
- **Attributes**: Attack Power, Defense Power, Magic Power, Durability
- **Upgradeable**: Enhance equipment through gameplay
- **Cross-Chain Transfer**: Move equipment between supported chains

#### 6. Randomized NPCs
- **Unique Personalities**: Each NPC has distinct traits and specialties
  - **Grima the Merchant**: Equipment trading and market advice
  - **Elder Thane**: Dungeon lore and magical guidance
  - **Thorin Ironforge**: Weapon crafting and upgrades
  - **Luna the Guide**: Beginner tips and party formation help

### DeFi Features

#### 1. Equipment Marketplace
- **Lending System**: Lend your equipment to other players for fees
- **Borrowing**: Rent equipment with collateral requirements
- **Cross-Chain Trading**: Trade equipment across different networks
- **Price Discovery**: Market-driven pricing for rare items

#### 2. Yield Generation
- **Equipment Staking**: Earn passive income from lent equipment
- **Liquidity Rewards**: Provide liquidity to the marketplace
- **Governance Participation**: Vote on game parameters and updates

## 📊 Smart Contract Deployments

### Ethereum Sepolia Testnet
- **PartyRegistry**: `0x93Fd309A0D457174bD94F4c7BCe60c589e6bE4D6`
- **LootManager**: `0xf755e942112584C0547C3f85392B2c2Ee602161B`
- **CrossChainLootManager**: `0x194CadA5D03EF6Cd9AA51C3BB36EF64F4De174bB`
- **RandomLootGenerator**: `0xA19D323E6A4dB37c0f0F85F8FC2F7410e4061EC3`

### Other Networks
- **Polygon Mumbai**: Coming soon
- **Arbitrum Goerli**: Coming soon
- **Avalanche Fuji**: Coming soon

## 🧪 Testing

### Smart Contracts
```bash
cd packages/contracts
forge test                     # Run all test
```

## 🚀 Deployment

### Local Development
```bash
# Start all services
npm run dev

# Individual services
npm run dev:contracts          # Foundry anvil node
npm run dev:backend           # Express server
npm run dev:frontend          # Vite dev server
```

### Database Management
```bash
cd packages/backend

# Development commands
npm run db:push               # Push schema changes
npm run db:migrate            # Create migration
npm run db:reset              # Reset database
npm run db:studio             # Open Prisma Studio
npm run db:seed               # Seed with test data
```

### Contract Deployment
```bash
cd packages/contracts

# Deploy to testnet
forge script script/DeployAll.s.sol --rpc-url $SEPOLIA_RPC_URL --broadcast --verify

# Deploy specific contract
forge script script/DeployPartyRegistry.s.sol --rpc-url $SEPOLIA_RPC_URL --broadcast
```

## 📚 API Documentation

### REST Endpoints

#### Game Management
- `GET /api/game/status` - Get current game status
- `POST /api/game/register` - Register new player
- `GET /api/game/player/:address` - Get player profile
- `PUT /api/game/player/:address` - Update player profile

#### Party System
- `POST /api/party/create` - Create new party
- `GET /api/party/:id` - Get party details
- `POST /api/party/:id/join` - Join party
- `DELETE /api/party/:id/leave` - Leave party
- `GET /api/party/available` - List available parties
- `POST /api/party/:id/disband` - Disband party (leader only)

#### Loot & Equipment
- `GET /api/loot/generate` - Generate random loot
- `POST /api/loot/collect` - Collect loot item
- `GET /api/loot/inventory/:address` - Get player inventory
- `POST /api/loot/transfer` - Transfer equipment

#### AI Integration
- `POST /api/ai/chat` - Chat with NPC
- `GET /api/ai/npcs` - List available NPCs
- `POST /api/ai/dialogue` - Start dialogue sequence

### WebSocket Events

#### Multiplayer Communication
- `join-game` - Join game session
- `leave-game` - Leave game session
- `player-action` - Broadcast player action
- `game-state-update` - Receive game state updates
- `party-chat` - Party chat messages
- `combat-action` - Combat system events

#### Real-time Updates
- `party-update` - Party composition changes
- `loot-spawned` - New loot available
- `enemy-defeated` - Combat victory
- `level-completed` - Dungeon floor completion

## 🔧 Configuration

### Environment Variables

#### Backend Configuration
```bash
# Server
PORT=3001
NODE_ENV=development

# Database
DATABASE_URL="postgresql://user:pass@localhost:5432/dungeon_crawler"

# Blockchain
PRIVATE_KEY="your-ethereum-private-key"
INFURA_API_KEY="your-infura-api-key"
SEPOLIA_RPC_URL="https://sepolia.infura.io/v3/YOUR_KEY"

# Contract Addresses
PARTY_REGISTRY_ADDRESS="0x93Fd309A0D457174bD94F4c7BCe60c589e6bE4D6"
LOOT_MANAGER_ADDRESS="0xf755e942112584C0547C3f85392B2c2Ee602161B"
CROSS_CHAIN_LOOT_MANAGER_ADDRESS="0x194CadA5D03EF6Cd9AA51C3BB36EF64F4De174bB"
RANDOM_LOOT_GENERATOR_ADDRESS="0xA19D323E6A4dB37c0f0F85F8FC2F7410e4061EC3"

# Chainlink VRF
CHAINLINK_VRF_COORDINATOR="0x8103B0A8A00be2DDC778e6e7eaa21791Cd364625"
CHAINLINK_SUBSCRIPTION_ID="your-subscription-id"
CHAINLINK_GAS_LANE="0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c"
```

#### Frontend Configuration
```bash
# API
VITE_API_URL="http://localhost:3001"
VITE_WALLET_CONNECT_PROJECT_ID="your-walletconnect-project-id"
```

## 🎯 Game Mechanics

### Character Progression
- **Experience System**: Gain XP from combat, exploration, and quest completion
- **Level Scaling**: Unlock new abilities and equipment tiers
- **Skill Trees**: Customize your character build
- **Equipment Mastery**: Become proficient with weapon types

### Dungeon Generation
- **Procedural Layouts**: No two dungeon runs are identical
- **Themed Floors**: Different environments with unique challenges
- **Boss Encounters**: Epic battles with rare loot rewards
- **Secret Areas**: Hidden rooms with valuable treasures

### Loot System
- **Rarity Distribution**: Balanced drop rates using Chainlink VRF
- **Equipment Attributes**: Randomized stats within rarity bounds
- **Set Bonuses**: Collect matching equipment for powerful effects
- **Crafting Materials**: Upgrade and enhance your gear

### Multiplayer Features
- **Real-time Synchronization**: Smooth multiplayer experience
- **Party Coordination**: Strategic gameplay requiring teamwork
- **Cross-Chain Compatibility**: Play with friends on any supported network
- **Shared Rewards**: Fair loot distribution among party members

## 🤝 Contributing

We welcome contributions from the community! Here's how to get started:

### Development Workflow

1. **Fork the repository**
   ```bash
   git fork https://github.com/your-repo/cross-chain-ai-dungeon-crawler
   ```

2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```

3. **Make your changes**
   - Follow the existing code style
   - Add tests for new features
   - Update documentation as needed

4. **Test your changes**
   ```bash
   npm run test
   npm run lint
   ```

5. **Commit and push**
   ```bash
   git commit -m 'feat: add amazing feature'
   git push origin feature/amazing-feature
   ```

6. **Open a Pull Request**

### Code Standards

- **TypeScript**: Use TypeScript for all new JavaScript code
- **Solidity**: Follow OpenZeppelin patterns and best practices
- **Testing**: Write tests for all new functionality
- **Documentation**: Update README and inline comments
- **Linting**: Run ESLint and Prettier before committing

### Areas for Contribution

- **Game Features**: New dungeons, enemies, equipment, abilities
- **Blockchain Integration**: Additional network support, DeFi features
- **AI Enhancement**: More sophisticated NPC behaviors and dialogue
- **UI/UX**: Improved interfaces and user experience
- **Performance**: Optimization and scaling improvements

## 🐛 Troubleshooting

### Common Issues

#### Wallet Connection Problems
```bash
# Clear browser cache and try again
# Ensure you're on the correct network (Sepolia)
# Check that MetaMask is unlocked
```

#### Database Issues
```bash
# Reset database
cd packages/backend
npm run db:reset
```

#### Build Errors
```bash
# Clean and rebuild
npm run clean
npm install
npm run build
```

#### Transaction Failures
- Ensure sufficient testnet ETH for gas fees
- Check contract addresses are correct
- Verify network configuration matches deployed contracts

### Getting Help

- **Discord**: [Join our community](https://discord.gg/dungeon-crawler)
- **GitHub Issues**: Report bugs and request features

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Chainlink**: For cross-chain infrastructure and verifiable randomness
- **OpenZeppelin**: For secure smart contract implementations
- **Foundry**: For excellent Solidity development tooling
- **Phaser.js**: For powerful 2D game engine
- **ElizaOS**: For AI-powered NPC capabilities
- **Viem & Wagmi**: For excellent Web3 developer experience

## 🌟 Roadmap

### Phase 1: Foundation (Current)
- ✅ Smart contract deployment on testnets
- ✅ Basic multiplayer functionality
- ✅ Party formation system
- ✅ Equipment NFTs with Chainlink VRF
- ✅ AI NPC integration

### Phase 2: Enhancement (Q1 2025)
- 🔄 Mainnet deployment
- 🔄 Advanced combat mechanics
- 🔄 Guild system
- 🔄 Equipment marketplace v2
- 🔄 Mobile app development

### Phase 3: Expansion (Q2 2025)
- 📋 Additional blockchain networks
- 📋 PvP arena system
- 📋 Governance token launch
- 📋 Advanced AI companions
- 📋 VR/AR integration

---

**Built with ❤️ by the DungeonX Team**

*Ready to embark on your cross-chain adventure? Connect your wallet and dive into the dungeons!*
