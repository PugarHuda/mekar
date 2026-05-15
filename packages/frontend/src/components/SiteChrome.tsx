"use client";

import { usePathname } from "next/navigation";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

/**
 * Site chrome wrapper — renders the persistent Header + Footer around
 * page content.
 *
 * Why this exists: previously every page rendered its own `<Header />`
 * and `<Footer />`. On client-side navigation that meant the WHOLE
 * navbar unmounted + remounted on every click — wagmi/RainbowKit, the
 * NetworkBanner, and the locale switch all re-evaluated for a frame,
 * which showed up as a visible flicker in the nav bar.
 *
 * Mounting Header/Footer HERE — inside the root layout — means they
 * persist across every client-side navigation. React keeps the same
 * `<Header />` element in the tree; only `children` swaps. The navbar
 * never remounts, so the flicker is gone.
 *
 * Routes that intentionally have no chrome (the fullscreen pitch deck
 * at /slides) are excluded by pathname.
 */

// Pathnames that render WITHOUT the header/footer.
const BARE_ROUTES = ["/slides"];

export function SiteChrome({ children }: { children: React.ReactNode }) {
    const pathname = usePathname() ?? "/";
    const bare = BARE_ROUTES.some(
        (r) => pathname === r || pathname.startsWith(r + "/")
    );

    if (bare) return <>{children}</>;

    return (
        <>
            <Header />
            {children}
            <Footer />
        </>
    );
}
