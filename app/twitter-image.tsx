// Twitter card image — same generator as opengraph-image so X/Twitter and
// other platforms that prefer twitter:* tags share the brand card.
// Re-exported so we don't drift in case we restyle the OG image.

export { default, alt, size, contentType, runtime } from "./opengraph-image";
