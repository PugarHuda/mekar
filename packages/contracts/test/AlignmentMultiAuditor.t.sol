// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {AgentINFT} from "../contracts/AgentINFT.sol";
import {MekarRegistry} from "../contracts/MekarRegistry.sol";
import {TrainingDataRegistry} from "../contracts/TrainingDataRegistry.sol";
import {AlignmentMultiAuditor} from "../contracts/AlignmentMultiAuditor.sol";
import {IMekarTypes} from "../contracts/interfaces/IMekarTypes.sol";

/// @notice Tests for AlignmentMultiAuditor — k-of-n threshold flagging.
/// Covers the security-critical paths: threshold enforcement, no
/// double-vote, fresh-proposal per (agentId, score) pair, owner-only
/// auditor management, and successful slash on quorum.
contract AlignmentMultiAuditorTest is Test {
    AgentINFT internal agentInft;
    MekarRegistry internal registry;
    TrainingDataRegistry internal trainingRegistry;
    AlignmentMultiAuditor internal multiAuditor;

    address internal deployer = address(0xD1);
    address internal alice = address(0xA1);
    address internal auditorA = address(0xAAA1);
    address internal auditorB = address(0xAAA2);
    address internal auditorC = address(0xAAA3);
    address internal hostile = address(0xBAD);

    uint256 internal agentId;

    function setUp() public {
        IMekarTypes.RoyaltySchema memory defaultSchema = IMekarTypes.RoyaltySchema({
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
        agentInft.setRegistry(address(registry));
        registry.setAgentInftContract(address(agentInft));

        // 2-of-3 threshold to exercise both "not yet quorum" and "quorum reached"
        multiAuditor = new AlignmentMultiAuditor(deployer, address(agentInft), 2);
        agentInft.setAlignmentAuditor(address(multiAuditor));
        multiAuditor.approveAuditor(auditorA);
        multiAuditor.approveAuditor(auditorB);
        multiAuditor.approveAuditor(auditorC);
        vm.stopPrank();

        vm.startPrank(alice);
        agentId = agentInft.mintGenesis(
            keccak256("w"),
            keccak256("t"),
            keccak256("tee"),
            defaultSchema,
            IMekarTypes.ParticipationMode.Voluntary
        );
        vm.stopPrank();
    }

    function test_SingleVoteDoesNotSlash() public {
        vm.prank(auditorA);
        multiAuditor.flagAgent(agentId, 6_000, "drift");
        // Score unchanged — only 1 of 2 required votes
        assertEq(agentInft.getAlignmentHealth(agentId), 10_000);
        assertEq(multiAuditor.votesFor(agentId, 6_000), 1);
    }

    function test_ThresholdReachedSlashes() public {
        vm.prank(auditorA);
        multiAuditor.flagAgent(agentId, 6_000, "drift");
        vm.prank(auditorB);
        multiAuditor.flagAgent(agentId, 6_000, "drift");
        // Quorum reached → score pushed, proposal cleared
        assertEq(agentInft.getAlignmentHealth(agentId), 6_000);
        assertEq(multiAuditor.votesFor(agentId, 6_000), 0);
    }

    function test_DifferentScoreOpensSeparateProposal() public {
        vm.prank(auditorA);
        multiAuditor.flagAgent(agentId, 6_000, "minor");
        vm.prank(auditorB);
        multiAuditor.flagAgent(agentId, 4_000, "major");
        // Two distinct open proposals, neither has reached threshold
        assertEq(agentInft.getAlignmentHealth(agentId), 10_000);
        assertEq(multiAuditor.votesFor(agentId, 6_000), 1);
        assertEq(multiAuditor.votesFor(agentId, 4_000), 1);
    }

    function test_DoubleVoteReverts() public {
        vm.prank(auditorA);
        multiAuditor.flagAgent(agentId, 6_000, "drift");
        vm.prank(auditorA);
        vm.expectRevert(
            abi.encodeWithSelector(AlignmentMultiAuditor.AlreadyVoted.selector, auditorA)
        );
        multiAuditor.flagAgent(agentId, 6_000, "drift");
    }

    function test_UnapprovedAuditorReverts() public {
        vm.prank(hostile);
        vm.expectRevert(
            abi.encodeWithSelector(
                AlignmentMultiAuditor.UnauthorizedAuditor.selector,
                hostile
            )
        );
        multiAuditor.flagAgent(agentId, 6_000, "evil");
    }

    function test_WithdrawVoteRemovesFromTally() public {
        vm.prank(auditorA);
        multiAuditor.flagAgent(agentId, 6_000, "drift");
        assertEq(multiAuditor.votesFor(agentId, 6_000), 1);

        vm.prank(auditorA);
        multiAuditor.withdrawVote(agentId, 6_000);
        assertEq(multiAuditor.votesFor(agentId, 6_000), 0);
        assertFalse(multiAuditor.hasVoted(agentId, 6_000, auditorA));
    }

    function test_OnlyOwnerCanApproveAuditors() public {
        vm.prank(hostile);
        vm.expectRevert();
        multiAuditor.approveAuditor(hostile);
    }

    function test_RevokedAuditorCanNoLongerVote() public {
        vm.prank(deployer);
        multiAuditor.revokeAuditor(auditorA);

        vm.prank(auditorA);
        vm.expectRevert(
            abi.encodeWithSelector(
                AlignmentMultiAuditor.UnauthorizedAuditor.selector,
                auditorA
            )
        );
        multiAuditor.flagAgent(agentId, 6_000, "drift");
    }

    function test_SetThresholdRequiresOwner() public {
        vm.prank(hostile);
        vm.expectRevert();
        multiAuditor.setThreshold(3);

        vm.prank(deployer);
        multiAuditor.setThreshold(3);
        assertEq(multiAuditor.threshold(), 3);
    }

    function test_InvalidScoreReverts() public {
        vm.prank(auditorA);
        vm.expectRevert(
            abi.encodeWithSelector(
                AlignmentMultiAuditor.InvalidScore.selector,
                uint16(10_001)
            )
        );
        multiAuditor.flagAgent(agentId, 10_001, "out of bounds");
    }

    function test_ProposalClearedAfterSlashSoFutureVotesAreFresh() public {
        // Round 1 quorum
        vm.prank(auditorA);
        multiAuditor.flagAgent(agentId, 6_000, "drift");
        vm.prank(auditorB);
        multiAuditor.flagAgent(agentId, 6_000, "drift");
        assertEq(agentInft.getAlignmentHealth(agentId), 6_000);

        // Round 2: a different score — fresh proposal, A can vote again
        vm.prank(auditorA);
        multiAuditor.flagAgent(agentId, 3_000, "worse");
        assertEq(multiAuditor.votesFor(agentId, 3_000), 1);
    }
}
