// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {AgentINFT} from "../contracts/AgentINFT.sol";
import {MekarRegistry} from "../contracts/MekarRegistry.sol";
import {RoyaltyVault} from "../contracts/RoyaltyVault.sol";
import {TrainingDataRegistry} from "../contracts/TrainingDataRegistry.sol";

/// @title Deploy MEKAR contracts to 0G Aristotle Mainnet
/// @dev Order:
///   1. TrainingDataRegistry  (no deps)
///   2. AgentINFT             (no deps)
///   3. MekarRegistry         (no deps)
///   4. RoyaltyVault          (depends on AgentINFT, Registry, TrainingDataRegistry)
///   5. Wire up cross-references
contract Deploy is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);

        console2.log("\n=== MEKAR Deployment ===");
        console2.log("Deployer:", deployer);
        console2.log("Balance: ", deployer.balance);
        console2.log("ChainId: ", block.chainid);
        console2.log("");

        require(deployer.balance > 0, "Deployer has zero balance");

        vm.startBroadcast(deployerKey);

        TrainingDataRegistry trainingRegistry = new TrainingDataRegistry(deployer);
        console2.log("TrainingDataRegistry deployed:", address(trainingRegistry));

        AgentINFT agentInft = new AgentINFT(deployer);
        console2.log("AgentINFT            deployed:", address(agentInft));

        MekarRegistry registry = new MekarRegistry(deployer);
        console2.log("MekarRegistry        deployed:", address(registry));

        RoyaltyVault royaltyVault = new RoyaltyVault(
            deployer,
            address(agentInft),
            address(registry),
            address(trainingRegistry)
        );
        console2.log("RoyaltyVault         deployed:", address(royaltyVault));

        // Wire up
        agentInft.setRegistry(address(registry));
        registry.setAgentInftContract(address(agentInft));
        registry.setRoyaltyVaultContract(address(royaltyVault));
        registry.setTrainingDataRegistry(address(trainingRegistry));

        vm.stopBroadcast();

        console2.log("\n=== Deployment Complete ===");
        console2.log("Add these to your .env:");
        console2.log("NEXT_PUBLIC_TRAINING_DATA_REGISTRY_ADDRESS=", address(trainingRegistry));
        console2.log("NEXT_PUBLIC_AGENT_INFT_ADDRESS=             ", address(agentInft));
        console2.log("NEXT_PUBLIC_REGISTRY_ADDRESS=               ", address(registry));
        console2.log("NEXT_PUBLIC_ROYALTY_VAULT_ADDRESS=          ", address(royaltyVault));

        // Save deployment to JSON
        string memory json = "deployment";
        vm.serializeAddress(json, "TrainingDataRegistry", address(trainingRegistry));
        vm.serializeAddress(json, "AgentINFT", address(agentInft));
        vm.serializeAddress(json, "MekarRegistry", address(registry));
        vm.serializeAddress(json, "RoyaltyVault", address(royaltyVault));
        vm.serializeAddress(json, "deployer", deployer);
        string memory finalJson = vm.serializeUint(json, "chainId", block.chainid);

        vm.writeFile(
            string.concat("./deployments/", vm.toString(block.chainid), ".json"),
            finalJson
        );
    }
}
