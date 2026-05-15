// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title MekarMultisig
/// @notice Minimal k-of-n multisig that can serve as the `owner` of any
///         Ownable Mekar contract. Each Ownable contract (AgentINFT,
///         MekarRegistry, RoyaltyVault, etc.) is constructor-owned by an
///         EOA today; transferring ownership to a deployed instance of
///         this multisig hardens the protocol against a single key being
///         compromised.
/// @dev Workflow:
///        1. Signer A calls `propose(target, value, data, description)`.
///           Proposal #N opens, votes = [A].
///        2. Other signers call `confirm(N)` until votes.length >= threshold.
///        3. Any signer calls `execute(N)` to run the proposed call.
///
///      Signers can `revoke(N)` to withdraw their vote before execution.
///      Threshold + signer set are themselves modifiable, but ONLY via a
///      proposal that targets this contract — no admin backdoor.
///
///      NOT deployed for the live demo (would require manual ownership
///      transfer of 5 existing contracts and break the demo's "deployer
///      signs everything" UX). Shipped as production-ready reference,
///      with full forge coverage.
contract MekarMultisig {
    // ─────────────────────────────────────────────────────────────────────
    // Events
    // ─────────────────────────────────────────────────────────────────────

    event SignerAdded(address indexed signer);
    event SignerRemoved(address indexed signer);
    event ThresholdChanged(uint256 oldThreshold, uint256 newThreshold);
    event Proposed(
        uint256 indexed id,
        address indexed proposer,
        address target,
        uint256 value,
        bytes data,
        string description
    );
    event Confirmed(uint256 indexed id, address indexed signer);
    event Revoked(uint256 indexed id, address indexed signer);
    event Executed(uint256 indexed id, bytes returndata);
    event ExecutionFailed(uint256 indexed id, bytes returndata);

    // ─────────────────────────────────────────────────────────────────────
    // Errors
    // ─────────────────────────────────────────────────────────────────────

    error NotSigner(address caller);
    error DuplicateSigner(address signer);
    error UnknownSigner(address signer);
    error InvalidThreshold(uint256 threshold);
    error UnknownProposal(uint256 id);
    error AlreadyExecuted(uint256 id);
    error AlreadyConfirmed(address signer);
    error NotConfirmed(address signer);
    error InsufficientConfirmations(uint256 have, uint256 need);
    error OnlySelf();
    error CallFailed(bytes returndata);

    // ─────────────────────────────────────────────────────────────────────
    // State
    // ─────────────────────────────────────────────────────────────────────

    struct Proposal {
        address target;
        uint256 value;
        bytes data;
        string description;
        bool executed;
        address[] confirmers;
        mapping(address => bool) confirmed;
    }

    mapping(address => bool) public isSigner;
    address[] private _signers;
    uint256 public threshold;
    uint256 public proposalCount;

    mapping(uint256 => Proposal) private _proposals;

    modifier onlySigner() {
        if (!isSigner[msg.sender]) revert NotSigner(msg.sender);
        _;
    }

    /// @dev Mutating signer-set / threshold can only happen through a
    ///      successful proposal — i.e. msg.sender of those calls IS this
    ///      contract. Enforces "no admin backdoor".
    modifier onlySelf() {
        if (msg.sender != address(this)) revert OnlySelf();
        _;
    }

    constructor(address[] memory initialSigners, uint256 initialThreshold) {
        if (initialThreshold == 0 || initialThreshold > initialSigners.length) {
            revert InvalidThreshold(initialThreshold);
        }
        for (uint256 i = 0; i < initialSigners.length; i++) {
            address s = initialSigners[i];
            if (s == address(0) || isSigner[s]) revert DuplicateSigner(s);
            isSigner[s] = true;
            _signers.push(s);
            emit SignerAdded(s);
        }
        threshold = initialThreshold;
        emit ThresholdChanged(0, initialThreshold);
    }

    // ─────────────────────────────────────────────────────────────────────
    // Receive — required to hold + forward value
    // ─────────────────────────────────────────────────────────────────────

    receive() external payable {}

    // ─────────────────────────────────────────────────────────────────────
    // Self-administered governance
    // ─────────────────────────────────────────────────────────────────────

    function addSigner(address newSigner) external onlySelf {
        if (newSigner == address(0) || isSigner[newSigner]) {
            revert DuplicateSigner(newSigner);
        }
        isSigner[newSigner] = true;
        _signers.push(newSigner);
        emit SignerAdded(newSigner);
    }

    function removeSigner(address oldSigner) external onlySelf {
        if (!isSigner[oldSigner]) revert UnknownSigner(oldSigner);
        // After removal, threshold must still fit the new signer count.
        if (_signers.length - 1 < threshold) {
            revert InvalidThreshold(threshold);
        }
        isSigner[oldSigner] = false;
        for (uint256 i = 0; i < _signers.length; i++) {
            if (_signers[i] == oldSigner) {
                _signers[i] = _signers[_signers.length - 1];
                _signers.pop();
                break;
            }
        }
        emit SignerRemoved(oldSigner);
    }

    function setThreshold(uint256 newThreshold) external onlySelf {
        if (newThreshold == 0 || newThreshold > _signers.length) {
            revert InvalidThreshold(newThreshold);
        }
        emit ThresholdChanged(threshold, newThreshold);
        threshold = newThreshold;
    }

    // ─────────────────────────────────────────────────────────────────────
    // Proposal lifecycle
    // ─────────────────────────────────────────────────────────────────────

    function propose(
        address target,
        uint256 value,
        bytes calldata data,
        string calldata description
    ) external onlySigner returns (uint256 id) {
        id = ++proposalCount;
        Proposal storage p = _proposals[id];
        p.target = target;
        p.value = value;
        p.data = data;
        p.description = description;
        // Proposer auto-confirms — saves a confirm tx.
        p.confirmers.push(msg.sender);
        p.confirmed[msg.sender] = true;
        emit Proposed(id, msg.sender, target, value, data, description);
        emit Confirmed(id, msg.sender);
    }

    function confirm(uint256 id) external onlySigner {
        Proposal storage p = _proposals[id];
        if (p.target == address(0)) revert UnknownProposal(id);
        if (p.executed) revert AlreadyExecuted(id);
        if (p.confirmed[msg.sender]) revert AlreadyConfirmed(msg.sender);
        p.confirmed[msg.sender] = true;
        p.confirmers.push(msg.sender);
        emit Confirmed(id, msg.sender);
    }

    function revoke(uint256 id) external onlySigner {
        Proposal storage p = _proposals[id];
        if (p.target == address(0)) revert UnknownProposal(id);
        if (p.executed) revert AlreadyExecuted(id);
        if (!p.confirmed[msg.sender]) revert NotConfirmed(msg.sender);
        p.confirmed[msg.sender] = false;
        // Swap-and-pop from confirmers array.
        for (uint256 i = 0; i < p.confirmers.length; i++) {
            if (p.confirmers[i] == msg.sender) {
                p.confirmers[i] = p.confirmers[p.confirmers.length - 1];
                p.confirmers.pop();
                break;
            }
        }
        emit Revoked(id, msg.sender);
    }

    function execute(uint256 id) external onlySigner {
        Proposal storage p = _proposals[id];
        if (p.target == address(0)) revert UnknownProposal(id);
        if (p.executed) revert AlreadyExecuted(id);
        // We snapshot the current confirmer count vs threshold here so
        // a confirmation in the same block can satisfy it.
        if (p.confirmers.length < threshold) {
            revert InsufficientConfirmations(p.confirmers.length, threshold);
        }
        p.executed = true;

        (bool ok, bytes memory returndata) = p.target.call{value: p.value}(p.data);
        if (!ok) {
            // Revert with the inner reason so callers see the real failure
            emit ExecutionFailed(id, returndata);
            revert CallFailed(returndata);
        }
        emit Executed(id, returndata);
    }

    // ─────────────────────────────────────────────────────────────────────
    // Views
    // ─────────────────────────────────────────────────────────────────────

    function signers() external view returns (address[] memory) {
        return _signers;
    }

    function confirmersOf(uint256 id) external view returns (address[] memory) {
        return _proposals[id].confirmers;
    }

    function proposalDetails(uint256 id)
        external
        view
        returns (
            address target,
            uint256 value,
            bytes memory data,
            string memory description,
            bool executed,
            uint256 confirmationsCount
        )
    {
        Proposal storage p = _proposals[id];
        return (p.target, p.value, p.data, p.description, p.executed, p.confirmers.length);
    }

    function isConfirmed(uint256 id, address signer) external view returns (bool) {
        return _proposals[id].confirmed[signer];
    }
}
