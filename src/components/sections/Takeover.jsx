import { useCallback, useEffect, useRef } from "react";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import anime from "animejs/lib/anime.es.js";

import { splitChars, splitWords } from "../../lib/text";
import LiquidVeil from "../LiquidVeil";
import building from "../../assets/takeover/building.png";
import flower from "../../assets/takeover/flower.png";

gsap.registerPlugin(ScrollTrigger);

/**
 * SECTION 03 — RECOUVREMENT LIQUIDE
 *
 * Première moitié d'un diptyque : Takeover recouvre l'écran de matière
 * charbon, Values EST cette matière une fois posée. La dernière couche du
 * voile (#171A2E) est exactement `bg-charbon` : le raccord entre les deux
 * sections est donc invisible, et ce qui commence ici se termine là-bas.
 *
 * Composition — deux couches superposées dans le cadre sticky, qui se
 * relaient au scroll :
 *
 *   ┌───────────────────────────────────────────┐      ┌──────────────────────┐
 *   │  eyebrow                                  │      │  eyebrow             │
 *   │                                           │  →   │  nova.      ← replié │
 *   │                 nova.                     │      │ [img] description    │
 *   └───────────────────────────────────────────┘      └──────────────────────┘
 *        titre plein cadre                          il RESTE, en petit, au-dessus
 *
 * DÉROULÉ (celui de la référence vidéo) :
 *
 *   1. FOND CLAIR   — on entre sur `bg-ivoire`, le voile est encore hors cadre
 *   2. COULÉE       — la matière monte et recouvre l'écran ; le titre se
 *                     révèle dessus une fois la couverture faite
 *   3. LE TITRE SE REPLIE — il se réduit et remonte se poser sous l'eyebrow,
 *                     où il RESTE affiché jusqu'à la fin de la section
 *   4. DESCRIPTION  — elle entre par la droite, et À SA HAUTEUR les deux
 *                     visuels apparaissent aux bords gauche et droit
 *
 * Les visuels sont des PNG détourés, posés sans cadre ni fond. Ils ENTRENT EN
 * PIVOTANT : le pivot est placé loin au-dessus d'eux, si bien que la rotation
 * décrit un arc large qui les amène du hors-champ jusqu'à leur place. Leur
 * ancrage CSS, lui, ne bouge jamais.
 *
 * C'est le voile — et lui seul — qui fait passer le fond du clair au sombre.
 * La <section> reste donc `bg-ivoire` : c'est ce qu'on voit à l'entrée.
 */

/*
 * Poussières dorées qui montent dans la matière une fois la coulée posée.
 * Positions fixes (pas de hasard au rendu) : x en %, départ en vh sous le
 * cadre, course en vh, taille en px.
 */
const MOTES = [
  [6, 12, 150, 3], [14, 40, 120, 2], [22, 5, 170, 4], [31, 30, 135, 2],
  [39, 18, 160, 3], [47, 50, 115, 2], [55, 8, 175, 3], [63, 35, 130, 4],
  [71, 15, 155, 2], [79, 45, 125, 3], [87, 10, 165, 2], [94, 28, 140, 3],
  [10, 60, 110, 2], [34, 65, 105, 3], [58, 58, 118, 2], [82, 62, 108, 2],
];

/* étoiles filantes : départ (top en %), angle, instant sur la timeline */
const SHOOTING = [
  [16, 14, 0.5],
  [34, 9, 0.6],
  [9, 18, 0.8],
];

/* Fenêtre de progression du voile pendant laquelle le texte se révèle. */
const REVEAL_START = 0.5;
const REVEAL_END = 0.8;

