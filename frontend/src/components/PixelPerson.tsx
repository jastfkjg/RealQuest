import { getAppearance } from "../game/appearances";

export function PixelPerson({
  variant = 0,
  portrait = false,
}: {
  variant?: number;
  portrait?: boolean;
}) {
  return (
    <div
      aria-hidden="true"
      className={`pixel-person person-${variant}`}
      style={{
        backgroundImage: portrait
          ? `url("/assets/hearthwood/detail/portraits/character-${getAppearance(variant).id}.png")`
          : `url("/assets/hearthwood/village/character-${getAppearance(variant).id}.png")`,
        backgroundSize: "100% 100%",
        backgroundPosition: "center",
      }}
    />
  );
}
