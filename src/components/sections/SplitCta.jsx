import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import useReveal from "../../hooks/useReveal";
import TypedHeading from "../TypedHeading";
import MagneticButton from "../MagneticButton";
import cta from "../../assets/People/cta.jpg";

gsap.registerPlugin(ScrollTrigger);

/**
 * SECTION 10 — DOUBLE APPEL À L'ACTION : DEUX TRAJECTOIRES
 *
 * Deux façons de partir, présentées comme la face nuit et la face jour d'une
 * même planète :
 *
 *   ┌──────── NUIT ────────┐  ◐  ┌──────── JOUR ────────┐
 *   │ Décollage immédiat   │(    │ Exploration libre     │
 *   │ Un projet en tête ?  │ ))  │ Pas encore prêt ?     │
 *   │ [demander un devis]  │     │ [recevoir le book]    │
 *   └──────────────────────┘     └───────────────────────┘
 *
 * La planète centrale est éclairée d'un côté seulement (côté jour). À
 * l'entrée dans l'écran, les deux panneaux sortent de derrière elle en
 * s'écartant, elle pivote jusqu'à sa place et deux orbites se tracent vers
 * chaque panneau. Au survol d'un panneau, son orbite s'illumine.
 */

const SPARK =
  "M0 -10 C1.2 -2.4 2.4 -1.2 10 0 C2.4 1.2 1.2 2.4 0 10 C-1.2 2.4 -2.4 1.2 -10 0 C-2.4 -1.2 -1.2 -2.4 0 -10Z";

/* quelques étoiles pour la face nuit (x %, y %, taille px) */
const NIGHT_STARS = [
  [12, 18, 7], [34, 10, 5], [58, 22, 9], [80, 14, 6], [90, 40, 5], [70, 62, 7],
  [22, 70, 6], [46, 84, 5], [86, 86, 8], [8, 46, 5],
];

