// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {AgentINFT} from "../contracts/AgentINFT.sol";
import {MekarRegistry} from "../contracts/MekarRegistry.sol";
import {RoyaltyVault} from "../contracts/RoyaltyVault.sol";
import {TrainingDataRegistry} from "../contracts/TrainingDataRegistry.sol";
import {AlignmentAuditor} from "../contracts/AlignmentAuditor.sol";
import {IMekarTypes} from "../contracts/interfaces/IMekarTypes.sol";

/// @notice Property-based (fuzz) tests for RoyaltyVault.
///
/// Unit tests prove specific cases; these prove the royalty math holds
/// across the WHOLE input space. The headline property is conservation
/// of value: a settled inference must pay out exactly what was paid in,
/// to the wei — recipients + treasury + provider == totalPaid. If any
/// rounding bug, double-pay, or leak existed, a random fuzz input would
/// surface it where a hand-picked example might not.
contract RoyaltyVaultFuzzTest is Test {
    AgentINFT internal agentInft;
    MekarRegistry internal registry;
    RoyaltyVault internal royaltyVault;
    TrainingDataRegistry internal trainingRegistry;
    AlignmentAuditor internal auditor;

    address internal deployer = address(0xD1);
    address internal alice = address(0xA1);
    address internal bob = address(0xB0B);
    address internal user = address(0x55E2);
    address internal provider = address(0x9404);

    IMekarTypes.RoyaltySchema internal defaultSchema;

    function setUp() public {
        defaultSchema = IMekarTypes.RoyaltySchema({
            directOwnerBps: 5_000,
            gen1Bps: 2_500,
            gen2Bps: 1_500,
            gen3PlusBps: 700,
            trainingDataBps: 300,
            maxGenerationsPaid: 10
        });

        vm.startPrank(deployer);
        trainingRegistry = new TrainingDataRegistry(deployer);
        agentInft = new AgentINFT(deployer);
        registry = new MekarRegistry(deployer);
        royaltyVault = new RoyaltyVault(
            deployer,
            address(agentInft),
            address(registry),
            address(trainingRegistry)
        );
        agentInft.setRegistry(address(registry));
        registry.setAgentInftContract(address(agentInft));
        registry.setRoyaltyVaultContract(address(royaltyVault));
        registry.setTrainingDataRegistry(address(trainingRegistry));
        auditor = new AlignmentAuditor(deployer, address(agentInft));
        agentInft.setAlignmentAuditor(address(auditor));
        auditor.approveAuditor(deployer);
        vm.stopPrank();

        vm.deal(alice, 1_000 ether);
        vm.deal(bob, 1_000 ether);
        vm.deal(user, 100_000 ether);
        vm.deal(provider, 10 ether);
    }

    /* ─────────────── helpers ─────────────── */

    function _mintGenesis(address creator) internal returns (uint256) {
        vm.prank(creator);
        return agentInft.mintGenesis(
            keccak256(abi.encode("w", creator, block.timestamp)),
            keccak256(abi.encode("t", creator)),
            keccak256(abi.encode("a", creator)),
            defaultSchema,
            IMekarTypes.ParticipationMode.Voluntary
        );
    }

    function _mintFork(address creator, uint256 parentId) internal returns (uint256) {
        vm.prank(creator);
        return agentInft.mintFork(
            parentId,
            keccak256(abi.encode("fw", creator, block.timestamp)),
            keccak256(abi.encode("ft", creator)),
            keccak256(abi.encode("fa", creator))
        );
    }

    function _registerProvider() internal {
        vm.prank(provider);
        royaltyVault.registerProvider{value: 0.1 ether}(provider, 0.1 ether);
    }

    /* ─────────────── fuzz: value conservation ─────────────── */

    /// @notice For ANY base price, a settled genesis inference must pay
    ///         out exactly what came in: ownerGain + treasuryDelta +
    ///         providerGain == totalPaid, to the wei.
    function testFuzz_GenesisConservation(uint256 basePrice) public {
        // Bound to a realistic, non-degenerate range. Below ~1e4 wei the
        // 10% fee floors to 0 — still conserves, but the test is more
        // meaningful in the range real inferences live in.
        basePrice = bound(basePrice, 1e4, 100 ether);

        uint256 agentId = _mintGenesis(alice);
        vm.prank(alice);
        royaltyVault.setBasePrice(agentId, basePrice);
        _registerProvider();

        uint256 totalPaid = royaltyVault.getInferencePrice(agentId);

        uint256 aliceBefore = alice.balance;
        uint256 providerBefore = provider.balance;
        uint256 treasuryBefore = royaltyVault.protocolFeesAccrued();

        vm.prank(user);
        bytes32 reqId = royaltyVault.payInference{value: totalPaid}(agentId);
        vm.prank(provider);
        royaltyVault.settleInference(reqId, keccak256("out"), hex"1234");

        uint256 aliceGain = alice.balance - aliceBefore;
        uint256 providerGain = provider.balance - providerBefore;
        uint256 treasuryDelta = royaltyVault.protocolFeesAccrued() - treasuryBefore;

        // The core property — wei-perfect conservation.
        assertEq(
            aliceGain + providerGain + treasuryDelta,
            totalPaid,
            "settle must conserve value exactly"
        );
        // Vault must not be left holding stray wei beyond the treasury.
        assertEq(
            address(royaltyVault).balance,
            royaltyVault.protocolFeesAccrued() + 0.1 ether, // + provider stake
            "vault balance == treasury + stake, no leak"
        );
    }

    /// @notice Conservation must also hold across a multi-wallet lineage
    ///         (genesis + fork) — the cascade splits the base across two
    ///         owners + treasury, and the sum must still equal totalPaid.
    function testFuzz_ForkConservation(uint256 basePrice) public {
        basePrice = bound(basePrice, 1e4, 100 ether);

        uint256 genesis = _mintGenesis(alice);
        uint256 fork = _mintFork(bob, genesis);
        vm.prank(bob);
        royaltyVault.setBasePrice(fork, basePrice);
        _registerProvider();

        uint256 totalPaid = royaltyVault.getInferencePrice(fork);

        uint256 aliceBefore = alice.balance;
        uint256 bobBefore = bob.balance;
        uint256 providerBefore = provider.balance;
        uint256 treasuryBefore = royaltyVault.protocolFeesAccrued();

        vm.prank(user);
        bytes32 reqId = royaltyVault.payInference{value: totalPaid}(fork);
        vm.prank(provider);
        royaltyVault.settleInference(reqId, keccak256("out"), hex"5678");

        uint256 totalOut = (alice.balance - aliceBefore) +
            (bob.balance - bobBefore) +
            (provider.balance - providerBefore) +
            (royaltyVault.protocolFeesAccrued() - treasuryBefore);

        assertEq(totalOut, totalPaid, "fork cascade must conserve value");
    }

    /* ─────────────── fuzz: alignment scaling is bounded ─────────────── */

    /// @notice Slashing an ancestor's alignment health can only REDUCE
    ///         what it earns — never increase it. For any health value
    ///         0..10000, the slashed payout must be ≤ the full payout.
    function testFuzz_AlignmentNeverIncreasesPayout(uint16 health) public {
        health = uint16(bound(health, 0, 10_000));

        // Baseline: full-alignment fork cascade, capture what alice (the
        // genesis owner / gen-1 ancestor) earns.
        uint256 g1 = _mintGenesis(alice);
        uint256 f1 = _mintFork(bob, g1);
        vm.prank(bob);
        royaltyVault.setBasePrice(f1, 1 ether);
        _registerProvider();

        uint256 aliceBefore1 = alice.balance;
        vm.prank(user);
        bytes32 r1 = royaltyVault.payInference{value: royaltyVault.getInferencePrice(f1)}(f1);
        vm.prank(provider);
        royaltyVault.settleInference(r1, keccak256("o1"), hex"11");
        uint256 fullAlignGain = alice.balance - aliceBefore1;

        // Second lineage: identical shape, but slash the genesis agent's
        // alignment to the fuzzed value before settling.
        uint256 g2 = _mintGenesis(alice);
        uint256 f2 = _mintFork(bob, g2);
        vm.prank(bob);
        royaltyVault.setBasePrice(f2, 1 ether);
        vm.prank(deployer);
        auditor.flagAgent(g2, health, "fuzz");

        uint256 aliceBefore2 = alice.balance;
        vm.prank(user);
        bytes32 r2 = royaltyVault.payInference{value: royaltyVault.getInferencePrice(f2)}(f2);
        vm.prank(provider);
        royaltyVault.settleInference(r2, keccak256("o2"), hex"22");
        uint256 slashedGain = alice.balance - aliceBefore2;

        assertLe(
            slashedGain,
            fullAlignGain,
            "slashed alignment must never pay MORE than full alignment"
        );
        // At full health the slash is a no-op — payouts must match.
        if (health == 10_000) {
            assertEq(slashedGain, fullAlignGain, "health=100% must equal unslashed");
        }
        // At zero health the ancestor tier earns nothing.
        if (health == 0) {
            assertEq(slashedGain, 0, "health=0 must zero the ancestor share");
        }
    }
}
