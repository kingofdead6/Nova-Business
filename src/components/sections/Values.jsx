import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import Starfield from "../Starfield";
import { values } from "../../data/site";
import { splitWords } from "../../lib/text";
import valuebox1 from "../../assets/Values/valuebox1.png";
import valuebox2 from "../../assets/Values/valuebox2.png";
import valuebox3 from "../../assets/Values/valuebox3.png";

gsap.registerPlugin(ScrollTrigger);

const valueImages = [valuebox1, valuebox2, valuebox3];
const ROMAN = ["I", "II", "III"];
/* gradient map appliqué à chaque visuel — voir ColorFilters.jsx */
const MAPS = ["teal", "aurora", "rose"];

/*
 * Cap de l'aiguille pour chaque valeur (degrés, 0 = nord). Les trois repères
 * dorés du cadran sont posés à ces mêmes angles.
 */
const HEADINGS = [-50, 0, 50];

/**
 * SECTION 04 — CE QU'ON APPORTE
 *
 * Seconde moitié du diptyque ouvert par Takeover. Le raccord reste le même :
 * fond #171A2E (= dernière couche du voile), `-mt-px` contre le liseré
 * sous-pixel, et une zone de repos en haut de section.
 *
 * MISE EN PAGE — une colonne fixe, une colonne qui défile :
 *
 *   ┌──────────────────────┬──────────────────────────────┐
 *   │ eyebrow              │  ╭────╮   I                  │
 *   │ Trois choses qu'on   │  │ img│   réflexe fondateur  │ ← défile
 *   │ refuse de négocier   │  ╰────╯   texte…             │
 *   │ texte                │                              │
 *   │   (boussole) 01 / 03 │  ╭────╮   II …               │
 *   └──────────────────────┴──────────────────────────────┘
 *        `sticky` (md+)
 *
 * Seules les valeurs défilent. À gauche, une boussole en trait fin — l'autre
 * boussole du site est une rose dorée massive ; celle-ci est un instrument
 * de navigation : cadran gradué, points cardinaux, aiguille losange. Son
 * aiguille pivote vers le repère de la valeur en cours de lecture, et le
 * compteur suit.
 *
 * NB : la section est en `overflow-clip`, pas `overflow-hidden`. `hidden`
 * en fait un conteneur de défilement, ce qui neutralise `position: sticky`
 * sur la colonne de gauche.
 */

/* ------------------------------------------------------------------------ */
/* CIEL DE LA SECTION — étincelles colorées et étoiles filantes              */
/* ------------------------------------------------------------------------ */
/*
 * Par-dessus le champ discret de <Starfield>, des étincelles à quatre
 * branches dans la palette du ciel d'ouverture (or, turquoise, rose,
 * lavande). Trois plans de profondeur dérivent à des vitesses différentes au
 * scroll ; le scintillement est en CSS (`.twinkle-star`), sans JS par frame.
 * Tirage graîné : même ciel à chaque chargement.
 */

const SKY_TINTS = ["#F3D58A", "#7CF3E3", "#FF6FB5", "#B49CFF", "#F1ECE0", "#C8B88A"];
const SPARK =
  "M0 -10 C1.2 -2.4 2.4 -1.2 10 0 C2.4 1.2 1.2 2.4 0 10 C-1.2 2.4 -2.4 1.2 -10 0 C-2.4 -1.2 -1.2 -2.4 0 -10Z";

const SPARKS = (() => {
  let seed = 4721;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  return Array.from({ length: 70 }, (_, i) => ({
    x: rand() * 100,
    y: rand() * 100,
    size: 8 + rand() * 14,
    color: SKY_TINTS[Math.floor(rand() * SKY_TINTS.length)],
    plane: i % 3,
    speed: 2.2 + rand() * 2.6,
    delay: rand() * 3,
  }));
})();

/* étoiles filantes : départ (top en %), angle, fenêtre de scroll [début, fin] */
const COMETS = [
  [12, 16, 0.08, 0.2],
  [46, 11, 0.4, 0.52],
  [74, 20, 0.7, 0.82],
];

