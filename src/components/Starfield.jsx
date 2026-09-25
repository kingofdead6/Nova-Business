import { useEffect, useMemo, useRef } from "react";

/*
 * CHAMP D'ÉTOILES — le fond du ciel, posé SOUS la coulée.
 *
 * Il ne s'agit pas d'un décor de remplissage : la coulée sombre est le ciel,
 * et ce champ est ce qu'elle contient. Il n'apparaît donc jamais sur le clair
 * — il est révélé au fur et à mesure que la matière recouvre le cadre.
 *
 * Pourquoi un <canvas> et pas des <div> ou un SVG : à 180 étoiles, autant de
 * nœuds dans l'arbre coûteraient un layout à chaque frame de parallaxe. Ici
 * tout tient dans une seule couche composée, et le rendu est suspendu dès que
 * la section sort de l'écran.
 *
 * Pas de scintillement en boucle : §09 proscrit les animations qui pulsent.
 * La seule chose qui bouge est la dérive, et elle est indexée sur le SCROLL,
 * donc elle s'arrête avec lui.
 */

/** Générateur déterministe : le ciel est le même à chaque chargement. */
function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/*
 * Trois plans de profondeur. Les petites étoiles sont nombreuses et presque
 * immobiles, les grosses sont rares et dérivent le plus : c'est cet écart qui
 * donne l'échelle demandée au §03, sans aucun effet de flou.
 */
/*
 * Les grandeurs sont accordées sur celles du semis SVG de la coulée
 * (SKY_STARS) : le raccord entre Takeover et Values ne doit pas donner à voir
 * deux ciels d'intensités différentes. Les rayons sont en pixels CSS, donc
 * indépendants du viewBox étiré d'en face — d'où des valeurs plus petites
 * pour une présence équivalente à l'écran.
 */
const PLANES = [
  { count: 130, r: [0.6, 1.1], alpha: [0.3, 0.55], drift: 6 },
  { count: 68, r: [1.0, 1.7], alpha: [0.5, 0.8], drift: 14 },
  { count: 26, r: [1.6, 2.6], alpha: [0.75, 1], drift: 26 },
];

export default function Starfield({ className = "", z = 0, seed = 11 }) {
  const canvas = useRef(null);
  const wrap = useRef(null);
  const progress = useRef(0);

  /* Positions en coordonnées normalisées : indépendantes de la taille. */
  const stars = useMemo(() => {
    const rand = mulberry32(seed);
    const out = [];
    PLANES.forEach((plane, pi) => {
      for (let i = 0; i < plane.count; i += 1) {
        out.push({
          x: rand(),
          y: rand(),
          r: plane.r[0] + rand() * (plane.r[1] - plane.r[0]),
          a: plane.alpha[0] + rand() * (plane.alpha[1] - plane.alpha[0]),
          drift: plane.drift,
          plane: pi,
        });
      }
    });
    return out;
  }, [seed]);

  useEffect(() => {
    const el = canvas.current;
    const host = wrap.current;
    if (!el || !host) return undefined;

    const ctx = el.getContext("2d", { alpha: true });
    if (!ctx) return undefined;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let w = 0;
    let h = 0;
    let dpr = 1;
    let raf = 0;
    let visible = true;

    const draw = () => {
      raf = 0;
      ctx.clearRect(0, 0, w, h);

      /*
       * La dérive est un simple décalage vertical indexé sur la progression
       * du scroll. Les plans lointains bougent moins : le ciel a de la
       * profondeur, et on n'a dépensé ni WebGL ni filtre pour l'obtenir.
       */
      const p = reduced ? 0 : progress.current;

      for (let i = 0; i < stars.length; i += 1) {
        const s = stars[i];
        const y = s.y * h - p * s.drift;
        /* enroulement : une étoile sortie par le haut rentre par le bas */
        const yy = ((y % h) + h) % h;

        ctx.globalAlpha = s.a;
        ctx.beginPath();
        ctx.arc(s.x * w, yy, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    };

    const schedule = () => {
      if (raf || !visible) return;
      raf = requestAnimationFrame(draw);
    };

    const resize = () => {
      const rect = host.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = Math.max(1, Math.round(rect.width));
      h = Math.max(1, Math.round(rect.height));
      el.width = Math.round(w * dpr);
      el.height = Math.round(h * dpr);
      el.style.width = `${w}px`;
      el.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      /* la couleur « contraste » du §04 : les étoiles sont un or pâle */
      ctx.fillStyle = "#C8B88A";
      draw();
    };

    const onScroll = () => {
      const rect = host.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      /* -1 → 1 selon la traversée du cadre par la fenêtre */
      progress.current = (vh / 2 - (rect.top + rect.height / 2)) / vh;
      schedule();
    };

    /*
     * Rendu suspendu hors écran — exigence explicite du §07. Sans ça, le
     * canvas continuerait à repeindre pendant tout le reste de la page.
     */
    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (visible) schedule();
      },
      { rootMargin: "10% 0px" }
    );
    io.observe(host);

    const ro = new ResizeObserver(resize);
    ro.observe(host);

    resize();
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      io.disconnect();
      ro.disconnect();
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [stars]);

  return (
    <div
      ref={wrap}
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
      style={{ zIndex: z }}
      aria-hidden="true"
    >
      <canvas ref={canvas} className="block h-full w-full" />
    </div>
  );
}
