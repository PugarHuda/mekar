/**
 * /brand — logo + brand asset downloads.
 *
 * The route handler at /api/brand/logo returns ONLY SVG. PNG export
 * happens here on the client by drawing the SVG to a <canvas> and
 * exporting the resulting raster. Browser canvas rasterisation is
 * more reliable than next/og's Satori path for this use case
 * (which had font-fetch + data-URI rendering failures).
 *
 * No nav link — reach via direct URL. Marked noindex.
 */

import type { Metadata } from "next";
import { BrandClient } from "./BrandClient";

export const metadata: Metadata = {
    title: "Mekar — Brand assets",
    description: "Logo downloads for partners + submissions.",
    robots: { index: false, follow: false },
};

export default function BrandPage() {
    return <BrandClient />;
}
