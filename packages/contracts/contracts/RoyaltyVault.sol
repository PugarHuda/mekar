// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IRoyaltyVault} from "./interfaces/IRoyaltyVault.sol";
import {IAgentINFT} from "./interfaces/IAgentINFT.sol";
import {IMekarRegistry} from "./interfaces/IMekarRegistry.sol";
import {IMekarTypes} from "./interfaces/IMekarTypes.sol";
import {LineageMath} from "./libraries/LineageMath.sol";
import {TrainingDataRegistry} from "./TrainingDataRegistry.sol";

/// @title RoyaltyVault
/// @notice Receives inference fees, distributes royalty atomically across the lineage tree
/// @dev Implements escrow + distribution in one contract to keep MVP simple.
///      Production version may split escrow / settlement / distribution.
contract RoyaltyVault is IRoyaltyVault, Ownable, ReentrancyGuard {
    using LineageMath for IMekarTypes.RoyaltySchema;

    // ─────────────────────────────────────────────────────────────────────
    // Constants
    // ─────────────────────────────────────────────────────────────────────

    uint16 public constant COMPUTE_PROVIDER_BPS = 1_000;   // 10% on top of fee
    uint16 public constant PROTOCOL_FEE_BPS = 1_000;       // 10% on top of fee
    uint64 public constant ESCROW_TIMEOUT = 1 hours;
    /// @dev Lowered from 0.1 OG to 0.001 OG for hackathon demo on Galileo
    ///      where faucet drips are scarce. Production should restore higher
    ///      stake to make slashing economically meaningful.
    uint256 public constant MIN_PROVIDER_STAKE = 0.001 ether;
    /// @dev Hard cap on how many generations the distributor will walk per call.
    ///      Schemas with maxGenerationsPaid > MAX_LINEAGE_DEPTH are silently
    ///      truncated to this value to bound gas usage. Royalty intended for
    ///      ancestors beyond this cap routes to the protocol treasury via the
    ///      same fallback path used for burned-ancestor revenue.
    uint16 public constant MAX_LINEAGE_DEPTH = 10;

    // ─────────────────────────────────────────────────────────────────────
    // Peer contracts
    // ─────────────────────────────────────────────────────────────────────

    IAgentINFT public immutable agentInft;
    IMekarRegistry public immutable registry;
    TrainingDataRegistry public immutable trainingRegistry;

    // ─────────────────────────────────────────────────────────────────────
    // State
    // ─────────────────────────────────────────────────────────────────────

    /// @dev tokenId => base inference price (excluding fees)
    mapping(uint256 => uint256) public basePrice;

    /// @dev requestId => PaymentEscrow
    mapping(bytes32 => PaymentEscrow) private _escrows;

    /// @dev provider address => stake amount
    mapping(address => uint256) public providerStake;

    /// @dev nonce per payer to ensure unique requestIds
    mapping(address => uint256) private _payerNonce;

    /// @dev Default base price for agents that haven't set custom price
    uint256 public defaultBasePrice = 0.001 ether; // 0.001 $0G per inference

    /// @dev Accumulated protocol fees withdrawable by owner
    uint256 public protocolFeesAccrued;

    // ─────────────────────────────────────────────────────────────────────
    // Modifiers
    // ─────────────────────────────────────────────────────────────────────

    modifier onlyAgentExists(uint256 agentId) {
        // Will revert with TokenDoesNotExist via getLineage
        agentInft.getLineage(agentId);
        _;
    }

    modifier onlyRegisteredProvider() {
        if (providerStake[msg.sender] < MIN_PROVIDER_STAKE) {
            revert UnregisteredProvider(msg.sender);
        }
        _;
    }

    // ─────────────────────────────────────────────────────────────────────
    // Constructor
    // ─────────────────────────────────────────────────────────────────────

    constructor(
        address initialOwner,
        address agentInftAddr,
        address registryAddr,
        address trainingRegistryAddr
    ) Ownable(initialOwner) {
        agentInft = IAgentINFT(agentInftAddr);
        registry = IMekarRegistry(registryAddr);
        trainingRegistry = TrainingDataRegistry(trainingRegistryAddr);
    }

    // ─────────────────────────────────────────────────────────────────────
    // Pricing
    // ─────────────────────────────────────────────────────────────────────

    /// @inheritdoc IRoyaltyVault
    function getInferencePrice(uint256 agentId) public view override returns (uint256) {
        uint256 base = basePrice[agentId];
        if (base == 0) base = defaultBasePrice;

        // Total = base + protocol fee + provider fee
        uint256 protocolFee = (base * PROTOCOL_FEE_BPS) / LineageMath.BPS_DENOMINATOR;
        uint256 providerFee = (base * COMPUTE_PROVIDER_BPS) / LineageMath.BPS_DENOMINATOR;
        return base + protocolFee + providerFee;
    }

    error NotAgentOwner(uint256 agentId, address caller);

    /// @inheritdoc IRoyaltyVault
    function setBasePrice(uint256 agentId, uint256 newPrice) external override {
        if (agentInft.ownerOf(agentId) != msg.sender) revert NotAgentOwner(agentId, msg.sender);
        basePrice[agentId] = newPrice;
    }

    function setDefaultBasePrice(uint256 newDefault) external onlyOwner {
        defaultBasePrice = newDefault;
    }

    // ─────────────────────────────────────────────────────────────────────
    // Provider registry
    // ─────────────────────────────────────────────────────────────────────

    /// @inheritdoc IRoyaltyVault
    function registerProvider(address provider, uint256 /* stake */)
        external
        payable
        override
    {
        require(msg.value >= MIN_PROVIDER_STAKE, "Insufficient stake");
        require(provider == msg.sender, "Self-register only");
        providerStake[provider] += msg.value;
    }

    /// @inheritdoc IRoyaltyVault
    function unregisterProvider() external override nonReentrant {
        uint256 stake = providerStake[msg.sender];
        require(stake > 0, "Not registered");
        providerStake[msg.sender] = 0;

        (bool ok, ) = payable(msg.sender).call{value: stake}("");
        require(ok, "Refund failed");
    }

    /// @inheritdoc IRoyaltyVault
    function isRegisteredProvider(address provider) external view override returns (bool) {
        return providerStake[provider] >= MIN_PROVIDER_STAKE;
    }

    // ─────────────────────────────────────────────────────────────────────
    // Inference flow
    // ─────────────────────────────────────────────────────────────────────

    /// @inheritdoc IRoyaltyVault
    function payInference(uint256 agentId)
        external
        payable
        override
        nonReentrant
        onlyAgentExists(agentId)
        returns (bytes32 requestId)
    {
        uint256 price = getInferencePrice(agentId);
        if (msg.value < price) revert InsufficientPayment(price, msg.value);

        // Generate unique request ID
        unchecked {
            _payerNonce[msg.sender]++;
        }
        requestId = keccak256(
            abi.encode(msg.sender, agentId, block.timestamp, _payerNonce[msg.sender])
        );

        _escrows[requestId] = PaymentEscrow({
            payer: msg.sender,
            agentId: agentId,
            amount: msg.value,
            timestamp: uint64(block.timestamp),
            status: EscrowStatus.Escrowed
        });

        emit InferenceRequested(requestId, agentId, msg.sender, msg.value);
    }

    /// @inheritdoc IRoyaltyVault
    function settleInference(
        bytes32 requestId,
        bytes32 outputHash,
        bytes calldata teeAttestation
    ) external override nonReentrant onlyRegisteredProvider {
        PaymentEscrow memory escrow = _escrows[requestId];
        if (escrow.status != EscrowStatus.Escrowed) revert InvalidEscrowState();

        // Mark settled FIRST (CEI pattern)
        _escrows[requestId].status = EscrowStatus.Settled;

        // Verify TEE attestation
        // MVP: just check non-zero. Production: verify enclave signature.
        if (teeAttestation.length == 0) revert InvalidTeeAttestation();
        if (outputHash == bytes32(0)) revert InvalidTeeAttestation();

        // Compute the fee components
        uint256 totalPaid = escrow.amount;
        uint256 base = basePrice[escrow.agentId];
        if (base == 0) base = defaultBasePrice;

        uint256 protocolFee = (base * PROTOCOL_FEE_BPS) / LineageMath.BPS_DENOMINATOR;
        uint256 providerFee = (base * COMPUTE_PROVIDER_BPS) / LineageMath.BPS_DENOMINATOR;

        // Distribute royalty from base
        uint256 distributed = _distributeRoyalty(escrow.agentId, base);

        // Pay compute provider
        protocolFeesAccrued += protocolFee;

        // Refund any excess (overpayment) along with the provider fee
        uint256 toProvider = providerFee;
        uint256 leftover = totalPaid - base - protocolFee - providerFee;
        toProvider += leftover; // leftover goes to provider as bonus / dust

        (bool ok, ) = payable(msg.sender).call{value: toProvider}("");
        require(ok, "Provider payment failed");

        emit ComputeProviderPaid(msg.sender, toProvider);
        emit ProtocolFeeCollected(escrow.agentId, protocolFee);
        emit InferenceSettled(requestId, escrow.agentId, msg.sender, distributed);
    }

    /// @inheritdoc IRoyaltyVault
    function refundIfTimeout(bytes32 requestId) external override nonReentrant {
        PaymentEscrow memory escrow = _escrows[requestId];
        if (escrow.status != EscrowStatus.Escrowed) revert InvalidEscrowState();
        if (block.timestamp <= escrow.timestamp + ESCROW_TIMEOUT) revert EscrowNotTimedOut();

        _escrows[requestId].status = EscrowStatus.Refunded;

        (bool ok, ) = payable(escrow.payer).call{value: escrow.amount}("");
        require(ok, "Refund failed");

        emit PaymentRefunded(requestId, escrow.payer, escrow.amount);
    }

    function getEscrow(bytes32 requestId) external view returns (PaymentEscrow memory) {
        return _escrows[requestId];
    }

    // ─────────────────────────────────────────────────────────────────────
    // Royalty distribution (the core algorithm)
    // ─────────────────────────────────────────────────────────────────────

    /// @notice Walk the lineage tree and distribute royalty to all ancestors
    /// @dev Performs BFS up to MAX_LINEAGE_DEPTH. Deduplicates ancestors that
    ///      appear via multiple paths. Sends $0G to each ancestor's owner.
    ///      Any unallocated portion (deep-lineage cap, burned ancestor, low
    ///      alignment) routes to `protocolFeesAccrued` so accounting closes
    ///      on `fee` exactly. Closes the FAQ Q2 / Q4 / Q5 honesty gaps.
    /// @return distributed Total amount actually paid out to ancestor wallets
    function _distributeRoyalty(uint256 agentId, uint256 fee)
        internal
        returns (uint256 distributed)
    {
        IMekarTypes.RoyaltySchema memory schema = agentInft.getRoyaltySchema(agentId);
        IMekarTypes.AgentLineage memory lineage = agentInft.getLineage(agentId);

        // 1. Pay direct owner — current INFT holder, by definition not burned.
        uint256 ownerShare = LineageMath.computeGenerationShare(schema, 0, fee);
        address ownerAddr = agentInft.ownerOf(agentId);
        _safeTransfer(ownerAddr, ownerShare);
        distributed += ownerShare;
        emit RoyaltyPaid(agentId, ownerAddr, 0, ownerShare);

        // 2. Walk ancestors generation by generation, deduplicating
        if (lineage.parents.length > 0) {
            distributed += _distributeAncestorTiers(lineage.parents, schema, fee);
        }

        // 3. Pay training data contributors (genesis-level)
        uint256 trainingShare = (fee * schema.trainingDataBps) / LineageMath.BPS_DENOMINATOR;
        if (trainingShare > 0) {
            distributed += _distributeToContributors(lineage, trainingShare);
        }

        // 4. Q2 fix — anything not distributed (deep-lineage cap, missing
        //    ancestors, alignment slashing) is consolidated into the protocol
        //    treasury rather than left dangling on the vault balance.
        if (distributed < fee) {
            unchecked {
                protocolFeesAccrued += fee - distributed;
            }
        }

        return distributed;
    }

    /// @dev BFS walk, paying each unique ancestor at each generation tier.
    ///      Per-ancestor share is scaled by alignmentHealth (Q4): an agent at
    ///      80% alignment receives 80% of its tier slot; the missing 20% is
    ///      not redistributed — `_distributeRoyalty` sweeps it into protocol
    ///      treasury, so misalignment is a real economic penalty.
    ///      Burned-ancestor `ownerOf` calls are caught (Q5) so settlement
    ///      never reverts; the missing share also routes to treasury via the
    ///      same final sweep.
    function _distributeAncestorTiers(
        uint256[] memory directParents,
        IMekarTypes.RoyaltySchema memory schema,
        uint256 fee
    ) internal returns (uint256 distributed) {
        // Track all ancestors paid (dedup global, not per-tier)
        uint256[] memory paid = new uint256[](500);
        uint256 paidCount = 0;

        uint256[] memory currentTier = directParents;
        uint16 generation = 1;

        while (currentTier.length > 0 && generation <= schema.maxGenerationsPaid && generation <= MAX_LINEAGE_DEPTH) {
            uint256[] memory uniqueThisTier = _dedupAgainst(currentTier, paid, paidCount);

            if (uniqueThisTier.length > 0) {
                uint256 tierTotal = LineageMath.computeGenerationShare(schema, generation, fee);
                uint256 perAncestor = tierTotal / uniqueThisTier.length;

                for (uint256 i = 0; i < uniqueThisTier.length; i++) {
                    uint256 ancestorId = uniqueThisTier[i];

                    // Q5: tolerate burned/nonexistent ancestor — owner lookup
                    // may revert. On revert, skip transfer; the unallocated
                    // perAncestor amount falls through to the treasury sweep.
                    address ancestorOwner = address(0);
                    try agentInft.ownerOf(ancestorId) returns (address o) {
                        ancestorOwner = o;
                    } catch {
                        // ancestor burned — leave owner=0, share goes to treasury
                    }

                    if (ancestorOwner != address(0)) {
                        // Q4: scale by alignment health. 10000 = 100%, 0 = 0%.
                        // ownerOf succeeded so getAlignmentHealth should too,
                        // but wrap defensively.
                        uint16 health = 10_000;
                        try agentInft.getAlignmentHealth(ancestorId) returns (uint16 h) {
                            health = h;
                        } catch {
                            // keep default 10000
                        }

                        uint256 effectiveShare = (perAncestor * health) / LineageMath.BPS_DENOMINATOR;
                        if (effectiveShare > 0) {
                            _safeTransfer(ancestorOwner, effectiveShare);
                            distributed += effectiveShare;
                            emit RoyaltyPaid(ancestorId, ancestorOwner, generation, effectiveShare);
                        }
                    }

                    if (paidCount < paid.length) {
                        paid[paidCount] = ancestorId;
                        unchecked {
                            paidCount++;
                        }
                    }
                }
            }

            currentTier = _gatherNextTier(uniqueThisTier);
            unchecked {
                generation++;
            }
        }

        return distributed;
    }

    function _dedupAgainst(
        uint256[] memory candidates,
        uint256[] memory paid,
        uint256 paidCount
    ) internal pure returns (uint256[] memory) {
        uint256[] memory tmp = new uint256[](candidates.length);
        uint256 count = 0;

        for (uint256 i = 0; i < candidates.length; i++) {
            uint256 c = candidates[i];

            // Check against globally paid
            bool seen = false;
            for (uint256 j = 0; j < paidCount; j++) {
                if (paid[j] == c) {
                    seen = true;
                    break;
                }
            }
            if (seen) continue;

            // Check against current tmp (within-tier dedup)
            for (uint256 j = 0; j < count; j++) {
                if (tmp[j] == c) {
                    seen = true;
                    break;
                }
            }
            if (seen) continue;

            tmp[count] = c;
            unchecked {
                count++;
            }
        }

        uint256[] memory result = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = tmp[i];
        }
        return result;
    }

    function _gatherNextTier(uint256[] memory currentTier)
        internal
        view
        returns (uint256[] memory)
    {
        uint256[] memory buffer = new uint256[](currentTier.length * 8);
        uint256 bufferLen = 0;

        for (uint256 i = 0; i < currentTier.length; i++) {
            // Q5: getParents has an `exists` modifier and reverts on burned
            // tokens. Skip rather than abort the whole settlement; the
            // ancestor's grandparents simply drop out of this distribution.
            uint256[] memory parents;
            try agentInft.getParents(currentTier[i]) returns (uint256[] memory p) {
                parents = p;
            } catch {
                continue;
            }
            for (uint256 j = 0; j < parents.length; j++) {
                if (bufferLen >= buffer.length) break;
                buffer[bufferLen] = parents[j];
                unchecked {
                    bufferLen++;
                }
            }
        }

        uint256[] memory result = new uint256[](bufferLen);
        for (uint256 i = 0; i < bufferLen; i++) {
            result[i] = buffer[i];
        }
        return result;
    }

    function _distributeToContributors(IMekarTypes.AgentLineage memory lineage, uint256 totalShare)
        internal
        returns (uint256 distributed)
    {
        if (lineage.trainingDataMerkle == bytes32(0)) {
            // No training data registered → return share to protocol
            protocolFeesAccrued += totalShare;
            return 0;
        }

        address[] memory contributors = trainingRegistry.getContributors(
            lineage.trainingDataMerkle
        );

        if (contributors.length == 0) {
            // No contributors set → fallback to creator
            _safeTransfer(lineage.creator, totalShare);
            return totalShare;
        }

        uint256 totalDistributed = 0;
        for (uint256 i = 0; i < contributors.length; i++) {
            uint16 shareBps = trainingRegistry.getContributorShare(
                lineage.trainingDataMerkle,
                contributors[i]
            );
            uint256 amount = (totalShare * shareBps) / LineageMath.BPS_DENOMINATOR;
            if (amount > 0) {
                _safeTransfer(contributors[i], amount);
                totalDistributed += amount;
            }
        }

        return totalDistributed;
    }

    function _safeTransfer(address to, uint256 amount) internal {
        if (amount == 0 || to == address(0)) return;
        (bool ok, ) = payable(to).call{value: amount}("");
        // Don't revert on failure — if a recipient contract reverts, redirect to protocol fees
        if (!ok) {
            protocolFeesAccrued += amount;
        }
    }

    // ─────────────────────────────────────────────────────────────────────
    // Owner ops
    // ─────────────────────────────────────────────────────────────────────

    function withdrawProtocolFees(address to) external onlyOwner nonReentrant {
        uint256 amount = protocolFeesAccrued;
        protocolFeesAccrued = 0;
        (bool ok, ) = payable(to).call{value: amount}("");
        require(ok, "Withdraw failed");
    }

    receive() external payable {
        protocolFeesAccrued += msg.value;
    }
}
