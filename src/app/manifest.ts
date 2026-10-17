import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Ship Ease Hub",
    short_name: "Ship Ease Hub",
    description: "Modern logistics & shipping solution. Ship from Nigeria to the world, and shop from the USA, UK and China to Nigeria.",
    start_url: "/app",
    display: "standalone",
    background_color: "#00002E",
    theme_color: "#00002E",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
    ],
  };
}
