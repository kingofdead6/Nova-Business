import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import anime from "animejs/lib/anime.es.js";

import { initReveals } from "../../lib/reveal";
import TypedHeading from "../TypedHeading";
import people from "../../assets/People/people.jpg";

gsap.registerPlugin(ScrollTrigger);

/**
 * SECTION 08 — MÉTHODE : LE PLAN DE VOL
 *
 * Huit semaines, racontées comme un compte à rebours de lancement : la mise
 * en ligne EST le décollage. Une trajectoire ascendante traverse la section
 * et se trace au scroll ; une fusée la parcourt. Chaque étape est suspendue
 * à un point de passage : elle s'allume quand la fusée l'atteint, et le
 * compte à rebours descend de T−8 à T0.
 *
 *                                             ✦ T0
 *                                    ●────╯
 *                          ●───╯     │
 *                ●───╯     │         │
 *   ────╯●       │         │         │
 *        │       │         │         │
 *     [étape 1][étape 2][étape 3][étape 4]
 *
 * Dessous : la photo d'équipe dans un HUBLOT, et les chiffres en télémétrie.
 *
 * ≥ 768 px : trajectoire + fusée. En dessous (ou en mouvement réduit), les
 * étapes forment une pile avec un rail vertical qui se remplit.
 */

const steps = [
  { week: "Semaine 1", t: "T−8", title: "Cadrage", body: "Un atelier de 2 h, un document d'une page. On valide le périmètre, le budget et la date de livraison." },
  { week: "Semaines 2–3", t: "T−6", title: "Direction artistique", body: "Deux pistes visuelles complètes. Vous en choisissez une, on l'affine ensemble." },
  { week: "Semaines 4–7", t: "T−4", title: "Production", body: "Design puis développement, avec une préversion en ligne mise à jour chaque semaine." },
  { week: "Semaine 8", t: "T0", title: "Mise en ligne", body: "Recette, formation de vos équipes, transfert des accès. Le site vous appartient." },
];

const stats = [
  { value: 40, suffix: "+", label: "marques accompagnées", unit: "équipages" },
  { value: 96, suffix: "", label: "score Lighthouse moyen", unit: "sur 100" },
  { value: 8, suffix: " sem.", label: "délai moyen de livraison", unit: "jusqu'au décollage" },
];

/*
 * Trajectoire (viewBox 1000 × 420). Les points de passage sont au centre
 * de chacune des quatre colonnes d'étapes (x = 125, 375, 625, 875) et
 * montent vers la droite.
 */
const VB_W = 1000;
const VB_H = 420;
const WAYPOINTS = [
  [125, 330],
  [375, 250],
  [625, 160],
  [875, 60],
];
const PATH =
  "M0 410 C 60 400, 100 350, 125 330 S 300 270, 375 250 S 560 190, 625 160 S 800 90, 875 60 S 960 20, 1000 10";

