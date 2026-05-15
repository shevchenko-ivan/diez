// Twitter card image — same generator as opengraph-image so X/Twitter and
// other platforms that prefer twitter:* tags share the brand card.
// Next.js won't accept re-exports for the `runtime`/`size`/etc segment
// config (must be statically analyzable), so we declare them inline and
// delegate the actual render to the OG component.

import OG from "./opengraph-image";

export const runtime = "edge";
export const alt = "Diez — Акорди для гітари";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default OG;
