// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IMekarTypes} from "./IMekarTypes.sol";

/// @title IRoyaltyVault
/// @notice Receives inference fees, distributes royalty per lineage tree
interface IRoyaltyVault is IMekarTypes {
    // ─────────────────────────────────────────────────────────────────────
    // Events
    // ─────────────────────────────────────────────────────────────────────

    event InferenceRequested(
        bytes32 indexed requestId,
        uint256 indexed agentId,
        address indexed payer,
        uint256 amount
    );

    event InferenceSettled(
        bytes32 indexed requestId,
        uint256 indexed agentId,
        address provider,
        uint256 totalDistributed
    );

    event RoyaltyPaid(
        uint256 indexed agentId,
        address indexed recipient,
        uint16 generation,
        uint256 amount
    );

    event ProtocolFeeCollected(uint256 indexed agentId, uint256 amount);
    event ComputeProviderPaid(address indexed provider, uint256 amount);
    event PaymentRefunded(bytes32 indexed requestId, address payer, uint256 amount);

    // ─────────────────────────────────────────────────────────────────────
    // Errors
    // ─────────────────────────────────────────────────────────────────────

    error InvalidEscrowState();
    error InsufficientPayment(uint256 required, uint256 sent);
    error InvalidTeeAttestation();
    error UnregisteredProvider(address provider);
    error EscrowNotTimedOut();
    error AgentNotActive(uint256 agentId);

    // ─────────────────────────────────────────────────────────────────────
    // Inference payment flow
    // ─────────────────────────────────────────────────────────────────────

    /// @notice User pays for inference, escrows fee
    /// @param agentId The INFT agent being invoked
    /// @return requestId Unique identifier for the inference request
    function payInference(uint256 agentId) external payable returns (bytes32 requestId);

    /// @notice Compute provider settles after inference completes
    /// @dev Triggers atomic royalty distribution to all ancestors
    function settleInference(
        bytes32 requestId,
        bytes32 outputHash,
        bytes calldata teeAttestation
    ) external;

    /// @notice Refund payment if provider doesn't settle within timeout
    function refundIfTimeout(bytes32 requestId) external;

    // ─────────────────────────────────────────────────────────────────────
    // Provider registry
    // ─────────────────────────────────────────────────────────────────────

    function registerProvider(address provider, uint256 stake) external payable;
    function unregisterProvider() external;
    function isRegisteredProvider(address provider) external view returns (bool);

    // ─────────────────────────────────────────────────────────────────────
    // Pricing
    // ─────────────────────────────────────────────────────────────────────

    /// @notice Get inference price for an agent
    /// @dev Includes base price + protocol fee + compute provider fee
    function getInferencePrice(uint256 agentId) external view returns (uint256);

    function setBasePrice(uint256 agentId, uint256 newPrice) external;
}
