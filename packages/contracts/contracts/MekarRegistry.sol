// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IMekarRegistry} from "./interfaces/IMekarRegistry.sol";
import {IAgentINFT} from "./interfaces/IAgentINFT.sol";

/// @title MekarRegistry
/// @notice Master directory + lineage graph traversal for the MEKAR protocol
/// @dev Holds references to peer contracts; not the source of truth for INFT
///      ownership (that lives in AgentINFT). Cheap convenience layer for
///      lineage queries used by RoyaltyVault and frontends.
contract MekarRegistry is IMekarRegistry, Ownable {
    // ─────────────────────────────────────────────────────────────────────
    // Constants
    // ─────────────────────────────────────────────────────────────────────

    uint16 public constant MAX_LINEAGE_DEPTH = 50;

    // ─────────────────────────────────────────────────────────────────────
    // Peer contract addresses (updatable by owner)
    // ─────────────────────────────────────────────────────────────────────

    address public override agentInftContract;
    address public override royaltyVaultContract;
    address public override trainingDataRegistry;
    address public override alignmentAuditor;

    // ─────────────────────────────────────────────────────────────────────
    // Indexes
    // ─────────────────────────────────────────────────────────────────────

    /// @dev tokenId => mutable metadata pointer (0G KV)
    mapping(uint256 => bytes32) private _metadataPointers;

    /// @dev creator => list of agent IDs they minted
    mapping(address => uint256[]) private _agentsByCreator;

    /// @dev agent => array of direct descendants (children only, not grandchildren)
    mapping(uint256 => uint256[]) private _descendants;

    /// @dev generation depth => array of agent IDs
    mapping(uint16 => uint256[]) private _agentsByGeneration;

    uint256 private _totalAgents;

    // ─────────────────────────────────────────────────────────────────────
    // Modifiers
    // ─────────────────────────────────────────────────────────────────────

    modifier onlyAgentContract() {
        if (msg.sender != agentInftContract) revert UnauthorizedRegistrant();
        _;
    }

    constructor(address initialOwner) Ownable(initialOwner) {}

    // ─────────────────────────────────────────────────────────────────────
    // Configuration
    // ─────────────────────────────────────────────────────────────────────

    function setAgentInftContract(address newAddr) external onlyOwner {
        agentInftContract = newAddr;
        emit ContractAddressUpdated("AgentINFT", newAddr);
    }

    function setRoyaltyVaultContract(address newAddr) external onlyOwner {
        royaltyVaultContract = newAddr;
        emit ContractAddressUpdated("RoyaltyVault", newAddr);
    }

    function setTrainingDataRegistry(address newAddr) external onlyOwner {
        trainingDataRegistry = newAddr;
        emit ContractAddressUpdated("TrainingDataRegistry", newAddr);
    }

    function setAlignmentAuditor(address newAddr) external onlyOwner {
        alignmentAuditor = newAddr;
        emit ContractAddressUpdated("AlignmentAuditor", newAddr);
    }

    // ─────────────────────────────────────────────────────────────────────
    // Registration (called from AgentINFT after each mint)
    // ─────────────────────────────────────────────────────────────────────

    /// @inheritdoc IMekarRegistry
    function registerAgent(uint256 agentId, address creator) external override onlyAgentContract {
        IAgentINFT.AgentLineage memory lineage = IAgentINFT(agentInftContract).getLineage(agentId);

        _agentsByCreator[creator].push(agentId);
        _agentsByGeneration[lineage.generation].push(agentId);

        // Index parent → descendants
        for (uint256 i = 0; i < lineage.parents.length; i++) {
            _descendants[lineage.parents[i]].push(agentId);
        }

        unchecked {
            _totalAgents++;
        }

        emit AgentRegistered(agentId, creator);
    }

    /// @inheritdoc IMekarRegistry
    function updateMetadata(uint256 agentId, bytes32 metadataPointer) external override {
        if (IAgentINFT(agentInftContract).ownerOf(agentId) != msg.sender) {
            revert UnauthorizedRegistrant();
        }
        _metadataPointers[agentId] = metadataPointer;
        emit MetadataUpdated(agentId, metadataPointer);
    }

    function getMetadataPointer(uint256 agentId) external view returns (bytes32) {
        return _metadataPointers[agentId];
    }

    // ─────────────────────────────────────────────────────────────────────
    // Lineage queries
    // ─────────────────────────────────────────────────────────────────────

    /// @inheritdoc IMekarRegistry
    /// @dev BFS traversal up to maxDepth. Deduplicates ancestors that appear via
    ///      multiple paths (multi-parent compose).
    function getAncestors(uint256 agentId, uint16 maxDepth)
        external
        view
        override
        returns (uint256[] memory)
    {
        if (maxDepth > MAX_LINEAGE_DEPTH) revert LineageDepthExceeded();
        IAgentINFT inft = IAgentINFT(agentInftContract);

        // Allocate worst-case buffer (50 generations × max 10 parents per gen = 500)
        uint256[] memory buffer = new uint256[](500);
        uint256 bufferLen = 0;

        // Track visited to dedupe
        // (Solidity has no Set; use scan within buffer — small N, OK)
        uint256[] memory frontier = inft.getParents(agentId);
        uint16 currentDepth = 1;

        while (frontier.length > 0 && currentDepth <= maxDepth) {
            uint256[] memory nextFrontier = new uint256[](frontier.length * 4);
            uint256 nextLen = 0;

            for (uint256 i = 0; i < frontier.length; i++) {
                uint256 ancestor = frontier[i];

                // Add to buffer if not seen
                bool seen = false;
                for (uint256 j = 0; j < bufferLen; j++) {
                    if (buffer[j] == ancestor) {
                        seen = true;
                        break;
                    }
                }
                if (!seen) {
                    buffer[bufferLen] = ancestor;
                    unchecked {
                        bufferLen++;
                    }

                    // Queue ancestor's parents for next level
                    uint256[] memory grandparents = inft.getParents(ancestor);
                    for (uint256 k = 0; k < grandparents.length; k++) {
                        if (nextLen >= nextFrontier.length) break;
                        nextFrontier[nextLen] = grandparents[k];
                        unchecked {
                            nextLen++;
                        }
                    }
                }
            }

            // Resize next frontier
            uint256[] memory resized = new uint256[](nextLen);
            for (uint256 i = 0; i < nextLen; i++) {
                resized[i] = nextFrontier[i];
            }
            frontier = resized;

            unchecked {
                currentDepth++;
            }
        }

        // Resize result
        uint256[] memory result = new uint256[](bufferLen);
        for (uint256 i = 0; i < bufferLen; i++) {
            result[i] = buffer[i];
        }
        return result;
    }

    /// @inheritdoc IMekarRegistry
    function getDescendants(uint256 agentId) external view override returns (uint256[] memory) {
        return _descendants[agentId];
    }

    /// @inheritdoc IMekarRegistry
    function totalAgents() external view override returns (uint256) {
        return _totalAgents;
    }

    /// @inheritdoc IMekarRegistry
    function getAgentsByCreator(address creator) external view override returns (uint256[] memory) {
        return _agentsByCreator[creator];
    }

    /// @inheritdoc IMekarRegistry
    function getAgentsByGeneration(uint16 generation)
        external
        view
        override
        returns (uint256[] memory)
    {
        return _agentsByGeneration[generation];
    }
}
