// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "../lib/openzeppelin-contracts/contracts/access/Ownable.sol";
import "../lib/openzeppelin-contracts/contracts/utils/ReentrancyGuard.sol";
import "../lib/chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";

/**
 * @title PartyRegistry
 * @dev Manages cross-chain party formation and synchronization
 */
contract PartyRegistry is Ownable, ReentrancyGuard {
    uint256 private _partyIds;
    
    struct Party {
        uint256 id;
        address leader;
        address[] members;
        uint256 maxSize;
        uint256 chainId;
        bool isActive;
        uint256 createdAt;
        bytes32 dungeonSeed;
    }
    
    struct Player {
        address wallet;
        uint256 level;
        uint256 experience;
        bool isRegistered;
        uint256 currentPartyId;
    }
    
    // Mappings
    mapping(uint256 => Party) public parties;
    mapping(address => Player) public players;
    mapping(uint256 => mapping(address => bool)) public partyMembers;
    
    // Events
    event PlayerRegistered(address indexed player, uint256 timestamp);
    event PartyCreated(uint256 indexed partyId, address indexed leader, uint256 chainId);
    event PlayerJoinedParty(uint256 indexed partyId, address indexed player);
    event PlayerLeftParty(uint256 indexed partyId, address indexed player);
    event PartyDisbanded(uint256 indexed partyId);
    event CrossChainPartySync(uint256 indexed partyId, uint256 targetChainId, bytes32 messageId);
    
    // Modifiers
    modifier onlyRegisteredPlayer() {
        require(players[msg.sender].isRegistered, "Player not registered");
        _;
    }
    
    modifier onlyPartyLeader(uint256 partyId) {
        require(parties[partyId].leader == msg.sender, "Not party leader");
        _;
    }
    
    modifier partyExists(uint256 partyId) {
        require(parties[partyId].id != 0, "Party does not exist");
        _;
    }
    
    constructor(address initialOwner) Ownable(initialOwner) {}
    
    /**
     * @dev Register a new player
     */
    function registerPlayer() external {
        require(!players[msg.sender].isRegistered, "Player already registered");
        
        players[msg.sender] = Player({
            wallet: msg.sender,
            level: 1,
            experience: 0,
            isRegistered: true,
            currentPartyId: 0
        });
        
        emit PlayerRegistered(msg.sender, block.timestamp);
    }
    
    /**
     * @dev Create a new party
     */
    function createParty(uint256 maxSize) external onlyRegisteredPlayer returns (uint256) {
        require(players[msg.sender].currentPartyId == 0, "Already in a party");
        require(maxSize >= 2 && maxSize <= 8, "Invalid party size");
        
        _partyIds++;
        uint256 newPartyId = _partyIds;
        
        address[] memory initialMembers = new address[](1);
        initialMembers[0] = msg.sender;
        
        parties[newPartyId] = Party({
            id: newPartyId,
            leader: msg.sender,
            members: initialMembers,
            maxSize: maxSize,
            chainId: block.chainid,
            isActive: true,
            createdAt: block.timestamp,
            dungeonSeed: 0
        });
        
        partyMembers[newPartyId][msg.sender] = true;
        players[msg.sender].currentPartyId = newPartyId;
        
        emit PartyCreated(newPartyId, msg.sender, block.chainid);
        emit PlayerJoinedParty(newPartyId, msg.sender);
        
        return newPartyId;
    }

    /**
     * @dev Delete a party (only by the party leader)
     */
    function deleteParty(uint256 partyId) external onlyPartyLeader(partyId) partyExists(partyId) nonReentrant {
        Party storage party = parties[partyId];


        // Mark all members as not in any party
        for (uint256 i = 0; i < party.members.length; i++) {
            address member = party.members[i];
            players[member].currentPartyId = 0;
            partyMembers[partyId][member] = false;
        }

        // Clear party data
        delete parties[partyId];

        emit PartyDisbanded(partyId);
        _partyIds--;

    }

    
    /**
     * @dev Join an existing party
     */
    function joinParty(uint256 partyId) external onlyRegisteredPlayer partyExists(partyId) {
        require(players[msg.sender].currentPartyId == 0, "Already in a party");
        require(parties[partyId].isActive, "Party is not active");
        require(parties[partyId].members.length < parties[partyId].maxSize, "Party is full");
        require(!partyMembers[partyId][msg.sender], "Already in this party");
        
        parties[partyId].members.push(msg.sender);
        partyMembers[partyId][msg.sender] = true;
        players[msg.sender].currentPartyId = partyId;
        
        emit PlayerJoinedParty(partyId, msg.sender);
    }
    
    /**
     * @dev Leave current party
     */
    function leaveParty() external onlyRegisteredPlayer {
        uint256 partyId = players[msg.sender].currentPartyId;
        require(partyId != 0, "Not in a party");
        
        _removePlayerFromParty(partyId, msg.sender);
        
        // If leader leaves, disband party or transfer leadership
        if (parties[partyId].leader == msg.sender) {
            if (parties[partyId].members.length == 0) {
                parties[partyId].isActive = false;
                emit PartyDisbanded(partyId);
            } else {
                // Transfer leadership to first remaining member
                parties[partyId].leader = parties[partyId].members[0];
            }
        }
        
        emit PlayerLeftParty(partyId, msg.sender);
    }
    
    /**
     * @dev Kick a player from party (leader only)
     */
    function kickPlayer(uint256 partyId, address player) external onlyPartyLeader(partyId) {
        require(partyMembers[partyId][player], "Player not in party");
        require(player != msg.sender, "Cannot kick yourself");
        
        _removePlayerFromParty(partyId, player);
        emit PlayerLeftParty(partyId, player);
    }
    
    /**
     * @dev Set dungeon seed for party (leader only)
     */
    function setDungeonSeed(uint256 partyId, bytes32 seed) external onlyPartyLeader(partyId) {
        parties[partyId].dungeonSeed = seed;
    }
    
    /**
     * @dev Get party information
     */
    function getParty(uint256 partyId) external view returns (Party memory) {
        return parties[partyId];
    }
    
    /**
     * @dev Get player information
     */
    function getPlayer(address playerAddress) external view returns (Player memory) {
        return players[playerAddress];
    }
    
    /**
     * @dev Get current party count
     */
    function getPartyCount() external view returns (uint256) {
        return _partyIds;
    }
    
    /**
     * @dev Check if player is in specific party
     */
    function isPlayerInParty(uint256 partyId, address player) external view returns (bool) {
        return partyMembers[partyId][player];
    }
    
    /**
     * @dev Internal function to remove player from party
     */
    function _removePlayerFromParty(uint256 partyId, address player) internal {
        require(partyMembers[partyId][player], "Player not in party");
        
        partyMembers[partyId][player] = false;
        players[player].currentPartyId = 0;
        
        // Remove from members array
        address[] storage members = parties[partyId].members;
        for (uint i = 0; i < members.length; i++) {
            if (members[i] == player) {
                members[i] = members[members.length - 1];
                members.pop();
                break;
            }
        }
    }
    
    /**
     * @dev Update player stats (can be called by authorized contracts)
     */
    function updatePlayerStats(address player, uint256 newLevel, uint256 newExperience) external onlyOwner {
        require(players[player].isRegistered, "Player not registered");
        
        players[player].level = newLevel;
        players[player].experience = newExperience;
    }
}
