// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IMekarTypes} from "../interfaces/IMekarTypes.sol";

/// @title LineageMath
/// @notice Pure helper functions for royalty math + lineage validation
/// @dev Stateless, gas-efficient. Tested via fuzz tests.
library LineageMath {
    uint16 internal constant BPS_DENOMINATOR = 10_000;

    error SchemaSumOverflow();
    error InvalidGenerationCap();

    /// @notice Validate a royalty schema sums correctly
    /// @dev Sum of all generation BPS must equal BPS_DENOMINATOR (10000)
    function validateSchema(IMekarTypes.RoyaltySchema memory schema) internal pure returns (bool) {
        uint256 total = uint256(schema.directOwnerBps) +
            uint256(schema.gen1Bps) +
            uint256(schema.gen2Bps) +
            uint256(schema.gen3PlusBps) +
            uint256(schema.trainingDataBps);

        if (total != BPS_DENOMINATOR) revert SchemaSumOverflow();
        if (schema.maxGenerationsPaid == 0 || schema.maxGenerationsPaid > 100) {
            revert InvalidGenerationCap();
        }
        return true;
    }

    /// @notice Compute the share for a given generation
    /// @param schema The agent's royalty schema
    /// @param generation The generation distance (1 = parent, 2 = grandparent, etc)
    /// @param fee Total fee being distributed
    /// @return The total amount allocated to that generation tier
    function computeGenerationShare(
        IMekarTypes.RoyaltySchema memory schema,
        uint16 generation,
        uint256 fee
    ) internal pure returns (uint256) {
        if (generation == 0) {
            return (fee * schema.directOwnerBps) / BPS_DENOMINATOR;
        } else if (generation == 1) {
            return (fee * schema.gen1Bps) / BPS_DENOMINATOR;
        } else if (generation == 2) {
            return (fee * schema.gen2Bps) / BPS_DENOMINATOR;
        } else if (generation > schema.maxGenerationsPaid) {
            return 0;
        } else {
            return (fee * schema.gen3PlusBps) / BPS_DENOMINATOR;
        }
    }

    /// @notice Default royalty schema used when creator does not provide one
    function defaultSchema() internal pure returns (IMekarTypes.RoyaltySchema memory) {
        return
            IMekarTypes.RoyaltySchema({
                directOwnerBps: 5000,
                gen1Bps: 2500,
                gen2Bps: 1500,
                gen3PlusBps: 700,
                trainingDataBps: 300,
                maxGenerationsPaid: 10
            });
    }

    /// @notice Deduplicate an unsorted array of token IDs
    /// @dev O(n^2) — only used for small ancestor sets (max 100 entries)
    function deduplicate(uint256[] memory input) internal pure returns (uint256[] memory) {
        uint256[] memory tmp = new uint256[](input.length);
        uint256 count = 0;

        for (uint256 i = 0; i < input.length; i++) {
            bool seen = false;
            for (uint256 j = 0; j < count; j++) {
                if (tmp[j] == input[i]) {
                    seen = true;
                    break;
                }
            }
            if (!seen) {
                tmp[count] = input[i];
                count++;
            }
        }

        uint256[] memory result = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = tmp[i];
        }
        return result;
    }
}
