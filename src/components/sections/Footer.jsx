import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { contact } from "../../data/site";
import MagneticButton from "../MagneticButton";
import { splitChars } from "../../lib/text";
import { initReveals } from "../../lib/reveal";
import TypedHeading from "../TypedHeading";
import Starfield from "../Starfield";

gsap.registerPlugin(ScrollTrigger);

/**
 * SECTION 12 — PIED DE PAGE : RETOUR À LA BASE
 *
 *   TRANSMISSION OUVERTE                        HEURE À PARIS 14:32:07
 *   parlons de votre projet
 *   bonjour@novabusiness.fr ↗ ─────────────────────────────────────
 *   téléphone · adresse (+ coordonnées) · réseaux
 *   ────────────────────────────────────────────────────────────────
 *                      nova business.
 *        ╭──────────── horizon de la planète ────────────╮
 *        © 2026 · mentions · confidentialité · retour à la base ↑
 *
 * 1. Le pied de page bascule du clair au sombre pendant qu'on le traverse :
 *    un seul nombre `--ink` (0 → 1) pilote l'opacité du calque nuit et, via
 *    `color-mix` dans index.css, toutes les couleurs du texte. GSAP
 *    n'interpole jamais une couleur dans une variable — il en est incapable.
 * 2. En bas, une planète se lève : son horizon monte au scroll et le nom
 *    géant vient se poser dessus, lettre par lettre, puis un reflet doré le
 *    parcourt.
 * 3. De temps en temps, une étoile filante traverse le ciel (CSS, coupée en
 *    mouvement réduit). L'heure de Paris est en direct.
 */

/* Coordonnées décoratives du studio (Paris 11e). */
const COORDS = "48.8531° N · 2.3811° E";

function useParisTime() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(now);
}