function SectionSky() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      {[0, 1, 2].map((plane) => (
        <div key={plane} data-sky-plane={plane} className="absolute inset-0 will-change-transform">
          {SPARKS.filter((sp) => sp.plane === plane).map((sp, i) => (
            <svg
              key={i}
              viewBox="-12 -12 24 24"
              className="twinkle-star absolute overflow-visible"
              style={{
                left: `${sp.x}%`,
                top: `${sp.y}%`,
                width: sp.size,
                height: sp.size,
                "--tw": `${sp.speed}s`,
                "--tw-delay": `${sp.delay}s`,
                filter: `drop-shadow(0 0 ${Math.round(sp.size / 2)}px ${sp.color})`,
              }}
            >
              <path d={SPARK} fill={sp.color} />
            </svg>
          ))}
        </div>
      ))}

      {COMETS.map(([top, angle], i) => (
        <span
          key={i}
          data-comet={i}
          className="absolute left-0 block h-[1.5px] w-[16vw] opacity-0 will-change-transform"
          style={{
            top: `${top}%`,
            rotate: `${angle}deg`,
            background: "linear-gradient(90deg, transparent, rgba(124,243,227,0.5) 45%, #FFFFFF)",
            boxShadow: "0 0 10px rgba(180,156,255,0.7)",
          }}
        />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------------ */
/* BOUSSOLE DE NAVIGATION                                                    */
/* ------------------------------------------------------------------------ */

function NavCompass() {
  const ticks = Array.from({ length: 72 }, (_, i) => i * 5);

  return (
    <svg viewBox="-110 -110 220 220" className="h-full w-full overflow-visible" aria-hidden="true">
      {/* le cadran tourne lentement au scroll, l'aiguille garde son cap */}
      <g data-dial>
        <circle r="98" fill="none" stroke="#F1ECE0" strokeOpacity="0.28" strokeWidth="0.8" />
        <circle r="84" fill="none" stroke="#F1ECE0" strokeOpacity="0.14" strokeWidth="0.6" />

        {ticks.map((deg) => {
          const major = deg % 30 === 0;
          const mid = !major && deg % 10 === 0;
          const len = major ? 10 : mid ? 6 : 3;
          return (
            <line
              key={deg}
              x1="0"
              y1={-98}
              x2="0"
              y2={-98 + len}
              stroke={major ? "#C8B88A" : "#F1ECE0"}
              strokeOpacity={major ? 0.9 : mid ? 0.45 : 0.22}
              strokeWidth={major ? 1.2 : 0.7}
              transform={`rotate(${deg})`}
            />
          );
        })}

        {[
          ["N", 0],
          ["E", 90],
          ["S", 180],
          ["O", 270],
        ].map(([label, deg]) => (
          <text
            key={label}
            transform={`rotate(${deg}) translate(0 -66) rotate(${-deg})`}
            textAnchor="middle"
            dominantBaseline="central"
            fill={label === "N" ? "#C8B88A" : "#F1ECE0"}
            fillOpacity={label === "N" ? 1 : 0.5}
            style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: 1 }}
          >
            {label}
          </text>
        ))}
      </g>

      {/* repères des trois valeurs : fixes, c'est l'aiguille qui va vers eux */}
      {HEADINGS.map((deg, i) => (
        <g key={deg} transform={`rotate(${deg})`}>
          <circle data-mark={i} cy="-104" r="3.2" fill="#C8B88A" opacity="0.35" />
        </g>
      ))}

      {/* aiguille losange : pointe dorée vers le cap, talon ivoire pâle */}
      <g data-needle>
        <path d="M0 -80 L7 0 L0 0 Z" fill="#E2BD62" />
        <path d="M0 -80 L-7 0 L0 0 Z" fill="#C8B88A" />
        <path d="M0 58 L7 0 L0 0 Z" fill="#F1ECE0" fillOpacity="0.35" />
        <path d="M0 58 L-7 0 L0 0 Z" fill="#F1ECE0" fillOpacity="0.18" />
      </g>
      <circle r="6" fill="#171A2E" stroke="#C8B88A" strokeWidth="1.4" />
      <circle r="1.8" fill="#C8B88A" />
    </svg>
  );
}

export default function Values() {
  const root = useRef(null);

  useEffect(() => {
    if (!root.current) return undefined;

    const ctx = gsap.context(() => {
      const q = (sel) => root.current.querySelector(sel);
      const qa = (sel) => Array.from(root.current.querySelectorAll(sel));
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      const title = q("[data-split]");
      const rule = q("[data-rule]");
      const eyebrow = q("[data-eyebrow]");
      const lede = q("[data-lede]");
      const compass = q("[data-compass]");
      const needles = qa("[data-needle]");
      const dial = q("[data-dial]");
      const marks = qa("[data-mark]");
      const counters = qa("[data-counter]");
      const items = qa("[data-value]");

      /* aiguille, repères, compteur, valeur mise en avant */
      let current = -1;
      const setActive = (i, instant = false) => {
        if (i === current) return;
        current = i;
        items.forEach((el, k) => el.setAttribute("data-active", String(k === i)));
        marks.forEach((m) => {
          const on = Number(m.dataset.mark) === i;
          gsap.to(m, { opacity: on ? 1 : 0.35, scale: on ? 1.5 : 1, duration: 0.5, transformOrigin: "50% 50%" });
        });
        counters.forEach((c) => {
          c.textContent = `${String(i + 1).padStart(2, "0")} / ${String(items.length).padStart(2, "0")}`;
        });
        if (needles.length) {
          gsap.to(needles, {
            rotation: HEADINGS[i] ?? 0,
            svgOrigin: "0 0",
            /* l'aiguille dépasse son cap puis s'y stabilise, comme un vrai compas */
            ease: "elastic.out(1, 0.4)",
            duration: instant ? 0 : 1.6,
            overwrite: true,
          });
        }
      };

      /* ------------------------------------------------------------------ */
      /* MOUVEMENT RÉDUIT — tout est lisible, rien ne s'anime                */
      /* ------------------------------------------------------------------ */

      if (reduced) {
        if (rule) gsap.set(rule, { scaleX: 1 });
        items.forEach((el) => el.setAttribute("data-active", "true"));
        if (needles.length) gsap.set(needles, { rotation: HEADINGS[0], svgOrigin: "0 0" });
        return;
      }

      setActive(0, true);

      /* ------------------------------------------------------------------ */
      /* CIEL — dérive en profondeur et étoiles filantes                     */
      /* ------------------------------------------------------------------ */

      qa("[data-sky-plane]").forEach((plane) => {
        const depth = Number(plane.dataset.skyPlane) + 1;
        gsap.fromTo(
          plane,
          { yPercent: 4 * depth },
          {
            yPercent: -6 * depth,
            ease: "none",
            scrollTrigger: { trigger: root.current, start: "top bottom", end: "bottom top", scrub: 1 },
          }
        );
      });

      qa("[data-comet]").forEach((comet) => {
        const [, , from, to] = COMETS[Number(comet.dataset.comet)];
        gsap
          .timeline({
            scrollTrigger: {
              trigger: root.current,
              start: () => `top+=${from * root.current.offsetHeight} center`,
              end: () => `top+=${to * root.current.offsetHeight} center`,
              scrub: 0.8,
              invalidateOnRefresh: true,
            },
          })
          .fromTo(comet, { xPercent: -120 }, { xPercent: 700, ease: "power1.in", duration: 1 }, 0)
          .to(comet, { opacity: 1, duration: 0.15, ease: "none" }, 0)
          .to(comet, { opacity: 0, duration: 0.25, ease: "none" }, 0.75);
      });

      /* ------------------------------------------------------------------ */
      /* EN-TÊTE (colonne fixe)                                              */
      /* ------------------------------------------------------------------ */

      const head = gsap.timeline({
        scrollTrigger: { trigger: q("[data-head]"), start: "top 78%" },
      });

      if (rule) {
        head.fromTo(rule, { scaleX: 0, transformOrigin: "0% 50%" }, { scaleX: 1, duration: 1.1, ease: "expo.out" }, 0);
      }
      if (eyebrow) {
        head.fromTo(eyebrow, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.9, ease: "expo.out" }, 0.1);
      }
      if (title) {
        head.from(splitWords(title), { yPercent: 110, duration: 1.1, ease: "expo.out", stagger: 0.05 }, 0.18);
      }
      if (lede) {
        head.fromTo(lede, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.9, ease: "expo.out" }, 0.42);
      }

      /*
       * La boussole se « déplie » : le cadran tourne d'un demi-tour en
       * s'agrandissant, l'aiguille arrive du sud.
       */
      if (compass) {
        head.fromTo(
          compass,
          { opacity: 0, scale: 0.6, rotate: -180 },
          { opacity: 1, scale: 1, rotate: 0, duration: 1.6, ease: "expo.out" },
          0.3
        );
      }

      /* le cadran continue de tourner doucement tant qu'on lit les valeurs */
      if (dial) {
        gsap.fromTo(
          dial,
          { rotation: 0 },
          {
            rotation: -60,
            svgOrigin: "0 0",
            ease: "none",
            scrollTrigger: {
              trigger: q("[data-values]"),
              start: "top bottom",
              end: "bottom top",
              scrub: 1.2,
            },
          }
        );
      }

      /* ------------------------------------------------------------------ */
      /* VALEURS — seule colonne qui défile (≥ 768 px)                       */
      /* ------------------------------------------------------------------ */

      const column = q("[data-values]");
      const mm = gsap.matchMedia();

      mm.add("(min-width: 768px)", () => {
      items.forEach((item, i) => {
        const frame = item.querySelector("[data-value-frame]");
        const img = item.querySelector("[data-value-img]");
        const numeral = item.querySelector("[data-value-numeral]");
        const heading = item.querySelector("[data-value-title]");
        const body = item.querySelector("[data-value-body]");
        const line = item.querySelector("[data-value-line]");

        /*
         * Entrée scrubée : l'arche s'ouvre de bas en haut, l'image se
         * resserre, puis le chiffre romain, le titre mot à mot, le texte et
         * le filet. Fenêtre courte (de l'entrée au centre de l'écran) pour
         * que tout soit posé au moment où l'aiguille désigne la valeur.
         */
        const tl = gsap.timeline({
          scrollTrigger: { trigger: item, start: "top 90%", end: "center 55%", scrub: 1 },
        });

        if (frame) tl.fromTo(frame, { clipPath: "inset(100% 0% 0% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", ease: "power2.out", duration: 1 }, 0);
        if (img) tl.fromTo(img, { scale: 1.35, yPercent: 8 }, { scale: 1, yPercent: 0, ease: "power2.out", duration: 1.2 }, 0);
        if (numeral) tl.fromTo(numeral, { opacity: 0, x: -30 }, { opacity: 1, x: 0, ease: "power2.out", duration: 0.6 }, 0.25);
        if (heading) tl.from(splitWords(heading), { yPercent: 110, ease: "power3.out", duration: 0.6, stagger: 0.08 }, 0.35);
        if (body) tl.fromTo(body, { opacity: 0, y: 24 }, { opacity: 1, y: 0, ease: "power2.out", duration: 0.6 }, 0.55);
        if (line) tl.fromTo(line, { scaleX: 0, transformOrigin: "0% 50%" }, { scaleX: 1, ease: "power2.inOut", duration: 0.6 }, 0.7);

        /* parallaxe douce de l'image dans son arche pendant la traversée */
        if (img) {
          gsap.to(img, {
            yPercent: -8,
            ease: "none",
            scrollTrigger: { trigger: item, start: "center 55%", end: "bottom top", scrub: 1 },
          });
        }

      });

      /*
       * La valeur au centre de l'écran prend l'aiguille.
       *
       * Un seul déclencheur sur toute la colonne, et non un par valeur : avec
       * des déclencheurs séparés, un saut de scroll (ancre, défilement
       * rapide) pouvait franchir une valeur sans jamais la rendre « active »,
       * et l'aiguille restait sur la précédente. Ici l'index se déduit de la
       * progression — il est donc toujours juste, même après un saut.
       */
      if (column && items.length) {
        const pick = (p) => Math.min(items.length - 1, Math.floor(p * items.length));
        ScrollTrigger.create({
          trigger: column,
          start: "top 55%",
          end: "bottom 55%",
          onUpdate: (self) => setActive(pick(self.progress)),
          onLeave: () => setActive(items.length - 1),
          onLeaveBack: () => setActive(0),
        });
      }
      });

      /* ------------------------------------------------------------------ */
      /* TÉLÉPHONE — LE JEU DE CARTES                                        */
      /* ------------------------------------------------------------------ */
      /*
       * Les trois valeurs deviennent un paquet de cartes empilées. La
       * colonne s'épingle ; au scroll, la carte du dessus s'envole en
       * tournoyant (à gauche, puis à droite…) et découvre la suivante, qui
       * avance d'un cran. Une mini-boussole au-dessus du paquet suit la
       * carte visible, comme la grande sur bureau.
       */
      mm.add("(max-width: 767px)", () => {
        if (!column || items.length < 2) return undefined;
        column.dataset.mode = "deck";
        const n = items.length;
        const STEP = 16; // décalage vertical entre deux cartes du paquet (px)
        const SHRINK = 0.05;

        items.forEach((it, k) =>
          gsap.set(it, { zIndex: n - k, y: k * STEP, scale: 1 - k * SHRINK, transformOrigin: "50% 0%" })
        );

        const HOLD = 0.4;
        const deck = gsap.timeline({
          scrollTrigger: {
            trigger: column,
            start: "top top",
            end: () => `+=${window.innerHeight * 0.85 * (n - 1 + HOLD)}`,
            pin: true,
            scrub: 0.8,
            invalidateOnRefresh: true,
            onUpdate: (self) => {
              const t = self.progress * (n - 1 + HOLD);
              setActive(Math.min(n - 1, Math.floor(t + 0.5)));
            },
          },
        });

        for (let k = 0; k < n - 1; k += 1) {
          const dir = k % 2 === 0 ? -1 : 1;
          /* la carte du dessus s'envole en tournoyant */
          deck.to(
            items[k],
            { xPercent: 125 * dir, y: `-=${60}`, rotate: 22 * dir, opacity: 0, ease: "power2.in", duration: 1 },
            k
          );
          /* les suivantes avancent d'un cran */
          for (let j = k + 1; j < n; j += 1) {
            const rank = j - k - 1;
            deck.to(items[j], { y: rank * STEP, scale: 1 - rank * SHRINK, ease: "power2.out", duration: 1 }, k);
          }
        }
        deck.to({}, { duration: HOLD });

        return () => {
          delete column.dataset.mode;
        };
      });
    }, root);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={root}
      data-flock
      className="relative -mt-px overflow-clip bg-[#171A2E] pb-28 pt-[18vh] md:pb-40 md:pt-[22vh]"
    >
      {/*
        LE CIEL, UNE FOIS POSÉ — Takeover révèle ce champ d'étoiles au rythme
        de la coulée ; ici il est simplement là. `z-0` : sous tout le contenu.
      */}
      <Starfield seed={47} z={0} />
      <SectionSky />

      <div className="edge relative z-10 md:grid md:grid-cols-12 md:gap-10 lg:gap-16">
        {/* ============================================================ */}
        {/* COLONNE FIXE — texte + boussole                               */}
        {/* ============================================================ */}

        <aside
          data-head
          className="mb-16 md:sticky md:top-[16vh] md:col-span-5 md:mb-0 md:self-start"
        >
          <span data-rule aria-hidden="true" className="mb-6 block h-px w-full bg-dore/50" />

          <span data-eyebrow className="eyebrow mb-6 block text-dore">
            Notre façon de travailler
          </span>

          <h2 data-split className="text-d2 font-medium text-ivoire">
            Trois choses qu&apos;on refuse de négocier
          </h2>

          <p data-lede className="mt-6 max-w-[42ch] text-[15px] leading-relaxed text-ivoire/50 md:text-base">
            Ce sont les trois réflexes qui décident de tout le reste : ce que
            nous acceptons, ce que nous refusons, et la façon dont un projet se
            termine.
          </p>

          <div className="mt-10 flex items-center gap-6 md:mt-14">
            <div data-compass className="h-28 w-28 shrink-0 md:h-40 md:w-40">
              <NavCompass />
            </div>
            <div className="flex flex-col gap-2">
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ivoire/40">
                Cap actuel
              </span>
              <span data-counter className="font-mono text-2xl tracking-[0.12em] text-dore">
                01 / 03
              </span>
            </div>
          </div>
        </aside>

        {/* ============================================================ */}
        {/* COLONNE QUI DÉFILE — les trois valeurs                        */}
        {/* ============================================================ */}

        <div data-values className="group/deck relative md:col-span-7 data-[mode=deck]:h-[100svh]">
          {/* tableau de bord du paquet (téléphone) : mini-boussole + cap */}
          <div aria-hidden="true" className="absolute inset-x-0 top-5 hidden items-center gap-4 group-data-[mode=deck]/deck:flex">
            <div className="h-14 w-14 shrink-0">
              <NavCompass />
            </div>
            <div className="flex flex-col gap-1">
              <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-ivoire/40">Cap actuel</span>
              <span data-counter className="font-mono text-lg tracking-[0.12em] text-dore">01 / 03</span>
            </div>
            <span className="ml-auto font-mono text-[9px] uppercase tracking-[0.2em] text-ivoire/35">défiler ↓</span>
          </div>

          {values.map((v, i) => (
            <article
              key={v.title}
              data-value
              data-active="false"
              className="
                flex min-h-[70vh] items-center py-10
                opacity-35 transition-opacity duration-700 ease-nova
                data-[active=true]:opacity-100
                md:min-h-[88vh]
                group-data-[mode=deck]/deck:absolute group-data-[mode=deck]/deck:inset-x-0 group-data-[mode=deck]/deck:top-[5.25rem] group-data-[mode=deck]/deck:min-h-0 group-data-[mode=deck]/deck:items-start group-data-[mode=deck]/deck:opacity-100
                group-data-[mode=deck]/deck:rounded-[8px] group-data-[mode=deck]/deck:border group-data-[mode=deck]/deck:border-ivoire/15 group-data-[mode=deck]/deck:bg-[#1C2045] group-data-[mode=deck]/deck:p-4
                group-data-[mode=deck]/deck:shadow-[0_30px_60px_-30px_rgba(0,0,0,0.8)] group-data-[mode=deck]/deck:will-change-transform
              "
            >
              <div className="grid w-full gap-8 sm:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] sm:items-center lg:gap-12 group-data-[mode=deck]/deck:grid-cols-1 group-data-[mode=deck]/deck:gap-4">
                {/* arche : l'image se révèle de bas en haut */}
                <figure className="relative mx-auto w-full max-w-[300px] sm:mx-0 group-data-[mode=deck]/deck:mx-0 group-data-[mode=deck]/deck:max-w-none">
                  <div
                    data-value-frame
                    className="relative aspect-[3/4] overflow-hidden rounded-t-full border border-dore/30 group-data-[mode=deck]/deck:aspect-auto group-data-[mode=deck]/deck:h-[27svh] group-data-[mode=deck]/deck:rounded-t-[999px]"
                  >
                    <img
                      data-value-img
                      src={valueImages[i]}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover will-change-transform"
                      style={{ filter: `url(#nova-map-${MAPS[i % MAPS.length]})` }}
                    />
                    <div
                      aria-hidden="true"
                      className="absolute inset-0 bg-gradient-to-t from-[#171A2E]/80 via-transparent to-transparent"
                    />
                  </div>
                  {/* arche fantôme décalée, en trait : double le contour */}
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 translate-x-3 translate-y-3 rounded-t-full border border-ivoire/10 group-data-[mode=deck]/deck:hidden"
                  />
                </figure>

                <div>
                  <div className="mb-5 flex items-baseline gap-4 group-data-[mode=deck]/deck:mb-1 group-data-[mode=deck]/deck:gap-3">
                    <span data-value-numeral className="font-display text-5xl text-dore md:text-6xl group-data-[mode=deck]/deck:text-4xl">
                      {ROMAN[i]}
                    </span>
                    <span className="font-mono text-[11px] tracking-[0.18em] text-ivoire/40">
                      {String(i + 1).padStart(2, "0")} / {String(values.length).padStart(2, "0")}
                    </span>
                  </div>

                  <h3 data-value-title className="text-d3 font-bold lowercase leading-none text-ivoire group-data-[mode=deck]/deck:text-2xl">
                    {v.title}
                  </h3>

                  <p data-value-body className="mt-5 max-w-[46ch] text-[16px] leading-[1.6] text-ivoire/65 md:text-[17px] group-data-[mode=deck]/deck:mt-2 group-data-[mode=deck]/deck:text-[14px] group-data-[mode=deck]/deck:leading-[1.55] max-[380px]:group-data-[mode=deck]/deck:text-[13px]">
                    {v.body}
                  </p>

                  <span data-value-line aria-hidden="true" className="mt-8 block h-px w-full max-w-[46ch] bg-dore/60 group-data-[mode=deck]/deck:mt-3" />
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
