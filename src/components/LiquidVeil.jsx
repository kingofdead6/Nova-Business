import { useEffect, useId, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import {
  LAYERS,
  FLOURISHES,
  VIEWBOX,
  liquidPath,
  flourishPath,
  layerProgress,
  layerColor,
  SKY_STARS,
} from "../lib/liquid";

gsap.registerPlugin(ScrollTrigger);

/**
 * VOILE LIQUIDE — recouvrement procédural piloté par le scroll.
 *
 * Le scroll est la SEULE source de vérité : à chaque frame on lit la
 * progression du ScrollTrigger et on régénère la géométrie pour cette valeur.
 * Il n'y a aucune timeline autonome pour le mouvement principal, donc :
 *   - scroll avant   → la coulée avance
 *   - scroll arrière → elle recule exactement de la même façon
 *   - arrêt          → elle se fige dans l'état courant
 *
 * Performance : le DOM SVG est construit UNE fois. À chaque frame on ne
 * réécrit que l'attribut `d` de quelques <path> — aucun re-render React,
 * aucune allocation de nœud, aucune propriété déclenchant un layout.
 *
 * props
 *  - flip       : false → la matière monte depuis le bas (recouvrement)
 *                 true  → elle descend depuis le haut (rideau inversé)
 *  - palette    : "dark" sur fond clair, "light" sur fond sombre
 *  - z          : empilement — 0 pour passer derrière le contenu,
 *                 au-dessus de celui du contenu pour le recouvrir
 *  - reverse    : inverse la progression (1 → 0) : la matière est déjà là
 *                 au début et se retire au fil du scroll
 *  - start/end  : bornes ScrollTrigger, pour adapter à la hauteur de section
 *  - onProgress : reçoit la progression 0→1 à chaque mise à jour
 */

/** Progression minimale entre deux écritures : évite le travail inutile. */
const EPS = 0.0005;

export default function LiquidVeil({
  flip = false,
  palette = "dark",
  z = 0,
  reverse = false,
  start = "top top",
  end = "bottom bottom",
  onProgress,
  stars = false,
  className = "",
}) {
  const root = useRef(null);
  const pathRefs = useRef([]);
  const flourishRefs = useRef([]);
  /* jumeau du dernier calque, utilisé comme masque du champ d'étoiles */
  const clipRef = useRef(null);
  const starsRef = useRef(null);
  /* le voile est instancié plusieurs fois : l'id du masque doit être unique */
  const clipId = `veil-sky-${useId().replace(/:/g, "")}`;

  // le callback change d'identité à chaque render du parent : on le garde
  // dans un ref pour ne pas relancer tout l'effet
  const onProgressRef = useRef(onProgress);
  onProgressRef.current = onProgress;

  /*
   * CORRECTION D'ASPECT DES ÉTOILES.
   *
   * Le viewBox est carré mais le SVG est étiré (`preserveAspectRatio="none"`)
   * pour épouser le cadre : un <circle> y deviendrait un ovale d'autant plus
   * écrasé que l'écran est large. On garde donc `rx` en unités de viewBox et
   * on recalcule `ry` à partir du rapport réel — les étoiles restent rondes
   * du mobile à l'ultra-large, sans toucher à la géométrie de la coulée.
   */
  useEffect(() => {
    if (!stars) return undefined;
    const host = root.current;
    const group = starsRef.current;
    if (!host || !group) return undefined;

    const fit = () => {
      const { width, height } = host.getBoundingClientRect();
      if (!width || !height) return;
      const ratio = width / height;
      const nodes = group.children;
      for (let i = 0; i < nodes.length; i += 1) {
        const rx = SKY_STARS[i]?.r;
        if (rx == null) continue;
        nodes[i].setAttribute("ry", String(rx * ratio));
      }
    };

    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(host);
    return () => ro.disconnect();
  }, [stars]);

  useEffect(() => {
    if (!root.current) return undefined;

    const ctx = gsap.context(() => {
      const section = root.current.closest("section");
      if (!section) return;

      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      /** Écrit la géométrie correspondant à une progression donnée. */
      const draw = (raw) => {
        const p = reverse ? 1 - raw : raw;
        for (let i = 0; i < LAYERS.length; i++) {
          const path = pathRefs.current[i];
          if (!path) continue;
          const lp = layerProgress(p, LAYERS[i].bias);
          const d = liquidPath(LAYERS[i], lp, flip);
          path.setAttribute("d", d);
          /*
           * Le masque du ciel suit EXACTEMENT le dernier calque : les étoiles
           * ne peuvent donc jamais déborder sur le clair, et leur apparition
           * épouse le bord ondulé de la coulée sans le moindre décalage.
           */
          if (i === LAYERS.length - 1 && clipRef.current) {
            clipRef.current.setAttribute("d", d);
          }
        }

        for (let i = 0; i < FLOURISHES.length; i++) {
          const el = flourishRefs.current[i];
          if (!el) continue;
          el.setAttribute("d", flourishPath(FLOURISHES[i], p, flip));
        }
      };

      /* ------------------------------------------------------------------ */
      /* MOUVEMENT RÉDUIT                                                    */
      /* ------------------------------------------------------------------ */

      if (reduced) {
        // état final, sans animation : la section reste lisible
        draw(1);
        onProgressRef.current?.(1);
        return;
      }

      /* ------------------------------------------------------------------ */
      /* BOUCLE DE RENDU                                                     */
      /* ------------------------------------------------------------------ */

      // `scrub` interpole la valeur cible : on anime un objet nu, et c'est son
      // onUpdate qui redessine. La géométrie suit donc le scroll avec le même
      // lissage que le reste du site, sans jamais devenir autonome.
      const state = { p: 0 };
      let lastDrawn = -1;

      draw(0);
      onProgressRef.current?.(0);

      const tween = gsap.to(state, {
        p: 1,
        ease: "none",
        scrollTrigger: {
          trigger: section,
          start,
          end,
          scrub: 0.6,
          invalidateOnRefresh: true,
        },
        onUpdate: () => {
          const p = state.p;
          if (Math.abs(p - lastDrawn) < EPS) return;
          lastDrawn = p;
          draw(p);
          onProgressRef.current?.(p);
        },
      });

      // si la section est déjà dépassée au chargement (rechargement en cours
      // de page), on se cale immédiatement sur le bon état
      requestAnimationFrame(() => {
        ScrollTrigger.refresh();
        const st = tween.scrollTrigger;
        if (st) {
          draw(st.progress);
          onProgressRef.current?.(st.progress);
        }
      });
    }, root);

    return () => ctx.revert();
  }, [flip, start, end, reverse]);

  return (
    /*
     * `z` est écrit en style inline plutôt qu'en classe : deux utilitaires
     * Tailwind de même spécificité (z-0 et z-20) seraient départagés par leur
     * ordre dans la feuille, pas par l'ordre dans l'attribut — donc peu fiable.
     */
    <div
      ref={root}
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
      style={{ zIndex: z }}
      aria-hidden="true"
    >
      <svg
        viewBox={VIEWBOX}
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full"
        style={{ display: "block" }}
      >
        {/*
          fill-rule="evenodd" : c'est lui qui crée la topologie « papier
          découpé ». Un sous-chemin fermé posé SUR la matière y perce un trou,
          le même posé sur le vide y pose un îlot — sans masque ni filtre.
        */}
        {LAYERS.map((layer, i) => (
          <path
            key={layer.id}
            ref={(el) => {
              pathRefs.current[i] = el;
            }}
            fill={layerColor(i, palette)}
            fillRule="evenodd"
            shapeRendering="geometricPrecision"
          />
        ))}

        {/*
          CHAMP D'ÉTOILES — dessiné À L'INTÉRIEUR de la matière.

          Le <clipPath> est le jumeau du dernier calque : les étoiles ne sont
          visibles que là où le ciel a déjà recouvert l'écran, et se révèlent
          donc au rythme de la coulée plutôt qu'en fondu. Rien ne scintille —
          §09 proscrit les éléments qui pulsent — c'est le déplacement du bord
          qui les fait apparaître.
        */}
        {stars && (
          <>
            <defs>
              <clipPath id={clipId} clipPathUnits="userSpaceOnUse">
                <path ref={clipRef} />
              </clipPath>
            </defs>
            <g ref={starsRef} clipPath={`url(#${clipId})`} fill="#C8B88A">
              {SKY_STARS.map((s, i) => (
                <ellipse key={i} cx={s.x} cy={s.y} rx={s.r} ry={s.r} opacity={s.a} />
              ))}
            </g>
          </>
        )}

        {/* fioritures dessinées : arcs ouverts, tracés et non remplis */}
        <g
          fill="none"
          stroke={palette === "light" ? "#3A4680" : "#C8B88A"}
          strokeWidth="3"
          strokeLinecap="round"
          opacity="0.5"
        >
          {FLOURISHES.map((f, i) => (
            <path
              key={i}
              ref={(el) => {
                flourishRefs.current[i] = el;
              }}
            />
          ))}
        </g>
      </svg>
    </div>
  );
}
