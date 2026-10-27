"use client";

import { useEffect, useRef, useState } from "react";

// How far ahead of the visible area an element starts counting as "near".
// Generous on purpose: the point is to skip what nobody will see, not to make
// people watch covers pop in — a swipe should land on images already loaded.
const AHEAD_Y = 600; // px above/below the screen (most of a phone screen)
const AHEAD_X = 600; // px past a carousel's visible edge (3–4 cards)
// Once a carousel is actually being swiped, look much further ahead in it:
// whoever swipes once tends to keep going, faster than covers can load.
const AHEAD_X_SWIPING = 1200;

/** Nearest ancestor that scrolls horizontally — a carousel — or null. */
function horizontalScroller(el: Element): Element | null {
  for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
    const overflowX = getComputedStyle(p).overflowX;
    if (overflowX === "auto" || overflowX === "scroll") return p;
  }
  return null;
}

/**
 * True once the element has come near the visible area — and stays true.
 *
 * A tighter replacement for `<img loading="lazy">` on the homepage carousels:
 * the browser's own lazy loading starts fetching ~1250px ahead in every
 * direction, so a phone that shows 6 covers downloaded 21 (the off-screen
 * cards of both carousels plus a strip two screens down). Each one is a
 * request to our CDN on a first visit.
 *
 * Inside a carousel "near" means both: the carousel is within AHEAD_Y of the
 * screen, and the card is within AHEAD_X of the carousel's visible part
 * (AHEAD_X_SWIPING after the carousel's first scroll). Two observers rather
 * than one with `scrollMargin`, which Safari and older browsers don't
 * support — there the cards past the edge would only start loading as they
 * slid into view.
 */
export function useNearViewport<T extends Element>(enabled = true) {
  const ref = useRef<T | null>(null);
  const [near, setNear] = useState(false);

  useEffect(() => {
    if (!enabled || near) return;
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      const id = requestAnimationFrame(() => setNear(true));
      return () => cancelAnimationFrame(id);
    }

    const observers: IntersectionObserver[] = [];
    const done = () => {
      setNear(true);
      observers.forEach((io) => io.disconnect());
    };
    const watch = (
      target: Element,
      options: IntersectionObserverInit,
      onChange: (intersecting: boolean) => void,
    ) => {
      const io = new IntersectionObserver(
        (entries) => onChange(entries[entries.length - 1].isIntersecting),
        options,
      );
      io.observe(target);
      observers.push(io);
    };

    const scroller = horizontalScroller(el);
    if (!scroller) {
      watch(el, { rootMargin: `${AHEAD_Y}px ${AHEAD_X}px` }, (hit) => hit && done());
    } else {
      let stripNear = false;
      let cardNear = false;
      const check = () => stripNear && cardNear && done();
      watch(scroller, { rootMargin: `${AHEAD_Y}px 0px` }, (hit) => {
        stripNear = hit;
        check();
      });
      watch(el, { root: scroller, rootMargin: `0px ${AHEAD_X}px` }, (hit) => {
        cardNear = hit;
        check();
      });
      const onSwipe = () =>
        watch(el, { root: scroller, rootMargin: `0px ${AHEAD_X_SWIPING}px` }, (hit) => {
          if (hit) cardNear = true;
          check();
        });
      scroller.addEventListener("scroll", onSwipe, { once: true, passive: true });
      return () => {
        scroller.removeEventListener("scroll", onSwipe);
        observers.forEach((io) => io.disconnect());
      };
    }
    return () => observers.forEach((io) => io.disconnect());
  }, [enabled, near]);

  return [ref, near] as const;
}
