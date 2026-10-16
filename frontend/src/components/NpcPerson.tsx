/** Residents are never indexed through the player's appearance registry. */
export function NpcPerson({
  id,
  portrait = false,
}: {
  id: string;
  portrait?: boolean;
}) {
  return (
    <img
      className={`npc-person ${portrait ? "npc-portrait" : "npc-figure"}`}
      src={`/assets/hearthwood/residents/${id}-${portrait ? "portrait" : "figure"}.png`}
      alt=""
      draggable={false}
      aria-hidden="true"
    />
  );
}
