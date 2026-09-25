import { useEffect, useRef } from "react";
import gsap from "gsap";

/**
 * ÉTOILES EN ORBITE AUTOUR DU CURSEUR
 *
 * - Une petite constellation gravite autour du curseur, chaque étoile sur sa
 *   propre orbite : rayon, vitesse, sens et inclinaison différents.
 * - Les orbites sont des ellipses inclinées : l'étoile qui passe « derrière »
 *   le curseur rapetisse et pâlit, celle qui passe devant grossit — la
 *   rotation se lit en profondeur plutôt qu'à plat.
 * - Le centre suit le curseur avec retard, et chaque étoile suit ce centre à
 *   sa propre vitesse : quand la souris file, le système s'étire en traîne,
 *   puis se referme en anneau à l'arrêt.
 * - Les orbites s'élargissent un peu avec la vitesse du curseur.
 * - Actif uniquement dans les sections [data-flock], sur pointeur fin, et
 *   jamais en mouvement réduit.
 */

/*
 * Une ligne par étoile :
 *   r     rayon de l'orbite (px)
 *   tilt  inclinaison de l'ellipse (deg)
 *   flat  aplatissement (ry = r × flat)
 *   speed tours par seconde (négatif = sens inverse)
 *   size  taille de l'étoile (px)
 *   color teinte
 *   lag   vitesse de poursuite du centre (plus bas = plus de traîne)
 */
const STARS = [
  { r: 42, tilt: -20, flat: 0.42, speed: 0.34, size: 22, color: "#F3D58A", lag: 0.22 },
  { r: 58, tilt: 28, flat: 0.36, speed: -0.26, size: 15, color: "#F1ECE0", lag: 0.17 },
  { r: 74, tilt: -48, flat: 0.5, speed: 0.2, size: 18, color: "#E2BD62", lag: 0.13 },
  { r: 50, tilt: 64, flat: 0.3, speed: -0.4, size: 11, color: "#FFFFFF", lag: 0.2 },
  { r: 90, tilt: 10, flat: 0.28, speed: 0.15, size: 14, color: "#F3D58A", lag: 0.1 },
  { r: 66, tilt: -76, flat: 0.44, speed: -0.18, size: 10, color: "#F1ECE0", lag: 0.15 },
];

/* étoile à quatre branches, rayon 10 */
const SPARKLE =
  "M0 -10 C1.2 -2.4 2.4 -1.2 10 0 C2.4 1.2 1.2 2.4 0 10 C-1.2 2.4 -2.4 1.2 -10 0 C-2.4 -1.2 -1.2 -2.4 0 -10Z";

/* vitesse de poursuite du centre commun */
const CENTER_EASE = 0.18;

/* élargissement maximal des orbites quand le curseur file (facteur) */
const SPREAD = 0.6;

