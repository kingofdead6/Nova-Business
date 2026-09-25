import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import LiquidVeil from "../LiquidVeil";
import { initReveals } from "../../lib/reveal";
import TypedHeading from "../TypedHeading";
import { services } from "../../data/site";

gsap.registerPlugin(ScrollTrigger);

/**
 * SECTION 05 — SERVICES : LE CARNET DE MISSION
 *
 * Chaque métier est une MISSION vers une planète. La section s'épingle et
 * les quatre missions défilent à l'horizontale, comme un voyage : on
 * descend, le vaisseau avance. Une trajectoire en pointillés relie les
 * planètes et se trace au rythme du trajet ; en bas, un tableau de bord
 * indique la mission en cours et la distance parcourue.
 *
 *   ┌ MISSION 01 ─────────────── AD 04h 12m · DÉC +22° ┐
 *   │    ◯═══ planète          Sites & plateformes      │
 *   │   (lune en orbite)       lede                     │
 *   │                          CHARGE UTILE             │
 *   │                          Sites vitrines ····· a   │
 *   └───────────────────────────────────────────────────┘  ─ ─ ─ → mission 02
 *
 * MODES
 *  - horizontal (toutes largeurs, mouvement autorisé) : épinglage +
 *    défilement latéral scrubé. Le mode est posé par JS (`data-mode="h"`).
 *    Sur téléphone, les panneaux sont plus larges et plus compacts
 *    (planète réduite, texte resserré) pour tenir dans un écran.
 *  - vertical (sans JS, mouvement réduit) : pile simple et lisible.
 *
 * Le raccord avec Values ne change pas : la matière sombre arrive pleine en
 * haut de section et se retire (LiquidVeil `reverse`). Pas d'`overflow-hidden`
 * sur la <section> : il casserait l'épinglage.
 */

/* Données propres à la mise en scène (le contenu reste dans data/site). */
const MISSIONS = [
  { coord: "AD 04h 12m · DÉC +22°", map: "teal", orbit: 14, tilt: -18 },
  { coord: "AD 09h 47m · DÉC −08°", map: "rose", orbit: 18, tilt: 14 },
  { coord: "AD 13h 05m · DÉC +41°", map: "aurora", orbit: 12, tilt: -26 },
  { coord: "AD 21h 33m · DÉC −17°", map: "teal", orbit: 20, tilt: 22 },
];

/* distance affichée au tableau de bord, en unités astronomiques */
const TOTAL_UA = 38.4;

/** Coins de repérage façon dessin technique. */
function CropMarks() {
  const base = "pointer-events-none absolute h-4 w-4 border-bronze/60";
  return (
    <>
      <span aria-hidden="true" className={`${base} -left-px -top-px border-l border-t`} />
      <span aria-hidden="true" className={`${base} -right-px -top-px border-r border-t`} />
      <span aria-hidden="true" className={`${base} -bottom-px -left-px border-b border-l`} />
      <span aria-hidden="true" className={`${base} -bottom-px -right-px border-b border-r`} />
    </>
  );
}

