import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/**
 * Site motion: smooth scroll (Lenis) + scroll-reveal / parallax (GSAP) +
 * a sticky-nav solidify on scroll.
 *
 * Everything degrades gracefully: under prefers-reduced-motion we reveal
 * instantly and skip the smooth-scroll hijack. The page is fully readable
 * with JS disabled.
 */
export function initMotion(): void {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const reveals = gsap.utils.toArray<HTMLElement>("[data-reveal]");

  /* Sticky nav: solidify after scrolling past the top. Runs in every mode via a
     native scroll listener, so reduced-motion users also get a readable nav
     (important over the light Paper section). */
  const navEl = document.querySelector<HTMLElement>("[data-nav]");
  if (navEl) {
    const syncNav = () => navEl.classList.toggle("is-stuck", window.scrollY > 8);
    window.addEventListener("scroll", syncNav, { passive: true });
    syncNav();
  }

  if (reduce) {
    reveals.forEach((el) => el.classList.add("is-revealed"));
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  /* ---- Lenis smooth scroll, driven by GSAP's ticker ---- */
  const lenis = new Lenis({
    duration: 1.05,
    easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
  });
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((time: number) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);

  /* In-page anchor links route through Lenis for a smooth glide */
  document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const id = a.getAttribute("href");
      if (!id || id === "#") return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      lenis.scrollTo(target as HTMLElement, { offset: -72, duration: 1.1 });
    });
  });

  /* ---- Scroll-reveal, batched & staggered by group ---- */
  ScrollTrigger.batch("[data-reveal]", {
    start: "top 88%",
    onEnter: (batch) =>
      gsap.to(batch, {
        opacity: 1,
        y: 0,
        duration: 0.9,
        ease: "expo.out",
        stagger: 0.08,
        overwrite: "auto",
      }),
  });

  /* ---- Parallax accents ---- */
  gsap.utils.toArray<HTMLElement>("[data-parallax]").forEach((el) => {
    const depth = parseFloat(el.dataset.parallax || "10");
    gsap.to(el, {
      yPercent: -depth,
      ease: "none",
      scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: true },
    });
  });

  /* Recalculate once fonts settle to avoid scroll-trigger drift */
  if (document.fonts?.ready) document.fonts.ready.then(() => ScrollTrigger.refresh());
}
