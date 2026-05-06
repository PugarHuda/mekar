import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { zgGalileo, zgMainnet } from "./chains";

export const wagmiConfig = getDefaultConfig({
  appName: "MEKAR — AI Genealogy & Royalty",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "demo-project-id",
  chains: [zgGalileo, zgMainnet],
  ssr: true,
});
