import { useCallback, useEffect, useRef, useState } from "react";

import useReveal from "../../hooks/useReveal";
import Starfield from "../Starfield";
import { testimonials } from "../../data/site";
import receiverPic from "../../assets/People/Testimonials.png";

/**
 * SECTION 09 — TÉMOIGNAGES : TRANSMISSIONS REÇUES
 *
 * Chaque client est une ÉTOILE d'une petite constellation, sur le panneau
 * d'un radiotélescope. L'étoile active émet des anneaux de signal ; son
 * message arrive à droite en se DÉCODANT — chaque caractère passe par des
 * glyphes stellaires avant de se fixer — pendant qu'une onde défile sous la
 * citation.
 *
 *   ┌──── récepteur ────┐   TRANSMISSION 02 / 03 · 1420,40 MHz · ▮▮▮▮▯
 *   │  ✦ CL              │   « ✦·×ls ont posé les bo·nes q+es… »  (décodage)
 *   │       ✦ IB  ((·))  │   IDRISS BENALI — DIRECTEUR, ATELIER 9E
 *   │   ✦ SP             │   ∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿
 *   └────────────────────┘   ← →
 *
 * Rotation automatique toutes les 8 s (anneau de progression autour de
 * l'étoile active), coupée dès qu'on choisit une étoile ou une flèche, et
 * désactivée en mouvement réduit — tout comme le décodage.
 *
 * Accessibilité : le texte brouillé est `aria-hidden` ; la citation réelle
 * est toujours présente dans une région live, invisible à l'écran.
 */

const ROTATE_MS = 8000;
const DECODE_MS = 1500;
const GLYPHS = "✦·+×°*";

/* position de chaque étoile sur le panneau (%) */
const STARS = [
  { x: 26, y: 28 },
  { x: 70, y: 44 },
  { x: 38, y: 74 },
];

/* étoiles de décor, sans rôle */
const DUST = [
  [12, 60], [18, 14], [52, 18], [84, 22], [88, 70], [62, 86], [8, 88], [56, 58], [78, 12], [30, 50],
];

const initials = (name) =>
  name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

/** Décodage : chaque caractère se fixe à son tour, les autres scintillent. */
function useDecode(text, run) {
  const [out, setOut] = useState(text);
  const frame = useRef(0);

  useEffect(() => {
    if (!run) {
      setOut(text);
      return undefined;
    }
    const start = performance.now();
    const chars = Array.from(text);
    const tick = (now) => {
      const t = Math.min(1, (now - start) / DECODE_MS);
      const fixed = Math.floor(t * chars.length);
      let s = "";
      for (let i = 0; i < chars.length; i += 1) {
        const c = chars[i];
        if (i < fixed || c === " ") s += c;
        else s += GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
      }
      setOut(s);
      if (t < 1) frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame.current);
  }, [text, run]);

  return out;
}

