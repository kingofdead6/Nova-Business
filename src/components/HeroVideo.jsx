import { useEffect, useRef, useState } from "react";

/*
 * OUVERTURE FILMÉE.
 *
 * Le fichier n'est pas versionné : il est déposé dans `public/`. Le composant
 * doit donc se comporter correctement dans les DEUX cas — présent ou absent —
 * sans jamais afficher de cadre cassé.
 *
 *   - absent  : on retombe sur le ciel étoilé de la marque, et la séquence
 *               continue exactement de la même façon
 *   - présent : la vidéo joue en fond, muette et en boucle
 *
 * `onError` est la seule détection fiable : une requête HEAD serait bloquée
 * en production derrière un CDN, et `canPlayType` ne dit rien de l'existence
 * du fichier.
 */
export default function HeroVideo({ src, poster, className = "" }) {
  const video = useRef(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const v = video.current;
    if (!v || failed) return undefined;

    /*
     * L'autoplay muet est autorisé partout, mais la promesse est rejetée si
     * l'onglet est en arrière-plan au montage. On avale le rejet : la vidéo
     * repartira au retour de l'onglet, et surtout la séquence n'est jamais
     * bloquée par une lecture qui n'a pas démarré.
     */
    const play = () => v.play().catch(() => {});
    play();

    const onVisible = () => {
      if (document.visibilityState === "visible") play();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [failed]);

  if (failed || !src) return null;

  return (
    <video
      ref={video}
      className={className}
      src={src}
      poster={poster}
      muted
      loop
      playsInline
      preload="auto"
      aria-hidden="true"
      tabIndex={-1}
      onError={() => setFailed(true)}
    />
  );
}
