import { Map, Volume2, VolumeX, Menu, MapPin, Zap } from "lucide-react";

/** Object illustrations for game entries; fine native strokes for utility keys. */
export type HudIconName =
  | "backpack"
  | "journal"
  | "sprout"
  | "map"
  | "sound"
  | "muted"
  | "menu"
  | "pin"
  | "energy";
const utility = {
  map: Map,
  sound: Volume2,
  muted: VolumeX,
  menu: Menu,
  pin: MapPin,
  energy: Zap,
};
export function HudIcon({ name }: { name: HudIconName }) {
  if (name === "backpack" || name === "journal" || name === "sprout")
    return (
      <img
        className={`hud-icon hud-icon-${name}`}
        src={`/assets/hearthwood/detail/items/${name}.png`}
        width={48}
        height={48}
        alt=""
        aria-hidden="true"
        draggable={false}
      />
    );
  const Icon = utility[name];
  return (
    <Icon
      className={`hud-icon hud-icon-${name}`}
      size={24}
      strokeWidth={1.7}
      aria-hidden="true"
      focusable="false"
    />
  );
}