export default function Footer() {
  const root = useRef(null);
  const veil = useRef(null);
  const wordmark = useRef(null);
  const planet = useRef(null);
  const paris = useParisTime();

  useEffect(() => {
    if (!root.current) return undefined;

    const ctx = gsap.context(() => {
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const el = root.current;

      initReveals(el);

      /* ---------------------------------------------------------------- */
      /* 1. INVERSION CLAIR → SOMBRE                                       */
      /* ---------------------------------------------------------------- */
      const invert = { t: 0 };
      const applyInvert = () => {
        if (veil.current) veil.current.style.opacity = String(invert.t);
        el.style.setProperty("--ink", String(invert.t));
      };
      applyInvert();

      if (!reduced) {
        gsap.to(invert, {
          t: 1,
          ease: "none",
          onUpdate: applyInvert,
          scrollTrigger: { trigger: el, start: "top 85%", end: "top 15%", scrub: 0.6, invalidateOnRefresh: true },
        });
      } else {
        invert.t = 1;
        applyInvert();
      }

      /* ---------------------------------------------------------------- */
      /* 2. LA PLANÈTE SE LÈVE, LE NOM S'Y POSE                            */
      /* ---------------------------------------------------------------- */
      const signoff = el.querySelector("[data-signoff]");
      if (planet.current && signoff && !reduced) {
        gsap.fromTo(
          planet.current,
          { yPercent: 18 },
          {
            yPercent: 0,
            ease: "none",
            scrollTrigger: { trigger: signoff, start: "top bottom", end: "bottom bottom", scrub: 1 },
          }
        );
      }

      const chars = splitChars(wordmark.current);
      if (chars.length) {
        if (reduced) {
          gsap.set(chars, { yPercent: 0, opacity: 1 });
        } else {
          /*
           * `fromTo` et non `set` + `to` : si le déclencheur est déjà franchi
           * à la création, l'état fermé deviendrait aussi l'arrivée.
           */
          gsap
            .timeline({ scrollTrigger: { trigger: wordmark.current, start: "top 92%", once: true } })
            .fromTo(
              chars,
              { yPercent: 110, opacity: 0 },
              { yPercent: 0, opacity: 1, duration: 1.1, ease: "expo.out", stagger: 0.035, immediateRender: true }
            )
            /* reflet doré qui court sur les lettres, aller-retour par lettre */
            .to(
              chars,
              { color: "#C8B88A", duration: 0.35, ease: "sine.inOut", stagger: { each: 0.05, yoyo: true, repeat: 1 } },
              0.9
            );
        }
      }
    }, root);

    return () => ctx.revert();
  }, []);

  const year = new Date().getFullYear();

  return (
    <footer ref={root} id="contact" className="footer-invert relative overflow-hidden bg-ivoire pt-16 md:pt-24">
      {/* calque nuit : c'est son opacité qui bascule */}
      <div ref={veil} aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[#171A2E] opacity-0">
        <Starfield seed={73} z={0} />
        {/* étoiles filantes */}
        {[
          { top: "8%", delay: "2s", angle: "16deg" },
          { top: "30%", delay: "6.5s", angle: "11deg" },
        ].map((c) => (
          <span
            key={c.top}
            className="footer-comet absolute left-0 block h-px w-[14vw] opacity-0"
            style={{
              top: c.top,
              "--delay": c.delay,
              "--angle": c.angle,
              background: "linear-gradient(90deg, transparent, rgba(124,243,227,0.5) 50%, #FFFFFF)",
              boxShadow: "0 0 8px rgba(180,156,255,0.7)",
            }}
          />
        ))}
      </div>

      <div className="edge relative">
        {/* ---------------- ACCROCHE ---------------- */}
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-4xl">
            <span className="footer-accent-cycle eyebrow mb-6 flex items-center gap-2 text-[color:var(--f-accent)]">
              <span className="h-1.5 w-1.5 rounded-full bg-current shadow-[0_0_8px_currentColor]" />
              Transmission ouverte
            </span>
            <TypedHeading
              as="h2"
              className="text-d2 font-medium lowercase leading-[0.95] text-[color:var(--f-fg)]"
              text="parlons de votre projet"
              html={'parlons de <span class="font-display italic text-[color:var(--f-accent)]">votre projet</span>'}
            />
            <p data-reveal="fade" data-reveal-delay="0.15" className="mt-6 max-w-md text-[15px] leading-relaxed text-[color:var(--f-muted)]">
              Un mail, trois lignes sur votre besoin. Réponse sous 24 h ouvrées.
            </p>
          </div>

          {/* horloge de la base */}
          <div data-reveal="fade" className="flex flex-col items-start gap-1 md:items-end">
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--f-faint)]">Heure à Paris</span>
            <span className="font-mono text-2xl tabular-nums tracking-[0.08em] text-[color:var(--f-fg)] md:text-3xl">{paris}</span>
          </div>
        </div>

        {/* ---------------- EMAIL EN GRAND ---------------- */}
        <a
          href={`mailto:${contact.email}`}
          data-cursor="hover"
          className="group mt-12 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-3 border-t border-[color:var(--f-line)] pt-8 text-[color:var(--f-fg)]"
        >
          <span className="break-all text-xl font-semibold tracking-tight transition-transform duration-700 ease-nova group-hover:translate-x-2 sm:text-3xl md:text-5xl">
            {contact.email}
          </span>
          {/* flèche en orbite : un satellite tourne autour au survol */}
          <span aria-hidden="true" className="relative inline-flex h-12 w-12 shrink-0 items-center justify-center md:h-16 md:w-16">
            <span className="absolute inset-0 rounded-full border border-[color:var(--f-line)] transition-colors duration-500 group-hover:border-[color:var(--f-accent)]" />
            <span className="orbit-moon absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100" style={{ "--orbit": "3s" }}>
              <span className="absolute left-1/2 top-0 block h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-dore shadow-[0_0_8px_rgba(200,184,138,0.9)]" />
            </span>
            <span className="footer-accent-cycle font-mono text-xl text-[color:var(--f-accent)] transition-transform duration-700 ease-nova group-hover:-translate-y-0.5 group-hover:translate-x-0.5 md:text-2xl">
              ↗
            </span>
          </span>
        </a>

        {/* ---------------- COLONNES ---------------- */}
        <div className="mt-14 grid gap-12 border-t border-[color:var(--f-line)] pt-12 md:grid-cols-12">
          <div className="md:col-span-5">
            <span data-reveal="fade" className="eyebrow mb-5 block text-[color:var(--f-faint)]">
              Fréquence directe
            </span>
            <a
              href={`tel:${contact.phone.replace(/\s/g, "")}`}
              data-cursor="hover"
              className="link-underline font-mono text-[15px] text-[color:var(--f-muted)] transition-colors duration-500 hover:text-[color:var(--f-fg)]"
            >
              {contact.phone}
            </a>
            <div className="mt-9 flex flex-wrap gap-3">
              <MagneticButton href={`mailto:${contact.email}`} variant="solid">
                démarrer un projet
              </MagneticButton>
              <MagneticButton
                href="#realisations"
                variant="outline"
                className="!border-[color:var(--f-line)] !text-[color:var(--f-fg)] hover:!border-[color:var(--f-accent)] hover:!bg-[color:var(--f-accent)] hover:!text-ivoire"
              >
                voir le book
              </MagneticButton>
            </div>
          </div>

          <div className="md:col-span-4">
            <span data-reveal="fade" className="eyebrow mb-5 block text-[color:var(--f-faint)]">
              Base terrestre
            </span>
            <address data-reveal="lines" data-reveal-delay="0.1" className="not-italic text-[15px] leading-relaxed text-[color:var(--f-muted)]">
              {contact.address.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </address>
            <span className="mt-4 block font-mono text-[10px] uppercase tracking-[0.2em] text-[color:var(--f-faint)]">{COORDS}</span>
          </div>

          <div className="md:col-span-3">
            <span data-reveal="fade" className="eyebrow mb-5 block text-[color:var(--f-faint)]">
              Canaux
            </span>
            <ul data-reveal="lines" data-reveal-delay="0.1" className="flex flex-col">
              {contact.socials.map((s) => (
                <li key={s.label}>
                  <a
                    href={s.href}
                    data-cursor="hover"
                    className="group flex items-center justify-between border-b border-[color:var(--f-line)] py-3 text-[15px] text-[color:var(--f-muted)] transition-colors duration-500 hover:text-[color:var(--f-fg)]"
                  >
                    <span className="flex items-center gap-3 transition-transform duration-500 ease-nova group-hover:translate-x-1">
                      <span className="h-1 w-1 rounded-full bg-[color:var(--f-faint)] transition-colors duration-500 group-hover:bg-dore" />
                      {s.label}
                    </span>
                    <span
                      aria-hidden="true"
                      className="footer-accent-cycle -translate-x-1 font-mono text-xs text-[color:var(--f-accent)] opacity-0 transition-all duration-500 ease-nova group-hover:translate-x-0 group-hover:opacity-100"
                    >
                      →
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* ================= SIGNATURE : le nom posé sur l'horizon ================= */}
      <div data-signoff className="relative mt-20 md:mt-28">
        <div className="relative z-10 px-2">
          <h2
            ref={wordmark}
            aria-label="Nova Business"
            className="whitespace-nowrap pb-[0.06em] text-center font-black lowercase leading-[1] tracking-[-0.04em] text-[color:var(--f-fg)]"
            style={{ fontSize: "clamp(2.5rem, 12.5vw, 15rem)" }}
          >
            nova business.
          </h2>
        </div>

        {/* horizon de la planète — il monte au scroll */}
        {/*
          Découpe par `clip-path` et non `overflow-hidden` : le halo de
          l'atmosphère déborde vers le HAUT et ne doit pas y être coupé net ;
          seuls le bas (le reste du globe) et les côtés sont rognés.
        */}
        <div
          aria-hidden="true"
          className="relative -mt-[4vw] h-[clamp(140px,18vw,300px)]"
          style={{ clipPath: "inset(-120% 0 0 0)" }}
        >
          <div ref={planet} className="absolute inset-x-0 top-0 h-full will-change-transform">
            <div
              className="absolute left-1/2 top-0 aspect-square w-[170vw] -translate-x-1/2 rounded-full"
              style={{
                background:
                  "radial-gradient(circle at 50% 0%, #2A3170 0%, #1B1F45 18%, #11142C 45%, #0B0D1E 70%)",
                boxShadow:
                  "0 -2px 0 rgba(241,236,224,0.55), 0 -10px 40px rgba(124,243,227,0.35), 0 -30px 90px rgba(180,156,255,0.3), 0 -60px 160px rgba(255,111,181,0.15)",
              }}
            />
            {/* lignes de latitude, pour lire la courbure */}
            <div
              className="absolute left-1/2 top-[18%] aspect-square w-[150vw] -translate-x-1/2 rounded-full border border-ivoire/[0.06]"
            />
            <div
              className="absolute left-1/2 top-[42%] aspect-square w-[130vw] -translate-x-1/2 rounded-full border border-ivoire/[0.05]"
            />
          </div>
        </div>

        {/* barre légale, posée sur la surface */}
        <div className="absolute inset-x-0 bottom-0 z-10">
          <div className="edge flex flex-wrap items-center justify-between gap-x-6 gap-y-3 py-6 font-mono text-[10px] uppercase tracking-[0.16em] text-ivoire/45 md:text-[11px]">
            <span>© {year} Nova Business · {COORDS}</span>
            <span className="flex gap-6">
              <a href="/mentions-legales" className="link-underline hover:text-ivoire">
                Mentions légales
              </a>
              <a href="/confidentialite" className="link-underline hover:text-ivoire">
                Confidentialité
              </a>
            </span>
            <a href="#top" data-cursor="hover" className="group flex items-center gap-2 transition-colors duration-500 hover:text-ivoire">
              retour à la base
              <span aria-hidden="true" className="transition-transform duration-500 ease-nova group-hover:-translate-y-1">
                ↑
              </span>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
