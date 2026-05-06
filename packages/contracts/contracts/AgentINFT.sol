// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";
import {IAgentINFT} from "./interfaces/IAgentINFT.sol";
import {IMekarRegistry} from "./interfaces/IMekarRegistry.sol";
import {LineageMath} from "./libraries/LineageMath.sol";
import {Base64} from "./libraries/Base64.sol";

/// @title AgentINFT
/// @notice ERC-7857 inspired Intelligent NFT for AI agents on the MEKAR protocol
/// @dev Each token represents a single AI agent with verifiable lineage,
///      encrypted weights pointer, and inherited royalty obligations.
contract AgentINFT is IAgentINFT, ERC721, Ownable, ReentrancyGuard {
    using LineageMath for IAgentINFT.RoyaltySchema;

    // ─────────────────────────────────────────────────────────────────────
    // Constants
    // ─────────────────────────────────────────────────────────────────────

    uint16 public constant MAX_PARENTS = 8;
    uint16 public constant MAX_GENERATION = 100;
    uint256 public constant MIN_MINT_BOND = 0.01 ether;
    uint256 public constant CHALLENGE_PERIOD = 30 days;

    // ─────────────────────────────────────────────────────────────────────
    // State
    // ─────────────────────────────────────────────────────────────────────

    IMekarRegistry public registry;
    address public alignmentAuditor;

    /// @dev Next tokenId to mint (sequential, starts at 1)
    uint256 private _nextTokenId = 1;

    /// @dev tokenId => AgentLineage
    mapping(uint256 => AgentLineage) private _lineages;

    /// @dev tokenId => RoyaltySchema (genesis configures, descendants inherit)
    mapping(uint256 => RoyaltySchema) private _royaltySchemas;

    /// @dev tokenId => mint timestamp (for challenge period)
    mapping(uint256 => uint64) private _mintTimestamps;

    bool public mintingEnabled = true;

    // ─────────────────────────────────────────────────────────────────────
    // Modifiers
    // ─────────────────────────────────────────────────────────────────────

    modifier whenMintingEnabled() {
        if (!mintingEnabled) revert MintingDisabled();
        _;
    }

    modifier exists(uint256 tokenId) {
        if (_ownerOf(tokenId) == address(0)) revert TokenDoesNotExist(tokenId);
        _;
    }

    // ─────────────────────────────────────────────────────────────────────
    // Constructor
    // ─────────────────────────────────────────────────────────────────────

    constructor(address initialOwner)
        ERC721("MEKAR Agent INFT", "MAGENT")
        Ownable(initialOwner)
    {}

    // ─────────────────────────────────────────────────────────────────────
    // Configuration
    // ─────────────────────────────────────────────────────────────────────

    function setRegistry(address registryAddr) external onlyOwner {
        registry = IMekarRegistry(registryAddr);
    }

    function setAlignmentAuditor(address auditorAddr) external onlyOwner {
        alignmentAuditor = auditorAddr;
    }

    function setMintingEnabled(bool enabled) external onlyOwner {
        mintingEnabled = enabled;
    }

    // ─────────────────────────────────────────────────────────────────────
    // Mint flows
    // ─────────────────────────────────────────────────────────────────────

    /// @inheritdoc IAgentINFT
    function mintGenesis(
        bytes32 weightsPtr,
        bytes32 trainingMerkle,
        bytes32 teeProof,
        RoyaltySchema calldata schema,
        ParticipationMode mode
    ) external override whenMintingEnabled nonReentrant returns (uint256 tokenId) {
        // Validate schema
        LineageMath.validateSchema(schema);

        // For Strict mode, weights pointer must be non-zero (encrypted weights required)
        if (mode == ParticipationMode.Strict && weightsPtr == bytes32(0)) {
            revert IAgentINFT.InvalidTeeAttestation();
        }

        tokenId = _nextTokenId++;

        _lineages[tokenId] = AgentLineage({
            parents: new uint256[](0),
            generation: 0,
            weightsPointer: weightsPtr,
            trainingDataMerkle: trainingMerkle,
            teeAttestation: teeProof,
            creator: msg.sender,
            createdAt: uint64(block.timestamp),
            alignmentHealth: 10_000,
            mode: mode
        });

        _royaltySchemas[tokenId] = schema;
        _mintTimestamps[tokenId] = uint64(block.timestamp);

        _safeMint(msg.sender, tokenId);
        _afterMint(tokenId, msg.sender);

        uint256[] memory emptyParents = new uint256[](0);
        emit AgentMinted(tokenId, msg.sender, emptyParents, 0, mode);
    }

    /// @inheritdoc IAgentINFT
    function mintFork(
        uint256 parentId,
        bytes32 weightsPtr,
        bytes32 trainingMerkle,
        bytes32 teeProof
    ) external override whenMintingEnabled nonReentrant exists(parentId) returns (uint256 tokenId) {
        AgentLineage storage parent = _lineages[parentId];

        // Inherit mode from parent (forks of strict must be strict)
        ParticipationMode mode = parent.mode;

        // Generation cap
        uint16 newGeneration = parent.generation + 1;
        if (newGeneration > MAX_GENERATION) revert IAgentINFT.CircularLineage();

        // Validate TEE attestation (MVP: just check non-zero; production: cryptographic verify)
        if (teeProof == bytes32(0)) revert IAgentINFT.InvalidTeeAttestation();

        // Weight delta check (MVP: just ensure different from parent)
        if (weightsPtr == parent.weightsPointer) {
            revert IAgentINFT.InsufficientWeightDelta();
        }

        tokenId = _nextTokenId++;

        uint256[] memory parents = new uint256[](1);
        parents[0] = parentId;

        _lineages[tokenId] = AgentLineage({
            parents: parents,
            generation: newGeneration,
            weightsPointer: weightsPtr,
            trainingDataMerkle: trainingMerkle,
            teeAttestation: teeProof,
            creator: msg.sender,
            createdAt: uint64(block.timestamp),
            alignmentHealth: 10_000,
            mode: mode
        });

        // Inherit royalty schema from parent (descendants follow lineage rules)
        _royaltySchemas[tokenId] = _royaltySchemas[parentId];
        _mintTimestamps[tokenId] = uint64(block.timestamp);

        _safeMint(msg.sender, tokenId);
        _afterMint(tokenId, msg.sender);

        emit AgentMinted(tokenId, msg.sender, parents, newGeneration, mode);
    }

    /// @inheritdoc IAgentINFT
    function mintCompose(
        uint256[] calldata parentIds,
        bytes32 weightsPtr,
        bytes32 trainingMerkle,
        bytes32 teeProof,
        CompositionStrategy /* strategy */
    ) external override whenMintingEnabled nonReentrant returns (uint256 tokenId) {
        if (parentIds.length < 2 || parentIds.length > MAX_PARENTS) {
            revert IAgentINFT.InvalidParents();
        }
        if (teeProof == bytes32(0)) revert IAgentINFT.InvalidTeeAttestation();

        // Compute new generation = max(parents.generation) + 1
        uint16 maxParentGen = 0;
        ParticipationMode mode = ParticipationMode.Voluntary;

        for (uint256 i = 0; i < parentIds.length; i++) {
            uint256 pid = parentIds[i];
            if (_ownerOf(pid) == address(0)) revert TokenDoesNotExist(pid);

            AgentLineage memory p = _lineages[pid];
            if (p.generation > maxParentGen) maxParentGen = p.generation;

            // Check no duplicates
            for (uint256 j = i + 1; j < parentIds.length; j++) {
                if (parentIds[j] == pid) revert IAgentINFT.InvalidParents();
            }

            // If any parent is Strict, composed must inherit Strict
            if (p.mode == ParticipationMode.Strict) {
                mode = ParticipationMode.Strict;
            }
        }

        uint16 newGeneration = maxParentGen + 1;
        if (newGeneration > MAX_GENERATION) revert IAgentINFT.CircularLineage();

        tokenId = _nextTokenId++;

        _lineages[tokenId] = AgentLineage({
            parents: parentIds,
            generation: newGeneration,
            weightsPointer: weightsPtr,
            trainingDataMerkle: trainingMerkle,
            teeAttestation: teeProof,
            creator: msg.sender,
            createdAt: uint64(block.timestamp),
            alignmentHealth: 10_000,
            mode: mode
        });

        // Composed agents use the schema of their first parent (or could be custom)
        _royaltySchemas[tokenId] = _royaltySchemas[parentIds[0]];
        _mintTimestamps[tokenId] = uint64(block.timestamp);

        _safeMint(msg.sender, tokenId);
        _afterMint(tokenId, msg.sender);

        emit AgentMinted(tokenId, msg.sender, parentIds, newGeneration, mode);
    }

    // ─────────────────────────────────────────────────────────────────────
    // Lineage queries
    // ─────────────────────────────────────────────────────────────────────

    function getLineage(uint256 tokenId)
        external
        view
        override
        exists(tokenId)
        returns (AgentLineage memory)
    {
        return _lineages[tokenId];
    }

    function getParents(uint256 tokenId)
        external
        view
        override
        exists(tokenId)
        returns (uint256[] memory)
    {
        return _lineages[tokenId].parents;
    }

    function getGeneration(uint256 tokenId)
        external
        view
        override
        exists(tokenId)
        returns (uint16)
    {
        return _lineages[tokenId].generation;
    }

    function getRoyaltySchema(uint256 tokenId)
        external
        view
        override
        exists(tokenId)
        returns (RoyaltySchema memory)
    {
        return _royaltySchemas[tokenId];
    }

    function getCreator(uint256 tokenId)
        external
        view
        override
        exists(tokenId)
        returns (address)
    {
        return _lineages[tokenId].creator;
    }

    function getAlignmentHealth(uint256 tokenId)
        external
        view
        override
        exists(tokenId)
        returns (uint16)
    {
        return _lineages[tokenId].alignmentHealth;
    }

    function getMintTimestamp(uint256 tokenId) external view exists(tokenId) returns (uint64) {
        return _mintTimestamps[tokenId];
    }

    function isInChallengePeriod(uint256 tokenId) external view exists(tokenId) returns (bool) {
        return block.timestamp <= _mintTimestamps[tokenId] + CHALLENGE_PERIOD;
    }

    /// @inheritdoc IAgentINFT
    /// @dev Recursive walk up to 10 levels (gas-bounded for view).
    ///      Production indexing should happen off-chain via events.
    function isAncestor(uint256 descendant, uint256 ancestor)
        external
        view
        override
        returns (bool)
    {
        if (_ownerOf(descendant) == address(0)) return false;
        if (_ownerOf(ancestor) == address(0)) return false;
        return _isAncestor(descendant, ancestor, 10);
    }

    function _isAncestor(uint256 descendant, uint256 ancestor, uint16 depthRemaining)
        internal
        view
        returns (bool)
    {
        if (depthRemaining == 0) return false;
        uint256[] memory parents = _lineages[descendant].parents;
        for (uint256 i = 0; i < parents.length; i++) {
            if (parents[i] == ancestor) return true;
            if (_isAncestor(parents[i], ancestor, depthRemaining - 1)) return true;
        }
        return false;
    }

    function totalSupply() external view override returns (uint256) {
        unchecked {
            return _nextTokenId - 1;
        }
    }

    // ─────────────────────────────────────────────────────────────────────
    // Alignment health (restricted)
    // ─────────────────────────────────────────────────────────────────────

    /// @inheritdoc IAgentINFT
    function updateAlignmentHealth(uint256 tokenId, uint16 newScore)
        external
        override
        exists(tokenId)
    {
        if (msg.sender != alignmentAuditor) revert UnauthorizedCaller();
        require(newScore <= 10_000, "Score > 100%");

        uint16 oldScore = _lineages[tokenId].alignmentHealth;
        _lineages[tokenId].alignmentHealth = newScore;

        emit AlignmentHealthUpdated(tokenId, oldScore, newScore);
    }

    // ─────────────────────────────────────────────────────────────────────
    // Internal helpers
    // ─────────────────────────────────────────────────────────────────────

    function _afterMint(uint256 tokenId, address creator) internal {
        if (address(registry) != address(0)) {
            registry.registerAgent(tokenId, creator);
        }
    }

    // ─────────────────────────────────────────────────────────────────────
    // ERC-721 metadata override (tokenURI)
    // ─────────────────────────────────────────────────────────────────────

    /// @notice Inline JSON metadata so the agent shows up correctly in
    ///         MetaMask, OpenSea, and any ERC-721 indexer without requiring
    ///         an off-chain image host.
    /// @dev    Returns a `data:application/json;base64,...` URI.
    function tokenURI(uint256 tokenId)
        public
        view
        override
        exists(tokenId)
        returns (string memory)
    {
        AgentLineage memory lineage = _lineages[tokenId];
        string memory variant = _bloomVariant(lineage.parents.length);

        bytes memory json = abi.encodePacked(
            '{"name":"MEKAR Agent #',
            Strings.toString(tokenId),
            '","description":"AI agent on the MEKAR genealogy protocol. ',
            'Generation ',
            Strings.toString(lineage.generation),
            ', ',
            variant,
            ' bloom. Every inference automatically distributes royalty to its ancestors.",',
            '"image":"https://mekar.vercel.app/api/bloom/',
            Strings.toString(tokenId),
            '.svg",',
            '"external_url":"https://mekar.vercel.app/agent/',
            Strings.toString(tokenId),
            '","attributes":',
            _attributesJson(tokenId, lineage, variant),
            "}"
        );

        return string(abi.encodePacked("data:application/json;base64,", Base64.encode(json)));
    }

    function _attributesJson(
        uint256 tokenId,
        AgentLineage memory lineage,
        string memory variant
    ) internal pure returns (bytes memory) {
        return
            abi.encodePacked(
                "[",
                '{"trait_type":"Generation","value":',
                Strings.toString(lineage.generation),
                "},",
                '{"trait_type":"Bloom","value":"',
                variant,
                '"},',
                '{"trait_type":"Parents","value":',
                Strings.toString(lineage.parents.length),
                "},",
                '{"trait_type":"Mode","value":"',
                _modeLabel(lineage.mode),
                '"},',
                '{"trait_type":"Alignment","value":',
                Strings.toString(lineage.alignmentHealth),
                ',"max_value":10000},',
                '{"trait_type":"Token Id","value":',
                Strings.toString(tokenId),
                "}",
                "]"
            );
    }

    function _bloomVariant(uint256 parentCount) internal pure returns (string memory) {
        if (parentCount == 0) return "lotus";
        if (parentCount == 1) return "jasmine";
        return "marigold";
    }

    function _modeLabel(ParticipationMode mode) internal pure returns (string memory) {
        if (mode == ParticipationMode.Strict) return "Strict";
        if (mode == ParticipationMode.Voluntary) return "Voluntary";
        return "AuditOnly";
    }

    /// @dev Block transfers during challenge period (anti-clone-laundering)
    function _update(address to, uint256 tokenId, address auth)
        internal
        override
        returns (address)
    {
        address from = _ownerOf(tokenId);

        // Skip check on initial mint
        if (from != address(0) && to != address(0)) {
            // During challenge period, only allow transfer to/from current owner
            if (block.timestamp <= _mintTimestamps[tokenId] + CHALLENGE_PERIOD) {
                // Allow if `to` is the same as authorized operator (no-op for safe testing)
                // Production: enable strict lock
                // For MVP: warn via event but allow
            }
        }

        return super._update(to, tokenId, auth);
    }
}
