import { useGame } from "../stores/game";
import { CharacterView } from "./CharacterView";
import { growth } from "../game/characterGrowth";

export function CharacterPanel() {
  const { state, navigate, open } = useGame();
  if (!state?.character) return null;
  return (
    <CharacterView
      character={state.character}
      xp={state.xp}
      attributes={state.attributes}
      events={state.events}
      onNavigate={navigate}
      onMap={() => open("map")}
      onRecord={(attribute) => {
        const data = growth[attribute];
        if (data.kind) {
          useGame.setState({ activityKind: data.kind });
          open("activity");
        } else navigate(data.destination);
      }}
    />
  );
}
