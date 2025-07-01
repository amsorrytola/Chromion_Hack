// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {Test, console} from "forge-std/Test.sol";
import "../src/CrossChainLootManager.sol";
import "../src/LootManager.sol";
import "../src/RandomLootGenerator.sol";

contract CrossChainLootManagerTest is Test {
    CrossChainLootManager public crossChainLootManager;
    LootManager public lootManager;
    RandomLootGenerator public randomLootGenerator;
    
    address public constant ROUTER = 0x0BF3dE8c5D3e8A2B34D2BEeB17ABfCeBaf363A59; // Sepolia CCIP Router
    address public constant LINK = 0x779877A7B0D9E8603169DdbD7836e478b4624789; // Sepolia LINK
    address public constant VRF_COORDINATOR = 0x8103B0A8A00be2DDC778e6e7eaa21791Cd364625; // Sepolia VRF Coordinator
    
    address public owner = makeAddr("owner");
    address public player1 = makeAddr("player1");
    address public player2 = makeAddr("player2");
    
    function setUp() public {
        vm.startPrank(owner);
        
        // Deploy LootManager first
        lootManager = new LootManager(
            VRF_COORDINATOR,
            1, // subscription ID
            0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c, // keyHash
            100000, // callback gas limit
            owner
        );
        
        // Deploy RandomLootGenerator
        randomLootGenerator = new RandomLootGenerator(
            1, // subscription ID
            VRF_COORDINATOR,
            address(lootManager)
        );
        
        // Deploy CrossChainLootManager
        crossChainLootManager = new CrossChainLootManager(
            ROUTER,
            LINK,
            address(lootManager)
        );
        
        vm.stopPrank();
    }
    
    function testContractDeployment() public view {
        assertEq(crossChainLootManager.owner(), owner);
        assertEq(address(crossChainLootManager.lootManager()), address(lootManager));
        
        // Test chain selectors are allowlisted
        assertTrue(crossChainLootManager.allowlistedDestinationChains(16015286601757825753)); // Ethereum Sepolia
        assertTrue(crossChainLootManager.allowlistedSourceChains(12532609583862916517)); // Polygon Mumbai
    }
    
    function testLootManagerIntegration() public {
        vm.startPrank(owner);
        
        // Mint a test loot item
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
    
    function testAllowlistManagement() public {
        vm.startPrank(owner);
        
        uint64 testChainSelector = 123456789;
        address testSender = makeAddr("testSender");
        
        // Test destination chain allowlisting
        assertFalse(crossChainLootManager.allowlistedDestinationChains(testChainSelector));
        crossChainLootManager.allowlistDestinationChain(testChainSelector, true);
        assertTrue(crossChainLootManager.allowlistedDestinationChains(testChainSelector));
        
        // Test source chain allowlisting
        assertFalse(crossChainLootManager.allowlistedSourceChains(testChainSelector));
        crossChainLootManager.allowlistSourceChain(testChainSelector, true);
        assertTrue(crossChainLootManager.allowlistedSourceChains(testChainSelector));
        
        // Test sender allowlisting
        assertFalse(crossChainLootManager.allowlistedSenders(testSender));
        crossChainLootManager.allowlistSender(testSender, true);
        assertTrue(crossChainLootManager.allowlistedSenders(testSender));
        
        vm.stopPrank();
    }
    
    function testOnlyOwnerFunctions() public {
        vm.startPrank(player1);
        
        // Test that non-owner cannot modify allowlists
        vm.expectRevert();
        crossChainLootManager.allowlistDestinationChain(123456789, true);
        
        vm.expectRevert();
        crossChainLootManager.allowlistSourceChain(123456789, true);
        
        vm.expectRevert();
        crossChainLootManager.allowlistSender(makeAddr("test"), true);
        
        vm.stopPrank();
    }
    
    function testRandomLootGenerator() public {
        vm.startPrank(owner);
        
        // Test VRF config updates
        randomLootGenerator.updateVRFConfig(
            0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c,
            150000,
            3
        );
        
        randomLootGenerator.updateSubscriptionId(2);
        
        vm.stopPrank();
    }
    
    // Mock test for cross-chain functionality (requires CCIP testnet)
    function testCrossChainLootTransferPreparation() public {
        vm.startPrank(owner);
        
        // Mint loot for testing
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
        
        // Verify the loot exists and can be retrieved
        assertEq(lootManager.ownerOf(lootId), player1);
        
        LootManager.LootItem memory loot = lootManager.getLoot(lootId);
        assertEq(loot.name, "Lightning Staff");
        assertEq(loot.rarity, 3);
        
        vm.stopPrank();
        
        // In a real cross-chain test, we would:
        // 1. Call crossChainLootManager.sendLootCrossChain()
        // 2. Verify the loot is burned on source chain
        // 3. Verify CCIP message is sent
        // 4. Simulate message receipt on destination chain
        // 5. Verify loot is minted on destination chain
    }
}
