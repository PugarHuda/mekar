// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title TrainingDataRegistry
/// @notice Anchors training data Merkle roots + contributor lists for AI agents
/// @dev Lightweight contract — actual data lives off-chain in 0G Specialized Flow.
///      Provides verifiable membership proof for compliance / audit.
contract TrainingDataRegistry is Ownable {
    // ─────────────────────────────────────────────────────────────────────
    // Events
    // ─────────────────────────────────────────────────────────────────────

    event DatasetRegistered(
        bytes32 indexed merkleRoot,
        address indexed registrant,
        uint64 timestamp,
        bytes32 storagePointer
    );

    event ContributorsAdded(bytes32 indexed merkleRoot, address[] contributors, uint16[] sharesBps);

    event AttestationLinked(bytes32 indexed merkleRoot, bytes32 teeAttestation);

    // ─────────────────────────────────────────────────────────────────────
    // Errors
    // ─────────────────────────────────────────────────────────────────────

    error DatasetAlreadyRegistered();
    error DatasetNotFound();
    error ShareSumOverflow();
    error UnauthorizedRegistrant();
    error LengthMismatch();

    // ─────────────────────────────────────────────────────────────────────
    // Storage
    // ─────────────────────────────────────────────────────────────────────

    struct Dataset {
        address registrant;
        uint64 registeredAt;
        bytes32 storagePointer;       // Pointer to encrypted dataset on 0G Storage
        bytes32 teeAttestation;       // TEE attestation of training run
        bool exists;
    }

    /// @dev merkleRoot => Dataset
    mapping(bytes32 => Dataset) private _datasets;

    /// @dev merkleRoot => list of contributor addresses
    mapping(bytes32 => address[]) private _contributors;

    /// @dev merkleRoot => contributor address => shareBps
    mapping(bytes32 => mapping(address => uint16)) private _contributorShares;

    /// @dev creator => list of merkleRoots they registered
    mapping(address => bytes32[]) private _datasetsByCreator;

    bytes32[] private _allDatasets;

    constructor(address initialOwner) Ownable(initialOwner) {}

    // ─────────────────────────────────────────────────────────────────────
    // Registration
    // ─────────────────────────────────────────────────────────────────────

    /// @notice Register a training dataset by its Merkle root
    /// @param merkleRoot Keccak256 root of training data hashes
    /// @param storagePointer 0G Storage location of encrypted dataset
    /// @param teeAttestation TEE attestation hash of training run (optional, can be zero)
    function registerDataset(
        bytes32 merkleRoot,
        bytes32 storagePointer,
        bytes32 teeAttestation
    ) external {
        if (_datasets[merkleRoot].exists) revert DatasetAlreadyRegistered();
        if (merkleRoot == bytes32(0)) revert DatasetNotFound();

        _datasets[merkleRoot] = Dataset({
            registrant: msg.sender,
            registeredAt: uint64(block.timestamp),
            storagePointer: storagePointer,
            teeAttestation: teeAttestation,
            exists: true
        });

        _datasetsByCreator[msg.sender].push(merkleRoot);
        _allDatasets.push(merkleRoot);

        emit DatasetRegistered(merkleRoot, msg.sender, uint64(block.timestamp), storagePointer);

        if (teeAttestation != bytes32(0)) {
            emit AttestationLinked(merkleRoot, teeAttestation);
        }
    }

    /// @notice Add contributors and their share for royalty distribution
    /// @dev Sum of shares must be 10000 (100%)
    function setContributors(
        bytes32 merkleRoot,
        address[] calldata contributors,
        uint16[] calldata sharesBps
    ) external {
        Dataset memory ds = _datasets[merkleRoot];
        if (!ds.exists) revert DatasetNotFound();
        if (ds.registrant != msg.sender) revert UnauthorizedRegistrant();
        if (contributors.length != sharesBps.length) revert LengthMismatch();

        // Validate share sum
        uint256 total = 0;
        for (uint256 i = 0; i < sharesBps.length; i++) {
            total += sharesBps[i];
        }
        if (total != 10_000) revert ShareSumOverflow();

        // Clear old contributors (rare, but safe)
        address[] storage existing = _contributors[merkleRoot];
        for (uint256 i = 0; i < existing.length; i++) {
            delete _contributorShares[merkleRoot][existing[i]];
        }
        delete _contributors[merkleRoot];

        // Set new
        for (uint256 i = 0; i < contributors.length; i++) {
            _contributors[merkleRoot].push(contributors[i]);
            _contributorShares[merkleRoot][contributors[i]] = sharesBps[i];
        }

        emit ContributorsAdded(merkleRoot, contributors, sharesBps);
    }

    /// @notice Link a TEE attestation post-registration (e.g., after async training)
    function linkAttestation(bytes32 merkleRoot, bytes32 teeAttestation) external {
        Dataset storage ds = _datasets[merkleRoot];
        if (!ds.exists) revert DatasetNotFound();
        if (ds.registrant != msg.sender) revert UnauthorizedRegistrant();

        ds.teeAttestation = teeAttestation;
        emit AttestationLinked(merkleRoot, teeAttestation);
    }

    // ─────────────────────────────────────────────────────────────────────
    // Queries
    // ─────────────────────────────────────────────────────────────────────

    function getDataset(bytes32 merkleRoot) external view returns (Dataset memory) {
        if (!_datasets[merkleRoot].exists) revert DatasetNotFound();
        return _datasets[merkleRoot];
    }

    function getContributors(bytes32 merkleRoot) external view returns (address[] memory) {
        return _contributors[merkleRoot];
    }

    function getContributorShare(bytes32 merkleRoot, address contributor)
        external
        view
        returns (uint16)
    {
        return _contributorShares[merkleRoot][contributor];
    }

    function getDatasetsByCreator(address creator) external view returns (bytes32[] memory) {
        return _datasetsByCreator[creator];
    }

    function totalDatasets() external view returns (uint256) {
        return _allDatasets.length;
    }

    function isRegistered(bytes32 merkleRoot) external view returns (bool) {
        return _datasets[merkleRoot].exists;
    }
}
