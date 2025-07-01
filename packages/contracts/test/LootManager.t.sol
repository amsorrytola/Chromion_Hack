// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {Test, console} from "forge-std/Test.sol";
import "../src/LootManager.sol";
import "../src/PartyRegistry.sol";

contract LootManagerTest is Test {
    LootManager public lootManager;
    PartyRegistry public partyRegistry;
    
    address public constant VRF_COORDINATOR = 0x8103B0A8A00be2DDC778e6e7eaa21791Cd364625; // Sepolia VRF Coordinator
    address public owner = makeAddr("owner");
    address public player1 = makeAddr("player1");
    address public player2 = makeAddr("player2");
    
    function setUp() public {
        vm.startPrank(owner);
        
        // Deploy LootManager
        lootManager = new LootManager(
            VRF_COORDINATOR,
            1, // subscription ID
            0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c, // keyHash
            100000, // callback gas limit
            owner
        );
        
        // Deploy PartyRegistry
        partyRegistry = new PartyRegistry(owner);
        
        vm.stopPrank();
    }
    
    function testLootManagerDeployment() public view {
        assertEq(lootManager.owner(), owner);
        assertEq(lootManager.name(), "Dungeon Equipment");
        assertEq(lootManager.symbol(), "DEQP");
    }
    
    function testPartyRegistryDeployment() public view {
        assertEq(partyRegistry.owner(), owner);
    }
    
    function testMintLoot() public {
        vm.startPrank(owner);
        
        string[] memory attributes = new string[](2);
        attributes[0] = "Strength +10";
        attributes[1] = "Fire Resistance +5";
        
        uint256 lootId = lootManager.mintLoot(
            player1,
            "Fire Sword",
            "Weapon",
            2, // Rare
            100, // Power
            attributes
        );
        
        // Verify loot was created
        assertEq(lootManager.ownerOf(lootId), player1);
        
        LootManager.LootItem memory loot = lootManager.getLoot(lootId);
        assertEq(loot.name, "Fire Sword");
        assertEq(loot.lootType, "Weapon");
        assertEq(loot.rarity, 2);
        assertEq(loot.power, 100);
        assertEq(loot.attributes.length, 2);
        
        vm.stopPrank();
    }
    
    function testCreateParty() public {
        vm.startPrank(player1);
        
        // First register the player
        partyRegistry.registerPlayer();
        
        uint256 partyId = partyRegistry.createParty(4); // maxSize of 4
        
        PartyRegistry.Party memory party = partyRegistry.getParty(partyId);
        assertEq(party.leader, player1);
        assertEq(party.maxSize, 4);
        assertTrue(party.isActive);
        assertTrue(partyRegistry.isPlayerInParty(partyId, player1));
        
        vm.stopPrank();
    }
    
    function testJoinParty() public {
        vm.startPrank(player1);
        // Register player1 and create party
        partyRegistry.registerPlayer();
        uint256 partyId = partyRegistry.createParty(4);
        vm.stopPrank();
        
        vm.startPrank(player2);
        // Register player2 and join party
        partyRegistry.registerPlayer();
        partyRegistry.joinParty(partyId);
        
        assertTrue(partyRegistry.isPlayerInParty(partyId, player2));
        
        PartyRegistry.Party memory party = partyRegistry.getParty(partyId);
        assertEq(party.members.length, 2);
        
        vm.stopPrank();
    }
    
    function testSetLendingStatus() public {
        vm.startPrank(owner);
        
        string[] memory attributes = new string[](1);
        attributes[0] = "Magic Power +15";
        
        uint256 lootId = lootManager.mintLoot(
            player1,
            "Lightning Staff",
            "Weapon",
            3, // Epic
            150,
            attributes
        );
        
        vm.stopPrank();
        
        vm.startPrank(player1);
        
        // Initially not lendable
        LootManager.Equipment memory equipment = lootManager.getEquipment(lootId);
        assertFalse(equipment.isLendable);
        
        // Set as lendable
        lootManager.setLendingStatus(lootId, true);
        
        equipment = lootManager.getEquipment(lootId);
        assertTrue(equipment.isLendable);
        
        vm.stopPrank();
    }
    
    function testOnlyOwnerMintLoot() public {
        vm.startPrank(player1);
        
        string[] memory attributes = new string[](0);
        
        vm.expectRevert();
        lootManager.mintLoot(
            player2,
            "Hacker Sword",
            "Weapon",
            5,
            9999,
            attributes
        );
        
        vm.stopPrank();
    }
    
    function testBurnLoot() public {
        vm.startPrank(owner);
        
        string[] memory attributes = new string[](1);
        attributes[0] = "Temporary Item";
        
        uint256 lootId = lootManager.mintLoot(
            player1,
            "Test Item",
            "Consumable",
            0,
            10,
            attributes
        );
        
        // Verify item exists
        assertEq(lootManager.ownerOf(lootId), player1);
        
        // Burn the item
        lootManager.burnLoot(lootId);
        
        // Verify item is burned
        vm.expectRevert();
        lootManager.ownerOf(lootId);
        
        vm.stopPrank();
    }
    
    function testPlayerEquipment() public {
        vm.startPrank(owner);
        
        string[] memory attributes = new string[](0);
        
        // Mint multiple items for player1
        uint256 lootId1 = lootManager.mintLoot(player1, "Sword", "Weapon", 1, 50, attributes);
        uint256 lootId2 = lootManager.mintLoot(player1, "Shield", "Armor", 1, 30, attributes);
        uint256 lootId3 = lootManager.mintLoot(player2, "Staff", "Weapon", 2, 80, attributes);
        
        // Check player1's equipment
        uint256[] memory player1Equipment = lootManager.getPlayerEquipment(player1);
        assertEq(player1Equipment.length, 2);
        assertTrue(player1Equipment[0] == lootId1 || player1Equipment[1] == lootId1);
        assertTrue(player1Equipment[0] == lootId2 || player1Equipment[1] == lootId2);
        
        // Check player2's equipment
        uint256[] memory player2Equipment = lootManager.getPlayerEquipment(player2);
        assertEq(player2Equipment.length, 1);
        assertEq(player2Equipment[0], lootId3);
        
        vm.stopPrank();
    }
}
