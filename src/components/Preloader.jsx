import { useEffect, useRef, useState } from "react";
import anime from "animejs/lib/anime.es.js";

import CosmicSky from "./CosmicSky";

/**
 * Écran d'ouverture — anime.js.
 *
 * Le ciel cosmique (voir CosmicSky) se remplit d'étoiles ; deux
 * constellations se tracent de part et d'autre du logo pendant que le
 * compteur monte. Puis le ciel et un volet corail se retirent vers le haut
 * sur le Hero, qui s'ouvre sur ce même ciel. Appelle onDone() à la fin.
 */

export default function Preloader({ onDone }) {
  const root = useRef(null);
  const countRef = useRef(null);
  const [gone, setGone] = useState(false);

  // onDone est souvent une lambda inline : on la garde dans un ref pour que
  // l'effet ne se rejoue pas (il se rejouerait après démontage → root null).
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    const el = root.current;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduced || !el) {
      setGone(true);
      onDoneRef.current?.();
      return undefined;
    }

    const counter = { value: 0 };

    const tl = anime.timeline({
      easing: "easeOutExpo",
      complete: () => {
        setGone(true);
        onDoneRef.current?.();
      },
    });

    tl.add({
      targets: el.querySelectorAll(".sky-star"),
      opacity: [0, 1],
      duration: 900,
      delay: anime.stagger(6, { from: "center" }),
      easing: "easeOutQuad",
    })
      .add(
        {
          targets: el.querySelectorAll(".cline"),
          strokeDashoffset: [anime.setDashoffset, 0],
          opacity: [0, 0.75],
          duration: 1500,
          delay: anime.stagger(200),
          easing: "easeInOutQuart",
        },
        150
      )
      .add(
        {
          targets: el.querySelectorAll(".cnode"),
          scale: [0, 1],
          opacity: [0, 1],
          duration: 700,
          delay: anime.stagger(90),
          easing: "easeOutBack",
        },
        250
      )
      .add(
        {
          targets: el.querySelectorAll(".draw"),
          strokeDashoffset: [anime.setDashoffset, 0],
          /* partent transparents : pas de logo entier au premier repaint */
          opacity: { value: [0, 1], duration: 200, easing: "linear" },
          duration: 1500,
          delay: anime.stagger(140),
          easing: "easeInOutQuart",
        },
        0
      )
      .add(
        {
          targets: el.querySelector(".halo"),
          opacity: [0, 1],
          scale: [0.6, 1],
          duration: 1600,
          easing: "easeOutQuad",
        },
        0
      )
      .add(
        {
          targets: counter,
          value: 100,
          round: 1,
          duration: 1800,
          easing: "easeInOutQuart",
          update: () => {
            if (countRef.current) {
              countRef.current.textContent = String(counter.value).padStart(3, "0");
            }
          },
        },
        0
      )
      .add(
        {
          targets: el.querySelectorAll(".word"),
          opacity: [0, 1],
          translateY: [16, 0],
          duration: 800,
          delay: anime.stagger(80),
        },
        "-=800"
      )
      .add({
        /* le ciel part d'abord et découvre le volet corail, qui suit */
        targets: [el.querySelector(".panel-sky"), el.querySelector(".panel-accent")],
        translateY: ["0%", "-100%"],
        duration: 950,
        delay: anime.stagger(120),
        easing: "cubicBezier(0.76, 0, 0.24, 1)",
      }, "+=650")
      .add(
        {
          targets: el.querySelector(".pl-content"),
          opacity: 0,
          translateY: -30,
          duration: 450,
        },
        "-=1000"
      );

    return () => {
      tl.pause();
    };
  }, []);

  if (gone) return null;

  return (
    <div ref={root} className="fixed inset-0 z-[80] overflow-hidden" aria-hidden="true">
      {/* volet révélé en second : corail → ambre */}
      <div
        className="panel-accent absolute inset-0"
        style={{ background: "linear-gradient(135deg, #FF5F8F 0%, #FF9A62 55%, #FFD166 100%)" }}
      />

      {/* ============================ CIEL ============================ */}
      <div className="panel-sky absolute inset-0">
        <CosmicSky hidden />
      </div>

      {/* =========================== CONTENU =========================== */}
      <div className="pl-content absolute inset-0 flex flex-col items-center justify-center gap-8">
        <div className="relative">
          {/* halo derrière le logo */}
          <div
            className="halo pointer-events-none absolute -inset-16 rounded-full opacity-0 blur-2xl"
            style={{
              background:
                "radial-gradient(circle, rgba(255,111,181,0.45) 0%, rgba(124,243,227,0.2) 45%, transparent 70%)",
            }}
          />

          {/* le trait du logo Nova : cercle ouvert + swoop + étoile */}
          <svg viewBox="0 0 120 120" className="relative h-28 w-28" fill="none">
            <defs>
              <linearGradient id="pl-logo" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#7CF3E3" />
                <stop offset="50%" stopColor="#B49CFF" />
                <stop offset="100%" stopColor="#FF6FB5" />
              </linearGradient>
            </defs>
            <path
              className="draw"
              opacity="0"
              d="M96 34a48 48 0 1 0 -6 62"
              stroke="url(#pl-logo)"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <path
              className="draw"
              opacity="0"
              d="M28 82c4-22 12-28 16-14s12 10 20-4 14-16 24-20"
              stroke="url(#pl-logo)"
              strokeWidth="3.5"
              strokeLinecap="round"
            />
            <path
              className="draw"
              opacity="0"
              d="M88 30l3 8 8 3-8 3-3 8-3-8-8-3 8-3z"
              stroke="#FFD166"
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <div className="flex items-baseline gap-3 overflow-hidden">
          <span
            className="word bg-clip-text font-sans text-3xl font-black uppercase tracking-tight text-transparent opacity-0 md:text-4xl"
            style={{ backgroundImage: "linear-gradient(90deg, #FFFFFF 0%, #B49CFF 60%, #7CF3E3 100%)" }}
          >
            Nova
          </span>
          <span className="word font-display text-3xl italic text-[#FF8FC2] opacity-0 md:text-4xl">
            business
          </span>
        </div>

        <span
          ref={countRef}
          className="font-mono text-[11px] tracking-[0.3em] text-[#7CF3E3]/80"
        >
          000
        </span>
      </div>
    </div>
  );
}