export default function Process() {
  const root = useRef(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return undefined;

    const ctx = gsap.context(() => {
      initReveals(el);
      const q = (sel) => el.querySelector(sel);
      const qa = (sel) => Array.from(el.querySelectorAll(sel));
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      /* ------------------------------------------------------------ */
      /* COMPTEURS DE TÉLÉMÉTRIE — une seule fois                      */
      /* ------------------------------------------------------------ */
      ScrollTrigger.create({
        trigger: q("[data-stats]"),
        start: "top 82%",
        once: true,
        onEnter: () => {
          qa("[data-count]").forEach((node) => {
            const target = { v: 0 };
            const end = Number(node.dataset.count);
            if (reduced) {
              node.textContent = end;
              return;
            }
            anime({
              targets: target,
              v: end,
              round: 1,
              duration: 1600,
              easing: "easeOutExpo",
              update: () => {
                node.textContent = target.v;
              },
            });
          });
          qa("[data-gauge]").forEach((g) =>
            gsap.to(g, { scaleX: Number(g.dataset.gauge), duration: reduced ? 0 : 1.6, ease: "expo.out" })
          );
        },
      });

      /* le hublot : la photo glisse lentement derrière la vitre */
      const portholeImg = q("[data-porthole-img]");
      if (portholeImg && !reduced) {
        gsap.fromTo(portholeImg, { yPercent: -8, scale: 1.15 }, {
          yPercent: 8,
          scale: 1.15,
          ease: "none",
          scrollTrigger: { trigger: portholeImg, start: "top bottom", end: "bottom top", scrub: 1 },
        });
      }

      const mm = gsap.matchMedia();

      /* ------------------------------------------------------------ */
      /* TRAJECTOIRE — ≥ 768 px                                        */
      /* ------------------------------------------------------------ */
      mm.add("(min-width: 768px)", () => {
        const flight = q("[data-flight]");
        const area = q("[data-sky-area]");
        const path = q("[data-path]");
        const rocket = q("[data-rocket]");
        const countdown = q("[data-countdown]");
        const nodes = qa("[data-node]");
        const links = qa("[data-link]");
        const cards = qa("[data-step]");
        const liftoff = q("[data-liftoff]");
        if (!flight || !area || !path || !rocket) return undefined;

        const length = path.getTotalLength();

        /* fraction de la trajectoire où se trouve chaque point de passage */
        const stops = WAYPOINTS.map(([wx, wy]) => {
          let best = 0;
          let bestD = Infinity;
          for (let s = 0; s <= 400; s += 1) {
            const pt = path.getPointAtLength((s / 400) * length);
            const d = (pt.x - wx) ** 2 + (pt.y - wy) ** 2;
            if (d < bestD) {
              bestD = d;
              best = s / 400;
            }
          }
          return best;
        });

        let lit = -1;
        const light = (count) => {
          if (count === lit) return;
          lit = count;
          nodes.forEach((n, i) => n.setAttribute("data-on", String(i < count)));
          links.forEach((l, i) =>
            gsap.to(l, { scaleY: i < count ? 1 : 0, duration: reduced ? 0 : 0.6, ease: "power2.out", overwrite: true })
          );
          cards.forEach((c, i) =>
            gsap.to(c, {
              opacity: i < count ? 1 : 0.25,
              y: i < count ? 0 : 24,
              duration: reduced ? 0 : 0.7,
              ease: "expo.out",
              overwrite: true,
            })
          );
        };

        /* place la fusée sur la courbe, orientée selon sa tangente */
        const place = (p) => {
          const w = area.clientWidth;
          const h = area.clientHeight;
          const at = Math.min(length, Math.max(0, p * length));
          const pt = path.getPointAtLength(at);
          const ahead = path.getPointAtLength(Math.min(length, at + 2));
          const back = path.getPointAtLength(Math.max(0, at - 2));
          const angle = Math.atan2((ahead.y - back.y) * (h / VB_H), (ahead.x - back.x) * (w / VB_W));
          gsap.set(rocket, {
            x: (pt.x / VB_W) * w,
            y: (pt.y / VB_H) * h,
            rotate: (angle * 180) / Math.PI,
          });

          const passed = stops.filter((s) => p >= s - 0.005).length;
          light(passed);

          if (countdown) {
            const weeks = Math.max(0, Math.round(8 * (1 - p)));
            countdown.textContent = weeks === 0 ? "T0 · décollage" : `T−${weeks} sem.`;
          }
          if (liftoff) {
            gsap.to(liftoff, { scale: p > 0.97 ? 1 : 0, opacity: p > 0.97 ? 1 : 0, duration: 0.5, ease: "back.out(2)", overwrite: true });
          }
        };

        gsap.set(path, { strokeDasharray: 1, strokeDashoffset: reduced ? 0 : 1 });

        if (reduced) {
          place(1);
          return undefined;
        }

        const state = { p: 0 };
        place(0);
        gsap.to(state, {
          p: 1,
          ease: "none",
          scrollTrigger: {
            trigger: flight,
            start: "top 78%",
            end: "bottom 45%",
            scrub: 1,
            invalidateOnRefresh: true,
          },
          onUpdate: () => {
            path.style.strokeDashoffset = String(1 - state.p);
            place(state.p);
          },
        });

        /* la fusée se replace si le cadre change de taille */
        const ro = new ResizeObserver(() => place(state.p));
        ro.observe(area);
        return () => ro.disconnect();
      });

      /* ------------------------------------------------------------ */
      /* PILE — < 768 px : rail vertical                               */
      /* ------------------------------------------------------------ */
      mm.add("(max-width: 767px)", () => {
        const rail = q("[data-rail]");
        if (rail && !reduced) {
          gsap.fromTo(rail, { scaleY: 0 }, {
            scaleY: 1,
            ease: "none",
            transformOrigin: "top",
            scrollTrigger: { trigger: q("[data-steps]"), start: "top 70%", end: "bottom 75%", scrub: true },
          });
        }
        return undefined;
      });
    }, el);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={root} className="relative overflow-hidden bg-ivoire py-24 md:py-32">
      <div className="edge">
        {/* ========================= EN-TÊTE ========================= */}
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <span data-reveal="fade" className="eyebrow mb-6 block">
              Méthode — plan de vol
            </span>
            <TypedHeading
              as="h2"
              className="text-d2 font-medium"
              text="Huit semaines, sans surprise"
              html={'Huit semaines, <span class="font-display italic text-bronze">sans surprise</span>'}
            />
          </div>
          <p data-reveal="fade" className="max-w-xs text-[15px] leading-relaxed text-pierre">
            Un plan de vol fixé dès la première semaine : chaque étape a sa date,
            et la mise en ligne est notre décollage.
          </p>
        </div>

        {/* ========================= TRAJECTOIRE ========================= */}
        <div data-flight className="relative mt-14 md:mt-20">
          <div data-sky-area className="relative hidden aspect-[1000/420] w-full md:block">
            {/* compte à rebours : il reste à l'écran pendant tout le vol */}
            <div className="absolute left-0 top-0 flex flex-col gap-1">
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-pierre">Compte à rebours</span>
              <span data-countdown className="font-mono text-3xl tracking-[0.08em] text-bronze lg:text-4xl">
                T−8 sem.
              </span>
            </div>
            <svg
              viewBox={`0 0 ${VB_W} ${VB_H}`}
              className="absolute inset-0 h-full w-full overflow-visible"
              aria-hidden="true"
            >
              {/* repères de hauteur, façon relevé de vol */}
              {[105, 210, 315].map((y) => (
                <line key={y} x1="0" x2={VB_W} y1={y} y2={y} stroke="#171A2E" strokeOpacity="0.06" />
              ))}
              {/* tracé prévu (pointillés) puis tracé parcouru (plein) */}
              <path d={PATH} fill="none" stroke="#3A4680" strokeOpacity="0.3" strokeWidth="1.5" strokeDasharray="2 7" />
              <path data-path d={PATH} pathLength="1" fill="none" stroke="#3A4680" strokeWidth="2" strokeLinecap="round" />
            </svg>

            {/* altitudes */}
            {[
              ["orbite", 12],
              ["haute atm.", 92],
              ["basse atm.", 197],
              ["sol", 400],
            ].map(([label, y]) => (
              <span
                key={label}
                aria-hidden="true"
                className="absolute right-0 -translate-y-1/2 font-mono text-[9px] uppercase tracking-[0.2em] text-pierre/60"
                style={{ top: `${(y / VB_H) * 100}%` }}
              >
                {label}
              </span>
            ))}

            {/* points de passage + liaisons vers les étapes */}
            {WAYPOINTS.map(([x, y], i) => (
              <div key={i} aria-hidden="true">
                <span
                  data-link
                  className="absolute bottom-0 w-px origin-top border-l border-dashed border-bronze/50"
                  style={{ left: `${(x / VB_W) * 100}%`, top: `${(y / VB_H) * 100}%`, transform: "scaleY(0)" }}
                />
                <span
                  data-node
                  data-on="false"
                  className="absolute block h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-bronze bg-ivoire transition-all duration-500 data-[on=true]:scale-125 data-[on=true]:bg-bronze data-[on=true]:shadow-[0_0_0_6px_rgba(58,70,128,0.15)]"
                  style={{ left: `${(x / VB_W) * 100}%`, top: `${(y / VB_H) * 100}%` }}
                />
              </div>
            ))}

            {/* étincelle de décollage, au bout de la trajectoire */}
            <span data-liftoff aria-hidden="true" className="absolute right-0 top-[2.4%] block -translate-y-1/2 translate-x-1/2 scale-0 opacity-0">
              <svg viewBox="-12 -12 24 24" className="h-10 w-10 overflow-visible [filter:drop-shadow(0_0_10px_rgba(200,184,138,0.9))]">
                <path d="M0 -10 C1.2 -2.4 2.4 -1.2 10 0 C2.4 1.2 1.2 2.4 0 10 C-1.2 2.4 -2.4 1.2 -10 0 C-2.4 -1.2 -1.2 -2.4 0 -10Z" fill="#C8B88A" />
              </svg>
            </span>

            {/* la fusée */}
            <span data-rocket aria-hidden="true" className="absolute left-0 top-0 z-10 block will-change-transform">
              <svg viewBox="-26 -12 52 24" className="-ml-[42px] -mt-[19px] h-[38px] w-[84px] overflow-visible [filter:drop-shadow(0_6px_10px_rgba(23,26,46,0.25))]">
                {/* flamme */}
                <path d="M-14 -4 L-26 0 L-14 4 Z" fill="#F3D58A" />
                <path d="M-14 -2.5 L-21 0 L-14 2.5 Z" fill="#FF9A62" />
                {/* ailerons */}
                <path d="M-10 -5 L-16 -11 L-4 -5 Z" fill="#3A4680" />
                <path d="M-10 5 L-16 11 L-4 5 Z" fill="#3A4680" />
                {/* corps */}
                <path d="M-14 -5 L10 -5 Q22 0 10 5 L-14 5 Z" fill="#F1ECE0" stroke="#171A2E" strokeWidth="1.2" />
                <circle cx="5" cy="0" r="2.6" fill="#7CF3E3" stroke="#171A2E" strokeWidth="1" />
              </svg>
            </span>
          </div>

          {/* ---------------- LES ÉTAPES ---------------- */}
          <div data-steps className="relative pl-8 md:pl-0">
            <span aria-hidden="true" className="absolute left-0 top-1 h-full w-px bg-charbon/10 md:hidden" />
            <span data-rail aria-hidden="true" className="absolute left-0 top-1 h-full w-px bg-bronze md:hidden" />

            <ol className="flex flex-col gap-11 md:grid md:grid-cols-4 md:gap-6 lg:gap-8">
              {steps.map((s) => (
                <li
                  key={s.title}
                  data-step
                  className="relative md:border-t md:border-charbon/10 md:pt-6"
                >
                  <span aria-hidden="true" className="absolute -left-8 top-2 h-2 w-2 -translate-x-1/2 rounded-full bg-bronze md:hidden" />
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-pierre">{s.week}</span>
                    <span className="font-mono text-[11px] tracking-[0.12em] text-bronze">{s.t}</span>
                  </div>
                  <h3 className="mt-3 text-2xl font-bold tracking-tight">{s.title}</h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-pierre">{s.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>

        {/* ========================= HUBLOT + TÉLÉMÉTRIE ========================= */}
        <div className="mt-24 grid items-center gap-14 md:mt-32 lg:grid-cols-[0.8fr_1fr] lg:gap-20">
          {/* hublot : la photo derrière une vitre ronde rivetée */}
          <figure data-reveal="fade" className="relative mx-auto aspect-square w-full max-w-[420px]">
            <div className="absolute inset-0 rounded-full bg-charbon shadow-[0_40px_80px_-40px_rgba(23,26,46,0.7)]" />
            {Array.from({ length: 12 }, (_, i) => {
              const a = (i / 12) * Math.PI * 2;
              return (
                <span
                  key={i}
                  aria-hidden="true"
                  className="absolute block h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-dore/80 shadow-[inset_-1px_-1px_1px_rgba(0,0,0,0.4)]"
                  style={{ left: `${50 + Math.cos(a) * 46.5}%`, top: `${50 + Math.sin(a) * 46.5}%` }}
                />
              );
            })}
            <div className="absolute inset-[9%] overflow-hidden rounded-full ring-2 ring-dore/60">
              <img
                data-porthole-img
                src={people}
                alt="L'équipe Nova au travail"
                loading="lazy"
                className="h-full w-full object-cover will-change-transform"
              />
              {/* reflet de la vitre */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 rounded-full"
                style={{
                  background:
                    "radial-gradient(circle at 30% 25%, rgba(255,255,255,0.35), transparent 35%), radial-gradient(circle at 50% 50%, transparent 60%, rgba(23,26,46,0.55))",
                }}
              />
            </div>
            <figcaption className="absolute -bottom-10 left-1/2 -translate-x-1/2 whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.2em] text-pierre">
              Hublot 01 — l&apos;équipage
            </figcaption>
          </figure>

          {/* télémétrie */}
          <div data-stats>
            <span className="eyebrow mb-8 block text-bronze">Télémétrie de mission</span>
            <dl className="flex flex-col gap-8">
              {stats.map((s) => (
                <div key={s.label} className="border-t border-charbon/10 pt-5">
                  <div className="flex items-baseline justify-between gap-4">
                    <dt className="text-[13px] text-pierre">{s.label}</dt>
                    <dd className="text-4xl font-black tracking-tight md:text-5xl">
                      <span data-count={s.value}>0</span>
                      {s.suffix}
                    </dd>
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    <span className="relative h-[3px] flex-1 overflow-hidden rounded-full bg-charbon/10">
                      <span
                        data-gauge={Math.min(1, s.value / (s.value >= 50 ? 100 : s.value * 1.25))}
                        className="absolute inset-0 block origin-left scale-x-0 rounded-full bg-gradient-to-r from-bronze to-dore"
                      />
                    </span>
                    <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-pierre/80">{s.unit}</span>
                  </div>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>
    </section>
  );
}
