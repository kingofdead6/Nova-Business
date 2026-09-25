import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import { splitWords } from "../../lib/text";
import { journal } from "../../data/site";

gsap.registerPlugin(ScrollTrigger);

/**
 * SECTION 11 — JOURNAL DE BORD
 *
 * Les articles sont des ENTRÉES du journal de bord de l'équipage : une
 * entrée à la une, deux entrées secondaires empilées.
 *
 *   ┌──────────────────────────────┐ ┌──────┬──────────────┐
 *   │ ENTRÉE 01 · DATE STELLAIRE…  │ │ img  │ ENTRÉE 02 …  │
 *   │           [ couverture ]     │ ├──────┼──────────────┤
 *   │ Titre à la une               │ │ img  │ ENTRÉE 03 …  │
 *   └──────────────────────────────┘ └──────┴──────────────┘
 *
 * ANIMATIONS
 *  - chaque couverture est révélée par un BALAYAGE DIAGONAL, comme l'aube
 *    qui passe le terminateur d'une planète : un bord doré file en tête ;
 *  - l'image se resserre et dérive légèrement au scroll (parallaxe) ;
 *  - les titres montent mot à mot ;
 *  - au survol : l'image s'approche, un satellite suit le filet du bas.
 *
 * Les couvertures reçoivent un gradient map de la palette (ColorFilters) :
 * le journal garde la même lumière que le reste du site.
 */

const MAPS = ["rose", "teal", "aurora"];

/* dates stellaires décoratives (année.jour) */
const STARDATES = ["2026.214", "2026.187", "2026.152"];

function Entry({ post, i, featured }) {
  return (
    <article
      data-entry
      className={`group relative ${featured ? "md:col-span-7" : ""}`}
    >
      <a
        href="#journal"
        data-cursor="hover"
        data-cursor-text="lire"
        className={`block ${featured ? "" : "sm:grid sm:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] sm:items-center sm:gap-5 md:gap-6"}`}
      >
        {/* ---------------- couverture ---------------- */}
        <div className="relative overflow-hidden rounded-[3px] bg-charbon">
          <div data-cover className="relative overflow-hidden">
            {/* enveloppe animée par GSAP (resserrement + parallaxe) ; le zoom de survol reste sur l'image */}
            <div data-cover-move className="will-change-transform">
            <img
              src={post.img}
              alt=""
              loading="lazy"
              className={`block w-full object-cover transition-transform duration-[1200ms] ease-nova will-change-transform group-hover:scale-[1.07] ${
                featured ? "aspect-[16/10]" : "aspect-[4/3]"
              }`}
              style={{ filter: `url(#nova-map-${MAPS[i % MAPS.length]})` }}
            />
            </div>
          </div>
          {/* bord doré du balayage */}
          <span
            data-sweep
            aria-hidden="true"
            className="pointer-events-none absolute -top-[10%] h-[120%] w-[2px] origin-center rotate-[14deg] bg-gradient-to-b from-transparent via-dore to-transparent opacity-0 shadow-[0_0_14px_rgba(200,184,138,0.9)]"
          />
          {featured && (
            <span className="absolute left-4 top-4 rounded-sm bg-charbon/65 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-dore backdrop-blur-sm">
              À la une
            </span>
          )}
        </div>

        {/* ---------------- texte ---------------- */}
        <div className={featured ? "mt-6" : "mt-5 sm:mt-0"}>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px] uppercase tracking-[0.18em]">
            <span className="text-bronze">Entrée {String(i + 1).padStart(2, "0")}</span>
            <span className="text-pierre/60">·</span>
            <span className="text-pierre">Date stellaire {STARDATES[i % STARDATES.length]}</span>
          </div>

          <h3
            data-entry-title
            className={`mt-3 font-semibold leading-snug tracking-tight transition-colors duration-500 group-hover:text-bronze ${
              featured ? "text-2xl md:text-[2rem] md:leading-[1.15]" : "text-lg md:text-xl"
            }`}
          >
            {post.title}
          </h3>

          <div className="mt-4 flex items-center gap-3">
            <span className="rounded-full border border-charbon/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-bronze">
              {post.tag}
            </span>
            <span className="font-mono text-[10px] text-pierre">{post.read} de lecture</span>
          </div>

          {/* filet + satellite qui le parcourt au survol */}
          <span className="relative mt-5 block h-px w-full bg-charbon/10">
            <span className="absolute inset-y-0 left-0 block w-full origin-left scale-x-0 bg-bronze transition-transform duration-700 ease-nova group-hover:scale-x-100" />
            <span className="absolute -top-[3px] left-0 block h-[7px] w-[7px] rounded-full bg-dore opacity-0 shadow-[0_0_8px_rgba(200,184,138,0.9)] transition-all duration-700 ease-nova group-hover:left-[calc(100%-7px)] group-hover:opacity-100" />
          </span>
        </div>
      </a>
    </article>
  );
}

