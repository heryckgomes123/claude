import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "AIVA — Seu segundo cérebro",
    short_name: "AIVA",
    description: "Tarefas, agenda, projetos, conteúdo e IA num só lugar.",
    start_url: "/today?source=pwa",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "fullscreen"],
    orientation: "portrait",
    background_color: "#07070c",
    theme_color: "#07070c",
    lang: "pt-BR",
    categories: ["productivity", "lifestyle", "business"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Capturar", url: "/today?capture=1", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Falar com AIVA", url: "/aiva?voice=1", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Creator", url: "/creator", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
