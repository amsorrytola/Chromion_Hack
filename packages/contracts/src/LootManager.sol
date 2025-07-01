// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "../lib/openzeppelin-contracts/contracts/token/ERC721/ERC721.sol";
import "../lib/openzeppelin-contracts/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "../lib/openzeppelin-contracts/contracts/access/Ownable.sol";
import "../lib/openzeppelin-contracts/contracts/utils/ReentrancyGuard.sol";
import "../lib/chainlink/contracts/src/v0.8/vrf/interfaces/VRFCoordinatorV2Interface.sol";
import "../lib/chainlink/contracts/src/v0.8/vrf/VRFConsumerBaseV2.sol";

/**
 * @title LootManager
 * @dev Manages loot generation, distribution, and NFT equipment using Chainlink VRF
 */
contract LootManager is ERC721, ERC721URIStorage, Ownable, ReentrancyGuard, VRFConsumerBaseV2 {
    uint256 private _tokenIds;
    
    // Chainlink VRF
    VRFCoordinatorV2Interface private immutable i_vrfCoordinator;
    uint64 private immutable i_subscriptionId;
    bytes32 private immutable i_gasLane;
    uint32 private immutable i_callbackGasLimit;
    uint16 private constant REQUEST_CONFIRMATIONS = 3;
    uint32 private constant NUM_WORDS = 3;
    
    // Equipment types
    enum EquipmentType { WEAPON, ARMOR, ACCESSORY, CONSUMABLE }
    enum Rarity { COMMON, UNCOMMON, RARE, EPIC, LEGENDARY, MYTHIC }
    
    struct Equipment {
        uint256 tokenId;
        EquipmentType equipmentType;
        Rarity rarity;
        string name;
        uint256 attackPower;
        uint256 defensePower;
        uint256 magicPower;
        uint256 durability;
        bool isLendable;
        address originalOwner;
        uint256 createdAt;
        string lootType;
        uint256 power;
        string[] attributes;
    }

    // Backward compatibility struct for CCIP
    struct LootItem {
        string name;
        string lootType;
        uint256 rarity;
        uint256 power;
        string[] attributes;
    }
    
    struct LootRequest {
        uint256 requestId;
        address player;
        uint256 partyId;
        uint256 dungeonLevel;
        bool fulfilled;
    }
    
    // Mappings
    mapping(uint256 => Equipment) public equipment;
    mapping(uint256 => LootRequest) public lootRequests;
    mapping(address => uint256[]) public playerEquipment;
    mapping(uint256 => address) public equipmentOwner;
    
    // Loot generation probabilities (out of 10000)
    mapping(Rarity => uint256) public rarityProbabilities;
    mapping(EquipmentType => uint256) public typeProbabilities;
    
    // Events
    event LootRequested(uint256 indexed requestId, address indexed player, uint256 partyId);
    event LootGenerated(uint256 indexed tokenId, address indexed player, EquipmentType equipmentType, Rarity rarity);
    event EquipmentCreated(uint256 indexed tokenId, address indexed owner, string name);
    event EquipmentLendingStatusChanged(uint256 indexed tokenId, bool isLendable);
    
    constructor(
        address vrfCoordinatorV2,
        uint64 subscriptionId,
        bytes32 gasLane,
        uint32 callbackGasLimit,
        address initialOwner
    ) 
        ERC721("Dungeon Equipment", "DEQP")
        Ownable(initialOwner)
        VRFConsumerBaseV2(vrfCoordinatorV2)
    {
        i_vrfCoordinator = VRFCoordinatorV2Interface(vrfCoordinatorV2);
        i_subscriptionId = subscriptionId;
        i_gasLane = gasLane;
        i_callbackGasLimit = callbackGasLimit;
        
        _initializeProbabilities();
    }

    // Override required functions
    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC721, ERC721URIStorage) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    function tokenURI(uint256 tokenId) public view virtual override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }
    
    /**
     * @dev Initialize loot generation probabilities
     */
    function _initializeProbabilities() internal {
        // Rarity probabilities (out of 10000)
        rarityProbabilities[Rarity.COMMON] = 5000;     // 50%
        rarityProbabilities[Rarity.UNCOMMON] = 2500;   // 25%
        rarityProbabilities[Rarity.RARE] = 1500;       // 15%
        rarityProbabilities[Rarity.EPIC] = 750;        // 7.5%
        rarityProbabilities[Rarity.LEGENDARY] = 200;   // 2%
        rarityProbabilities[Rarity.MYTHIC] = 50;       // 0.5%
        
        // Equipment type probabilities (out of 10000)
        typeProbabilities[EquipmentType.WEAPON] = 3500;     // 35%
        typeProbabilities[EquipmentType.ARMOR] = 3500;      // 35%
        typeProbabilities[EquipmentType.ACCESSORY] = 2000;  // 20%
        typeProbabilities[EquipmentType.CONSUMABLE] = 1000; // 10%
    }
    
    /**
     * @dev Request loot generation using Chainlink VRF
     */
    function requestLoot(address player, uint256 partyId, uint256 dungeonLevel) external onlyOwner returns (uint256) {
        uint256 requestId = i_vrfCoordinator.requestRandomWords(
            i_gasLane,
            i_subscriptionId,
            REQUEST_CONFIRMATIONS,
            i_callbackGasLimit,
            NUM_WORDS
        );
        
        lootRequests[requestId] = LootRequest({
            requestId: requestId,
            player: player,
            partyId: partyId,
            dungeonLevel: dungeonLevel,
            fulfilled: false
        });
        
        emit LootRequested(requestId, player, partyId);
        return requestId;
    }
    
    /**
     * @dev Chainlink VRF callback function
     */
    function fulfillRandomWords(uint256 requestId, uint256[] memory randomWords) internal override {
        LootRequest storage request = lootRequests[requestId];
        require(!request.fulfilled, "Request already fulfilled");
        
        request.fulfilled = true;
        
        // Generate equipment using random words
        _generateEquipment(request.player, request.dungeonLevel, randomWords);
    }
    
    /**
     * @dev Generate equipment based on random values
     */
    function _generateEquipment(address player, uint256 dungeonLevel, uint256[] memory randomWords) internal {
        uint256 typeRandom = randomWords[0] % 10000;
        uint256 rarityRandom = randomWords[1] % 10000;
        uint256 statsRandom = randomWords[2];
        
        // Determine equipment type
        EquipmentType equipType = _determineEquipmentType(typeRandom);
        
        // Determine rarity (with level scaling)
        Rarity rarity = _determineRarity(rarityRandom + (dungeonLevel * 100));
        
        // Calculate stats based on rarity and level
        uint256 baseStats = (uint256(rarity) + 1) * 10;
        uint256 levelBonus = dungeonLevel * 5;
        uint256 randomBonus = (statsRandom % 20) + 1;
        
        uint256 attackPower = baseStats + levelBonus + randomBonus;
        uint256 defensePower = (attackPower * 80) / 100;
        uint256 magicPower = (attackPower * 60) / 100;
        
        uint256 newTokenId = ++_tokenIds;
        
        string memory itemName = _generateItemName(equipType, rarity, statsRandom);
        
        equipment[newTokenId] = Equipment({
            tokenId: newTokenId,
            equipmentType: equipType,
            rarity: rarity,
            name: itemName,
            attackPower: attackPower,
            defensePower: defensePower,
            magicPower: magicPower,
            durability: 100,
            isLendable: false,
            originalOwner: player,
            createdAt: block.timestamp,
            lootType: _equipmentTypeToString(equipType),
            power: attackPower,
            attributes: new string[](0)
        });
        
        _safeMint(player, newTokenId);
        playerEquipment[player].push(newTokenId);
        equipmentOwner[newTokenId] = player;
        
        emit LootGenerated(newTokenId, player, equipType, rarity);
        emit EquipmentCreated(newTokenId, player, itemName);
    }
    
    /**
     * @dev Determine equipment type based on random value
     */
    function _determineEquipmentType(uint256 randomValue) internal view returns (EquipmentType) {
        uint256 cumulative = 0;
        
        for (uint256 i = 0; i < 4; i++) {
            EquipmentType equipType = EquipmentType(i);
            cumulative += typeProbabilities[equipType];
            if (randomValue < cumulative) {
                return equipType;
            }
        }
        
        return EquipmentType.CONSUMABLE; // Fallback
    }
    
    /**
     * @dev Determine rarity based on random value
     */
    function _determineRarity(uint256 randomValue) internal view returns (Rarity) {
        uint256 normalizedValue = randomValue % 10000;
        uint256 cumulative = 0;
        
        for (uint256 i = 0; i < 6; i++) {
            Rarity rarity = Rarity(i);
            cumulative += rarityProbabilities[rarity];
            if (normalizedValue < cumulative) {
                return rarity;
            }
        }
        
        return Rarity.COMMON; // Fallback
    }
    
    /**
     * @dev Generate item name based on type and rarity
     */
    function _generateItemName(EquipmentType equipType, Rarity rarity, uint256 /*seed*/) internal pure returns (string memory) {
        string memory rarityPrefix = _getRarityPrefix(rarity);
        string memory typeString = _getEquipmentTypeString(equipType);
        
        return string(abi.encodePacked(rarityPrefix, " ", typeString));
    }
    
    /**
     * @dev Get rarity prefix for naming
     */
    function _getRarityPrefix(Rarity rarity) internal pure returns (string memory) {
        if (rarity == Rarity.COMMON) return "Common";
        if (rarity == Rarity.UNCOMMON) return "Uncommon";
        if (rarity == Rarity.RARE) return "Rare";
        if (rarity == Rarity.EPIC) return "Epic";
        if (rarity == Rarity.LEGENDARY) return "Legendary";
        return "Mythic";
    }
    
    /**
     * @dev Get equipment type string for naming
     */
    function _getEquipmentTypeString(EquipmentType equipType) internal pure returns (string memory) {
        if (equipType == EquipmentType.WEAPON) return "Weapon";
        if (equipType == EquipmentType.ARMOR) return "Armor";
        if (equipType == EquipmentType.ACCESSORY) return "Accessory";
        return "Consumable";
    }
    
    /**
     * @dev Set equipment lending status
     */
    function setLendingStatus(uint256 tokenId, bool isLendable) external {
        require(ownerOf(tokenId) == msg.sender, "Not equipment owner");
        equipment[tokenId].isLendable = isLendable;
        emit EquipmentLendingStatusChanged(tokenId, isLendable);
    }
    
    /**
     * @dev Get equipment details
     */
    function getEquipment(uint256 tokenId) external view returns (Equipment memory) {
        return equipment[tokenId];
    }
    
    /**
     * @dev Get player's equipment
     */
    function getPlayerEquipment(address player) external view returns (uint256[] memory) {
        return playerEquipment[player];
    }
    
    /**
     * @dev Get loot data in CCIP compatible format
     */
    function getLoot(uint256 tokenId) external view returns (LootItem memory) {
        Equipment memory eq = equipment[tokenId];
        return LootItem({
            name: eq.name,
            lootType: eq.lootType,
            rarity: uint256(eq.rarity),
            power: eq.power,
            attributes: eq.attributes
        });
    }
    
    /**
     * @dev Mint loot with specific attributes (for CCIP)
     */
    function mintLoot(
        address to,
        string memory name,
        string memory lootType,
        uint256 rarity,
        uint256 power,
        string[] memory attributes
    ) external onlyOwner returns (uint256) {
        uint256 tokenId = ++_tokenIds;
        _safeMint(to, tokenId);
        
        equipment[tokenId] = Equipment({
            tokenId: tokenId,
            equipmentType: _stringToEquipmentType(lootType),
            rarity: Rarity(rarity),
            name: name,
            attackPower: power,
            defensePower: power / 2,
            magicPower: power / 3,
            durability: 100,
            isLendable: false,
            originalOwner: to,
            createdAt: block.timestamp,
            lootType: lootType,
            power: power,
            attributes: attributes
        });
        
        playerEquipment[to].push(tokenId);
        equipmentOwner[tokenId] = to;
        
        emit EquipmentCreated(tokenId, to, name);
        return tokenId;
    }
    
    /**
     * @dev Burn loot (for cross-chain transfers)
     */
    function burnLoot(uint256 tokenId) external onlyOwner {
        address owner = ownerOf(tokenId);
        
        // Remove from player's equipment array
        uint256[] storage playerEq = playerEquipment[owner];
        for (uint256 i = 0; i < playerEq.length; i++) {
            if (playerEq[i] == tokenId) {
                playerEq[i] = playerEq[playerEq.length - 1];
                playerEq.pop();
                break;
            }
        }
        
        delete equipment[tokenId];
        delete equipmentOwner[tokenId];
        _burn(tokenId);
    }
    
    /**
     * @dev Convert equipment type to string
     */
    function _equipmentTypeToString(EquipmentType equipType) internal pure returns (string memory) {
        if (equipType == EquipmentType.WEAPON) return "Weapon";
        if (equipType == EquipmentType.ARMOR) return "Armor";
        if (equipType == EquipmentType.ACCESSORY) return "Accessory";
        return "Consumable";
    }
    
    /**
     * @dev Convert string to equipment type
     */
    function _stringToEquipmentType(string memory typeStr) internal pure returns (EquipmentType) {
        bytes32 typeHash = keccak256(bytes(typeStr));
        if (typeHash == keccak256(bytes("Weapon"))) return EquipmentType.WEAPON;
        if (typeHash == keccak256(bytes("Armor"))) return EquipmentType.ARMOR;
        if (typeHash == keccak256(bytes("Accessory"))) return EquipmentType.ACCESSORY;
        return EquipmentType.CONSUMABLE;
    }
}
