// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {MekarMultisig} from "../contracts/MekarMultisig.sol";

/// @notice Behaviour tests for MekarMultisig.
/// Covers: propose+execute happy path, threshold enforcement, revoke,
/// self-only governance for signer set + threshold changes, value
/// forwarding, and revert propagation from the target.
contract MekarMultisigTest is Test {
    MekarMultisig internal multisig;

    address internal sA = address(0xA1);
    address internal sB = address(0xB2);
    address internal sC = address(0xC3);
    address internal outsider = address(0xBAD);

    address internal target;
    Sink internal sink;

    function setUp() public {
        sink = new Sink();
        target = address(sink);

        address[] memory initial = new address[](3);
        initial[0] = sA;
        initial[1] = sB;
        initial[2] = sC;
        multisig = new MekarMultisig(initial, 2);
        // Fund the multisig so it can forward value
        vm.deal(address(multisig), 5 ether);
    }

    // ─────────────────── Happy path ───────────────────

    function test_ProposeAutoConfirms() public {
        vm.prank(sA);
        uint256 id = multisig.propose(target, 0, abi.encodeWithSelector(Sink.bump.selector), "tick");
        (, , , , bool executed, uint256 confirmations) = multisig.proposalDetails(id);
        assertFalse(executed);
        assertEq(confirmations, 1);
        assertTrue(multisig.isConfirmed(id, sA));
    }

    function test_ThresholdHitAllowsExecute() public {
        vm.prank(sA);
        uint256 id = multisig.propose(target, 0, abi.encodeWithSelector(Sink.bump.selector), "tick");
        vm.prank(sB);
        multisig.confirm(id);

        vm.prank(sA);
        multisig.execute(id);
        assertEq(sink.count(), 1);

        (, , , , bool executed, ) = multisig.proposalDetails(id);
        assertTrue(executed);
    }

    function test_ValueForwarded() public {
        vm.prank(sA);
        uint256 id = multisig.propose(
            target,
            1 ether,
            abi.encodeWithSelector(Sink.bump.selector),
            "with value"
        );
        vm.prank(sB);
        multisig.confirm(id);
        vm.prank(sA);
        multisig.execute(id);
        assertEq(target.balance, 1 ether);
    }

    // ─────────────────── Negative paths ───────────────────

    function test_ExecuteBelowThresholdReverts() public {
        vm.prank(sA);
        uint256 id = multisig.propose(target, 0, abi.encodeWithSelector(Sink.bump.selector), "x");
        vm.prank(sA);
        vm.expectRevert(
            abi.encodeWithSelector(
                MekarMultisig.InsufficientConfirmations.selector,
                uint256(1),
                uint256(2)
            )
        );
        multisig.execute(id);
    }

    function test_NonSignerCannotPropose() public {
        vm.prank(outsider);
        vm.expectRevert(abi.encodeWithSelector(MekarMultisig.NotSigner.selector, outsider));
        multisig.propose(target, 0, "", "evil");
    }

    function test_DoubleConfirmReverts() public {
        vm.prank(sA);
        uint256 id = multisig.propose(target, 0, abi.encodeWithSelector(Sink.bump.selector), "tick");
        vm.prank(sA);
        vm.expectRevert(abi.encodeWithSelector(MekarMultisig.AlreadyConfirmed.selector, sA));
        multisig.confirm(id);
    }

    function test_RevokeRemovesConfirmation() public {
        vm.prank(sA);
        uint256 id = multisig.propose(target, 0, abi.encodeWithSelector(Sink.bump.selector), "tick");
        vm.prank(sA);
        multisig.revoke(id);
        assertFalse(multisig.isConfirmed(id, sA));
        (, , , , , uint256 confirmations) = multisig.proposalDetails(id);
        assertEq(confirmations, 0);
    }

    function test_TargetRevertPropagates() public {
        vm.prank(sA);
        uint256 id = multisig.propose(
            target,
            0,
            abi.encodeWithSelector(Sink.boom.selector),
            "should fail"
        );
        vm.prank(sB);
        multisig.confirm(id);

        vm.prank(sA);
        vm.expectRevert();
        multisig.execute(id);
    }

    // ─────────────────── Self-administered governance ───────────────────

    function test_ExternalSignerAddReverts() public {
        vm.prank(sA);
        vm.expectRevert(MekarMultisig.OnlySelf.selector);
        multisig.addSigner(outsider);
    }

    function test_SignerAddViaProposal() public {
        bytes memory data = abi.encodeWithSelector(MekarMultisig.addSigner.selector, outsider);
        vm.prank(sA);
        uint256 id = multisig.propose(address(multisig), 0, data, "add outsider");
        vm.prank(sB);
        multisig.confirm(id);
        vm.prank(sA);
        multisig.execute(id);

        assertTrue(multisig.isSigner(outsider));
    }

    function test_ThresholdChangeViaProposal() public {
        bytes memory data = abi.encodeWithSelector(MekarMultisig.setThreshold.selector, uint256(3));
        vm.prank(sA);
        uint256 id = multisig.propose(address(multisig), 0, data, "tighten");
        vm.prank(sB);
        multisig.confirm(id);
        vm.prank(sA);
        multisig.execute(id);
        assertEq(multisig.threshold(), 3);
    }

    function test_RemoveSignerCannotDropBelowThreshold() public {
        // threshold = 2 with 3 signers — removing one is fine; removing two
        // would leave threshold > signers, which the contract must refuse.
        bytes memory dropFirst = abi.encodeWithSelector(MekarMultisig.removeSigner.selector, sC);
        vm.prank(sA);
        uint256 id1 = multisig.propose(address(multisig), 0, dropFirst, "drop C");
        vm.prank(sB);
        multisig.confirm(id1);
        vm.prank(sA);
        multisig.execute(id1);
        assertFalse(multisig.isSigner(sC));

        // Now 2 signers, threshold 2 — dropping another would violate.
        bytes memory dropSecond = abi.encodeWithSelector(MekarMultisig.removeSigner.selector, sB);
        vm.prank(sA);
        uint256 id2 = multisig.propose(address(multisig), 0, dropSecond, "drop B");
        vm.prank(sB);
        multisig.confirm(id2);

        // The inner removeSigner reverts with InvalidThreshold(2);
        // execute wraps it in CallFailed(<encoded>). We assert just that
        // the outer call reverts — the precise inner reason is verified
        // by the constructor revert test elsewhere.
        vm.prank(sA);
        vm.expectRevert();
        multisig.execute(id2);
    }
}

/// @dev Test target — bumps a counter on `bump`, reverts on `boom`.
contract Sink {
    uint256 public count;

    function bump() external payable {
        count += 1;
    }

    function boom() external pure {
        revert("nope");
    }
}
