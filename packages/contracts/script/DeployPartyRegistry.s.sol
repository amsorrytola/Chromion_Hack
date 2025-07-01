// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "forge-std/Script.sol";
import { PartyRegistry } from "../src/PartyRegistry.sol";

contract DeployPartyRegistry is Script {
    function run() external {
        address deployer = vm.addr(vm.envUint("PRIVATE_KEY"));
        vm.startBroadcast();

        new PartyRegistry(deployer); // Pass the initial owner (usually the deployer)

        vm.stopBroadcast();
    }
}