export default function Testimonials() {
  const root = useReveal();
  const [i, setI] = useState(0);
  const [auto, setAuto] = useState(true);
  const [reduced, setReduced] = useState(false);
  const [receiving, setReceiving] = useState(false);
  const total = testimonials.length;
  const t = testimonials[i];

  useEffect(() => {
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  /* rotation automatique */
  useEffect(() => {
    if (!auto || reduced) return undefined;
    const id = setTimeout(() => setI((v) => (v + 1) % total), ROTATE_MS);
    return () => clearTimeout(id);
  }, [auto, reduced, i, total]);

  /* « réception » : l'onde s'amplifie le temps du décodage */
  useEffect(() => {
    if (reduced) return undefined;
    setReceiving(true);
    const id = setTimeout(() => setReceiving(false), DECODE_MS + 200);
    return () => clearTimeout(id);
  }, [i, reduced]);

  const quote = useDecode(`« ${t.quote} »`, !reduced);
  const byline = useDecode(`${t.author} — ${t.role}`, !reduced);

  const choose = useCallback((idx) => {
    setAuto(false);
    setI(((idx % total) + total) % total);
  }, [total]);

  return (
    <section
      ref={root}
      aria-label="Témoignages clients"
      className="relative overflow-hidden bg-charbon py-24 text-ivoire md:py-32"
    >
      <Starfield seed={91} z={0} />

      <div className="edge relative z-10">
        <div className="mb-12 flex flex-wrap items-end justify-between gap-4">
          <span data-reveal="fade" className="eyebrow block text-dore">
            Ce qu&apos;ils en disent — transmissions reçues
          </span>
          <span data-reveal="fade" className="font-mono text-[10px] uppercase tracking-[0.2em] text-ivoire/40">
            Récepteur Nova · bande 21 cm
          </span>
        </div>

        <div className="grid items-center gap-12 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:gap-16">
          {/* ======================== RÉCEPTEUR ======================== */}
          <div
            data-reveal="fade"
            className="relative aspect-[4/3] overflow-hidden rounded-[3px] border border-ivoire/10 md:aspect-[4/5]"
          >
            {/* visuel de fond : le radiotélescope, coloré et assombri */}
            <img
              src={receiverPic}
              alt=""
              aria-hidden="true"
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover opacity-45"
              style={{ filter: "url(#nova-map-aurora)" }}
            />
            <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-charbon via-charbon/40 to-charbon/70" />

            {/* cercles de coordonnées */}
            <svg aria-hidden="true" viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
              {[18, 32, 46].map((r) => (
                <ellipse key={r} cx="50" cy="50" rx={r} ry={r} fill="none" stroke="#F1ECE0" strokeOpacity="0.08" strokeWidth="0.25" />
              ))}
              {/* la constellation relie les clients */}
              <polyline
                points={STARS.map((s) => `${s.x},${s.y}`).join(" ")}
                fill="none"
                stroke="#C8B88A"
                strokeOpacity="0.45"
                strokeWidth="0.35"
                strokeDasharray="1 1.4"
              />
              {DUST.map(([x, y], k) => (
                <circle key={k} cx={x} cy={y} r="0.35" fill="#F1ECE0" opacity="0.5" />
              ))}
            </svg>

            {/* les clients */}
            {STARS.map((s, idx) => {
              const on = idx === i;
              const who = testimonials[idx];
              return (
                <button
                  key={who.author}
                  type="button"
                  onClick={() => choose(idx)}
                  data-cursor="hover"
                  aria-label={`Transmission de ${who.author}`}
                  aria-pressed={on}
                  className="group absolute -translate-x-1/2 -translate-y-1/2"
                  style={{ left: `${s.x}%`, top: `${s.y}%` }}
                >
                  <span className="relative flex h-14 w-14 items-center justify-center">
                    {/* anneaux de signal */}
                    {on && !reduced && (
                      <>
                        <span className="signal-ring absolute inset-0 rounded-full border border-dore/70" />
                        <span className="signal-ring absolute inset-0 rounded-full border border-dore/50 [animation-delay:0.9s]" />
                      </>
                    )}
                    {/* progression de la rotation automatique */}
                    {on && auto && !reduced && (
                      <svg key={`p-${i}`} viewBox="0 0 40 40" className="absolute inset-[-6px] -rotate-90">
                        <circle
                          cx="20"
                          cy="20"
                          r="18"
                          fill="none"
                          stroke="#C8B88A"
                          strokeWidth="1.2"
                          pathLength="1"
                          strokeDasharray="1"
                          className="transmit-progress"
                          style={{ "--dur": `${ROTATE_MS}ms` }}
                        />
                      </svg>
                    )}
                    <span
                      className={`flex h-10 w-10 items-center justify-center rounded-full border font-mono text-[11px] tracking-[0.1em] transition-all duration-500 ease-nova ${
                        on
                          ? "border-dore bg-dore text-charbon shadow-[0_0_28px_rgba(200,184,138,0.7)]"
                          : "border-ivoire/30 bg-charbon/70 text-ivoire/70 group-hover:border-dore/70 group-hover:text-ivoire"
                      }`}
                    >
                      {initials(who.author)}
                    </span>
                  </span>
                  <span
                    className={`mt-2 block whitespace-nowrap font-mono text-[9px] uppercase tracking-[0.2em] transition-opacity duration-500 ${
                      on ? "text-dore opacity-100" : "text-ivoire/50 opacity-0 group-hover:opacity-100"
                    }`}
                  >
                    {who.author}
                  </span>
                </button>
              );
            })}

            <span aria-hidden="true" className="absolute bottom-4 left-4 font-mono text-[9px] uppercase tracking-[0.2em] text-ivoire/40">
              Constellation clients · {String(total).padStart(2, "0")} sources
            </span>
          </div>

          {/* ======================== MESSAGE ======================== */}
          <div>
            <div className="mb-8 flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-[10px] uppercase tracking-[0.2em] text-ivoire/45">
              <span className="text-dore">
                Transmission {String(i + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
              </span>
              <span>1420,40 MHz</span>
              <span className="flex items-center gap-1" aria-hidden="true">
                signal
                {[0, 1, 2, 3, 4].map((b) => (
                  <span
                    key={b}
                    className={`inline-block w-1 rounded-[1px] ${b < 4 ? "bg-dore" : "bg-ivoire/20"}`}
                    style={{ height: 4 + b * 2 }}
                  />
                ))}
              </span>
            </div>

            {/* la citation réelle, pour les lecteurs d'écran */}
            <p aria-live="polite" className="sr-only">
              {`« ${t.quote} » — ${t.author}, ${t.role}`}
            </p>

            <blockquote aria-hidden="true">
              <p className="min-h-[7.5em] text-balance font-display text-2xl leading-snug md:min-h-[5.6em] md:text-[2.3rem] md:leading-[1.18]">
                {quote}
              </p>
              <footer className="mt-7 font-mono text-[11px] uppercase tracking-[0.18em] text-ivoire/55">{byline}</footer>
            </blockquote>

            {/* onde du récepteur */}
            <div aria-hidden="true" className="relative mt-10 h-12 overflow-hidden">
              {/* l'amplitude est sur l'enveloppe : l'animation de défilement occupe déjà le `transform` de l'onde */}
              <div
                className={`absolute inset-0 transition-transform duration-700 ease-nova ${
                  receiving ? "scale-y-100" : "scale-y-[0.25]"
                }`}
              >
              <svg
                viewBox="0 0 800 48"
                preserveAspectRatio="none"
                className="wave-scroll absolute left-0 top-0 h-full w-[200%]"
              >
                <path
                  d={Array.from({ length: 17 }, (_, k) => `${k === 0 ? "M" : "Q"}${k === 0 ? "0 24" : `${k * 50 - 25} ${k % 2 ? 4 : 44} ${k * 50} 24`}`).join(" ")}
                  fill="none"
                  stroke="url(#wave-grad)"
                  strokeWidth="1.5"
                />
                <defs>
                  <linearGradient id="wave-grad" x1="0" x2="1">
                    <stop offset="0" stopColor="#7CF3E3" />
                    <stop offset="0.5" stopColor="#C8B88A" />
                    <stop offset="1" stopColor="#FF6FB5" />
                  </linearGradient>
                </defs>
              </svg>
              </div>
              <span className="absolute inset-x-0 top-1/2 h-px bg-ivoire/10" />
            </div>

            <div className="mt-8 flex items-center gap-3">
              {[-1, 1].map((dir) => (
                <button
                  key={dir}
                  type="button"
                  onClick={() => choose(i + dir)}
                  data-cursor="hover"
                  aria-label={dir === -1 ? "Transmission précédente" : "Transmission suivante"}
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-ivoire/20 transition-colors duration-500 ease-nova hover:border-dore hover:bg-dore hover:text-charbon"
                >
                  <span aria-hidden="true">{dir === -1 ? "←" : "→"}</span>
                </button>
              ))}
              <span className="ml-3 font-mono text-[10px] uppercase tracking-[0.2em] text-ivoire/40">
                {auto && !reduced ? "réception automatique" : "réception manuelle"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
