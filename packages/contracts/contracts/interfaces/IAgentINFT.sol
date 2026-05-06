// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {IMekarTypes} from "./IMekarTypes.sol";

/// @title IAgentINFT
/// @notice ERC-7857 inspired Intelligent NFT for AI agents with lineage
/// @dev Extends ERC-721 with encrypted metadata and composition primitives
interface IAgentINFT is IERC721, IMekarTypes {
    // ─────────────────────────────────────────────────────────────────────
    // Events
    // ─────────────────────────────────────────────────────────────────────

    event AgentMinted(
        uint256 indexed tokenId,
        address indexed creator,
        uint256[] parents,
        uint16 generation,
        ParticipationMode mode
    );

    event WeightsRotated(uint256 indexed tokenId, bytes32 oldPointer, bytes32 newPointer);

    event AlignmentHealthUpdated(uint256 indexed tokenId, uint16 oldScore, uint16 newScore);

    event RoyaltySchemaUpdated(uint256 indexed tokenId, RoyaltySchema schema);

    // ─────────────────────────────────────────────────────────────────────
    // Custom errors
    // ─────────────────────────────────────────────────────────────────────

    error InvalidParents();
    error CircularLineage();
    error InvalidTeeAttestation();
    error InsufficientWeightDelta();
    error InvalidRoyaltySchema();
    error UnauthorizedCaller();
    error TokenDoesNotExist(uint256 tokenId);
    error MintingDisabled();
    error TransferLockedDuringChallenge();

    // ─────────────────────────────────────────────────────────────────────
    // Mint flows
    // ─────────────────────────────────────────────────────────────────────

    /// @notice Mint a genesis agent (no parents)
    /// @param weightsPtr Reference to encrypted weights on 0G Storage
    /// @param trainingMerkle Merkle root of training data
    /// @param teeProof TEE attestation hash
    /// @param schema Royalty distribution schema for descendants
    /// @param mode Participation tier
    /// @return tokenId The newly minted agent ID
    function mintGenesis(
        bytes32 weightsPtr,
        bytes32 trainingMerkle,
        bytes32 teeProof,
        RoyaltySchema calldata schema,
        ParticipationMode mode
    ) external returns (uint256 tokenId);

    /// @notice Mint a child agent forked from a single parent
    /// @param parentId The parent INFT to fork
    /// @param weightsPtr New encrypted weights pointer
    /// @param trainingMerkle New training data merkle root
    /// @param teeProof TEE attestation proving training
    /// @return tokenId The newly minted child agent ID
    function mintFork(
        uint256 parentId,
        bytes32 weightsPtr,
        bytes32 trainingMerkle,
        bytes32 teeProof
    ) external returns (uint256 tokenId);

    /// @notice Mint a composed agent from multiple parents
    /// @param parentIds Array of parent INFTs to merge
    /// @param weightsPtr Resulting weights pointer
    /// @param trainingMerkle Training data merkle (if any new training)
    /// @param teeProof TEE attestation
    /// @param strategy Composition strategy used
    function mintCompose(
        uint256[] calldata parentIds,
        bytes32 weightsPtr,
        bytes32 trainingMerkle,
        bytes32 teeProof,
        CompositionStrategy strategy
    ) external returns (uint256 tokenId);

    // ─────────────────────────────────────────────────────────────────────
    // Lineage queries
    // ─────────────────────────────────────────────────────────────────────

    function getLineage(uint256 tokenId) external view returns (AgentLineage memory);

    function getParents(uint256 tokenId) external view returns (uint256[] memory);

    function getGeneration(uint256 tokenId) external view returns (uint16);

    function getRoyaltySchema(uint256 tokenId) external view returns (RoyaltySchema memory);

    function getCreator(uint256 tokenId) external view returns (address);

    function getAlignmentHealth(uint256 tokenId) external view returns (uint16);

    /// @notice Check whether `ancestor` is in the lineage of `descendant`
    /// @dev Walks the parent tree up to MAX_LINEAGE_DEPTH
    function isAncestor(uint256 descendant, uint256 ancestor) external view returns (bool);

    function totalSupply() external view returns (uint256);

    // ─────────────────────────────────────────────────────────────────────
    // Admin / mutator (restricted)
    // ─────────────────────────────────────────────────────────────────────

    /// @notice Update alignment health based on Alignment Node reports
    /// @dev Only callable by AlignmentAuditor contract
    function updateAlignmentHealth(uint256 tokenId, uint16 newScore) external;
}
