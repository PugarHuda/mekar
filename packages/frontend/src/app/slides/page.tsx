/**
 * /slides — internal pitch deck for the 0G hackathon presentation.
 *
 * Not linked from the public nav and marked noindex. Reach via direct
 * URL only. Use arrow keys / space / click to advance. F11 for
 * fullscreen during the live pitch.
 *
 * Designed to read at 1080p projector resolution; falls back to
 * scrollable stack on phones for prep-on-mobile.
 */

import type { Metadata } from "next";
import { SlideDeck } from "./SlideDeck";

export const metadata: Metadata = {
    title: "Mekar — Pitch",
    description: "Internal pitch deck.",
    robots: { index: false, follow: false },
};

export default function SlidesPage() {
    return <SlideDeck />;
}
