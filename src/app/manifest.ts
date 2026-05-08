import type { MetadataRoute } from "next"
import { SITE } from "@/shared/constants/site"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE.name,
    short_name: SITE.name,
    description: SITE.description,
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#E89B6C",
    orientation: "portrait",
    lang: "ko",
    icons: [
      {
        src: SITE.logo,
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: SITE.logo,
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: SITE.logo,
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  }
}
