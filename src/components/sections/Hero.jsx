import { useEffect, useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import HeroVideo from "../HeroVideo";
import CosmicSky from "../CosmicSky";
import HandConstellation from "../HandConstellation";
import MagneticButton from "../MagneticButton";
import { splitWords, splitChars } from "../../lib/text";

gsap.registerPlugin(ScrollTrigger);

/**
 * SECTION 01 — HERO EN SÉQUENCE ÉPINGLÉE
 *
 * La section ne défile pas : elle est ÉPINGLÉE pendant plusieurs écrans de
 * scroll, et c'est son contenu qui se transforme. On descend, la page reste
 * en place, mais tout bouge — d'où l'impression de cinéma plutôt que de page.
 *
 * Quatre actes se relaient sur une seule timeline « scrubbée », c'est-à-dire
 * dont la tête de lecture EST la position de scroll :
 *
 *   0.06  ACTE I   — la vidéo plein cadre, le nom en surimpression
 *   0.34  ACTE II  — le ciel s'efface, le titre monte
 *   0.78  ACTE III — les chiffres s'incrémentent, la scène se tasse
 *   1.02  ACTE IV  — les constellations se dessinent
 *
 * POURQUOI UNE SEULE TIMELINE, ET NON QUATRE ScrollTrigger :
 * avec plusieurs déclencheurs indépendants, revenir en arrière rejoue les
 * segments dans le désordre et les transforms se marchent dessus. Ici la
 * position de scroll est l'unique source de vérité : en avant comme en
 * arrière, l'état affiché ne dépend que d'elle.
 *
 * Le scroll est la SEULE horloge du mouvement principal. Les seules boucles
 * autonomes sont la dérive des visuels — elles ne déplacent jamais la mise
 * en page.
 */

/* Les chiffres de l'acte III. Un seul endroit à modifier. */
const FACTS = [
  { value: 40, suffix: "+", label: "marques accompagnées" },
  { value: 96, suffix: "", label: "score Lighthouse moyen" },
  { value: 8, suffix: " sem.", label: "délai moyen de livraison" },
];

/* Bornes de l'acte III sur la progression globale : les compteurs s'y calent. */
const COUNT_FROM = 0.74;
const COUNT_SPAN = 0.2;

export default function Hero({ ready = true }) {
  const root = useRef(null);

  /*
   * ÉTAT D'OUVERTURE, DÈS LE MONTAGE.
   *
   * La séquence n'est construite qu'une fois le Preloader terminé (`ready`),
   * mais le Hero est déjà affiché PENDANT la sortie du Preloader : le volet
   * corail se lève dessus. Sans ce passage, on y voyait l'état brut — titre,
   * texte, boutons, chiffres et visuels visibles, « nova. » tout blanc — qui
   * disparaissait d'un coup à la fin de l'ouverture. On découpe et on masque
   * donc tout avant le premier repaint ; l'effet principal reprend ensuite
   * ces mêmes valeurs.
   */
  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    splitChars(el.querySelector("[data-mark]"));
    const titleWords = splitWords(el.querySelector("[data-title]"));
    gsap.set(titleWords, { yPercent: 118 });
    gsap.set(el.querySelectorAll("[data-fact]"), { yPercent: 40, opacity: 0 });
    gsap.set(el.querySelectorAll("[data-art]"), { opacity: 0, yPercent: 14 });
    gsap.set(el.querySelectorAll("[data-hand-line]"), { strokeDasharray: 1, strokeDashoffset: 1 });
    gsap.set(el.querySelectorAll("[data-hand-star]"), {
      scale: 0,
      opacity: 0,
      transformOrigin: "50% 50%",
    });
    gsap.set(el.querySelectorAll("[data-hand-fade]"), { opacity: 0 });
    gsap.set([el.querySelector("[data-lede]"), el.querySelector("[data-actions]")], {
      y: 26,
      opacity: 0,
    });
  }, []);

  useEffect(() => {
    const el = root.current;
    if (!ready || !el) return undefined;

    const q = (sel) => el.querySelector(sel);
    const qa = (sel) => Array.from(el.querySelectorAll(sel));

    const ctx = gsap.context(() => {
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      const titleWords = splitWords(q("[data-title]"));
      const markChars = splitChars(q("[data-mark]"));
      const facts = qa("[data-fact]");
      const arts = qa("[data-art]");
      const lede = q("[data-lede]");
      const actions = q("[data-actions]");
      const stage = q("[data-stage]");
      const frame = q("[data-frame]");
      /* constellations d'angle (bureau, acte IV) */
      const handLines = qa("[data-art] [data-hand-line]");
      const handStars = qa("[data-art] [data-hand-star]");
      const handFades = qa("[data-art] [data-hand-fade]");
      /* constellation au-dessus du titre (téléphone), tracée avec le titre */
      const mLines = qa("[data-art-mobile] [data-hand-line]");
      const mStars = qa("[data-art-mobile] [data-hand-star]");
      const mFades = qa("[data-art-mobile] [data-hand-fade]");
      const cue = q("[data-cue]");
      const eyebrow = q("[data-eyebrow]");

      /*
       * MOUVEMENT RÉDUIT — on n'épingle rien du tout.
       *
       * Une section épinglée reste une section qui immobilise la page : c'est
       * précisément ce dont on ne veut pas ici. On affiche donc l'état final
       * de la séquence, en une hauteur d'écran, et la page défile normalement.
       */
      if (reduced) {
        gsap.set([...titleWords, ...markChars, ...facts, ...arts], {
          opacity: 1,
          y: 0,
          yPercent: 0,
        });
        gsap.set([lede, actions], { opacity: 1, y: 0 });
        gsap.set(cue, { opacity: 0 });
        /* sans séquence, on montre directement la page claire */
        gsap.set(frame, { autoAlpha: 0 });
        gsap.set(eyebrow, { color: "rgba(23,26,46,0.7)" });
        qa("[data-count]").forEach((out) => {
          out.textContent = out.dataset.countTarget || "0";
        });
        return;
      }

      /* état d'ouverture : tout est en place AVANT le premier repaint */
      gsap.set(titleWords, { yPercent: 118 });
      gsap.set(facts, { yPercent: 40, opacity: 0 });
      gsap.set(arts, { opacity: 0, yPercent: 14 });
      gsap.set(handLines, { strokeDasharray: 1, strokeDashoffset: 1 });
      gsap.set(handStars, { scale: 0, opacity: 0, transformOrigin: "50% 50%" });
      gsap.set(handFades, { opacity: 0 });
      gsap.set([lede, actions], { y: 26, opacity: 0 });

      const tl = gsap.timeline({
        defaults: { ease: "expo.out" },
        scrollTrigger: {
          trigger: el,
          start: "top top",
          end: "+=360%",
          pin: true,
          /*
            `anticipatePin` évite le saut d'une frame au moment où la section
            passe en position fixe — visible surtout avec Lenis, dont le
            scroll lissé arrive légèrement en avance sur le layout.
          */
          anticipatePin: 1,
          scrub: 0.8,
          invalidateOnRefresh: true,
          /*
            Ce pin est créé EN DERNIER (il attend la fin du Preloader), alors
            qu'il est le premier de la page. ScrollTrigger recalcule dans
            l'ordre de création : sans priorité, les sections suivantes
            (Takeover…) étaient mesurées SANS son pin-spacer et se
            déclenchaient ~360vh trop tôt — arrivées à l'écran déjà finies.
          */
          refreshPriority: 1,
        },
      });

      /* ---------------- ACTE I → II : le ciel s'efface ---------------- */
      /*
       * Le ciel ne se replie plus en médaillon : il se dissout en avançant
       * légèrement vers le lecteur, et laisse la page ivoire nue. Il doit
       * être parti AVANT que le titre (sombre) ne monte, d'où sa durée
       * courte. `autoAlpha` le passe en `visibility: hidden` une fois
       * invisible : plus rien à peindre derrière le texte.
       */
      tl.to(
        frame,
        { autoAlpha: 0, scale: 1.06, duration: 0.45, ease: "power1.inOut" },
        0.06
      )
        .to(markChars, { yPercent: -140, opacity: 0, stagger: 0.012, duration: 0.9 }, 0.06)
        .to(cue, { opacity: 0, duration: 0.3 }, 0.06)
        /* le ciel se replie : l'eyebrow repasse sur l'ivoire, il fonce avec lui */
        .to(eyebrow, { color: "rgba(23,26,46,0.7)", duration: 0.45, ease: "power1.inOut" }, 0.06)

        /* ---------------- ACTE II : le titre monte ---------------- */
        .to(titleWords, { yPercent: 0, stagger: 0.035, duration: 1.1 }, 0.34)
        /* téléphone : la constellation se dessine au-dessus du titre qui monte */
        .to(mLines, { strokeDashoffset: 0, ease: "none", duration: 0.35, stagger: 0.018 }, 0.3)
        .to(mStars, { scale: 1, opacity: 1, ease: "back.out(2.2)", duration: 0.3, stagger: 0.025 }, 0.4)
        .to(mFades, { opacity: 1, ease: "power1.out", duration: 0.35, stagger: 0.05 }, 0.7)
        .to([lede, actions], { y: 0, opacity: 1, stagger: 0.08, duration: 0.9 }, 0.52)

        /* ---------------- ACTE III : les chiffres ---------------- */
        .to(facts, { yPercent: 0, opacity: 1, stagger: 0.07, duration: 0.9 }, 0.78)
        /* la scène se tasse pour faire de la place, elle ne disparaît pas */
        /* (téléphone : pas de tassement — la constellation occupe le haut) */
        .to(stage, { yPercent: window.matchMedia("(max-width: 767px)").matches ? 0 : -6, duration: 1.1 }, 0.78)

        /* ---------------- ACTE IV : les constellations se dessinent ---------------- */
        /*
         * Le trait avance au rythme du scroll (`ease: none`) : une plume qui
         * accélère toute seule ne se lit plus comme un dessin. C'est le
         * décalage entre les traits qui donne le rythme.
         */
        .to(arts, { opacity: 1, yPercent: 0, stagger: 0.1, duration: 0.5 }, 1.02)
        .to(handLines, { strokeDashoffset: 0, ease: "none", duration: 0.28, stagger: 0.035 }, 1.06)
        .to(
          handStars,
          { scale: 1, opacity: 1, ease: "back.out(2.2)", duration: 0.3, stagger: 0.045 },
          1.12
        )
        .to(handFades, { opacity: 1, ease: "power1.out", duration: 0.4, stagger: 0.1 }, 1.5);

      /* ------------------------------------------------------------------ */
      /* COMPTEURS                                                           */
      /* ------------------------------------------------------------------ */
      /*
       * Ils sont pilotés par la progression de la timeline DÉJÀ créée, et non
       * par un second ScrollTrigger.
       *
       * Un deuxième déclencheur visant `el` mesurait ses bornes APRÈS que le
       * pin ait enveloppé la section dans un `.pin-spacer` : `top top` ne
       * tombait plus au même endroit, la plage devenait dégénérée et
       * `onUpdate` ne remontait jamais jusqu'à l'acte III — les trois nombres
       * restaient à zéro. En lisant la progression de la timeline elle-même,
       * il n'y a plus qu'une seule mesure, donc plus rien à désynchroniser.
       */
      const outs = qa("[data-count]").map((node) => ({
        node,
        target: Number(node.dataset.countTarget || 0),
        last: -1,
      }));

      if (outs.length) {
        tl.eventCallback("onUpdate", () => {
          const p = gsap.utils.clamp(
            0,
            1,
            (tl.progress() - COUNT_FROM) / COUNT_SPAN
          );
          outs.forEach((o) => {
            const v = Math.round(o.target * p);
            /* on n'écrit dans le DOM que si la valeur affichée change */
            if (v !== o.last) {
              o.last = v;
              o.node.textContent = String(v);
            }
          });
        });
      }
    }, el);

    // le pin-spacer vient d'allonger la page : on remesure tous les triggers
    ScrollTrigger.refresh();

    return () => ctx.revert();
  }, [ready]);

  return (
    <section
      id="top"
      ref={root}
      /*
        `h-[100svh]` et non `100vh` : sur mobile la barre d'URL rétractable
        fait varier `vh` en cours de route, et une section épinglée sauterait
        à chaque changement.
      */
      className="relative h-[100svh] overflow-hidden bg-ivoire text-charbon"
    >
      {/* ---------------- FOND : vidéo, ciel ---------------- */}
      {/*
        Le cadre est le seul élément animé du fond. Il contient la vidéo ET
        le ciel de repli : quel que soit le cas, c'est la même boîte qui
        s'efface, donc la séquence est rigoureusement identique.
      */}
      <div
        data-frame
        className="absolute inset-0 z-0 overflow-hidden will-change-[opacity,transform]"
      >
        {/*
          REPLI SANS VIDÉO — le ciel cosmique de l'ouverture.

          C'est le MÊME ciel (même graine) que celui du Preloader : quand
          l'écran d'ouverture se lève, le Hero reprend exactement là où il
          s'arrêtait, puis ce ciel s'efface à l'acte II.
        */}
        <CosmicSky />

        <HeroVideo
          src="/hero.mp4"
          poster="/hero-poster.jpg"
          className="absolute inset-0 h-full w-full object-cover opacity-70"
        />
      </div>

      {/* ---------------- ACTE I : le nom en surimpression ---------------- */}
      <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
        <h2
          data-mark
          aria-label="Nova"
          className="hero-mark text-giant font-black lowercase leading-none"
        >
          nova.
        </h2>
      </div>

      {/* ---------------- CONSTELLATIONS DESSINÉES (acte IV) ---------------- */}
      {/*
        Elles occupent les deux zones que le texte laisse libres : le coin
        haut droit, à côté de la navigation, et le flanc droit, au-dessus des
        boutons. Sous `lg`, le titre prend toute la largeur : on les retire.
      */}
      <div
        data-art
        className="pointer-events-none absolute right-[2.5%] top-[4%] z-0 hidden w-[22vw] max-w-[330px] lg:block"
      >
        <HandConstellation chart="minor" />
      </div>

      <div
        data-art
        className="pointer-events-none absolute right-[3%] top-[30%] z-0 hidden w-[24vw] max-w-[360px] lg:block"
      >
        <HandConstellation chart="major" />
      </div>

      {/* ---------------- SCÈNE : titre, texte, chiffres ---------------- */}
      <div
        data-stage
        className="edge relative z-10 flex h-full flex-col justify-end pb-16 pt-28 max-md:pb-8 max-md:pt-6 md:pb-20"
      >
        {/*
          Téléphone seulement : une constellation faite main au-dessus du titre
          (les deux constellations d'angle du bureau n'y ont pas la place).
          Masquée sur les écrans très courts, où le titre occupe déjà tout.
        */}
        {/*
          La zone s'étire (`flex-1`) sur tout l'espace libre entre la barre de
          navigation et le titre : la carte est grande sur un grand téléphone,
          plus compacte sur un petit, sans jamais pousser le titre hors écran.
        */}
        <div
          data-art-mobile
          aria-hidden="true"
          className="pointer-events-none mb-3 min-h-0 flex-1 md:hidden [@media(max-height:620px)]:hidden"
        >
          <div className="mx-auto h-full max-h-[340px] w-full max-w-[440px]">
            <HandConstellation chart="hero" fit />
          </div>
        </div>

        <span data-eyebrow className="eyebrow mb-6 block text-ivoire/80 max-md:mb-4">
          Studio digital — Paris, 11e
        </span>

        <h1 className="text-d1 font-medium max-md:text-[clamp(2rem,9.6vw,2.75rem)]">
          <span data-title className="block">
            On donne aux marques une façade{" "}
            <span className="font-display italic text-bronze">qu&rsquo;on remarque</span>{" "}
            <span className="font-black">de loin.</span>
          </span>
        </h1>

        <div className="mt-9 flex flex-col gap-7 max-md:mt-5 max-md:gap-5 md:flex-row md:items-end md:justify-between">
          <p data-lede className="max-w-md text-[17px] leading-relaxed text-charbon/75 max-md:text-[15px] max-md:leading-[1.55]">
            Sites, identités et campagnes pour les maisons qui refusent de
            ressembler à leurs concurrents. Une équipe, un interlocuteur, des
            délais tenus.
          </p>

          <div data-actions className="flex flex-wrap items-center gap-3 max-md:gap-2">
            <MagneticButton href="#contact" variant="solid" className="max-md:!px-4 max-md:!py-2.5 max-md:!text-[11px]">
              démarrer un projet
            </MagneticButton>
            <MagneticButton href="#realisations" variant="ghost" className="max-md:!px-4 max-md:!py-2.5 max-md:!text-[11px]">
              voir nos réalisations
            </MagneticButton>
          </div>
        </div>

        {/* chiffres — acte III */}
        <dl className="mt-12 grid grid-cols-3 gap-6 border-t border-charbon/10 pt-7 max-md:mt-6 max-md:gap-3 max-md:pt-4">
          {FACTS.map((f) => (
            <div data-fact key={f.label}>
              <dt className="sr-only">{f.label}</dt>
              <dd>
                <span className="block text-3xl font-black tracking-tight max-md:text-2xl md:text-4xl">
                  <span data-count data-count-target={f.value}>
                    0
                  </span>
                  {f.suffix}
                </span>
                <span className="mt-1 block font-mono text-[11px] uppercase tracking-[0.16em] text-pierre max-md:text-[9px] max-md:tracking-[0.1em]">
                  {f.label}
                </span>
              </dd>
            </div>
          ))}
        </dl>
      </div>

      {/* indice de défilement — disparaît dès le premier geste */}
      <div
        data-cue
        className="pointer-events-none absolute inset-x-0 bottom-6 z-30 flex justify-center"
      >
        <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-ivoire/70">
          défiler ↓
        </span>
      </div>
    </section>
  );
}
