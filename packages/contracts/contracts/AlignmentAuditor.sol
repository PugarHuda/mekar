// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IAgentINFT} from "./interfaces/IAgentINFT.sol";

/// @title AlignmentAuditor
/// @notice Allowlist-gated proxy that calls AgentINFT.updateAlignmentHealth.
/// @dev MVP design: protocol owner curates a set of approved auditor addresses
///      (off-chain alignment node operators in production, deployer for the
///      hackathon demo). Each approved auditor can adjust an agent's score
///      between 0 and 10000 bp. The score then directly scales the agent's
///      ancestor-tier royalty payout in RoyaltyVault — wired so misalignment
///      has a real economic penalty, not just a label.
contract AlignmentAuditor is Ownable {
    // ─────────────────────────────────────────────────────────────────────
    // Events
    // ─────────────────────────────────────────────────────────────────────

    event AuditorApproved(address indexed auditor);
    event AuditorRevoked(address indexed auditor);
    event AgentFlagged(
        uint256 indexed agentId,
        address indexed auditor,
        uint16 oldScore,
        uint16 newScore,
        string reason
    );

    // ─────────────────────────────────────────────────────────────────────
    // Errors
    // ─────────────────────────────────────────────────────────────────────

    error UnauthorizedAuditor(address caller);
    error InvalidScore(uint16 score);
    error AgentInftNotSet();

    // ─────────────────────────────────────────────────────────────────────
    // State
    // ─────────────────────────────────────────────────────────────────────

    IAgentINFT public agentInft;

    /// @dev Address => is approved to push alignment scores
    mapping(address => bool) public approvedAuditors;

    constructor(address initialOwner, address agentInftAddr) Ownable(initialOwner) {
        agentInft = IAgentINFT(agentInftAddr);
    }

    // ─────────────────────────────────────────────────────────────────────
    // Owner ops
    // ─────────────────────────────────────────────────────────────────────

    function setAgentInft(address newAddr) external onlyOwner {
        agentInft = IAgentINFT(newAddr);
    }

    function approveAuditor(address auditor) external onlyOwner {
        approvedAuditors[auditor] = true;
        emit AuditorApproved(auditor);
    }

    function revokeAuditor(address auditor) external onlyOwner {
        approvedAuditors[auditor] = false;
        emit AuditorRevoked(auditor);
    }

    // ─────────────────────────────────────────────────────────────────────
    // Auditor ops
    // ─────────────────────────────────────────────────────────────────────

    /// @notice Push a new alignment score for an agent.
    /// @param agentId Token ID of the agent being audited
    /// @param newScore Alignment health, 0-10000 bp (10000 = 100%)
    /// @param reason Free-form string for transparency (e.g. "bias drift",
    ///        "hallucination", "training contamination"). Stored only in the
    ///        emitted event — chain history acts as the audit log.
    function flagAgent(uint256 agentId, uint16 newScore, string calldata reason) external {
        if (!approvedAuditors[msg.sender]) revert UnauthorizedAuditor(msg.sender);
        if (newScore > 10_000) revert InvalidScore(newScore);
        if (address(agentInft) == address(0)) revert AgentInftNotSet();

        uint16 oldScore = agentInft.getAlignmentHealth(agentId);
        agentInft.updateAlignmentHealth(agentId, newScore);

        emit AgentFlagged(agentId, msg.sender, oldScore, newScore, reason);
    }
}
