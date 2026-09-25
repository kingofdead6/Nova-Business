import { useCallback, useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import useReveal from "../../hooks/useReveal";
import TypedHeading from "../TypedHeading";
import MagneticButton from "../MagneticButton";
import { projects } from "../../data/site";

gsap.registerPlugin(ScrollTrigger);

/**
 * SECTION 06 — RÉALISATIONS : LE CATALOGUE D'OBSERVATION
 *
 * Les projets sont des OBJETS CÉLESTES catalogués (NB-01, NB-02…). À gauche,
 * le catalogue ; à droite, l'oculaire de l'observatoire. La section s'épingle
 * et le scroll fait défiler le catalogue : chaque nouvel objet s'ouvre dans
 * l'oculaire par un DIAPHRAGME circulaire, comme un télescope qu'on règle.
 *
 *   ┌───────────────┬────────────────────────────────────────┐
 *   │ ✦ NB-01 Edu…  │  OBJ · EduCenter          MAG 2025      │
 *   │   NB-02 Bar…  │            ┼   (réticule, anneau)       │
 *   │   NB-03 Inv…  │                                         │
 *   │   …           │  AD 02h 31m · DÉC +89°    NB-01 / 05    │
 *   └───────────────┴────────────────────────────────────────┘
 *
 * MODES
 *  - observatoire (toutes largeurs, mouvement autorisé) : épinglage, le
 *    scroll choisit l'objet, clic sur une ligne = on y défile. Sur
 *    téléphone, l'oculaire passe AU-DESSUS du catalogue, compacté.
 *  - liste (mouvement réduit) : chaque entrée montre son visuel en
 *    dessous, rien n'est épinglé.
 *
 * Les visuels sont les captures réelles des projets : ils ne sont ni
 * recolorés ni recadrés en cercle — l'oculaire les montre tels quels.
 */

/* coordonnées décoratives, une par objet catalogué */
const COORDS = [
  "AD 02h 31m · DÉC +89°",
  "AD 05h 55m · DÉC +07°",
  "AD 10h 08m · DÉC +11°",
  "AD 16h 29m · DÉC −26°",
  "AD 19h 50m · DÉC +08°",
];

const catalog = (i) => `NB-${String(i + 1).padStart(2, "0")}`;

export default function Work() {
  const [active, setActive] = useState(0);
  const revealRoot = useReveal();
  const stage = useRef(null);
  const layers = useRef([]);
  const marker = useRef(null);
  const rows = useRef([]);
  const trigger = useRef(null);
  const shown = useRef(0);
  const depth = useRef(1);
  const total = projects.length;

  /* ------------------------------------------------------------------ */
  /* ÉPINGLAGE — le scroll choisit l'objet                               */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    const el = stage.current;
    if (!el) return undefined;

    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        el.dataset.mode = "obs";

        trigger.current = ScrollTrigger.create({
          trigger: el,
          start: "top top",
          /* ~70 % d'écran de scroll par projet */
          end: () => `+=${window.innerHeight * 0.7 * total}`,
          pin: true,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            setActive(Math.min(total - 1, Math.floor(self.progress * total)));
          },
        });

        return () => {
          delete el.dataset.mode;
          trigger.current = null;
        };
      });
    }, el);

    return () => ctx.revert();
  }, [total]);

  /* ------------------------------------------------------------------ */
  /* DIAPHRAGME — ouverture de l'objet actif dans l'oculaire             */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    const layer = layers.current[active];
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    /* repère doré du catalogue : il glisse jusqu'à la ligne active */
    const row = rows.current[active];
    if (marker.current && row) {
      gsap.to(marker.current, {
        y: row.offsetTop + row.offsetHeight / 2,
        duration: reduced ? 0 : 0.7,
        ease: "expo.out",
      });
    }

    if (!layer || shown.current === active) return;
    shown.current = active;

    /* le nouvel objet passe au-dessus de tous les précédents */
    depth.current += 1;
    layer.style.zIndex = String(depth.current);

    if (reduced) {
      gsap.set(layer, { clipPath: "circle(150% at 50% 50%)" });
      return;
    }

    const img = layer.querySelector("img");
    gsap.fromTo(
      layer,
      { clipPath: "circle(0% at 50% 50%)" },
      { clipPath: "circle(75% at 50% 50%)", duration: 1.1, ease: "expo.inOut", overwrite: true }
    );
    if (img) {
      gsap.fromTo(img, { scale: 1.18 }, { scale: 1.02, duration: 2.4, ease: "expo.out", overwrite: true });
    }
  }, [active]);

  /* clic sur une ligne : on défile jusqu'à la tranche de scroll de l'objet */
  const goTo = useCallback((i) => {
    const st = trigger.current;
    if (!st) {
      setActive(i);
      return;
    }
    const y = st.start + ((i + 0.5) / total) * (st.end - st.start);
    window.scrollTo({ top: y, behavior: "smooth" });
  }, [total]);

  const current = projects[active];

  return (
    <section
      ref={revealRoot}
      id="realisations"
      aria-label="Réalisations récentes"
      className="relative bg-ivoire pt-24 md:pt-32"
    >
      {/* ========================= EN-TÊTE ========================= */}
      <div className="edge">
        <div className="mb-12 flex items-end justify-between gap-6 md:mb-4">
          <div>
            <span data-reveal="fade" className="eyebrow mb-6 block">
              Réalisations — catalogue d&apos;observation
            </span>
            <TypedHeading
              as="h2"
              className="text-d2 font-medium lowercase"
              text="travaux récents"
              html={'travaux <span class="font-display italic text-bronze">récents</span>'}
            />
          </div>
          <MagneticButton href="#contact" variant="ghost" className="hidden md:inline-flex">
            tous les projets
          </MagneticButton>
        </div>
      </div>

      {/* ========================= OBSERVATOIRE ========================= */}
      <div
        ref={stage}
        className="group relative pb-24 data-[mode=obs]:flex data-[mode=obs]:h-screen data-[mode=obs]:items-center data-[mode=obs]:pb-0"
      >
        <div className="edge grid gap-10 max-md:group-data-[mode=obs]:gap-4 md:grid-cols-12 md:items-center md:gap-10 lg:gap-14">
          {/* ---------------- CATALOGUE ---------------- */}
          <div className="relative md:col-span-4">
            <div className="mb-6 flex items-center gap-4 max-md:group-data-[mode=obs]:mb-1">
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-bronze">
                Catalogue Nova
              </span>
              <span className="hairline flex-1" />
              <span className="font-mono text-[10px] tracking-[0.18em] text-pierre">
                {String(total).padStart(2, "0")} objets
              </span>
            </div>

            <ol className="relative">
              {/* repère doré qui suit l'objet observé */}
              <span
                ref={marker}
                aria-hidden="true"
                className="pointer-events-none absolute -left-5 top-0 hidden -translate-y-1/2 max-md:-left-4 group-data-[mode=obs]:block"
              >
                <svg viewBox="-12 -12 24 24" className="h-3.5 w-3.5 overflow-visible">
                  <path
                    d="M0 -10 C1.2 -2.4 2.4 -1.2 10 0 C2.4 1.2 1.2 2.4 0 10 C-1.2 2.4 -2.4 1.2 -10 0 C-2.4 -1.2 -1.2 -2.4 0 -10Z"
                    fill="#C8B88A"
                  />
                </svg>
              </span>

              {projects.map((p, i) => {
                const on = i === active;
                return (
                  <li
                    key={p.name}
                    ref={(n) => {
                      rows.current[i] = n;
                    }}
                    className="border-b border-charbon/10 last:border-b-0"
                  >
                    <button
                      type="button"
                      onClick={() => goTo(i)}
                      data-cursor="hover"
                      aria-current={on || undefined}
                      className="group/row flex w-full items-baseline gap-4 py-4 text-left max-md:group-data-[mode=obs]:py-2"
                    >
                      <span
                        className={`font-mono text-[11px] tracking-[0.14em] transition-colors duration-500 ${
                          on ? "text-bronze" : "text-pierre/60"
                        }`}
                      >
                        {catalog(i)}
                      </span>
                      <span className="flex-1">
                        <span
                          className={`block text-2xl font-bold tracking-tight transition-all duration-500 ease-nova max-md:group-data-[mode=obs]:text-lg lg:text-3xl ${
                            on
                              ? "translate-x-1 text-charbon"
                              : "text-charbon/30 group-hover/row:text-charbon/60"
                          }`}
                        >
                          {p.name}
                        </span>
                        <span
                          className={`mt-1 block font-mono text-[10px] uppercase tracking-[0.16em] transition-opacity duration-500 max-md:group-data-[mode=obs]:hidden ${
                            on ? "text-pierre opacity-100" : "text-pierre opacity-50"
                          }`}
                        >
                          {p.kind} — {p.year}
                        </span>
                      </span>
                    </button>

                    {/* mode liste : le visuel sous l'entrée */}
                    <div className="mb-6 overflow-hidden rounded-[3px] border border-charbon/10 group-data-[mode=obs]:hidden">
                      <img src={p.img} alt={`Projet ${p.name}`} loading="lazy" className="block aspect-[16/10] w-full object-cover" />
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>

          {/* ---------------- OCULAIRE ---------------- */}
          <div className="hidden max-md:order-first md:col-span-8 group-data-[mode=obs]:block">
            {/* bandeau haut de l'oculaire — hors de l'image, qui reste nette */}
            <div className="mb-3 flex items-center gap-4 font-mono text-[10px] uppercase tracking-[0.18em]">
              <span className="text-bronze">Obj · {current.name}</span>
              <span className="hairline flex-1" />
              <span className="text-pierre">Mag {current.year}</span>
            </div>

            <figure className="relative aspect-[16/10] overflow-hidden rounded-[3px] bg-charbon shadow-[0_40px_90px_-45px_rgba(23,26,46,0.65)]">
              {projects.map((p, i) => (
                <div
                  key={p.name}
                  ref={(n) => {
                    layers.current[i] = n;
                  }}
                  className="absolute inset-0"
                  style={{
                    zIndex: i === 0 ? 1 : 0,
                    clipPath: i === 0 ? "circle(75% at 50% 50%)" : "circle(0% at 50% 50%)",
                  }}
                >
                  <img
                    src={p.img}
                    alt={i === active ? `Projet ${p.name}` : ""}
                    loading="lazy"
                    className="h-full w-full object-cover will-change-transform"
                  />
                </div>
              ))}

              {/*
                RÉTICULE — volontairement discret et doublé d'une ombre : il
                doit se lire sur une capture claire comme sur une sombre, sans
                masquer le projet.
              */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 z-[100] [filter:drop-shadow(0_0_2px_rgba(23,26,46,0.55))]"
              >
                <span className="absolute left-1/2 top-1/2 -ml-8 block h-px w-16 bg-dore" />
                <span className="absolute left-1/2 top-1/2 -mt-8 block h-16 w-px bg-dore" />
                <span
                  className="orbit-moon absolute left-1/2 top-1/2 -ml-12 -mt-12 block h-24 w-24 rounded-full border border-dashed border-dore"
                  style={{ "--orbit": "30s" }}
                />
                {[
                  "left-4 top-4 border-l-2 border-t-2",
                  "right-4 top-4 border-r-2 border-t-2",
                  "bottom-4 left-4 border-b-2 border-l-2",
                  "bottom-4 right-4 border-b-2 border-r-2",
                ].map((c) => (
                  <span key={c} className={`absolute h-7 w-7 border-dore ${c}`} />
                ))}
              </div>
            </figure>

            {/* bandeau bas : coordonnées, objet observé, jauge */}
            <div className="mt-3 flex items-center gap-6 font-mono text-[10px] uppercase tracking-[0.16em]">
              <span className="shrink-0 text-pierre max-md:hidden">{COORDS[active % COORDS.length]}</span>
              <p aria-live="polite" className="min-w-0 flex-1 truncate text-pierre max-md:sr-only">
                En observation — <span className="text-charbon">{current.name}</span> · {current.kind}
              </p>
              <span className="flex shrink-0 items-center gap-3" aria-hidden="true">
                <span className="flex gap-1.5">
                  {projects.map((p, i) => (
                    <span
                      key={p.name}
                      className={`block h-1 rounded-full transition-all duration-500 ease-nova ${
                        i === active ? "w-8 bg-bronze" : "w-2 bg-charbon/15"
                      }`}
                    />
                  ))}
                </span>
                <span className="text-bronze">
                  {catalog(active)} / {String(total).padStart(2, "0")}
                </span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
