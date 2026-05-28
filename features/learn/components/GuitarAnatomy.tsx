import Image from "next/image";

// Theme-aware guitar anatomy illustration. Two images (cream bg for light,
// black bg for dark) toggled purely via CSS (.guitar-anatomy-light /
// .guitar-anatomy-dark in globals.css) — no JS, so no hydration flash.
// object-contain guarantees no distortion even if the aspect ratio differs
// slightly from the wrapper.

const ALT =
  "Будова акустичної гітари з підписаними частинами: головка грифу, кілки, верхній поріжок, накладка грифу, лади, пʼятка грифу, верхня дека, резонаторний отвір (розетка), струнотримач (бридж), нижній поріжок, обичайка";

export function GuitarAnatomy() {
  return (
    <div className="not-prose my-6">
      <div className="guitar-anatomy-light" style={{ position: "relative", width: "100%", aspectRatio: "2000 / 1745" }}>
        <Image src="/learn/guitar-anatomy-light.jpg" alt={ALT} fill sizes="(max-width: 768px) 100vw, 680px" style={{ objectFit: "contain" }} />
      </div>
      <div className="guitar-anatomy-dark" style={{ position: "relative", width: "100%", aspectRatio: "2000 / 1757" }}>
        <Image src="/learn/guitar-anatomy-dark.jpg" alt={ALT} fill sizes="(max-width: 768px) 100vw, 680px" style={{ objectFit: "contain" }} />
      </div>
    </div>
  );
}
