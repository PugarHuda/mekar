"use client";

/**
 * Lite i18n — a typed dictionary lookup, not a full next-intl setup.
 *
 * Mekar's APAC focus (Indonesian creator economy) means we want
 * Bahasa Indonesia alongside English without paying the routing /
 * bundle cost of a full locale-per-route framework. We pick the
 * locale from localStorage on first paint, default to "en", and
 * expose a small `t(key)` lookup.
 *
 * Translated keys are intentionally limited to:
 *   - Header nav labels
 *   - Empty-state copy
 *   - Common CTAs ("Mint a bloom", "Pay & run", etc.)
 *
 * Long-form copy (manifesto, /docs) stays English-only — translating
 * developer docs accurately is a separate effort, and machine-
 * translating them would degrade trust signals.
 */

import { useEffect, useState, useSyncExternalStore } from "react";

export type Locale = "en" | "id";
export const LOCALE_LABEL: Record<Locale, string> = {
    en: "English",
    id: "Bahasa Indonesia",
};

type Dict = Record<string, string>;

const en: Dict = {
    "nav.explorer": "Explorer",
    "nav.mint": "Mint",
    "nav.trending": "Trending",
    "nav.dashboard": "Dashboard",
    "nav.docs": "Docs",
    "cta.connect": "Connect a wallet",
    "cta.mint": "Mint a bloom",
    "cta.pay": "Pay & run inference →",
    "cta.try": "Try it →",
    "cta.fork": "Fork this bloom",
    "empty.explorer": "An empty garden. Plant the first seed.",
    "empty.dashboard": "No agents minted yet from this wallet.",
    "empty.settlement": "No inference activity yet. Be the first to bloom this agent.",
    "label.steward": "Steward",
    "label.descendants": "descendants",
    "label.inferences": "inferences",
    "label.distributed": "OG distributed",
    "label.alignment": "alignment",
    "footer.tagline":
        "A public ledger of AI parentage, built on the 0G network. Every agent has a lineage. Every inference pays its ancestors.",
};

const id: Dict = {
    "nav.explorer": "Penjelajah",
    "nav.mint": "Cetak",
    "nav.trending": "Tren",
    "nav.dashboard": "Dasbor",
    "nav.docs": "Dokumentasi",
    "cta.connect": "Hubungkan dompet",
    "cta.mint": "Cetak agen baru",
    "cta.pay": "Bayar & jalankan inferensi →",
    "cta.try": "Coba →",
    "cta.fork": "Fork agen ini",
    "empty.explorer": "Taman masih kosong. Tanam benih pertama.",
    "empty.dashboard": "Belum ada agen yang dicetak dari dompet ini.",
    "empty.settlement": "Belum ada aktivitas inferensi. Jadi yang pertama membungakan agen ini.",
    "label.steward": "Pemilik",
    "label.descendants": "turunan",
    "label.inferences": "inferensi",
    "label.distributed": "OG terdistribusi",
    "label.alignment": "keselarasan",
    "footer.tagline":
        "Catatan publik silsilah AI, dibangun di jaringan 0G. Setiap agen punya silsilah. Setiap inferensi membayar leluhurnya.",
};

const DICTS: Record<Locale, Dict> = { en, id };

const STORAGE_KEY = "mekar:locale";
const listeners = new Set<() => void>();

function readLocale(): Locale {
    if (typeof window === "undefined") return "en";
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw === "id" ? "id" : "en";
}

let cachedLocale: Locale = "en";

/**
 * Read the active locale. SSR-safe: defaults to "en" on the server,
 * hydration corrects to user-pinned value on first render.
 */
function getLocaleSnapshot(): Locale {
    return cachedLocale;
}

function subscribe(cb: () => void): () => void {
    listeners.add(cb);
    return () => listeners.delete(cb);
}

export function setLocale(next: Locale): void {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, next);
    cachedLocale = next;
    listeners.forEach((l) => l());
}

export function useLocale(): Locale {
    // Subscribe-based read so a setLocale() call anywhere re-renders
    // every consumer in the tree without prop drilling.
    return useSyncExternalStore(subscribe, getLocaleSnapshot, () => "en");
}

/**
 * Bootstrap hook — must be mounted once near the root so the cached
 * locale picks up the persisted value after hydration.
 */
export function useLocaleBootstrap(): void {
    useEffect(() => {
        const fromStorage = readLocale();
        if (fromStorage !== cachedLocale) {
            cachedLocale = fromStorage;
            listeners.forEach((l) => l());
        }
    }, []);
}

/**
 * Translate a key. Falls back to the English value if the active
 * locale doesn't have the key — that way new keys can ship in EN
 * without breaking ID, and translation is a strict superset.
 */
export function t(key: keyof typeof en, locale?: Locale): string {
    const loc = locale ?? cachedLocale;
    return DICTS[loc][key] ?? en[key] ?? key;
}

/** Hook variant — re-renders when locale changes. */
export function useT(): (key: keyof typeof en) => string {
    const locale = useLocale();
    return (key) => t(key, locale);
}

/** For language switcher UIs. */
export const SUPPORTED_LOCALES: Locale[] = ["en", "id"];
