import { useEffect, useRef } from "react";

import Starfield from "../Starfield";

/**
 * BOUSSOLE ÉTOILÉE — interlude entre le Hero et le recouvrement liquide.
 *
 * Une rose des vents dorée, cerclée d'étoiles qui scintillent. Au scroll, la
 * rose tourne dans un sens et la couronne d'étoiles dans l'autre, à mi-vitesse.
 *
 * L'angle est calculé par rapport au CENTRE de la section : la rose pointe
 * pile au nord quand la boussole est au milieu de l'écran, et non à une
 * position arbitraire qui dépendrait de la hauteur de la page au-dessus.
 *
 * La boucle rAF ne tourne que lorsque la section est visible. Le DOM SVG est
 * construit une fois par React ; chaque frame ne réécrit que deux attributs
 * `transform`.
 */

/* degrés de rotation par pixel de scroll */
const SPEED = 0.25;
/* lissage : part de l'écart rattrapée à chaque frame */
const EASE = 0.1;

/** Une branche de la rose : deux facettes, l'une éclairée, l'autre ombrée. */
function Point({ angle, len, w }) {
  return (
    <g transform={`rotate(${angle})`}>
      <path d={`M0 ${-len} L${w} 0 L0 0 Z`} fill="var(--sc-light)" />
      <path d={`M0 ${-len} L${-w} 0 L0 0 Z`} fill="var(--sc-dark)" />
    </g>
  );
}

/* couronne : 12 étincelles, une sur trois plus grande et plus éloignée */
const SPARKLES = Array.from({ length: 12 }, (_, i) => {
  const a = (i / 12) * Math.PI * 2 + (i % 2 ? 0.15 : 0);
  const rad = i % 3 === 0 ? 112 : 104;
  return {
    x: Math.cos(a) * rad,
    y: Math.sin(a) * rad,
    r: i % 3 === 0 ? 6 : 3.5,
    delay: (i * 0.37) % 2.6,
  };
});

const sparklePath = ({ x, y, r }) =>
  `M${x} ${y - r} Q${x} ${y} ${x + r} ${y} Q${x} ${y} ${x} ${y + r} Q${x} ${y} ${x - r} ${y} Q${x} ${y} ${x} ${y - r} Z`;

/*
 * `tone` :
 *  - "light" (défaut) : bande ivoire, entre le Hero et Takeover ;
 *  - "night" : fond nuit #171A2E + champ d'étoiles, entre Values et
 *    Services — les deux sections qui l'encadrent sont sombres, et Services
 *    s'ouvre sur la matière qui se retire : une bande claire au milieu
 *    casserait le raccord.
 */
export default function Compass({ tone = "light", label = "Un cap, une direction" }) {
  const night = tone === "night";

  const root = useRef(null);
  const rose = useRef(null);
  const orbit = useRef(null);

  useEffect(() => {
    const section = root.current;
    if (!section) return undefined;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    /* scroll auquel le centre de la section coïncide avec celui de l'écran */
    const centerScroll = () => {
      const r = section.getBoundingClientRect();
      return window.scrollY + r.top + r.height / 2 - window.innerHeight / 2;
    };

    let cur = null;
    let raf = 0;

    const frame = () => {
      const target = (window.scrollY - centerScroll()) * SPEED;
      cur = reduced || cur === null ? target : cur + (target - cur) * EASE;
      rose.current?.setAttribute("transform", `rotate(${cur.toFixed(2)})`);
      orbit.current?.setAttribute("transform", `rotate(${(-cur * 0.5).toFixed(2)})`);
      raf = requestAnimationFrame(frame);
    };

    const io = new IntersectionObserver(([entry]) => {
      cancelAnimationFrame(raf);
      if (entry.isIntersecting) {
        cur = null; // on se recale net en rentrant, sans rattrapage visible
        raf = requestAnimationFrame(frame);
      }
    });
    io.observe(section);

    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <section
      ref={root}
      aria-label={`Boussole — ${label}`}
      data-flock={night ? "" : undefined}
      className={`relative -mt-px overflow-hidden py-24 md:py-32 ${
        night ? "bg-[#171A2E] text-ivoire" : "bg-ivoire text-bronze"
      }`}
    >
      {night && <Starfield seed={83} z={0} />}

      {/* léger halo doré derrière la rose */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            night
              ? "radial-gradient(closest-side circle at 50% 55%, rgba(243,213,138,0.12), rgba(243,213,138,0.07) 25%, rgba(243,213,138,0.03) 50%, rgba(243,213,138,0.01) 75%, rgba(243,213,138,0))"
              : "radial-gradient(closest-side circle at 50% 55%, rgba(200,184,138,0.22), transparent)",
        }}
      />

      <div className="edge relative flex flex-col items-center gap-10">
        <p className={`eyebrow text-center ${night ? "text-dore" : ""}`}>{label}</p>

        <div className={`star-compass ${night ? "star-compass--night" : ""}`}>
          <svg viewBox="-120 -120 240 240" aria-hidden="true">
            <g ref={orbit}>
              {SPARKLES.map((s, i) => (
                <path
                  key={i}
                  d={sparklePath(s)}
                  fill="var(--sc-star)"
                  className="sc-twinkle"
                  style={{ animationDelay: `${s.delay}s` }}
                />
              ))}
            </g>

            <g ref={rose}>
              <circle r="88" fill="none" stroke="var(--sc-ring)" strokeOpacity="0.35" strokeWidth="1" />
              <circle
                r="80"
                fill="none"
                stroke="var(--sc-ring)"
                strokeOpacity="0.5"
                strokeWidth="0.8"
                strokeDasharray="1 4.2"
              />
              <circle r="40" fill="none" stroke="var(--sc-ring)" strokeOpacity="0.3" strokeWidth="0.8" />
              {Array.from({ length: 8 }, (_, i) => (
                <Point key={`s${i}`} angle={(i * 2 + 1) * 22.5} len={52} w={7} />
              ))}
              {Array.from({ length: 4 }, (_, i) => (
                <Point key={`m${i}`} angle={45 + i * 90} len={70} w={11} />
              ))}
              {Array.from({ length: 4 }, (_, i) => (
                <Point key={`c${i}`} angle={i * 90} len={100} w={14} />
              ))}
              <circle cy="-108" r="3" fill="var(--sc-light)" />
              <circle r="7" fill="var(--sc-dark)" />
              <circle r="3.5" fill="var(--sc-light)" />
            </g>
          </svg>
        </div>
      </div>
    </section>
  );
}