export default function SplitCta() {
  const ref = useRef(null);
  const revealRoot = useReveal();
  const [side, setSide] = useState(null); // "night" | "day" | null

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const ctx = gsap.context(() => {
      const q = (s) => el.querySelector(s);
      const night = q("[data-night]");
      const day = q("[data-day]");
      const planet = q("[data-planet]");
      const orbits = el.querySelectorAll("[data-orbit]");

      gsap.set(orbits, { strokeDasharray: 1, strokeDashoffset: reduced ? 0 : 1 });
      if (reduced) return;

      const mm = gsap.matchMedia();
      mm.add("(min-width: 768px)", () => {
        const tl = gsap.timeline({
          scrollTrigger: { trigger: el, start: "top 85%", end: "center 55%", scrub: 1 },
        });
        /* les panneaux sortent de derrière la planète */
        tl.fromTo(night, { xPercent: 28, opacity: 0, clipPath: "inset(0% 0% 0% 60%)" }, { xPercent: 0, opacity: 1, clipPath: "inset(0% 0% 0% 0%)", ease: "power3.out" }, 0)
          .fromTo(day, { xPercent: -28, opacity: 0, clipPath: "inset(0% 60% 0% 0%)" }, { xPercent: 0, opacity: 1, clipPath: "inset(0% 0% 0% 0%)", ease: "power3.out" }, 0)
          .fromTo(planet, { scale: 0.55, rotate: -60 }, { scale: 1, rotate: 0, ease: "power2.out" }, 0)
          .to(orbits, { strokeDashoffset: 0, ease: "none", stagger: 0.1 }, 0.3);
      });
      mm.add("(max-width: 767px)", () => {
        [night, day].forEach((panel) =>
          gsap.fromTo(panel, { y: 50, opacity: 0 }, {
            y: 0, opacity: 1, duration: 1, ease: "expo.out",
            scrollTrigger: { trigger: panel, start: "top 88%" },
          })
        );
        gsap.set(orbits, { strokeDashoffset: 0 });
      });
    }, el);

    return () => ctx.revert();
  }, []);

  const dim = (which) => (side && side !== which ? "opacity-30" : "opacity-100");

  return (
    <section ref={ref} aria-label="Démarrer un projet" className="overflow-hidden bg-ivoire py-16 md:py-24">
      <div ref={revealRoot} className="edge">
        <div className="mb-10 flex items-center gap-4 md:mb-14">
          <span data-reveal="fade" className="eyebrow">Choisissez votre trajectoire</span>
          <span className="hairline flex-1" />
          <span data-reveal="fade" className="font-mono text-[10px] uppercase tracking-[0.2em] text-pierre">
            2 départs possibles
          </span>
        </div>

        <div className="relative grid gap-4 md:grid-cols-2 md:gap-6">
          {/* ============ FACE NUIT — décollage immédiat ============ */}
          <div
            data-night
            onMouseEnter={() => setSide("night")}
            onMouseLeave={() => setSide(null)}
            className="relative flex min-h-[380px] flex-col justify-between overflow-hidden rounded-[3px] bg-[#171A2E] p-8 text-ivoire will-change-transform md:min-h-[440px] md:p-10 md:pr-36 lg:pr-40"
          >
            {NIGHT_STARS.map(([x, y, s], k) => (
              <svg
                key={k}
                aria-hidden="true"
                viewBox="-12 -12 24 24"
                className="twinkle-star absolute"
                style={{ left: `${x}%`, top: `${y}%`, width: s, height: s, "--tw": `${2.4 + (k % 4) * 0.5}s`, "--tw-delay": `${k * 0.3}s` }}
              >
                <path d={SPARK} fill={k % 3 ? "#F1ECE0" : "#C8B88A"} />
              </svg>
            ))}

            <div className="relative">
              <span className="mb-6 inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-dore">
                <span className="h-1.5 w-1.5 rounded-full bg-dore shadow-[0_0_8px_rgba(200,184,138,0.9)]" />
                Décollage immédiat
              </span>
              <TypedHeading
                as="h2"
                className="text-d3 font-black leading-[0.95]"
                text="Un projet en tête ? Dites-nous tout."
                html={'Un projet en tête ?<br /><span class="font-display font-normal italic text-dore">Dites-nous tout.</span>'}
              />
              <p className="mt-5 max-w-sm text-[15px] leading-relaxed text-ivoire/70">
                Décrivez votre besoin en trois lignes. Réponse sous 24 h ouvrées,
                avec une première estimation de budget et de délai.
              </p>
            </div>

            <div className="relative mt-8 flex flex-wrap items-center gap-5">
              <MagneticButton href="#contact" variant="light">
                demander un devis
              </MagneticButton>
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ivoire/45">T−24 h · réponse</span>
            </div>
          </div>

          {/* ============ FACE JOUR — exploration libre ============ */}
          <div
            data-day
            onMouseEnter={() => setSide("day")}
            onMouseLeave={() => setSide(null)}
            className="relative flex min-h-[380px] flex-col justify-between overflow-hidden rounded-[3px] border border-charbon/10 bg-blanc p-8 will-change-transform md:min-h-[440px] md:p-10 md:pl-36 lg:pl-40"
          >
            {/* grille de carte du ciel, côté jour */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 opacity-70"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(58,70,128,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(58,70,128,0.06) 1px, transparent 1px)",
                backgroundSize: "40px 40px",
              }}
            />

            <div className="relative">
              <span className="mb-6 inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-bronze">
                <span className="h-1.5 w-1.5 rounded-full border border-bronze" />
                Exploration libre
              </span>
              <TypedHeading
                as="h2"
                className="text-d3 font-black leading-[0.95]"
                text="Pas encore prêt ? Prenez le book."
                html={'Pas encore prêt ?<br /><span class="font-display font-normal italic text-bronze">Prenez le book.</span>'}
              />
              <p className="mt-5 max-w-sm text-[15px] leading-relaxed text-pierre">
                12 projets détaillés, nos tarifs de départ et la liste des
                questions à se poser avant de lancer une refonte.
              </p>
            </div>

            <div className="relative mt-8 flex flex-wrap items-center gap-5">
              <MagneticButton href="#contact" variant="outline">
                recevoir le book (PDF)
              </MagneticButton>
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-pierre">PDF · 12 projets</span>
            </div>
          </div>

          {/* ============ LA PLANÈTE, entre les deux faces ============ */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-1/2 z-20 hidden h-40 w-40 -translate-x-1/2 -translate-y-1/2 md:block lg:h-48 lg:w-48"
          >
            {/* orbites vers chaque panneau */}
            <svg viewBox="-100 -100 200 200" className="absolute inset-[-45%] h-[190%] w-[190%] overflow-visible">
              <ellipse
                data-orbit
                rx="96"
                ry="30"
                transform="rotate(-14)"
                pathLength="1"
                fill="none"
                stroke="#C8B88A"
                strokeWidth="0.8"
                className={`transition-opacity duration-500 ${dim("night")}`}
              />
              <ellipse
                data-orbit
                rx="86"
                ry="24"
                transform="rotate(12)"
                pathLength="1"
                fill="none"
                stroke="#3A4680"
                strokeWidth="0.8"
                className={`transition-opacity duration-500 ${dim("day")}`}
              />
            </svg>

            <div data-planet className="relative h-full w-full">
              <div className="absolute inset-[-12%] rounded-full bg-[radial-gradient(closest-side,rgba(200,184,138,0.35),transparent)] blur-md" />
              <img
                src={cta}
                alt=""
                className="relative h-full w-full rounded-full object-cover ring-4 ring-ivoire"
                style={{ filter: "url(#nova-map-teal)" }}
              />
              {/* terminateur : moitié gauche dans la nuit, moitié droite au jour */}
              <div
                className="absolute inset-0 rounded-full"
                style={{ background: "linear-gradient(90deg, rgba(23,26,46,0.85) 0%, rgba(23,26,46,0.55) 38%, transparent 62%)" }}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
