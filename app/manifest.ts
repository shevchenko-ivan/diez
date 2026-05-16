import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Diez — Акорди для гітари",
    short_name: "Diez",
    description:
      "Українська платформа гітарних акордів. Пісні з акордами, підбір акордів, тексти пісень для гітаристів.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#FFFFFF",
    theme_color: "#FF8800",
    lang: "uk",
    // Categories surface the app in PWA / Android install stores and help
    // Google understand the site's vertical.
    categories: ["music", "education", "entertainment"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    // App shortcuts — show up when a user long-presses the home-screen icon
    // on Android / Chrome OS. Lets people jump straight into the tools.
    shortcuts: [
      {
        name: "Пошук пісень",
        short_name: "Пісні",
        description: "Каталог пісень з акордами",
        url: "/songs",
      },
      {
        name: "Виконавці",
        short_name: "Виконавці",
        description: "Усі виконавці",
        url: "/artists",
      },
      {
        name: "Тюнер",
        short_name: "Тюнер",
        description: "Налаштувати гітару",
        url: "/tuner",
      },
      {
        name: "Визначити акорд",
        short_name: "Акорди",
        description: "Визначити акорд за позиціями пальців",
        url: "/chords",
      },
    ],
  };
}
