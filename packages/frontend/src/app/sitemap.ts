import type { MetadataRoute } from "next";

const BASE_URL = "https://mekar.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: `${BASE_URL}/`, lastModified: now, priority: 1.0, changeFrequency: "weekly" },
    { url: `${BASE_URL}/explorer`, lastModified: now, priority: 0.9, changeFrequency: "daily" },
    { url: `${BASE_URL}/mint`, lastModified: now, priority: 0.8, changeFrequency: "weekly" },
    { url: `${BASE_URL}/dashboard`, lastModified: now, priority: 0.6, changeFrequency: "weekly" },
  ];
}