export default function Journal() {
  const root = useRef(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return undefined;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const ctx = gsap.context(() => {
      const q = (s) => el.querySelector(s);
      const title = q("[data-journal-title]");
      const rule = q("[data-journal-rule]");
      const eyebrow = q("[data-journal-eyebrow]");

      if (reduced) return;

      /* en-tête : l'eyebrow, le titre mot à mot, le filet */
      const head = gsap.timeline({ scrollTrigger: { trigger: q("[data-journal-head]"), start: "top 80%" } });
      if (eyebrow) head.fromTo(eyebrow, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.8, ease: "expo.out" }, 0);
      if (title) head.from(splitWords(title), { yPercent: 110, duration: 1.1, ease: "expo.out", stagger: 0.07 }, 0.1);
      if (rule) head.fromTo(rule, { scaleX: 0 }, { scaleX: 1, transformOrigin: "0% 50%", duration: 1.4, ease: "expo.inOut" }, 0.2);

      el.querySelectorAll("[data-entry]").forEach((entry) => {
        const cover = entry.querySelector("[data-cover]");
        const move = entry.querySelector("[data-cover-move]");
        const sweep = entry.querySelector("[data-sweep]");
        const heading = entry.querySelector("[data-entry-title]");
        const words = heading ? splitWords(heading) : [];

        /*
         * BALAYAGE DIAGONAL — un polygone dont le bord incliné avance de
         * gauche à droite. `edge` est la position du bord (en %) ; le bord
         * doré suit la même valeur.
         */
        const state = { edge: -20 };
        const paint = () => {
          const e = state.edge;
          if (cover) cover.style.clipPath = `polygon(0% 0%, ${e + 20}% 0%, ${e}% 100%, 0% 100%)`;
          if (sweep) sweep.style.left = `${e + 10}%`;
        };
        paint();

        const tl = gsap.timeline({ scrollTrigger: { trigger: entry, start: "top 85%" } });
        tl.to(state, { edge: 100, duration: 1.4, ease: "power3.inOut", onUpdate: paint }, 0)
          .to(sweep, { opacity: 1, duration: 0.2, ease: "none" }, 0)
          .to(sweep, { opacity: 0, duration: 0.3, ease: "none" }, 1.15)
          .fromTo(move, { scale: 1.25 }, { scale: 1.1, duration: 1.8, ease: "expo.out" }, 0)
          .from(words, { yPercent: 110, opacity: 0, duration: 0.9, ease: "expo.out", stagger: 0.03 }, 0.45);

        /* parallaxe douce : l'image reste agrandie à 1.1, la dérive ne découvre jamais de bord */
        gsap.fromTo(move, { yPercent: -4 }, {
          yPercent: 4,
          ease: "none",
          scrollTrigger: { trigger: entry, start: "top bottom", end: "bottom top", scrub: 1 },
        });
      });
    }, el);

    return () => ctx.revert();
  }, []);

  const [lead, ...rest] = journal;

  return (
    <section ref={root} id="journal" className="bg-ivoire py-24 md:py-32">
      <div className="edge">
        <div data-journal-head className="mb-12 md:mb-16">
          <div className="flex items-end justify-between gap-6">
            <div>
              <span data-journal-eyebrow className="eyebrow mb-6 block">
                Journal de bord
              </span>
              <h2 data-journal-title className="text-d2 font-medium lowercase">
                ce qu&apos;on <span className="font-display italic text-bronze">apprend</span>
              </h2>
            </div>
            <div className="hidden flex-col items-end gap-2 md:flex">
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-pierre">
                {String(journal.length).padStart(2, "0")} entrées récentes · écrites par l&apos;équipage
              </span>
              <a
                href="#journal"
                data-cursor="hover"
                className="link-underline font-mono text-[11px] uppercase tracking-[0.18em] text-bronze"
              >
                tout le journal →
              </a>
            </div>
          </div>
          <div data-journal-rule className="mt-8 h-px w-full bg-charbon/15" />
        </div>

        <div className="grid gap-12 md:grid-cols-12 md:gap-10 lg:gap-14">
          {lead && <Entry post={lead} i={0} featured />}

          <div className="flex flex-col gap-10 md:col-span-5 md:justify-between">
            {rest.map((post, k) => (
              <Entry key={post.title} post={post} i={k + 1} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
