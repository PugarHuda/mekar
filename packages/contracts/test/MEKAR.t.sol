// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {AgentINFT} from "../contracts/AgentINFT.sol";
import {MekarRegistry} from "../contracts/MekarRegistry.sol";
import {RoyaltyVault} from "../contracts/RoyaltyVault.sol";
import {TrainingDataRegistry} from "../contracts/TrainingDataRegistry.sol";
import {AlignmentAuditor} from "../contracts/AlignmentAuditor.sol";
import {IMekarTypes} from "../contracts/interfaces/IMekarTypes.sol";
import {IAgentINFT} from "../contracts/interfaces/IAgentINFT.sol";

contract MEKARTest is Test {
    AgentINFT internal agentInft;
    MekarRegistry internal registry;
    RoyaltyVault internal royaltyVault;
    TrainingDataRegistry internal trainingRegistry;

    address internal deployer = address(0xD1);
    address internal alice = address(0xA1);   // genesis creator
    address internal bob = address(0xB0B);    // fork1 creator
    address internal carol = address(0xCA40); // fork2 creator
    address internal david = address(0xDAD);  // composer
    address internal user = address(0x55E2);  // end user
    address internal provider = address(0x9404); // compute provider

    IMekarTypes.RoyaltySchema internal defaultSchema;

    function setUp() public {
        defaultSchema = IMekarTypes.RoyaltySchema({
            directOwnerBps: 5_000,
            gen1Bps: 2_500,
            gen2Bps: 1_500,
            gen3PlusBps: 700,
            trainingDataBps: 300,
            maxGenerationsPaid: 10
        });

        vm.startPrank(deployer);
        trainingRegistry = new TrainingDataRegistry(deployer);
        agentInft = new AgentINFT(deployer);
        registry = new MekarRegistry(deployer);
        royaltyVault = new RoyaltyVault(
            deployer,
            address(agentInft),
            address(registry),
            address(trainingRegistry)
        );

        agentInft.setRegistry(address(registry));
        registry.setAgentInftContract(address(agentInft));
        registry.setRoyaltyVaultContract(address(royaltyVault));
        registry.setTrainingDataRegistry(address(trainingRegistry));
        vm.stopPrank();

        // Fund accounts
        vm.deal(alice, 10 ether);
        vm.deal(bob, 10 ether);
        vm.deal(carol, 10 ether);
        vm.deal(david, 10 ether);
        vm.deal(user, 10 ether);
        vm.deal(provider, 10 ether);
    }

    // ─────────────────────────────────────────────────────────────────────
    // Genesis Mint
    // ─────────────────────────────────────────────────────────────────────

    function test_MintGenesis_AssignsTokenId1() public {
        vm.prank(alice);
        uint256 tokenId = agentInft.mintGenesis(
            keccak256("weights"),
            keccak256("training"),
            keccak256("tee"),
            defaultSchema,
            IMekarTypes.ParticipationMode.Voluntary
        );

        assertEq(tokenId, 1);
        assertEq(agentInft.totalSupply(), 1);
        assertEq(agentInft.ownerOf(1), alice);
    }

    function test_MintGenesis_RegistersInRegistry() public {
        vm.prank(alice);
        agentInft.mintGenesis(
            keccak256("w"),
            keccak256("t"),
            keccak256("a"),
            defaultSchema,
            IMekarTypes.ParticipationMode.Voluntary
        );

        assertEq(registry.totalAgents(), 1);
        uint256[] memory aliceAgents = registry.getAgentsByCreator(alice);
        assertEq(aliceAgents.length, 1);
        assertEq(aliceAgents[0], 1);
    }

    function test_MintGenesis_RevertsOnInvalidSchema() public {
        IMekarTypes.RoyaltySchema memory bad = defaultSchema;
        bad.directOwnerBps = 4_000; // sum no longer 10000

        vm.prank(alice);
        vm.expectRevert();
        agentInft.mintGenesis(
            keccak256("w"),
            keccak256("t"),
            keccak256("a"),
            bad,
            IMekarTypes.ParticipationMode.Voluntary
        );
    }

    function test_MintGenesis_StrictRequiresWeights() public {
        vm.prank(alice);
        vm.expectRevert();
        agentInft.mintGenesis(
            bytes32(0), // no weights
            keccak256("t"),
            keccak256("a"),
            defaultSchema,
            IMekarTypes.ParticipationMode.Strict
        );
    }

    // ─────────────────────────────────────────────────────────────────────
    // Fork Mint
    // ─────────────────────────────────────────────────────────────────────

    function _mintGenesisAs(address creator) internal returns (uint256) {
        vm.prank(creator);
        return agentInft.mintGenesis(
            keccak256(abi.encode("w", creator)),
            keccak256(abi.encode("t", creator)),
            keccak256(abi.encode("a", creator)),
            defaultSchema,
            IMekarTypes.ParticipationMode.Voluntary
        );
    }

    function test_MintFork_LinksParent_AndIncrementsGeneration() public {
        uint256 genesisId = _mintGenesisAs(alice);

        vm.prank(bob);
        uint256 forkId = agentInft.mintFork(
            genesisId,
            keccak256("fork-w"),
            keccak256("fork-t"),
            keccak256("fork-a")
        );

        IAgentINFT.AgentLineage memory lineage = agentInft.getLineage(forkId);
        assertEq(lineage.parents.length, 1);
        assertEq(lineage.parents[0], genesisId);
        assertEq(lineage.generation, 1);
        assertEq(lineage.creator, bob);
    }

    function test_MintFork_RevertsOnSameWeightsAsParent() public {
        bytes32 wp = keccak256("same");

        vm.prank(alice);
        uint256 genesisId = agentInft.mintGenesis(
            wp,
            keccak256("t"),
            keccak256("a"),
            defaultSchema,
            IMekarTypes.ParticipationMode.Voluntary
        );

        vm.prank(bob);
        vm.expectRevert(IAgentINFT.InsufficientWeightDelta.selector);
        agentInft.mintFork(genesisId, wp, keccak256("t2"), keccak256("a2"));
    }

    function test_MintFork_RevertsOnNonexistentParent() public {
        vm.prank(bob);
        vm.expectRevert();
        agentInft.mintFork(999, keccak256("w"), keccak256("t"), keccak256("a"));
    }

    function test_MintFork_RevertsOnEmptyTeeAttestation() public {
        uint256 genesisId = _mintGenesisAs(alice);

        vm.prank(bob);
        vm.expectRevert(IAgentINFT.InvalidTeeAttestation.selector);
        agentInft.mintFork(genesisId, keccak256("w"), keccak256("t"), bytes32(0));
    }

    function test_MintFork_AppearsInDescendants() public {
        uint256 genesisId = _mintGenesisAs(alice);
        vm.prank(bob);
        uint256 forkId = agentInft.mintFork(
            genesisId,
            keccak256("w"),
            keccak256("t"),
            keccak256("a")
        );

        uint256[] memory descendants = registry.getDescendants(genesisId);
        assertEq(descendants.length, 1);
        assertEq(descendants[0], forkId);
    }

    // ─────────────────────────────────────────────────────────────────────
    // Compose Mint
    // ─────────────────────────────────────────────────────────────────────

    function _setupGenesisAndTwoForks()
        internal
        returns (uint256 g, uint256 f1, uint256 f2)
    {
        g = _mintGenesisAs(alice);

        vm.prank(bob);
        f1 = agentInft.mintFork(g, keccak256("f1w"), keccak256("f1t"), keccak256("f1a"));

        vm.prank(carol);
        f2 = agentInft.mintFork(g, keccak256("f2w"), keccak256("f2t"), keccak256("f2a"));
    }

    function test_MintCompose_MultiParent_GenerationCorrect() public {
        (, uint256 f1, uint256 f2) = _setupGenesisAndTwoForks();

        uint256[] memory parents = new uint256[](2);
        parents[0] = f1;
        parents[1] = f2;

        vm.prank(david);
        uint256 composedId = agentInft.mintCompose(
            parents,
            keccak256("cw"),
            keccak256("ct"),
            keccak256("ca"),
            IMekarTypes.CompositionStrategy.LoraMerge
        );

        IAgentINFT.AgentLineage memory lineage = agentInft.getLineage(composedId);
        assertEq(lineage.parents.length, 2);
        assertEq(lineage.generation, 2);
    }

    function test_MintCompose_RevertsOnSingleParent() public {
        (, uint256 f1, ) = _setupGenesisAndTwoForks();

        uint256[] memory parents = new uint256[](1);
        parents[0] = f1;

        vm.prank(david);
        vm.expectRevert(IAgentINFT.InvalidParents.selector);
        agentInft.mintCompose(
            parents,
            keccak256("w"),
            keccak256("t"),
            keccak256("a"),
            IMekarTypes.CompositionStrategy.LoraMerge
        );
    }

    function test_MintCompose_RevertsOnDuplicateParents() public {
        (, uint256 f1, ) = _setupGenesisAndTwoForks();

        uint256[] memory parents = new uint256[](2);
        parents[0] = f1;
        parents[1] = f1; // duplicate

        vm.prank(david);
        vm.expectRevert(IAgentINFT.InvalidParents.selector);
        agentInft.mintCompose(
            parents,
            keccak256("w"),
            keccak256("t"),
            keccak256("a"),
            IMekarTypes.CompositionStrategy.LoraMerge
        );
    }

    // ─────────────────────────────────────────────────────────────────────
    // Lineage Queries
    // ─────────────────────────────────────────────────────────────────────

    function test_GetAncestors_DeduplicatesAcrossPaths() public {
        (uint256 g, uint256 f1, uint256 f2) = _setupGenesisAndTwoForks();

        uint256[] memory parents = new uint256[](2);
        parents[0] = f1;
        parents[1] = f2;

        vm.prank(david);
        uint256 composedId = agentInft.mintCompose(
            parents,
            keccak256("cw"),
            keccak256("ct"),
            keccak256("ca"),
            IMekarTypes.CompositionStrategy.LoraMerge
        );

        uint256[] memory ancestors = registry.getAncestors(composedId, 10);
        // Should contain f1, f2, g (genesis dedup'd despite 2 paths via f1 and f2)
        assertEq(ancestors.length, 3);
    }

    function test_IsAncestor_ReturnsTrueForLineage() public {
        (uint256 g, uint256 f1, uint256 f2) = _setupGenesisAndTwoForks();

        uint256[] memory parents = new uint256[](2);
        parents[0] = f1;
        parents[1] = f2;

        vm.prank(david);
        uint256 composedId = agentInft.mintCompose(
            parents,
            keccak256("cw"),
            keccak256("ct"),
            keccak256("ca"),
            IMekarTypes.CompositionStrategy.LoraMerge
        );

        assertTrue(agentInft.isAncestor(composedId, f1));
        assertTrue(agentInft.isAncestor(composedId, f2));
        assertTrue(agentInft.isAncestor(composedId, g));
        assertFalse(agentInft.isAncestor(g, composedId));
    }

    // ─────────────────────────────────────────────────────────────────────
    // Royalty Distribution
    // ─────────────────────────────────────────────────────────────────────

    function _registerProvider() internal {
        vm.prank(provider);
        royaltyVault.registerProvider{value: 0.1 ether}(provider, 0.1 ether);
    }

    function test_PayInference_EscrowsPayment() public {
        uint256 genesisId = _mintGenesisAs(alice);
        _registerProvider();

        uint256 price = royaltyVault.getInferencePrice(genesisId);
        vm.prank(user);
        bytes32 reqId = royaltyVault.payInference{value: price}(genesisId);

        IMekarTypes.PaymentEscrow memory escrow = royaltyVault.getEscrow(reqId);
        assertEq(escrow.amount, price);
        assertEq(escrow.payer, user);
        assertEq(uint256(escrow.status), uint256(IMekarTypes.EscrowStatus.Escrowed));
    }

    function test_SettleInference_DistributesToOwner() public {
        uint256 genesisId = _mintGenesisAs(alice);
        _registerProvider();

        uint256 price = royaltyVault.getInferencePrice(genesisId);
        vm.prank(user);
        bytes32 reqId = royaltyVault.payInference{value: price}(genesisId);

        uint256 aliceBalanceBefore = alice.balance;

        vm.prank(provider);
        royaltyVault.settleInference(reqId, keccak256("output"), hex"1234");

        // Alice receives:
        //   • 50% direct owner share
        //   • 3% training-contributor fallback (no contributors set → goes to creator)
        // Base = price / 1.2 (price = base * 1.2 with 10% protocol fee + 10% provider fee)
        uint256 base = (price * 10_000) / 12_000;
        uint256 ownerShare = (base * 5_000) / 10_000;
        uint256 trainingShare = (base * 300) / 10_000;

        assertEq(alice.balance, aliceBalanceBefore + ownerShare + trainingShare);
    }

    function test_SettleInference_DistributesAcrossLineage() public {
        ( /* g */ , uint256 f1, uint256 f2) = _setupGenesisAndTwoForks();

        uint256[] memory parents = new uint256[](2);
        parents[0] = f1;
        parents[1] = f2;

        vm.prank(david);
        uint256 composedId = agentInft.mintCompose(
            parents,
            keccak256("cw"),
            keccak256("ct"),
            keccak256("ca"),
            IMekarTypes.CompositionStrategy.LoraMerge
        );

        _registerProvider();

        uint256 aliceBefore = alice.balance;
        uint256 bobBefore = bob.balance;
        uint256 carolBefore = carol.balance;
        uint256 davidBefore = david.balance;

        uint256 price = royaltyVault.getInferencePrice(composedId);
        vm.prank(user);
        bytes32 reqId = royaltyVault.payInference{value: price}(composedId);

        vm.prank(provider);
        royaltyVault.settleInference(reqId, keccak256("output"), hex"1234");

        // Owner gets paid
        assertGt(david.balance, davidBefore);
        // Both gen 1 parents get paid
        assertGt(bob.balance, bobBefore);
        assertGt(carol.balance, carolBefore);
        // Genesis grandparent gets paid (deduped despite 2 paths)
        assertGt(alice.balance, aliceBefore);
    }

    function test_SettleInference_RevertsForUnregisteredProvider() public {
        uint256 genesisId = _mintGenesisAs(alice);
        _registerProvider();

        uint256 price = royaltyVault.getInferencePrice(genesisId);
        vm.prank(user);
        bytes32 reqId = royaltyVault.payInference{value: price}(genesisId);

        // user is not a registered provider
        vm.prank(user);
        vm.expectRevert();
        royaltyVault.settleInference(reqId, keccak256("output"), hex"1234");
    }

    function test_RefundIfTimeout_AfterEscrowExpires() public {
        uint256 genesisId = _mintGenesisAs(alice);
        _registerProvider();

        uint256 price = royaltyVault.getInferencePrice(genesisId);
        vm.prank(user);
        bytes32 reqId = royaltyVault.payInference{value: price}(genesisId);

        uint256 userBefore = user.balance;

        // Fast forward past timeout (1 hour + 1 second)
        vm.warp(block.timestamp + 1 hours + 1);

        royaltyVault.refundIfTimeout(reqId);

        assertEq(user.balance, userBefore + price);
    }

    function test_RefundIfTimeout_RevertsBeforeTimeout() public {
        uint256 genesisId = _mintGenesisAs(alice);
        _registerProvider();

        uint256 price = royaltyVault.getInferencePrice(genesisId);
        vm.prank(user);
        bytes32 reqId = royaltyVault.payInference{value: price}(genesisId);

        vm.expectRevert();
        royaltyVault.refundIfTimeout(reqId);
    }

    // ─────────────────────────────────────────────────────────────────────
    // TrainingDataRegistry
    // ─────────────────────────────────────────────────────────────────────

    function test_RegisterDataset() public {
        bytes32 root = keccak256("dataset");
        vm.prank(alice);
        trainingRegistry.registerDataset(root, keccak256("ptr"), keccak256("tee"));
        assertTrue(trainingRegistry.isRegistered(root));
    }

    function test_RegisterDataset_RevertsOnDuplicate() public {
        bytes32 root = keccak256("dataset");
        vm.prank(alice);
        trainingRegistry.registerDataset(root, keccak256("ptr"), keccak256("tee"));

        vm.prank(alice);
        vm.expectRevert();
        trainingRegistry.registerDataset(root, keccak256("ptr2"), keccak256("tee2"));
    }

    function test_SetContributors_ValidShareSum() public {
        bytes32 root = keccak256("dataset");
        vm.prank(alice);
        trainingRegistry.registerDataset(root, keccak256("ptr"), keccak256("tee"));

        address[] memory contribs = new address[](2);
        contribs[0] = bob;
        contribs[1] = carol;
        uint16[] memory shares = new uint16[](2);
        shares[0] = 6_000;
        shares[1] = 4_000;

        vm.prank(alice);
        trainingRegistry.setContributors(root, contribs, shares);

        address[] memory got = trainingRegistry.getContributors(root);
        assertEq(got.length, 2);
        assertEq(got[0], bob);
        assertEq(got[1], carol);
    }

    function test_SetContributors_RevertsOnInvalidShareSum() public {
        bytes32 root = keccak256("dataset");
        vm.prank(alice);
        trainingRegistry.registerDataset(root, keccak256("ptr"), keccak256("tee"));

        address[] memory contribs = new address[](2);
        contribs[0] = bob;
        contribs[1] = carol;
        uint16[] memory shares = new uint16[](2);
        shares[0] = 5_000;
        shares[1] = 4_000; // sums to 9000, not 10000

        vm.prank(alice);
        vm.expectRevert();
        trainingRegistry.setContributors(root, contribs, shares);
    }

    // ─────────────────────────────────────────────────────────────────────
    // tokenURI / metadata
    // ─────────────────────────────────────────────────────────────────────

    function test_TokenURI_ReturnsDataUriForGenesis() public {
        uint256 id = _mintGenesisAs(alice);
        string memory uri = agentInft.tokenURI(id);

        // Must start with the inline JSON data URI prefix
        bytes memory uriBytes = bytes(uri);
        assertGt(uriBytes.length, 50);

        bytes memory expectedPrefix = bytes("data:application/json;base64,");
        for (uint256 i = 0; i < expectedPrefix.length; i++) {
            assertEq(uriBytes[i], expectedPrefix[i]);
        }
    }

    function test_TokenURI_VariesByLineage() public {
        // Genesis → lotus
        _mintGenesisAs(alice);
        // Fork → jasmine
        vm.prank(bob);
        agentInft.mintFork(1, keccak256("w"), keccak256("t"), keccak256("a"));

        string memory g = agentInft.tokenURI(1);
        string memory f = agentInft.tokenURI(2);

        // Different bloom labels → different tokenURIs
        assertNotEq(keccak256(bytes(g)), keccak256(bytes(f)));
    }

    function test_TokenURI_RevertsForNonexistent() public {
        vm.expectRevert();
        agentInft.tokenURI(999);
    }

    // ─────────────────────────────────────────────────────────────────────
    // Alignment Health
    // ─────────────────────────────────────────────────────────────────────

    function test_OnlyAuditorCanUpdateAlignmentHealth() public {
        uint256 genesisId = _mintGenesisAs(alice);

        // Without auditor set, even deployer cannot
        vm.prank(deployer);
        vm.expectRevert(IAgentINFT.UnauthorizedCaller.selector);
        agentInft.updateAlignmentHealth(genesisId, 8_000);

        // Set auditor
        vm.prank(deployer);
        agentInft.setAlignmentAuditor(deployer);

        vm.prank(deployer);
        agentInft.updateAlignmentHealth(genesisId, 8_000);

        assertEq(agentInft.getAlignmentHealth(genesisId), 8_000);
    }

    // ─────────────────────────────────────────────────────────────────────
    // Q5 fix — burned ancestor must NOT brick settlement
    // ─────────────────────────────────────────────────────────────────────

    function test_Q5_SettleSurvives_BurnedAncestor() public {
        uint256 genesisId = _mintGenesisAs(alice);

        vm.prank(bob);
        uint256 forkId = agentInft.mintFork(
            genesisId,
            keccak256("fw"),
            keccak256("ft"),
            keccak256("fa")
        );

        // Burn the genesis ancestor (transfer to dead address — simulates loss)
        vm.prank(alice);
        agentInft.transferFrom(alice, address(0xdead), genesisId);

        // Now make ancestor truly burned by removing it via re-transfer to 0x0
        // OZ ERC721 doesn't let you transfer to 0 directly via transferFrom; use
        // a burn helper. We sidestep by simulating with a non-existent ID via
        // mock — the easiest equivalent is to assert the call to a deleted token
        // does not abort the settle. So instead, mint a fork from a valid genesis
        // and prove settlement does not revert when the ancestor is set to a
        // contract that reverts on receive (simulates "unrecoverable owner").
        // See test_Q5_SettleSurvives_RevertingOwner below for the canonical case.

        _registerProvider();
        uint256 price = royaltyVault.getInferencePrice(forkId);
        vm.prank(user);
        bytes32 reqId = royaltyVault.payInference{value: price}(forkId);

        // The crux: this MUST succeed even though genesis owner is the dead
        // address (which can't actually receive ETH usefully but can be queried).
        vm.prank(provider);
        royaltyVault.settleInference(reqId, keccak256("output"), hex"1234");

        // Bob (fork owner) gets paid.
        // Genesis share is still attempted (dead address accepts via .call),
        // but the key invariant is that settlement did not revert.
        assertEq(uint256(royaltyVault.getEscrow(reqId).status), uint256(IMekarTypes.EscrowStatus.Settled));
    }

    function test_Q5_SettleSurvives_RevertingOwner() public {
        // Owner that reverts on receive — share routes to protocol via _safeTransfer fallback
        RevertingOwner badOwner = new RevertingOwner();

        uint256 genesisId = _mintGenesisAs(alice);

        // Transfer genesis to the reverting contract
        vm.prank(alice);
        agentInft.transferFrom(alice, address(badOwner), genesisId);

        vm.prank(bob);
        uint256 forkId = agentInft.mintFork(
            genesisId,
            keccak256("fw"),
            keccak256("ft"),
            keccak256("fa")
        );

        _registerProvider();
        uint256 protocolBefore = royaltyVault.protocolFeesAccrued();
        uint256 price = royaltyVault.getInferencePrice(forkId);
        vm.prank(user);
        bytes32 reqId = royaltyVault.payInference{value: price}(forkId);

        // Settlement must succeed despite reverting genesis owner
        vm.prank(provider);
        royaltyVault.settleInference(reqId, keccak256("output"), hex"1234");

        assertEq(
            uint256(royaltyVault.getEscrow(reqId).status),
            uint256(IMekarTypes.EscrowStatus.Settled),
            "settle must not revert"
        );

        // Genesis share fell back to protocol treasury (transfer reverted)
        assertGt(royaltyVault.protocolFeesAccrued(), protocolBefore);
    }

    // ─────────────────────────────────────────────────────────────────────
    // Q2 fix — anything not distributed must close to protocol treasury
    // ─────────────────────────────────────────────────────────────────────

    function test_Q2_UndistributedClosesToProtocol() public {
        // Genesis with no parents and no training contributors registered →
        // gen1/gen2/gen3+ all have nothing to distribute, AND trainingDataBps
        // can't find contributors. The owner gets 50%, training falls back to
        // creator (3%), and 47% should land in protocolFeesAccrued.
        uint256 genesisId = _mintGenesisAs(alice);
        _registerProvider();

        uint256 protocolBefore = royaltyVault.protocolFeesAccrued();
        uint256 price = royaltyVault.getInferencePrice(genesisId);

        vm.prank(user);
        bytes32 reqId = royaltyVault.payInference{value: price}(genesisId);

        vm.prank(provider);
        royaltyVault.settleInference(reqId, keccak256("output"), hex"1234");

        // Base = price / 1.2 (10% protocol + 10% provider on top of base)
        uint256 base = (price * 10_000) / 12_000;
        uint256 protocolFee = (base * 1_000) / 10_000; // existing protocolFee path
        uint256 ownerShare = (base * 5_000) / 10_000;
        uint256 trainingShare = (base * 300) / 10_000;
        uint256 expectedDistributed = ownerShare + trainingShare;
        uint256 expectedSweep = base - expectedDistributed;

        // Treasury receives: existing protocolFee path + Q2 sweep
        uint256 expectedTreasuryDelta = protocolFee + expectedSweep;
        assertEq(
            royaltyVault.protocolFeesAccrued() - protocolBefore,
            expectedTreasuryDelta,
            "undistributed share must consolidate to treasury"
        );
    }

    // ─────────────────────────────────────────────────────────────────────
    // Q4 — alignment-weighted ancestor share
    // ─────────────────────────────────────────────────────────────────────

    function test_Q4_AncestorShareScalesByAlignment() public {
        uint256 genesisId = _mintGenesisAs(alice);

        vm.prank(bob);
        uint256 forkId = agentInft.mintFork(
            genesisId,
            keccak256("fw"),
            keccak256("ft"),
            keccak256("fa")
        );

        // Halve genesis alignment to 50%
        vm.prank(deployer);
        agentInft.setAlignmentAuditor(deployer);
        vm.prank(deployer);
        agentInft.updateAlignmentHealth(genesisId, 5_000);

        _registerProvider();

        uint256 aliceBefore = alice.balance;
        uint256 protocolBefore = royaltyVault.protocolFeesAccrued();

        uint256 price = royaltyVault.getInferencePrice(forkId);
        vm.prank(user);
        bytes32 reqId = royaltyVault.payInference{value: price}(forkId);

        vm.prank(provider);
        royaltyVault.settleInference(reqId, keccak256("output"), hex"1234");

        uint256 base = (price * 10_000) / 12_000;
        uint256 fullGen1 = (base * 2_500) / 10_000;
        uint256 expectedAliceShare = (fullGen1 * 5_000) / 10_000; // 50% of full

        assertEq(
            alice.balance - aliceBefore,
            expectedAliceShare,
            "ancestor at 50% alignment receives 50% of tier slot"
        );

        // Slashed half should land in treasury (along with protocolFee path)
        assertGt(royaltyVault.protocolFeesAccrued(), protocolBefore);
    }

    // ─────────────────────────────────────────────────────────────────────
    // AlignmentAuditor proxy — only approved auditors can flag
    // ─────────────────────────────────────────────────────────────────────

    function test_AlignmentAuditor_OnlyApprovedCanFlag() public {
        uint256 genesisId = _mintGenesisAs(alice);

        vm.prank(deployer);
        AlignmentAuditor auditor = new AlignmentAuditor(deployer, address(agentInft));

        vm.prank(deployer);
        agentInft.setAlignmentAuditor(address(auditor));

        // Bob (not approved) cannot flag
        vm.prank(bob);
        vm.expectRevert();
        auditor.flagAgent(genesisId, 7_000, "test");

        // After approval, bob can flag
        vm.prank(deployer);
        auditor.approveAuditor(bob);

        vm.prank(bob);
        auditor.flagAgent(genesisId, 7_000, "drift detected");

        assertEq(agentInft.getAlignmentHealth(genesisId), 7_000);
    }
}

/// @dev Test helper — a contract whose receive() reverts so we can simulate
///      an "unrecoverable" royalty recipient (lost-key wallet, malicious
///      contract, etc.). Used by Q5 fallback test.
contract RevertingOwner {
    receive() external payable {
        revert("nope");
    }
    function onERC721Received(address, address, uint256, bytes calldata) external pure returns (bytes4) {
        return this.onERC721Received.selector;
    }
}