export default function Takeover() {
  const root = useRef(null);
  const textTimeline = useRef(null);

  /** Synchronise la timeline de texte sur la progression de LiquidVeil. */
  const updateText = useCallback((progress) => {
    const tl = textTimeline.current;
    if (!tl) return;

    const t = (progress - REVEAL_START) / (REVEAL_END - REVEAL_START);
    tl.seek(tl.duration * Math.min(1, Math.max(0, t)));
  }, []);

  useEffect(() => {
    if (!root.current) return undefined;

    const ctx = gsap.context(() => {
      const q = (sel) => root.current.querySelector(sel);
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      const word = q("[data-word]");
      const sub = q("[data-sub]");
      const eyebrow = q("[data-eyebrow]");
      const rule = q("[data-rule]");
      const titleLayer = q("[data-title-layer]");
      const descLayer = q("[data-desc-layer]");
      /*
       * Hauteur où « nova. » se pose une fois replié. Bureau : 7vh, inchangé.
       * Téléphone : l'eyebrow peut passer sur deux lignes ; le mot se pose
       * donc juste SOUS lui (mesuré), au lieu de le chevaucher.
       */
      const FOLD =
        window.matchMedia("(max-width: 767px)").matches && eyebrow
          ? `${eyebrow.offsetTop + eyebrow.offsetHeight + 14}px`
          : "7vh";
      const leftArt = q("[data-art-left]");
      const rightArt = q("[data-art-right]");
      const motes = root.current.querySelectorAll("[data-mote]");
      const shooting = root.current.querySelectorAll("[data-shoot]");
      const fil = q("[data-fil]");

      if (!word || !sub) return;

      const chars = splitChars(word);

      /*
       * Le paragraphe se révèle MOT PAR MOT. `splitWords` recrée le <span
       * data-key> autour de « mémorable » : on y ajoute ensuite le trait
       * fait main qui viendra le souligner.
       */
      const subWords = splitWords(sub);
      const key = sub.querySelector("[data-key]");
      if (key && !key.querySelector("svg")) {
        key.insertAdjacentHTML(
          "beforeend",
          '<svg viewBox="0 0 200 20" preserveAspectRatio="none" aria-hidden="true" ' +
            'class="pointer-events-none absolute -bottom-2 left-0 h-3 w-full overflow-visible">' +
            '<path d="M3 13 C 40 6, 90 16, 130 9 S 185 7, 197 11" fill="none" ' +
            'stroke="#C8B88A" stroke-width="3" stroke-linecap="round" pathLength="1" />' +
            "</svg>"
        );
      }
      const underline = key ? key.querySelector("path") : null;

      /* ------------------------------------------------------------------ */
      /* ÉTAT INITIAL                                                        */
      /* ------------------------------------------------------------------ */

      gsap.set(chars, {
        opacity: 0,
        yPercent: 70,
        rotate: 5,
        transformOrigin: "50% 100%",
      });
      gsap.set(sub, { opacity: 0, y: 30 });
      gsap.set(subWords, { yPercent: 110 });
      if (underline) gsap.set(underline, { strokeDasharray: 1, strokeDashoffset: 1 });
      gsap.set(motes, { opacity: 0, y: 0 });
      gsap.set(shooting, { opacity: 0, xPercent: -120 });
      if (fil) gsap.set(fil, { scaleY: 0, transformOrigin: "50% 0%" });
      if (rule) gsap.set(rule, { scaleX: 0, transformOrigin: "0% 50%" });

      /*
       * La couche description part masquée : elle n'entre qu'une fois le titre
       * sorti.
       *
       * Les visuels S'IMPRIMENT. Comme une gravure qu'on tire de la presse,
       * chaque image se révèle de bas en haut derrière une ligne de lumière
       * dorée (le « balayage ») : le masque remonte, l'image se resserre
       * légèrement vers sa taille finale, et la ligne s'éteint une fois en
       * haut. Voir `[data-art-print]` et `[data-art-scan]` dans le rendu.
       */
      const arts = [leftArt, rightArt].filter(Boolean);
      const prints = arts.map((a) => a.querySelector("[data-art-print]"));
      const scans = arts.map((a) => a.querySelector("[data-art-scan]"));
      const artImgs = arts.map((a) => a.querySelector("img"));
      const auras = arts.map((a) => a.querySelector("[data-art-aura]")).filter(Boolean);

      /*
       * La couche titre est ancrée en haut (`items-start`) mais démarre avec
       * un grand retrait qui la place optiquement au CENTRE du cadre. C'est ce
       * retrait que le relais rétracte : le mot remonte donc en se repliant,
       * sans jamais quitter l'écran.
       */
      if (titleLayer) gsap.set(titleLayer, { paddingTop: "34vh" });

      if (descLayer) gsap.set(descLayer, { opacity: 0 });
      gsap.set(arts, { opacity: 0, y: 40 });
      gsap.set(prints, { clipPath: "inset(100% 0% 0% 0%)" });
      gsap.set(artImgs, { scale: 1.12, transformOrigin: "50% 100%" });
      gsap.set(scans, { top: "100%", opacity: 0 });
      gsap.set(auras, { opacity: 0, scale: 0.7 });

      /* ------------------------------------------------------------------ */
      /* MOUVEMENT RÉDUIT — tout est posé, rien ne bouge                     */
      /* ------------------------------------------------------------------ */

      if (reduced) {
        gsap.set(chars, { opacity: 1, yPercent: 0, rotate: 0 });
        gsap.set(sub, { opacity: 1, y: 0 });
        gsap.set(subWords, { yPercent: 0 });
        if (underline) gsap.set(underline, { strokeDashoffset: 0 });
        if (fil) gsap.set(fil, { scaleY: 1 });
        if (rule) gsap.set(rule, { scaleX: 1 });
        /*
         * Sans mouvement, on affiche directement l'état final : le titre déjà
         * replié en signature compacte, la description en place dessous.
         */
        if (titleLayer) gsap.set(titleLayer, { paddingTop: FOLD });
        gsap.set(word, { scale: 0.3 });
        if (descLayer) gsap.set(descLayer, { opacity: 1 });
        gsap.set(arts, { opacity: 1, y: 0 });
        gsap.set(prints, { clipPath: "none" });
        gsap.set(artImgs, { scale: 1 });
        gsap.set(auras, { opacity: 1, scale: 1 });
        return;
      }

      /* ------------------------------------------------------------------ */
      /* TEXTE — timeline anime.js pilotée par la progression du voile       */
      /* ------------------------------------------------------------------ */

      const timeline = anime.timeline({ autoplay: false, easing: "easeOutExpo" });

      timeline.add({
        targets: chars,
        opacity: [0, 1],
        translateY: ["70%", "0%"],
        rotate: [5, 0],
        duration: 1100,
        delay: anime.stagger(55),
      });

      /*
       * NB : seul le TITRE est piloté par la coulée. La description ne fait
       * plus partie de cette timeline — elle entre plus tard, une fois le
       * titre sorti du cadre, et dépend donc du scroll et non de la
       * progression du voile (voir « RELAIS » plus bas).
       */

      textTimeline.current = timeline;

      /* ------------------------------------------------------------------ */
      /* EYEBROW — apparaît à l'entrée dans la section                       */
      /* ------------------------------------------------------------------ */

      if (eyebrow) {
        gsap.fromTo(
          eyebrow,
          { opacity: 0, y: -14 },
          {
            opacity: 1,
            y: 0,
            duration: 1,
            ease: "expo.out",
            scrollTrigger: { trigger: root.current, start: "top 70%" },
          }
        );
      }

      /* ------------------------------------------------------------------ */
      /* RELAIS — le titre sort, la description et les visuels prennent la    */
      /* place                                                                */
      /* ------------------------------------------------------------------ */
      /*
       * Une seule timeline scrubée sur toute la traversée de la section. Les
       * positions sont des fractions de sa durée (0 → 1) et se lisent donc
       * directement comme une progression de scroll :
       *
       *   0.00 → 0.62  la coulée monte, le titre se révèle dessus
       *                (piloté par `updateText`, pas par cette timeline)
       *   0.62 → 0.72  LE TITRE S'ÉLÈVE ET SORT par le haut
       *   0.66 → 0.88  les visuels PIVOTENT depuis le hors-champ, texte entre
       *   0.86 → 1.00  maintien : tout est lisible avant le passage à Values
       *
       * Par-dessus, des couches d'ambiance, toutes scrubées elles aussi :
       * poussières dorées qui montent dans la matière, étoiles filantes, fil
       * de progression sur le bord gauche, reflet doré sur « nova. » replié
       * et dérive lente des visuels pendant le maintien.
       *
       * La timeline est ANCRÉE à 0.9 (voir la fin) : c'est la durée qu'elle
       * avait avant l'ajout de ces couches, donc la chorégraphie calée sur le
       * voile ne bouge pas. Une position t tombe à t / 0.9 du scroll.
       */

      const relay = gsap.timeline({
        scrollTrigger: {
          trigger: root.current,
          start: "top top",
          end: "bottom bottom",
          scrub: 1.2,
        },
      });

      /* le titre respire pendant que la coulée le recouvre */
      relay.fromTo(
        word,
        { scale: 1, y: 0 },
        { scale: 1.04, y: -18, ease: "none", duration: 0.62 },
        0
      );

      /*
       * ...puis IL SE REPLIE au lieu de partir.
       *
       * Deux tweens simultanés :
       *  - le mot se réduit à ~30 % (origine en haut, donc il se ramasse vers
       *    son propre bord supérieur) ;
       *  - la couche remonte en rétractant son padding, de 34vh à 7vh.
       *
       * Résultat : « nova. » vient se poser en petit sous l'eyebrow et Y RESTE
       * jusqu'à la fin de la section. Comme la timeline est scrubée, remonter
       * le déplie exactement à l'envers — il grandit et retrouve le centre.
       */
      relay.to(
        word,
        { scale: 0.3, y: 0, ease: "power2.inOut", duration: 0.16 },
        0.62
      );

      if (titleLayer) {
        relay.to(
          titleLayer,
          { paddingTop: FOLD, ease: "power2.inOut", duration: 0.16 },
          0.62
        );
      }

      /* la couche description devient active dès que le titre libère le cadre */
      if (descLayer) {
        relay.to(descLayer, { opacity: 1, duration: 0.02 }, 0.66);
      }

      /*
       * L'IMPRESSION — le masque remonte à vitesse constante (`ease: none`,
       * la ligne avance au rythme du scroll, comme un rouleau), et le
       * balayage doré le suit exactement puisqu'ils partagent position et
       * durée. Le visuel de droite part un peu après celui de gauche.
       */
      const PRINT = 0.16;
      arts.forEach((el, i) => {
        const at = 0.66 + i * 0.03;
        relay.to(el, { opacity: 1, duration: 0.02, ease: "none" }, at);
        relay.to(el, { y: 0, duration: PRINT + 0.04, ease: "power2.out" }, at);
        relay.to(prints[i], { clipPath: "inset(0% 0% 0% 0%)", duration: PRINT, ease: "none" }, at);
        /*
         * Une fois l'image imprimée, le masque est RETIRÉ : laissé à
         * `inset(0%)`, il découpait net le halo et l'ombre portée
         * (`drop-shadow`) aux bords de l'image. Scrubé, ce `set` se rejoue à
         * l'envers en remontant — le masque revient avant que l'image ne se
         * « désimprime ».
         */
        relay.set(prints[i], { clipPath: "none" }, at + PRINT);
        relay.to(artImgs[i], { scale: 1, duration: PRINT + 0.04, ease: "power2.out" }, at);
        /* le halo s'allume derrière l'image à mesure qu'elle s'imprime */
        if (auras[i]) {
          relay.to(auras[i], { opacity: 1, scale: 1, duration: PRINT, ease: "power1.out" }, at + 0.03);
        }
        if (scans[i]) {
          relay.to(scans[i], { top: "0%", duration: PRINT, ease: "none" }, at);
          relay.to(scans[i], { opacity: 1, duration: 0.015, ease: "none" }, at);
          relay.to(scans[i], { opacity: 0, duration: 0.025, ease: "none" }, at + PRINT - 0.01);
        }
      });

      /* le filet se trace, puis le paragraphe monte */
      if (rule) {
        relay.to(rule, { scaleX: 1, ease: "expo.out", duration: 0.12 }, 0.72);
      }

      /* le paragraphe : le bloc se pose, puis les mots montent un à un */
      relay.to(sub, { opacity: 1, y: 0, ease: "expo.out", duration: 0.1 }, 0.74);
      relay.to(
        subWords,
        { yPercent: 0, ease: "power3.out", duration: 0.05, stagger: 0.002 },
        0.75
      );

      /* le mot-clé se souligne d'un trait de plume, une fois la phrase lue */
      if (underline) {
        relay.to(underline, { strokeDashoffset: 0, ease: "none", duration: 0.04 }, 0.84);
      }

      /* ------------------------------------------------ couches d'ambiance */

      /* fil de progression : il descend au rythme de toute la traversée */
      if (fil) relay.to(fil, { scaleY: 1, ease: "none", duration: 0.9 }, 0);

      /*
       * Poussières : elles apparaissent quand la matière sombre est posée et
       * montent chacune à sa vitesse — le décalage suffit à créer la
       * profondeur.
       */
      motes.forEach((m, i) => {
        const travel = MOTES[i][2];
        relay.to(m, { opacity: 0.9, ease: "none", duration: 0.06 }, 0.42 + (i % 5) * 0.012);
        relay.to(m, { y: `-${travel}vh`, ease: "none", duration: 0.48 }, 0.42);
      });

      /* étoiles filantes : chacune traverse le cadre en un court instant */
      shooting.forEach((el, i) => {
        const at = SHOOTING[i][2];
        relay.to(el, { xPercent: 900, ease: "power1.in", duration: 0.05 }, at);
        relay.to(el, { opacity: 1, ease: "none", duration: 0.012 }, at);
        relay.to(el, { opacity: 0, ease: "none", duration: 0.015 }, at + 0.035);
      });

      /* reflet doré qui court sur « nova. » replié, lettre après lettre */
      relay.to(
        chars,
        {
          color: "#C8B88A",
          ease: "sine.inOut",
          duration: 0.025,
          /*
           * Aller-retour PAR LETTRE : placés au niveau du tween, `yoyo` et
           * `repeat` rejouaient tout le groupe décalé, et allongeaient la
           * timeline au-delà de son ancre.
           */
          stagger: { each: 0.012, yoyo: true, repeat: 1 },
        },
        0.8
      );

      /*
       * Une fois posés, les visuels dérivent doucement vers le haut : rien
       * n'est figé pendant la lecture. `yPercent` et non `y` : `y` est tenu
       * par leur entrée.
       */
      if (leftArt) relay.to(leftArt, { yPercent: -6, ease: "none", duration: 0.12 }, 0.78);
      if (rightArt) relay.to(rightArt, { yPercent: -4, ease: "none", duration: 0.12 }, 0.78);

      /* ancre : la timeline dure exactement 0.9 */
      relay.set({}, {}, 0.9);

    }, root);

    return () => {
      ctx.revert();
      textTimeline.current = null;
    };
  }, []);

  return (
    <section
      ref={root}
      id="studio"
      data-flock
      className="relative h-[600vh] bg-ivoire"
      aria-label="Nova Business en un mot"
    >
      {/* `h-stage` : 100vh avec repli 100svh — voir index.css */}
      <div className="sticky top-0 h-stage overflow-hidden">
        <LiquidVeil stars onProgress={updateText} />

        {/* ------------- AMBIANCE : poussières, étoiles filantes ------------- */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-[5] overflow-hidden">
          {MOTES.map(([x, from, , size], i) => (
            <span
              key={i}
              data-mote
              className="absolute rounded-full bg-dore will-change-transform"
              style={{
                left: `${x}%`,
                top: `${100 + from}vh`,
                width: size,
                height: size,
                boxShadow: `0 0 ${size * 4}px rgba(200,184,138,0.7)`,
              }}
            />
          ))}

          {SHOOTING.map(([top, angle], i) => (
            <span
              key={i}
              data-shoot
              className="absolute left-0 block h-px w-[14vw] will-change-transform"
              style={{
                top: `${top}%`,
                rotate: `${angle}deg`,
                background:
                  "linear-gradient(90deg, transparent, rgba(241,236,224,0.85) 80%, #FFFFFF)",
                boxShadow: "0 0 8px rgba(241,236,224,0.6)",
              }}
            />
          ))}
        </div>

        {/* fil de progression, bord gauche */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute bottom-[18%] left-3 top-[18%] z-20 hidden w-px bg-dore/20 md:left-5 md:block"
        >
          <span data-fil className="absolute inset-0 block bg-dore" />
        </div>

        {/*
          COMPOSITION — deux couches indépendantes dans le cadre sticky.

          Elles se succèdent au scroll comme dans la référence : le TITRE
          occupe l'écran une fois la coulée posée, puis s'élève et sort par le
          haut ; la DESCRIPTION prend le relais, flanquée des deux visuels qui
          arrivent EXACTEMENT à sa hauteur, en débord des bords gauche et
          droit.

          Deux couches superposées plutôt qu'une grille en colonne : chacune
          est centrée sur le cadre pour son propre compte, donc la sortie de
          l'une n'entraîne jamais l'autre.
        */}

        {/* ===================== EYEBROW ===================== */}

        <p
          data-eyebrow
          className="
            eyebrow absolute inset-x-0 top-0 z-20
            px-5 text-center text-dore
            max-md:text-[10px] max-md:tracking-[0.12em]
            pt-[calc(env(safe-area-inset-top)+4.5rem)]
            md:px-10 md:pt-24 md:text-left
            xl:px-16
          "
        >
          Depuis 2019 — 40+ marques accompagnées
        </p>

        {/* ====================== TITRE ====================== */}
        {/*
          Le titre NE DISPARAÎT PAS. Il occupe d'abord tout le cadre, puis se
          replie vers le haut pour devenir une signature compacte qui reste
          affichée pendant toute la suite de la section.

          Le pli est un simple `scale` : la couche est ancrée en haut
          (`items-start` + un padding qui la descend au centre), et c'est GSAP
          qui rétracte ce padding. Le mot se réduit donc VERS SON BORD
          SUPÉRIEUR au lieu de fuir hors du cadre — rien ne sort, donc rien
          n'a besoin de « revenir » à la remontée.
        */}

        <div
          data-title-layer
          className="pointer-events-none absolute inset-0 z-10 flex items-start justify-center px-5 will-change-transform"
        >
          <h2
            data-word
            className="
              origin-top text-center text-giant font-black lowercase
              leading-[0.8] text-ivoire
              [text-shadow:0_2px_60px_rgba(23,26,46,0.35)]
              will-change-transform
            "
          >
            nova.
          </h2>
        </div>

        {/* ============= DESCRIPTION + VISUELS DE BORD ============= */}
        {/*
          Les deux visuels sont des PNG détourés : ils sont posés TELS QUELS,
          sans cadre, sans fond, sans rognage ni dégradé. Leur ancrage est fixe
          (`top-[34%]`). Ils s'IMPRIMENT de bas en haut : `[data-art-print]`
          porte le masque qui remonte, `[data-art-scan]` est la ligne dorée
          qui le suit — hors du masque, pour rester visible au bord.
        */}

        <div
          data-desc-layer
          className="absolute inset-0 z-10 flex items-center will-change-transform"
        >
          {/* -------------- VISUEL GAUCHE -------------- */}

          <figure
            data-art-left
            aria-hidden="true"
            className="
              pointer-events-none absolute origin-top will-change-transform
              -left-[6%] top-[68%] w-[38vw] opacity-80
              max-md:left-[7%] max-md:top-auto max-md:bottom-[6svh] max-md:w-[30vw] max-md:opacity-100 max-[380px]:bottom-[3svh] max-[380px]:w-[22vw]
              sm:-left-[2%] sm:w-[36vw] sm:max-w-[300px]
              lg:left-[4vw] lg:top-[28%] lg:w-[20vw] lg:max-w-[260px] lg:opacity-100
              xl:max-w-[300px]
            "
          >
            {/* halo coloré qui s'allume pendant l'impression */}
            <div
              data-art-aura
              aria-hidden="true"
              className="pointer-events-none absolute -inset-[18%] -z-10 blur-2xl"
              style={{ background: "radial-gradient(closest-side, rgba(124,243,227,0.35), rgba(180,156,255,0.22) 55%, transparent)" }}
            />
            <div data-art-print className="will-change-[clip-path]">
              <img
                src={building}
                alt=""
                loading="lazy"
                className="takeover-art block w-full will-change-transform"
                style={{ "--art-glow": "rgba(124,243,227,0.35)", "--art-map": "url(#nova-map-teal)" }}
              />
            </div>
            <span
              data-art-scan
              aria-hidden="true"
              className="pointer-events-none absolute -inset-x-[6%] block h-[2px] -translate-y-1/2"
              style={{
                background:
                  "linear-gradient(90deg, transparent, #7CF3E3 18%, #F3D58A 50%, #FF6FB5 82%, transparent)",
                boxShadow: "0 0 16px 3px rgba(243,213,138,0.5)",
              }}
            />
            <figcaption className="mt-3 text-center font-mono text-[8px] uppercase tracking-[0.22em] text-dore/70 md:hidden">
              fig. 01 — orbites
            </figcaption>
          </figure>

          {/* -------------- VISUEL DROIT -------------- */}

          <figure
            data-art-right
            aria-hidden="true"
            className="
              pointer-events-none absolute origin-top will-change-transform
              -right-[4%] top-[72%] w-[34vw] opacity-80
              max-md:right-[8%] max-md:top-auto max-md:bottom-[9svh] max-md:w-[25vw] max-md:opacity-100 max-[380px]:bottom-[5svh] max-[380px]:w-[19vw]
              sm:-right-[1%] sm:w-[32vw] sm:max-w-[270px]
              lg:right-[3vw] lg:top-[30%] lg:w-[17vw] lg:max-w-[230px] lg:opacity-100
              xl:max-w-[260px]
            "
          >
            {/* halo coloré qui s'allume pendant l'impression */}
            <div
              data-art-aura
              aria-hidden="true"
              className="pointer-events-none absolute -inset-[18%] -z-10 blur-2xl"
              style={{ background: "radial-gradient(closest-side, rgba(255,111,181,0.32), rgba(243,213,138,0.2) 55%, transparent)" }}
            />
            <div data-art-print className="will-change-[clip-path]">
              <img
                src={flower}
                alt=""
                loading="lazy"
                className="takeover-art block w-full will-change-transform"
                style={{ "--art-glow": "rgba(255,111,181,0.35)", "--art-map": "url(#nova-map-rose)" }}
              />
            </div>
            <span
              data-art-scan
              aria-hidden="true"
              className="pointer-events-none absolute -inset-x-[6%] block h-[2px] -translate-y-1/2"
              style={{
                background:
                  "linear-gradient(90deg, transparent, #7CF3E3 18%, #F3D58A 50%, #FF6FB5 82%, transparent)",
                boxShadow: "0 0 16px 3px rgba(243,213,138,0.5)",
              }}
            />
            <figcaption className="mt-3 text-center font-mono text-[8px] uppercase tracking-[0.22em] text-dore/70 md:hidden">
              fig. 02 — comète
            </figcaption>
          </figure>

          {/* ---------------- TEXTE ---------------- */}
          {/*
            Aligné à droite comme dans la référence, mais gardé à l'intérieur
            de la gouttière pour ne jamais passer sous le visuel de droite.
          */}

          {/*
            Le titre replié occupe désormais le haut du cadre en permanence :
            la description est décalée vers le bas pour lui laisser la place au
            lieu de passer dessous. Sur mobile le retrait est plus important —
            le mot y est proportionnellement plus grand.
          */}
          <div
            className="
              relative z-10 w-full self-start px-6
              pt-[calc(env(safe-area-inset-top)+13rem)]
              md:ml-auto md:px-10 md:pt-[26vh]
              xl:px-16
            "
          >
            <div className="w-full max-w-[520px] md:ml-auto md:mr-[8vw] lg:mr-[22vw] xl:mr-[21vw]">
              <span
                data-rule
                aria-hidden="true"
                className="mb-5 block h-px w-full bg-dore/50 md:mb-6"
              />
              <p
                data-sub
                className="
                  text-left text-[19px] font-medium leading-[1.5]
                  tracking-[-0.01em] text-ivoire/80 max-md:text-[17px]
                  sm:text-xl
                  md:text-2xl md:leading-[1.55] md:text-ivoire/75
                "
              >
                Nous créons des expériences digitales où design, technologie et
                stratégie se rencontrent pour donner aux marques une présence
                forte, distinctive et{" "}
                <span data-key className="relative inline-block text-ivoire">
                  mémorable.
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