export default function CursorFlock() {
  const root = useRef(null);
  const stars = useRef([]);

  useEffect(() => {
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!fine || reduced) return undefined;

    const zones = Array.from(document.querySelectorAll("[data-flock]"));
    if (!zones.length) return undefined;

    let cleanup = null;

    const ctx = gsap.context(() => {
      const mouse = { x: -300, y: -300 };
      const center = { x: -300, y: -300 };
      /* vitesse du curseur, lissée : pilote l'élargissement des orbites */
      let velocity = 0;
      let active = false;
      let placed = false;

      /* chaque étoile démarre à un angle différent, et garde sa position */
      const state = STARS.map((_, i) => ({
        phase: (i / STARS.length) * Math.PI * 2,
        x: -300,
        y: -300,
      }));

      /* précalcul de l'inclinaison de chaque ellipse */
      const tilts = STARS.map((s) => {
        const a = (s.tilt * Math.PI) / 180;
        return { cos: Math.cos(a), sin: Math.sin(a) };
      });

      const onMove = (e) => {
        mouse.x = e.clientX;
        mouse.y = e.clientY;

        /*
         * Première apparition : on pose tout sur le curseur, sinon les
         * étoiles arriveraient en glissant depuis le coin de l'écran.
         */
        if (!placed) {
          placed = true;
          center.x = mouse.x;
          center.y = mouse.y;
          state.forEach((s) => {
            s.x = mouse.x;
            s.y = mouse.y;
          });
        }

        const inZone = zones.some((zone) => {
          const r = zone.getBoundingClientRect();
          return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
        });

        if (inZone !== active) {
          active = inZone;
          gsap.to(root.current, {
            opacity: inZone ? 1 : 0,
            duration: 0.6,
            ease: "power2.out",
          });
        }
      };

      const tick = (time, deltaMs) => {
        /* pas de temps en secondes, borné : un onglet réveillé ne saute pas */
        const dt = Math.min(deltaMs, 50) / 1000;
        /* coefficient de lissage indépendant de la fréquence d'affichage */
        const k = (ease) => 1 - Math.pow(1 - ease, dt * 60);

        const prevX = center.x;
        const prevY = center.y;
        center.x += (mouse.x - center.x) * k(CENTER_EASE);
        center.y += (mouse.y - center.y) * k(CENTER_EASE);

        const moved = Math.hypot(center.x - prevX, center.y - prevY) / Math.max(dt * 60, 0.001);
        velocity += (moved - velocity) * k(0.08);
        const spread = 1 + Math.min(velocity / 30, 1) * SPREAD;

        for (let i = 0; i < STARS.length; i += 1) {
          const cfg = STARS[i];
          const s = state[i];
          const el = stars.current[i];
          if (!el) continue;

          s.phase += cfg.speed * Math.PI * 2 * dt;

          /* point sur l'ellipse, puis rotation de l'ellipse */
          const ex = Math.cos(s.phase) * cfg.r * spread;
          const ey = Math.sin(s.phase) * cfg.r * cfg.flat * spread;
          const ox = ex * tilts[i].cos - ey * tilts[i].sin;
          const oy = ex * tilts[i].sin + ey * tilts[i].cos;

          /* chaque étoile poursuit sa place sur l'orbite à son rythme */
          s.x += (center.x + ox - s.x) * k(cfg.lag);
          s.y += (center.y + oy - s.y) * k(cfg.lag);

          /*
           * Profondeur : sin(phase) > 0 → moitié « avant » de l'ellipse. On
           * en tire l'échelle, l'opacité et l'ordre d'empilement.
           */
          const depth = Math.sin(s.phase);
          const scale = 0.7 + (depth + 1) * 0.25;
          const twinkle = 0.85 + Math.sin(time * 3.1 + i * 2.3) * 0.15;
          const spin = (time * 40 * (cfg.speed > 0 ? 1 : -1) + i * 30) % 360;

          el.style.transform =
            `translate3d(${s.x.toFixed(2)}px, ${s.y.toFixed(2)}px, 0) ` +
            `scale(${(scale * twinkle).toFixed(3)}) rotate(${spin.toFixed(1)}deg)`;
          el.style.opacity = (0.45 + (depth + 1) * 0.275).toFixed(3);
          el.style.zIndex = depth > 0 ? "2" : "1";
        }
      };

      gsap.ticker.add(tick);
      window.addEventListener("mousemove", onMove, { passive: true });

      cleanup = () => {
        gsap.ticker.remove(tick);
        window.removeEventListener("mousemove", onMove);
      };
    }, root);

    return () => {
      cleanup?.();
      ctx.revert();
    };
  }, []);

  return (
    <div ref={root} aria-hidden="true" className="pointer-events-none fixed inset-0 z-[65] opacity-0">
      {STARS.map((s, i) => (
        <svg
          key={i}
          ref={(el) => {
            stars.current[i] = el;
          }}
          viewBox="-12 -12 24 24"
          className="absolute left-0 top-0 overflow-visible will-change-transform"
          style={{
            width: s.size,
            height: s.size,
            marginLeft: -s.size / 2,
            marginTop: -s.size / 2,
            transform: "translate3d(-300px, -300px, 0)",
            filter: `drop-shadow(0 0 ${Math.round(s.size / 2)}px ${s.color})`,
          }}
        >
          <path d={SPARKLE} fill={s.color} />
        </svg>
      ))}
    </div>
  );
}
