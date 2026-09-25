import { useEffect, useMemo, useRef, useState } from "react";
import anime from "animejs/lib/anime.es.js";

/**
 * CIEL COSMIQUE — l'ouverture du site (Preloader) et l'acte I du Hero.
 *
 * Nuit aurore (indigo → violet → magenta, halos turquoise, rose et ambre),
 * poussière d'étoiles, étincelles à quatre branches et deux constellations
 * posées de part et d'autre du centre, qui reste libre pour le titre.
 *
 * Le composant gère lui-même le scintillement (boucle autonome, coupée en
 * mouvement réduit). Avec `hidden`, étoiles et nœuds partent invisibles et
 * les tracés ne sont pas encore dessinés : c'est au parent de les révéler en
 * ciblant `.sky-star`, `.cline` et `.cnode`.
 */

export const SKY_COLORS = ["#FFD166", "#FF6FB5", "#7CF3E3", "#B49CFF", "#FFFFFF"];

export const SKY_BACKGROUND =
  "radial-gradient(ellipse 60% 50% at 15% 85%, rgba(45,226,196,0.35), transparent 70%)," +
  "radial-gradient(ellipse 55% 45% at 88% 12%, rgba(255,95,162,0.40), transparent 70%)," +
  "radial-gradient(ellipse 50% 40% at 80% 90%, rgba(255,200,87,0.22), transparent 70%)," +
  "linear-gradient(160deg, #0B0624 0%, #221047 45%, #4A1463 80%, #6B1D6E 100%)";

/* étoile à quatre branches, centrée sur l'origine, rayon 10 */
const SPARKLE =
  "M0 -10 C1.2 -2.4 2.4 -1.2 10 0 C2.4 1.2 1.2 2.4 0 10 C-1.2 2.4 -2.4 1.2 -10 0 C-2.4 -1.2 -1.2 -2.4 0 -10Z";

/*
 * Constellations (viewBox 1000×600), tenues à l'écart du centre.
 *
 * Le SVG est en `slice` : sur un écran en portrait, seule une bande centrale
 * d'environ x 360 → 640 reste visible, et les constellations des bords
 * seraient rognées. On leur substitue alors un jeu au-dessus et au-dessous
 * du titre, dans cette bande.
 */
const CONSTELLATIONS = {
  wide: [
    [[80, 110], [175, 80], [245, 160], [205, 255], [300, 320], [180, 410], [105, 505]],
    [[755, 95], [845, 175], [935, 125], [890, 290], [800, 370], [905, 465], [830, 540]],
  ],
  tall: [
    [[392, 70], [450, 40], [520, 95], [590, 60], [612, 150], [545, 185]],
    [[400, 450], [465, 425], [505, 490], [585, 470], [605, 545], [520, 570]],
  ],
};