/** La planète : visuel rond coloré par gradient map, anneau incliné, lune. */
function Planet({ src, label, mission }) {
  return (
    <div data-planet className="relative mx-auto aspect-square w-full max-w-[320px] max-md:group-data-[mode=h]:max-w-[min(150px,19svh)]">
      {/* halo de l'atmosphère */}
      <div
        aria-hidden="true"
        className="absolute inset-[-10%] rounded-full opacity-60 blur-2xl"
        style={{
          background:
            "radial-gradient(closest-side, rgba(124,243,227,0.35), rgba(180,156,255,0.2) 60%, transparent)",
        }}
      />

      <img
        data-planet-img
        src={src}
        alt={label}
        loading="lazy"
        className="relative h-full w-full rounded-full object-cover shadow-[inset_-30px_-30px_60px_rgba(0,0,0,0.45)] will-change-transform"
        style={{ filter: `url(#nova-map-${mission.map})` }}
      />

      {/* ombre du terminateur : la planète a un côté nuit */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-full"
        style={{
          background:
            "radial-gradient(circle at 32% 30%, transparent 38%, rgba(23,26,46,0.55) 78%, rgba(23,26,46,0.8))",
        }}
      />

      {/* anneau incliné */}
      <svg
        aria-hidden="true"
        viewBox="-100 -100 200 200"
        className="pointer-events-none absolute inset-[-22%] h-[144%] w-[144%] overflow-visible"
        style={{ transform: `rotate(${mission.tilt}deg)` }}
      >
        <ellipse rx="92" ry="20" fill="none" stroke="#3A4680" strokeOpacity="0.55" strokeWidth="0.8" />
        <ellipse
          rx="84"
          ry="17"
          fill="none"
          stroke="#C8B88A"
          strokeOpacity="0.8"
          strokeWidth="0.6"
          strokeDasharray="1.5 3"
        />
      </svg>

      {/* lune en orbite */}
      <div
        aria-hidden="true"
        className="orbit-moon pointer-events-none absolute inset-[-12%]"
        style={{ "--orbit": `${mission.orbit}s` }}
      >
        <span className="absolute left-1/2 top-0 block h-3 w-3 -translate-x-1/2 rounded-full bg-dore shadow-[0_0_12px_rgba(200,184,138,0.9)]" />
      </div>
    </div>
  );
}

export default function Services() {
  const root = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      initReveals(root.current);

      const q = (sel) => root.current.querySelector(sel);
      const wrap = q("[data-track-wrap]");
      const track = q("[data-track]");
      const panels = gsap.utils.toArray("[data-panel]");
      const trail = q("[data-trail]");
      const hudIndex = q("[data-hud-index]");
      const hudDist = q("[data-hud-dist]");
      const hudBar = q("[data-hud-bar]");
      if (!wrap || !track) return;

      const mm = gsap.matchMedia();

      /* -------------------------------------------------------------- */
      /* HORIZONTAL — le voyage                                          */
      /* -------------------------------------------------------------- */
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        wrap.dataset.mode = "h";

        const distance = () => Math.max(0, track.scrollWidth - wrap.clientWidth);

        const setHud = (p) => {
          const i = Math.round(p * (panels.length - 1));
          if (hudIndex) hudIndex.textContent = String(i + 1).padStart(2, "0");
          if (hudDist) hudDist.textContent = (p * TOTAL_UA).toFixed(1);
        };
        setHud(0);

        const travel = gsap.to(track, {
          x: () => -distance(),
          ease: "none",
          scrollTrigger: {
            trigger: wrap,
            start: "top top",
            end: () => `+=${distance()}`,
            pin: true,
            scrub: 1,
            invalidateOnRefresh: true,
            onUpdate: (self) => setHud(self.progress),
          },
        });

        /* la trajectoire se trace et la jauge se remplit avec le trajet */
        if (trail) {
          gsap.fromTo(trail, { scaleX: 0 }, {
            scaleX: 1,
            ease: "none",
            transformOrigin: "0% 50%",
            scrollTrigger: { trigger: wrap, start: "top top", end: () => `+=${distance()}`, scrub: 1 },
          });
        }
        if (hudBar) {
          gsap.fromTo(hudBar, { scaleX: 0 }, {
            scaleX: 1,
            ease: "none",
            transformOrigin: "0% 50%",
            scrollTrigger: { trigger: wrap, start: "top top", end: () => `+=${distance()}`, scrub: 1 },
          });
        }

        /*
         * Chaque panneau « arrive » quand il entre par la droite : la planète
         * grossit en tournant, le texte glisse. `containerAnimation` indexe
         * ces déclencheurs sur le défilement latéral, pas sur le vertical.
         */
        panels.forEach((panel) => {
          const planet = panel.querySelector("[data-planet]");
          const img = panel.querySelector("[data-planet-img]");
          const copy = panel.querySelector("[data-copy]");

          const arrive = gsap.timeline({
            scrollTrigger: {
              trigger: panel,
              containerAnimation: travel,
              start: "left 95%",
              end: "left 35%",
              scrub: 1,
            },
          });
          if (planet) arrive.fromTo(planet, { scale: 0.6, rotate: -25, opacity: 0.4 }, { scale: 1, rotate: 0, opacity: 1, ease: "power2.out" }, 0);
          if (copy) arrive.fromTo(copy, { x: 80, opacity: 0 }, { x: 0, opacity: 1, ease: "power2.out" }, 0.15);

          /* la surface tourne lentement pendant toute la traversée */
          if (img) {
            gsap.fromTo(img, { rotate: -20 }, {
              rotate: 20,
              ease: "none",
              scrollTrigger: { trigger: panel, containerAnimation: travel, start: "left right", end: "right left", scrub: 1 },
            });
          }
        });

        return () => {
          delete wrap.dataset.mode;
        };
      });

    }, root);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={root}
      id="services"
      className="relative bg-ivoire pb-24 pt-[42vh] max-md:overflow-x-clip md:pb-0 md:pt-[48vh]"
    >
      {/*
        COULÉE DE RACCORD — sortie de la section Values : la matière arrive
        pleine et se retire vers le haut pendant qu'on descend. `top 92%` :
        elle ne démarre qu'à la frontière, pour laisser Values tranquille.
      */}
      <LiquidVeil flip reverse start="top 92%" end="top 10%" />

      {/* ========================= EN-TÊTE ========================= */}
      <div className="edge relative z-10">
        <div className="mb-12 flex flex-col justify-between gap-6 md:mb-16 md:flex-row md:items-end">
          <div className="max-w-xl">
            <span data-reveal="fade" className="eyebrow mb-6 block">
              Services — carnet de mission
            </span>
            <TypedHeading
              as="h2"
              className="text-d2 font-medium"
              text="Quatre missions, un seul équipage"
              html={'Quatre missions, <span class="font-display italic text-bronze">un seul équipage</span>'}
            />
          </div>
          <div data-reveal="fade" data-reveal-delay="0.15" className="max-w-xs">
            <p className="text-[15px] leading-relaxed text-pierre">
              Vous pouvez tout nous confier ou piocher une seule destination. On
              embarque aussi en renfort d&apos;une équipe interne.
            </p>
            <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.2em] text-bronze/70">
              4 destinations · 1 équipage · départ sur demande
            </p>
          </div>
        </div>
      </div>

      {/* ========================= LE VOYAGE ========================= */}
      <div
        data-track-wrap
        className="group relative z-10 data-[mode=h]:flex data-[mode=h]:h-screen data-[mode=h]:flex-col data-[mode=h]:justify-center data-[mode=h]:overflow-hidden max-md:data-[mode=h]:pb-12"
      >
        {/* fond de carte du ciel : grille fine + cercles de coordonnées */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 hidden opacity-60 group-data-[mode=h]:block"
          style={{
            backgroundImage:
              "linear-gradient(rgba(58,70,128,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(58,70,128,0.07) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
          }}
        />

        <div
          data-track
          className="
            edge relative flex flex-col gap-6
            group-data-[mode=h]:w-max group-data-[mode=h]:max-w-none group-data-[mode=h]:flex-row
            group-data-[mode=h]:items-center group-data-[mode=h]:gap-[8vw] group-data-[mode=h]:pr-[12vw]
            will-change-transform
          "
        >
          {/* trajectoire : pointillés fixes + tracé plein qui avance */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-0 right-0 top-1/2 hidden h-px group-data-[mode=h]:block"
          >
            <span className="absolute inset-0 border-t border-dashed border-bronze/30" />
            <span data-trail className="absolute inset-0 bg-bronze/70" />
          </div>

          {services.map((s, i) => {
            const mission = MISSIONS[i % MISSIONS.length];
            return (
              <article
                key={s.index}
                data-panel
                className="
                  relative shrink-0 border border-charbon/15 bg-blanc/80 p-6 backdrop-blur-[2px] md:p-10
                  group-data-[mode=h]:w-[86vw] md:group-data-[mode=h]:w-[74vw] group-data-[mode=h]:max-w-[1040px]
                  max-md:group-data-[mode=h]:p-5
                  lg:group-data-[mode=h]:w-[64vw]
                "
              >
                <CropMarks />

                {/* bandeau de mission */}
                <header className="mb-8 flex items-center gap-4 max-md:group-data-[mode=h]:mb-4 md:mb-10">
                  <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-bronze">
                    Mission {s.index}
                  </span>
                  <span className="hairline flex-1" />
                  <span className="hidden font-mono text-[10px] tracking-[0.14em] text-pierre sm:inline">
                    {mission.coord}
                  </span>
                </header>

                <div className="grid items-center gap-10 max-md:group-data-[mode=h]:gap-4 md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] md:gap-14">
                  <Planet src={s.img} label={s.mediaLabel} mission={mission} />

                  <div data-copy>
                    <TypedHeading as="h3" className="text-d3 font-bold tracking-tight" text={s.title} speed={34} />
                    <p className="mt-4 max-w-md text-[15px] leading-relaxed text-pierre max-md:group-data-[mode=h]:mt-2 max-md:group-data-[mode=h]:text-[14px] md:text-base">{s.lede}</p>

                    <span className="eyebrow mb-3 mt-8 block text-bronze/80 max-md:group-data-[mode=h]:mb-1 max-md:group-data-[mode=h]:mt-4">Charge utile</span>
                    <ul className="max-w-md">
                      {s.items.map((item, k) => (
                        <li key={item} className="flex items-baseline gap-3 py-1.5 text-[15px] text-charbon/85 max-md:group-data-[mode=h]:py-1 max-md:group-data-[mode=h]:text-[13px]">
                          <span>{item}</span>
                          <span aria-hidden="true" className="flex-1 translate-y-[-3px] border-b border-dotted border-charbon/25" />
                          <span className="font-mono text-[11px] text-bronze/80">
                            {String.fromCharCode(97 + k)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {/* tableau de bord : mission en cours + distance parcourue */}
        <div
          aria-hidden="true"
          className="edge pointer-events-none absolute inset-x-0 bottom-8 hidden items-center gap-6 max-md:bottom-5 max-md:gap-3 group-data-[mode=h]:flex"
        >
          <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-bronze">
            Mission <span data-hud-index>01</span> / {String(services.length).padStart(2, "0")}
          </span>
          <span className="relative h-px flex-1 bg-charbon/10">
            <span data-hud-bar className="absolute inset-0 bg-bronze" />
          </span>
          <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-pierre">
            <span data-hud-dist>0.0</span> ua parcourues
          </span>
        </div>
      </div>
    </section>
  );
}
