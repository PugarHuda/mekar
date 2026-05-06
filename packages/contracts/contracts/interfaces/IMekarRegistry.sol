// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IMekarTypes} from "./IMekarTypes.sol";

/// @title IMekarRegistry
/// @notice Master registry providing convenience lookups across the MEKAR protocol
interface IMekarRegistry is IMekarTypes {
    // ─────────────────────────────────────────────────────────────────────
    // Events
    // ─────────────────────────────────────────────────────────────────────

    event AgentRegistered(uint256 indexed agentId, address indexed creator);
    event MetadataUpdated(uint256 indexed agentId, bytes32 metadataPointer);
    event ContractAddressUpdated(string indexed key, address newAddress);

    // ─────────────────────────────────────────────────────────────────────
    // Errors
    // ─────────────────────────────────────────────────────────────────────

    error AgentNotFound(uint256 agentId);
    error UnauthorizedRegistrant();
    error LineageDepthExceeded();

    // ─────────────────────────────────────────────────────────────────────
    // Registration (called by AgentINFT)
    // ─────────────────────────────────────────────────────────────────────

    /// @notice Register a newly-minted agent into the global index
    /// @dev Only callable by AgentINFT contract
    function registerAgent(uint256 agentId, address creator) external;

    /// @notice Update an agent's mutable metadata pointer (0G KV)
    /// @dev Only callable by current owner
    function updateMetadata(uint256 agentId, bytes32 metadataPointer) external;

    // ─────────────────────────────────────────────────────────────────────
    // Lineage queries
    // ─────────────────────────────────────────────────────────────────────

    /// @notice Get the full ancestor list for an agent (BFS up to maxDepth)
    /// @dev Returns deduplicated list of unique ancestor IDs
    function getAncestors(uint256 agentId, uint16 maxDepth) external view returns (uint256[] memory);

    /// @notice Get all direct descendants of an agent
    function getDescendants(uint256 agentId) external view returns (uint256[] memory);

    /// @notice Total number of registered agents
    function totalAgents() external view returns (uint256);

    /// @notice Get all agents created by an address
    function getAgentsByCreator(address creator) external view returns (uint256[] memory);

    /// @notice Get all agents at a specific generation depth
    function getAgentsByGeneration(uint16 generation) external view returns (uint256[] memory);

    // ─────────────────────────────────────────────────────────────────────
    // Contract resolution
    // ─────────────────────────────────────────────────────────────────────

    function agentInftContract() external view returns (address);
    function royaltyVaultContract() external view returns (address);
    function trainingDataRegistry() external view returns (address);
    function alignmentAuditor() external view returns (address);
}
