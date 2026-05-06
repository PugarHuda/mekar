// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {AgentINFT} from "../contracts/AgentINFT.sol";
import {RoyaltyVault} from "../contracts/RoyaltyVault.sol";
import {TrainingDataRegistry} from "../contracts/TrainingDataRegistry.sol";
import {IMekarTypes} from "../contracts/interfaces/IMekarTypes.sol";

/// @title Seed demo lineage data on chain after deployment
/// @dev Mints a 4-agent tree (genesis + 2 forks + 1 compose) and pays
///      several inferences to demonstrate royalty distribution.
contract SeedDemo is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);

        // Load addresses from env
        address agentInftAddr = vm.envAddress("NEXT_PUBLIC_AGENT_INFT_ADDRESS");
        address royaltyVaultAddr = vm.envAddress("NEXT_PUBLIC_ROYALTY_VAULT_ADDRESS");
        address trainingRegistryAddr = vm.envAddress("NEXT_PUBLIC_TRAINING_DATA_REGISTRY_ADDRESS");

        AgentINFT agentInft = AgentINFT(agentInftAddr);
        RoyaltyVault royaltyVault = RoyaltyVault(payable(royaltyVaultAddr));
        TrainingDataRegistry trainingRegistry = TrainingDataRegistry(trainingRegistryAddr);

        IMekarTypes.RoyaltySchema memory schema = IMekarTypes.RoyaltySchema({
            directOwnerBps: 5_000,
            gen1Bps: 2_500,
            gen2Bps: 1_500,
            gen3PlusBps: 700,
            trainingDataBps: 300,
            maxGenerationsPaid: 10
        });

        vm.startBroadcast(deployerKey);

        // 1. Register training dataset
        bytes32 trainingRoot = keccak256(abi.encode("indomedical-corpus-v1", block.timestamp));
        bytes32 storagePtr = keccak256(abi.encode("0g-storage-ptr", block.timestamp));
        bytes32 teeProof = keccak256(abi.encode("tee-attestation", block.timestamp));

        trainingRegistry.registerDataset(trainingRoot, storagePtr, teeProof);
        console2.log("[1/5] Training dataset registered");

        // 2. Mint genesis
        uint256 genesisId = agentInft.mintGenesis(
            keccak256(abi.encode("genesis-weights", block.timestamp)),
            trainingRoot,
            teeProof,
            schema,
            IMekarTypes.ParticipationMode.Voluntary
        );
        console2.log("[2/5] Genesis minted, tokenId:", genesisId);

        // 3. Mint two forks
        uint256 fork1Id = agentInft.mintFork(
            genesisId,
            keccak256(abi.encode("fork1-weights", block.timestamp)),
            keccak256(abi.encode("fork1-train", block.timestamp)),
            keccak256(abi.encode("fork1-tee", block.timestamp))
        );
        console2.log("[3/5] Fork1 minted, tokenId:", fork1Id);

        uint256 fork2Id = agentInft.mintFork(
            genesisId,
            keccak256(abi.encode("fork2-weights", block.timestamp)),
            keccak256(abi.encode("fork2-train", block.timestamp)),
            keccak256(abi.encode("fork2-tee", block.timestamp))
        );
        console2.log("       Fork2 minted, tokenId:", fork2Id);

        // 4. Mint compose
        uint256[] memory parents = new uint256[](2);
        parents[0] = fork1Id;
        parents[1] = fork2Id;

        uint256 composedId = agentInft.mintCompose(
            parents,
            keccak256(abi.encode("compose-weights", block.timestamp)),
            keccak256(abi.encode("compose-train", block.timestamp)),
            keccak256(abi.encode("compose-tee", block.timestamp)),
            IMekarTypes.CompositionStrategy.LoraMerge
        );
        console2.log("[4/5] Composed minted, tokenId:", composedId);

        // 5. Register as provider, pay 5 inferences
        royaltyVault.registerProvider{value: 0.1 ether}(deployer, 0.1 ether);

        uint256 price = royaltyVault.getInferencePrice(composedId);
        console2.log("[5/5] Inference price:", price);

        for (uint256 i = 0; i < 5; i++) {
            bytes32 reqId = royaltyVault.payInference{value: price}(composedId);
            royaltyVault.settleInference(
                reqId,
                keccak256(abi.encode("output", i, block.timestamp)),
                hex"1234"
            );
        }
        console2.log("       5 inferences paid + settled");

        vm.stopBroadcast();

        console2.log("\n=== Seed Complete ===");
        console2.log("Lineage:");
        console2.log("  Genesis (#1)");
        console2.log("    + Fork (#2, medical)   -+");
        console2.log("    + Fork (#3, legal)     -+- Composed (#4)");
    }
}