/** Vrai quand l'écran est plus haut que large. */
function usePortrait() {
  const query = "(max-aspect-ratio: 1/1)";
  const [portrait, setPortrait] = useState(
    () => typeof window !== "undefined" && window.matchMedia(query).matches
  );
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setPortrait(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return portrait;
}

/** Générateur pseudo-aléatoire graîné : le même ciel à chaque chargement. */
function seeded(seed) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export default function CosmicSky({ seed = 20260925, hidden = false, className = "" }) {
  const root = useRef(null);
  /* les id SVG doivent être uniques : le ciel est monté deux fois */
  const uid = `sky${seed}`;
  const portrait = usePortrait();
  const constellations = CONSTELLATIONS[portrait ? "tall" : "wide"];

  const sky = useMemo(() => {
    const rand = seeded(seed);
    const dot = (x0, span) => ({
      x: x0 + rand() * span,
      y: rand() * 600,
      r: 0.6 + rand() * 1.6,
      color: rand() > 0.75 ? SKY_COLORS[Math.floor(rand() * 4)] : "#FFFFFF",
    });
    const dots = Array.from({ length: 110 }, () => dot(0, 1000));
    const sparks = Array.from({ length: 18 }, () => ({
      x: rand() * 1000,
      y: rand() * 600,
      s: 0.5 + rand() * 1.1,
      color: SKY_COLORS[Math.floor(rand() * SKY_COLORS.length)],
    }));
    /*
     * En portrait, seule la bande x 360 → 640 est visible : on la densifie.
     * Tirées APRÈS le reste, ces étoiles n'en décalent pas la graine — le
     * ciel de base est le même dans les deux orientations. En paysage elles
     * formaient une colonne plus dense au milieu : on ne les ajoute plus.
     */
    if (portrait) dots.push(...Array.from({ length: 40 }, () => dot(360, 280)));
    return { dots, sparks };
  }, [seed, portrait]);

  useEffect(() => {
    const el = root.current;
    if (!el) return undefined;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;

    /*
     * Les boucles partent de l'état affiché (opacité 1, échelle 1, angle 0) :
     * partir d'une autre valeur faisait « sauter » chaque étoile à son
     * premier tick.
     */
    const twinkle = anime({
      targets: el.querySelectorAll(".twinkle"),
      opacity: () => [1, anime.random(20, 45) / 100],
      duration: () => anime.random(700, 1800),
      delay: () => anime.random(0, 1200),
      direction: "alternate",
      loop: true,
      easing: "easeInOutSine",
    });

    /* les étincelles restent lisibles : elles respirent sans s'éteindre */
    const glint = anime({
      targets: el.querySelectorAll(".twinkle-spark"),
      opacity: () => [1, anime.random(45, 70) / 100],
      duration: () => anime.random(900, 2000),
      delay: () => anime.random(0, 1200),
      direction: "alternate",
      loop: true,
      easing: "easeInOutSine",
    });

    const spin = anime({
      targets: el.querySelectorAll(".spark-inner"),
      rotate: () => [0, anime.random(0, 1) ? 90 : -90],
      scale: [1, 0.72],
      duration: () => anime.random(1400, 2600),
      direction: "alternate",
      loop: true,
      easing: "easeInOutSine",
    });

    /* hors de l'écran, le ciel ne travaille pas */
    const io = new IntersectionObserver(([entry]) => {
      [twinkle, glint, spin].forEach((a) => (entry.isIntersecting ? a.play() : a.pause()));
    });
    io.observe(el);

    return () => {
      io.disconnect();
      [twinkle, glint, spin].forEach((a) => a.pause());
    };
  }, [portrait]);

  const start = hidden ? "0" : "1";

  return (
    <div
      ref={root}
      aria-hidden="true"
      className={`absolute inset-0 overflow-hidden ${className}`}
      style={{ background: SKY_BACKGROUND }}
    >
      <svg
        viewBox="0 0 1000 600"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 h-full w-full"
      >
        <defs>
          {/*
            Halo en dégradé radial plutôt qu'un filtre flou : un filtre sur un
            élément animé est recalculé à chaque frame, et ralentissait le
            repli du cadre dans le Hero.
          */}
          <radialGradient id={`${uid}-halo`}>
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </radialGradient>
          <linearGradient id={`${uid}-line`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#7CF3E3" />
            <stop offset="100%" stopColor="#FF6FB5" />
          </linearGradient>
        </defs>

        {/* poussière d'étoiles */}
        {sky.dots.map((d, i) => (
          <g key={`d${i}`} className="sky-star" opacity={start}>
            <circle className="twinkle" cx={d.x} cy={d.y} r={d.r} fill={d.color} />
          </g>
        ))}

        {/* étincelles à quatre branches */}
        {sky.sparks.map((s, i) => (
          <g
            key={`s${i}`}
            className="sky-star"
            opacity={start}
            transform={`translate(${s.x} ${s.y}) scale(${s.s})`}
          >
            {/* le halo scintille AVEC l'étincelle : seul, il restait en tache grise */}
            <g className="twinkle-spark">
              <circle r="12" fill={`url(#${uid}-halo)`} opacity="0.35" />
              <path
                className="spark-inner"
                d={SPARKLE}
                fill={s.color}
                style={{ transformBox: "fill-box", transformOrigin: "center" }}
              />
            </g>
          </g>
        ))}

        {/* constellations */}
        {constellations.map((pts, c) => (
          <g key={`c${c}`}>
            <path
              className="cline"
              d={`M${pts.map((p) => p.join(" ")).join(" L")}`}
              fill="none"
              stroke={`url(#${uid}-line)`}
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={hidden ? "0" : "0.75"}
            />
            {pts.map(([x, y], i) => (
              <g key={i} transform={`translate(${x} ${y})`}>
                <g
                  className="cnode"
                  opacity={start}
                  style={{ transformBox: "fill-box", transformOrigin: "center" }}
                >
                  <circle r="12" fill={`url(#${uid}-halo)`} opacity="0.35" />
                  <circle r="9" fill={SKY_COLORS[(i + c * 2) % 4]} opacity="0.22" />
                  <path
                    d={SPARKLE}
                    transform="scale(0.55)"
                    fill={i % 3 === 0 ? "#FFD166" : "#FFFFFF"}
                  />
                </g>
              </g>
            ))}
          </g>
        ))}
      </svg>
    </div>
  );
}
