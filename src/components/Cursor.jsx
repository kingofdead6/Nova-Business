import { useEffect, useRef, useState } from "react";
import gsap from "gsap";

/**
 * Curseur maison : un petit disque qui grossit sur les éléments marqués
 * `data-cursor="hover"` et affiche un libellé sur `data-cursor-text`.
 * Désactivé au toucher et si l'utilisateur a réduit les animations.
 *
 * COULEUR SELON LE FOND — le disque est ivoire en `mix-blend-mode:
 * difference` : il se SOUSTRAIT à ce qu'il survole. Sur l'ivoire il devient
 * presque noir, sur la nuit il devient ivoire doré, sur une image il en
 * inverse les couleurs. Aucune mesure n'est nécessaire : le navigateur le
 * fait au pixel près, y compris sur les fonds dessinés en SVG ou en canvas
 * (coulées, ciels, champs d'étoiles) que le DOM ne permet pas de lire.
 *
 * Avec un LIBELLÉ (« lire », « voir »), le mélange est coupé : un disque
 * doré à texte sombre, lisible sur tous les fonds. Le mode de fusion ne
 * s'anime pas — il bascule, pendant que la taille et la couleur s'animent.
 */
const BASE = "#F1ECE0"; // ivoire : l'inverse exact du fond ivoire → encre sombre
const LABEL = "#C8B88A";

export default function Cursor() {
  const dot = useRef(null);
  const [label, setLabel] = useState("");

  useEffect(() => {
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!fine || reduced) return undefined;

    const el = dot.current;
    document.body.classList.add("has-cursor");

    const xTo = gsap.quickTo(el, "x", { duration: 0.35, ease: "power3" });
    const yTo = gsap.quickTo(el, "y", { duration: 0.35, ease: "power3" });

    const onMove = (e) => {
      xTo(e.clientX);
      yTo(e.clientY);
    };

    const onOver = (e) => {
      const target = e.target.closest("[data-cursor]");
      if (!target) return;
      const text = target.getAttribute("data-cursor-text") || "";
      setLabel(text);
      el.style.mixBlendMode = text ? "normal" : "difference";
      gsap.to(el, {
        scale: text ? 3.6 : 2.4,
        backgroundColor: text ? LABEL : BASE,
        duration: 0.4,
        ease: "power3.out",
      });
    };

    const onOut = (e) => {
      if (!e.target.closest?.("[data-cursor]")) return;
      setLabel("");
      el.style.mixBlendMode = "difference";
      gsap.to(el, {
        scale: 1,
        backgroundColor: BASE,
        duration: 0.4,
        ease: "power3.out",
      });
    };

    window.addEventListener("mousemove", onMove);
    document.addEventListener("mouseover", onOver);
    document.addEventListener("mouseout", onOut);

    return () => {
      document.body.classList.remove("has-cursor");
      window.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseover", onOver);
      document.removeEventListener("mouseout", onOut);
    };
  }, []);

  return (
    <div
      ref={dot}
      aria-hidden="true"
      className="pointer-events-none fixed left-0 top-0 z-[70] hidden h-3 w-3 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full md:flex"
      style={{ backgroundColor: BASE, mixBlendMode: "difference" }}
    >
      {label && (
        <span className="whitespace-nowrap font-mono text-[3.2px] uppercase tracking-[0.14em] text-charbon">
          {label}
        </span>
      )}
    </div>
  );
}
