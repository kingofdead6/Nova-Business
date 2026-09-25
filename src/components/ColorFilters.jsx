/**
 * FILTRES DE COULEUR — « gradient maps » du site.
 *
 * Les visuels sont des gravures presque monochromes : un simple `hue-rotate`
 * ou `sepia` ne ferait que les teinter d'une seule couleur. Un gradient map
 * remplace chaque niveau de gris par une couleur d'une palette — ombres,
 * tons moyens et lumières reçoivent chacun la leur. Le trait reste intact,
 * seule la couleur change.
 *
 * Fonctionnement : l'image passe en niveaux de gris (`feColorMatrix`), puis
 * `feComponentTransfer` projette ce gris sur la palette, canal par canal. Les
 * cinq couleurs d'une palette sont réparties à égalité sur l'échelle 0 → 1.
 * L'alpha n'est pas touché : les PNG détourés restent détourés.
 *
 * Usage, en CSS : `filter: url(#nova-map-teal)`. Monté une fois dans App.
 */

export const PALETTES = {
  /* nuit → violet → turquoise → or → ivoire */
  teal: ["#12163A", "#4A3F9E", "#3FC9C0", "#F3D58A", "#FFF8E8"],
  /* nuit → prune → rose → or → ivoire */
  rose: ["#1A1033", "#7A2E86", "#FF6FB5", "#F6C979", "#FFF8E8"],
  /* nuit → indigo → lavande → turquoise → blanc */
  aurora: ["#0E1130", "#34408A", "#8E7BE8", "#7CF3E3", "#FFF8EE"],
};

const channels = (hexes) => {
  const rgb = hexes.map((h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255));
  return [0, 1, 2].map((c) => rgb.map((v) => v[c].toFixed(3)).join(" "));
};

export default function ColorFilters() {
  return (
    <svg aria-hidden="true" width="0" height="0" className="pointer-events-none absolute" focusable="false">
      <defs>
        {Object.entries(PALETTES).map(([name, hexes]) => {
          const [r, g, b] = channels(hexes);
          return (
            <filter key={name} id={`nova-map-${name}`} colorInterpolationFilters="sRGB">
              <feColorMatrix
                type="matrix"
                values="0.2126 0.7152 0.0722 0 0
                        0.2126 0.7152 0.0722 0 0
                        0.2126 0.7152 0.0722 0 0
                        0      0      0      1 0"
              />
              <feComponentTransfer>
                <feFuncR type="table" tableValues={r} />
                <feFuncG type="table" tableValues={g} />
                <feFuncB type="table" tableValues={b} />
              </feComponentTransfer>
            </filter>
          );
        })}
      </defs>
    </svg>
  );
}
