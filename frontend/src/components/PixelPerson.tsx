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
        backgroundImage: `url("/assets/hearthwood/village/${portrait ? "portrait" : "character"}-${getAppearance(variant).id}.png")`,
        backgroundSize: "100% 100%",
        backgroundPosition: "center",
      }}
    />
  );
}
