import type { NextRequest } from "next/server";
import { renderBloomSvg, variantFromLineage } from "@/lib/bloom";
import { createPublicClient, http } from "viem";
import { CONTRACT_ADDRESSES, isDeployed } from "@/contracts/addresses";
import { AGENT_INFT_ABI } from "@/contracts/abis";
import { ACTIVE_CHAIN } from "@/lib/chains";

/**
 * GET /api/bloom/{id}.svg
 *
 * Returns a procedural bloom SVG for the given agent. Used by the
 * tokenURI metadata endpoint, social previews, and any third-party
 * indexer that needs an image without rendering React.
 *
 * The route is intentionally simple — no auth, public-cache friendly,
 * works fine when the agent doesn't exist yet (returns a default lotus).
 */
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const cleanId = id.replace(/\.svg$/, "");
  const tokenId = parseInt(cleanId, 10);

  if (!Number.isFinite(tokenId) || tokenId < 1) {
    return svgResponse(renderBloomSvg("genesis", "default", { size: 600 }));
  }

  let parentCount = 0;
  let alignmentHealth: number | undefined;

  // Best-effort: look up the agent on-chain. If the RPC fails or the agent
  // doesn't exist, fall back to a default lotus.
  if (isDeployed) {
    try {
      const client = createPublicClient({
        chain: ACTIVE_CHAIN,
        transport: http(),
      });

      const lineage = (await client.readContract({
        address: CONTRACT_ADDRESSES.AgentINFT,
        abi: AGENT_INFT_ABI,
        functionName: "getLineage",
        args: [BigInt(tokenId)],
      })) as { parents: readonly bigint[]; alignmentHealth: number };

      parentCount = lineage.parents.length;
      alignmentHealth = Number(lineage.alignmentHealth);
    } catch {
      // ignore, fall through with defaults
    }
  }

  const variant = variantFromLineage(parentCount);
  // alignmentHealth is captured but not yet wired to the woodcut renderer; reserved for later wilt support.
  void alignmentHealth;
  const svg = renderBloomSvg(variant, String(tokenId), { size: 600 });

  return svgResponse(svg);
}

function svgResponse(svg: string): Response {
  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=300, s-maxage=86400",
    },
  });
}
