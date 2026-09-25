import { useMemo } from "react";

/**
 * CONSTELLATION DESSINÉE À LA MAIN — les visuels de l'acte IV du Hero.
 *
 * Une carte du ciel tracée à l'encre sur l'ivoire : les liaisons tremblent
 * légèrement (courbe dont le point de contrôle est décalé), et chaque trait
 * est doublé d'un second, plus fin, comme un repassage au crayon. Les étoiles
 * sont des astérisques aux branches inégales ; les plus brillantes sont
 * cerclées d'un rond qui ne se referme pas tout à fait.
 *
 * Rien n'est animé ici : le Hero scrube le tracé en ciblant
 *   [data-hand-line]  chemins à dessiner (pathLength = 1)
 *   [data-hand-star]  étoiles qui éclosent
 *   [data-hand-fade]  étiquette et orbite, en fondu
 * Les tremblés sont graînés : le dessin est identique à chaque chargement.
 */

const INK = "#3A4680"; // bronze
const GOLD = "#B8A26A"; // doré un ton plus soutenu, lisible sur l'ivoire
const LABEL = "#5E6480"; // pierre

export const CHARTS = {
  /* grande constellation, bord droit */
  major: {
    viewBox: "0 0 400 300",
    seed: 11,
    label: { x: 214, y: 286, text: "Nova Major", anchor: "middle" },
    orbit: { cx: 205, cy: 150, rx: 178, ry: 118, from: 200, to: 330 },
    points: [
      [36, 70, 1], [104, 42, 0], [168, 96, 2], [146, 168, 0],
      [228, 204, 1], [316, 176, 2], [362, 104, 0], [84, 226, 0],
    ],
    edges: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [3, 7], [2, 5]],
  },
  /*
   * Carte complète, en tête du Hero sur téléphone : deux constellations
   * reliées, un amas, une planète à anneau, une orbite, une comète, des
   * noms d'étoiles et une règle graduée.
   */
  hero: {
    viewBox: "0 0 400 270",
    seed: 53,
    label: { x: 18, y: 262, text: "Nova Borealis", anchor: "start" },
    orbit: null,
    points: [
      [40, 196, 1], [78, 156, 0], [122, 166, 2], [152, 118, 0], [198, 100, 1],
      [240, 124, 0], [228, 172, 1], [182, 196, 0], [282, 72, 2], [332, 54, 0],
      [366, 92, 1], [122, 76, 0], [92, 44, 1],
      /* l'amas */
      [318, 180, 0], [338, 194, 0], [354, 176, 0], [336, 164, 0],
    ],
    edges: [
      [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 2],
      [4, 8], [8, 9], [9, 10], [10, 5], [3, 11], [11, 12],
      [13, 14], [14, 15], [15, 16], [16, 13],
    ],
    extras: {
      planets: [{ cx: 44, cy: 104, r: 15, ring: { rx: 28, ry: 7, tilt: -18 } }],
      orbits: [{ cx: 282, cy: 72, rx: 42, ry: 15, tilt: -12 }],
      comets: [{ head: [262, 222], tails: [[372, 238], [368, 226], [362, 248]] }],
      names: [
        { i: 2, text: "α Novae", dx: 10, dy: 20 },
        { i: 8, text: "β", dx: 12, dy: -10 },
        { i: 4, text: "γ", dx: -6, dy: -12 },
        { i: 16, text: "amas du studio", dx: 0, dy: -14, anchor: "middle" },
      ],
      ticks: { y: 250, from: 150, to: 390, step: 12, major: 4 },
      moon: { cx: 360, cy: 18, r: 9 },
    },
  },

  /* bandeau étroit, coin haut droit */
  minor: {
    viewBox: "0 0 400 140",
    seed: 29,
    label: { x: 18, y: 128, text: "Atelier Minor", anchor: "start" },
    orbit: null,
    points: [
      [30, 76, 0], [96, 40, 1], [170, 64, 0], [236, 28, 2],
      [300, 70, 0], [372, 44, 1], [262, 112, 0],
    ],
    edges: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [4, 6], [6, 2]],
  },
};

function seeded(seed) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/** Liaison tremblée : une quadratique dont le contrôle dévie de la droite. */
function wobble([x1, y1], [x2, y2], jitter, rand) {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const len = Math.hypot(x2 - x1, y2 - y1) || 1;
  const nx = -(y2 - y1) / len;
  const ny = (x2 - x1) / len;
  const k = (rand() - 0.5) * 2 * jitter;
  return `M${x1.toFixed(1)} ${y1.toFixed(1)} Q${(mx + nx * k).toFixed(1)} ${(my + ny * k).toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`;
}

/** Cercle fait main : rayon qui varie, et un tracé qui dépasse son départ. */
function handCircle(cx, cy, r, rand) {
  const steps = 14;
  const start = rand() * Math.PI * 2;
  const sweep = Math.PI * 2 * 1.08;
  let d = "";
  for (let i = 0; i <= steps; i += 1) {
    const a = start + (sweep * i) / steps;
    const rr = r * (0.92 + rand() * 0.16);
    const x = cx + Math.cos(a) * rr;
    const y = cy + Math.sin(a) * rr;
    d += `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`;
  }
  return d;
}

