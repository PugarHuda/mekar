// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IMekarTypes
/// @notice Shared data structures for the MEKAR protocol
/// @dev Centralized types for consistency across contracts
interface IMekarTypes {
    // ─────────────────────────────────────────────────────────────────────
    // Lineage data
    // ─────────────────────────────────────────────────────────────────────

    /// @notice Per-agent lineage information
    /// @param parents Array of parent agent IDs (empty for genesis)
    /// @param generation 0 for genesis, max(parents.gen) + 1 otherwise
    /// @param weightsPointer Reference to encrypted weights on 0G Storage
    /// @param trainingDataMerkle Merkle root of training data hashes
    /// @param teeAttestation Hash of TEE attestation proving training
    /// @param creator Original minter address
    /// @param createdAt Block timestamp at mint
    /// @param alignmentHealth Score 0-10000 bp (10000 = perfect)
    /// @param mode Participation tier (Strict / Voluntary / AuditOnly)
    struct AgentLineage {
        uint256[] parents;
        uint16 generation;
        bytes32 weightsPointer;
        bytes32 trainingDataMerkle;
        bytes32 teeAttestation;
        address creator;
        uint64 createdAt;
        uint16 alignmentHealth;
        ParticipationMode mode;
    }

    /// @notice Royalty distribution schema (basis points = 1/10000)
    /// @dev Sum of generation tiers must equal 10000 (100%)
    struct RoyaltySchema {
        uint16 directOwnerBps;
        uint16 gen1Bps;
        uint16 gen2Bps;
        uint16 gen3PlusBps;
        uint16 trainingDataBps;
        uint16 maxGenerationsPaid;
    }

    /// @notice Inference payment escrow record
    struct PaymentEscrow {
        address payer;
        uint256 agentId;
        uint256 amount;
        uint64 timestamp;
        EscrowStatus status;
    }

    /// @notice Per-agent metadata (mutable, lives in 0G KV)
    struct AgentMetadata {
        string name;
        string description;
        string symbol;
        bytes32 metadataPointer;
    }

    // ─────────────────────────────────────────────────────────────────────
    // Enums
    // ─────────────────────────────────────────────────────────────────────

    /// @notice Three participation modes for agents
    enum ParticipationMode {
        Strict,      // Encrypted weights, forced INFT for forks
        Voluntary,   // Open weights, attribution-based
        AuditOnly    // No royalty, compliance documentation only
    }

    /// @notice Escrow lifecycle states
    enum EscrowStatus {
        None,
        Escrowed,
        Settled,
        Refunded
    }

    /// @notice Composition strategy for multi-parent merge
    enum CompositionStrategy {
        LoraMerge,
        Distillation,
        EnsembleRouting,
        SequentialPipeline
    }
}
