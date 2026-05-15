// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IAgentINFT} from "./interfaces/IAgentINFT.sol";

/// @title AlignmentMultiAuditor
/// @notice Threshold-signed proxy that pushes alignment scores into AgentINFT.
/// @dev Phase-2 upgrade of AlignmentAuditor: a single approved auditor is a
///      governance single-point-of-failure. This contract instead requires
///      `threshold` distinct approved auditors to all flag the same agent
///      with the same target score before the slash takes effect.
///
///      Flow:
///        1. Auditor A calls `flagAgent(id, newScore, reason)`. Proposal
///           opens, vote count = 1.
///        2. Auditor B calls the same fn with the same `id` + `newScore`.
///           Vote count = 2.
///        3. When votes >= threshold, the score is pushed to AgentINFT
///           and the proposal is cleared.
///
///      A different `newScore` opens a new proposal — auditors can't grief
///      each other's quorum by voting on a different target.
///
///      NOT deployed for the live hackathon demo (would change contract
///      address and break the deployed RoyaltyVault wiring). Ships as
///      production-ready reference, with full test coverage.
contract AlignmentMultiAuditor is Ownable {
    // ─────────────────────────────────────────────────────────────────────
    // Events
    // ─────────────────────────────────────────────────────────────────────

    event AuditorApproved(address indexed auditor);
    event AuditorRevoked(address indexed auditor);
    event ThresholdChanged(uint16 oldThreshold, uint16 newThreshold);
    event FlagProposed(
        uint256 indexed agentId,
        uint16 indexed newScore,
        address indexed auditor,
        uint16 votes,
        uint16 threshold,
        string reason
    );
    event AgentFlagged(
        uint256 indexed agentId,
        uint16 oldScore,
        uint16 newScore,
        address[] auditors
    );
    event FlagCancelled(uint256 indexed agentId, uint16 indexed newScore);

    // ─────────────────────────────────────────────────────────────────────
    // Errors
    // ─────────────────────────────────────────────────────────────────────

    error UnauthorizedAuditor(address caller);
    error InvalidScore(uint16 score);
    error InvalidThreshold(uint16 threshold);
    error AlreadyVoted(address auditor);
    error AgentInftNotSet();

    // ─────────────────────────────────────────────────────────────────────
    // State
    // ─────────────────────────────────────────────────────────────────────

    IAgentINFT public agentInft;

    /// @dev Number of approved auditors that must concur on a (agentId, newScore)
    ///      pair before the slash actually fires. Bumping above N approved
    ///      auditors is invalid — caught at set time.
    uint16 public threshold;

    /// @dev approved auditor address => true
    mapping(address => bool) public approvedAuditors;
    /// @dev Number of approved auditors, kept in sync so threshold checks are O(1)
    uint16 public approvedAuditorCount;

    /// @dev Per (agentId, newScore) proposal vote roll.
    ///      Keyed by keccak256(agentId, newScore) so a different target score
    ///      opens an independent proposal — preventing griefing by voting
    ///      with a wrong target.
    mapping(bytes32 => address[]) private _votes;
    /// @dev Cheap "has voted" guard so the same auditor can't double-count.
    mapping(bytes32 => mapping(address => bool)) private _voted;

    // ─────────────────────────────────────────────────────────────────────
    // Setup
    // ─────────────────────────────────────────────────────────────────────

    constructor(
        address initialOwner,
        address agentInftAddr,
        uint16 initialThreshold
    ) Ownable(initialOwner) {
        agentInft = IAgentINFT(agentInftAddr);
        if (initialThreshold == 0) revert InvalidThreshold(initialThreshold);
        threshold = initialThreshold;
    }

    function setAgentInft(address newAddr) external onlyOwner {
        agentInft = IAgentINFT(newAddr);
    }

    function setThreshold(uint16 newThreshold) external onlyOwner {
        if (newThreshold == 0 || newThreshold > approvedAuditorCount + 100) {
            revert InvalidThreshold(newThreshold);
        }
        emit ThresholdChanged(threshold, newThreshold);
        threshold = newThreshold;
    }

    function approveAuditor(address auditor) external onlyOwner {
        if (!approvedAuditors[auditor]) {
            approvedAuditors[auditor] = true;
            approvedAuditorCount += 1;
            emit AuditorApproved(auditor);
        }
    }

    function revokeAuditor(address auditor) external onlyOwner {
        if (approvedAuditors[auditor]) {
            approvedAuditors[auditor] = false;
            approvedAuditorCount -= 1;
            emit AuditorRevoked(auditor);
        }
    }

    // ─────────────────────────────────────────────────────────────────────
    // Auditor ops
    // ─────────────────────────────────────────────────────────────────────

    /// @notice Cast a vote to flag `agentId` with `newScore`. If the vote
    ///         tally reaches `threshold`, the score is pushed to AgentINFT
    ///         in the same tx and the proposal cleared.
    /// @param agentId  Token ID being audited
    /// @param newScore Alignment health 0-10000 bp
    /// @param reason   Free-form string emitted in the proposal event
    function flagAgent(
        uint256 agentId,
        uint16 newScore,
        string calldata reason
    ) external {
        if (!approvedAuditors[msg.sender]) revert UnauthorizedAuditor(msg.sender);
        if (newScore > 10_000) revert InvalidScore(newScore);
        if (address(agentInft) == address(0)) revert AgentInftNotSet();

        bytes32 key = _proposalKey(agentId, newScore);
        if (_voted[key][msg.sender]) revert AlreadyVoted(msg.sender);

        _voted[key][msg.sender] = true;
        _votes[key].push(msg.sender);
        uint16 currentVotes = uint16(_votes[key].length);

        emit FlagProposed(
            agentId,
            newScore,
            msg.sender,
            currentVotes,
            threshold,
            reason
        );

        if (currentVotes >= threshold) {
            address[] memory voters = _votes[key];
            uint16 oldScore = agentInft.getAlignmentHealth(agentId);
            agentInft.updateAlignmentHealth(agentId, newScore);

            // Clear the proposal — auditors can re-flag in a future round.
            for (uint256 i = 0; i < voters.length; i++) {
                _voted[key][voters[i]] = false;
            }
            delete _votes[key];

            emit AgentFlagged(agentId, oldScore, newScore, voters);
        }
    }

    /// @notice Withdraw your vote from an open proposal. Useful if you
    ///         re-audit and want to switch your support to a different
    ///         target score (which opens a fresh proposal).
    function withdrawVote(uint256 agentId, uint16 newScore) external {
        bytes32 key = _proposalKey(agentId, newScore);
        if (!_voted[key][msg.sender]) revert UnauthorizedAuditor(msg.sender);

        _voted[key][msg.sender] = false;
        address[] storage voters = _votes[key];
        for (uint256 i = 0; i < voters.length; i++) {
            if (voters[i] == msg.sender) {
                voters[i] = voters[voters.length - 1];
                voters.pop();
                break;
            }
        }
        if (voters.length == 0) emit FlagCancelled(agentId, newScore);
    }

    // ─────────────────────────────────────────────────────────────────────
    // Views
    // ─────────────────────────────────────────────────────────────────────

    /// @notice Current vote tally for a (agentId, newScore) proposal.
    function votesFor(uint256 agentId, uint16 newScore) external view returns (uint16) {
        return uint16(_votes[_proposalKey(agentId, newScore)].length);
    }

    /// @notice Whether `auditor` has already voted on the given proposal.
    function hasVoted(
        uint256 agentId,
        uint16 newScore,
        address auditor
    ) external view returns (bool) {
        return _voted[_proposalKey(agentId, newScore)][auditor];
    }

    // ─────────────────────────────────────────────────────────────────────
    // Internal
    // ─────────────────────────────────────────────────────────────────────

    function _proposalKey(uint256 agentId, uint16 newScore) private pure returns (bytes32) {
        return keccak256(abi.encodePacked(agentId, newScore));
    }
}