/** Astérisque : quatre traits aux longueurs et angles un peu inégaux. */
function asterisk(cx, cy, r, rand) {
  let d = "";
  for (let i = 0; i < 4; i += 1) {
    const a = (Math.PI / 4) * i + (rand() - 0.5) * 0.25;
    const len = (i % 2 ? 0.5 : 1) * r * (0.85 + rand() * 0.3);
    const dx = Math.cos(a) * len;
    const dy = Math.sin(a) * len;
    d += `M${(cx - dx).toFixed(1)} ${(cy - dy).toFixed(1)}L${(cx + dx).toFixed(1)} ${(cy + dy).toFixed(1)}`;
  }
  return d;
}

/**
 * `fit` : le dessin remplit la hauteur de son conteneur (proportions
 * gardées) au lieu de suivre sa largeur — pour une zone flexible.
 */
export default function HandConstellation({ chart = "major", className = "", fit = false }) {
  const c = CHARTS[chart];

  const drawing = useMemo(() => {
    const rand = seeded(c.seed);
    const pts = c.points;

    const lines = c.edges.map(([a, b]) => ({
      main: wobble(pts[a], pts[b], 7, rand),
      sketch: wobble(
        [pts[a][0] + 1.5, pts[a][1] - 1],
        [pts[b][0] - 1, pts[b][1] + 1.5],
        9,
        rand
      ),
    }));

    const stars = pts.map(([x, y, size]) => {
      const r = [5, 8, 11][size];
      return {
        x,
        y,
        glyph: asterisk(x, y, r, rand),
        ring: size === 2 ? handCircle(x, y, r + 7, rand) : null,
        dot: size > 0,
      };
    });

    let orbit = null;
    if (c.orbit) {
      const { cx, cy, rx, ry, from, to } = c.orbit;
      const a0 = (from * Math.PI) / 180;
      const a1 = (to * Math.PI) / 180;
      const p0 = [cx + Math.cos(a0) * rx, cy + Math.sin(a0) * ry];
      const p1 = [cx + Math.cos(a1) * rx, cy + Math.sin(a1) * ry];
      orbit = `M${p0[0].toFixed(1)} ${p0[1].toFixed(1)} A${rx} ${ry} 0 0 1 ${p1[0].toFixed(1)} ${p1[1].toFixed(1)}`;
    }

    /* soulignement tremblé sous l'étiquette */
    const { x, y, anchor } = c.label;
    const w = c.label.text.length * 7.4;
    const x0 = anchor === "middle" ? x - w / 2 : x;
    const underline = wobble([x0, y + 6], [x0 + w, y + 4], 2.5, rand);

    /* ---------------- éléments additionnels (carte « hero ») ---------------- */
    const ex = c.extras || {};

    /* ellipse tremblée, inclinée : anneaux de planète et orbites */
    const handEllipse = (cx, cy, rx, ry, tilt) => {
      const t = (tilt * Math.PI) / 180;
      const steps = 20;
      let d = "";
      for (let i = 0; i <= steps; i += 1) {
        const a = (i / steps) * Math.PI * 2 * 1.04;
        const k = 0.95 + rand() * 0.1;
        const px = Math.cos(a) * rx * k;
        const py = Math.sin(a) * ry * k;
        const x1 = cx + px * Math.cos(t) - py * Math.sin(t);
        const y1 = cy + px * Math.sin(t) + py * Math.cos(t);
        d += `${i ? "L" : "M"}${x1.toFixed(1)} ${y1.toFixed(1)}`;
      }
      return d;
    };

    const planets = (ex.planets || []).map((pl) => ({
      body: handCircle(pl.cx, pl.cy, pl.r, rand),
      /* bandes de la planète : deux arcs tremblés */
      bands: [-0.35, 0.3].map((f) =>
        wobble([pl.cx - pl.r * 0.9, pl.cy + pl.r * f], [pl.cx + pl.r * 0.9, pl.cy + pl.r * f - 2], 2, rand)
      ),
      ring: pl.ring ? handEllipse(pl.cx, pl.cy, pl.ring.rx, pl.ring.ry, pl.ring.tilt) : null,
    }));
    const orbits = (ex.orbits || []).map((o) => handEllipse(o.cx, o.cy, o.rx, o.ry, o.tilt));
    const comets = (ex.comets || []).map((cm) => ({
      head: cm.head,
      tails: cm.tails.map((tp) => wobble(cm.head, tp, 4, rand)),
      glyph: asterisk(cm.head[0], cm.head[1], 6, rand),
    }));
    const names = (ex.names || []).map((n) => ({
      x: pts[n.i][0] + n.dx,
      y: pts[n.i][1] + n.dy,
      text: n.text,
      anchor: n.anchor || "start",
    }));
    const ticks = [];
    if (ex.ticks) {
      const { y: ty, from, to, step, major } = ex.ticks;
      for (let tx = from, k = 0; tx <= to; tx += step, k += 1) {
        ticks.push({ x: tx, y: ty, len: k % major === 0 ? 7 : 3.5 });
      }
    }
    const moon = ex.moon
      ? {
          /* croissant : deux arcs qui se rejoignent */
          d: `M${ex.moon.cx} ${ex.moon.cy - ex.moon.r} A${ex.moon.r} ${ex.moon.r} 0 1 0 ${ex.moon.cx} ${ex.moon.cy + ex.moon.r} A${ex.moon.r * 0.72} ${ex.moon.r} 0 1 1 ${ex.moon.cx} ${ex.moon.cy - ex.moon.r}`,
        }
      : null;

    return { lines, stars, orbit, underline, planets, orbits, comets, names, ticks, moon };
  }, [c]);

  return (
    <svg
      viewBox={c.viewBox}
      className={`block overflow-visible ${fit ? "h-full w-full" : "h-auto w-full"} ${className}`}
      preserveAspectRatio="xMidYMid meet"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {drawing.orbit && (
        <path
          data-hand-fade
          d={drawing.orbit}
          stroke={GOLD}
          strokeWidth="1"
          strokeDasharray="1 6"
          opacity="0.7"
        />
      )}

      {/* règle graduée */}
      {drawing.ticks.length > 0 && (
        <g data-hand-fade stroke={INK} strokeWidth="0.8" opacity="0.45">
          {drawing.ticks.map((t) => (
            <line key={t.x} x1={t.x} x2={t.x} y1={t.y} y2={t.y - t.len} />
          ))}
        </g>
      )}

      {/* orbites et anneaux, tracés en pointillés dorés */}
      {drawing.orbits.map((d, i) => (
        <path key={`o${i}`} data-hand-line pathLength="1" d={d} stroke={GOLD} strokeWidth="0.9" opacity="0.8" />
      ))}

      {/* planètes */}
      {drawing.planets.map((pl, i) => (
        <g key={`p${i}`}>
          <path data-hand-line pathLength="1" d={pl.body} stroke={INK} strokeWidth="1.3" />
          {pl.bands.map((b, k) => (
            <path key={k} data-hand-line pathLength="1" d={b} stroke={INK} strokeWidth="0.7" opacity="0.5" />
          ))}
          {pl.ring && <path data-hand-line pathLength="1" d={pl.ring} stroke={GOLD} strokeWidth="1.1" />}
        </g>
      ))}

      {/* croissant de lune */}
      {drawing.moon && (
        <path data-hand-line pathLength="1" d={drawing.moon.d} stroke={GOLD} strokeWidth="1.1" />
      )}

      {/* comètes : traînée en faisceau, tête en astérisque */}
      {drawing.comets.map((cm, i) => (
        <g key={`c${i}`}>
          {cm.tails.map((t, k) => (
            <path key={k} data-hand-line pathLength="1" d={t} stroke={GOLD} strokeWidth={k === 0 ? 1.1 : 0.6} opacity={k === 0 ? 0.9 : 0.5} />
          ))}
          <g data-hand-star>
            <path d={cm.glyph} stroke={INK} strokeWidth="1.3" />
            <circle cx={cm.head[0]} cy={cm.head[1]} r="1.8" fill={GOLD} />
          </g>
        </g>
      ))}

      {drawing.lines.map((l, i) => (
        <g key={i}>
          <path data-hand-line pathLength="1" d={l.main} stroke={INK} strokeWidth="1.5" opacity="0.8" />
          <path data-hand-line pathLength="1" d={l.sketch} stroke={INK} strokeWidth="0.7" opacity="0.35" />
        </g>
      ))}

      {drawing.stars.map((s, i) => (
        <g key={i} data-hand-star>
          {s.ring && (
            <path d={s.ring} stroke={GOLD} strokeWidth="1.1" opacity="0.9" />
          )}
          <path d={s.glyph} stroke={INK} strokeWidth="1.4" />
          {s.dot && <circle cx={s.x} cy={s.y} r="1.8" fill={GOLD} />}
        </g>
      ))}

      {/* noms d'étoiles */}
      {drawing.names.length > 0 && (
        <g data-hand-fade fill={LABEL} className="font-display italic" style={{ fontSize: 10 }}>
          {drawing.names.map((n) => (
            <text key={n.text} x={n.x} y={n.y} textAnchor={n.anchor}>
              {n.text}
            </text>
          ))}
        </g>
      )}

      <g data-hand-fade>
        <text
          x={c.label.x}
          y={c.label.y}
          textAnchor={c.label.anchor}
          fill={LABEL}
          className="font-display italic"
          style={{ fontSize: 15 }}
        >
          {c.label.text}
        </text>
      </g>
      <path data-hand-line pathLength="1" d={drawing.underline} stroke={GOLD} strokeWidth="1" />
    </svg>
  );
}
