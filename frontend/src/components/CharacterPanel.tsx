import { useGame } from "../stores/game";
import { CharacterView } from "./CharacterView";
import { growth } from "../game/characterGrowth";

export function CharacterPanel() {
  const { state, navigate, open } = useGame();
  if (!state?.character) return null;
  return (
    <>
      <button
        className="rq-button hc-training-entry"
        onClick={() => open("training")}
      >
        <span>远行体力 · 上限 {state.stamina?.max || 100}</span>
        <span>{state.health_points || 0} 健康点 · 打开培养手札 →</span>
      </button>
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
    </>
  );
}
