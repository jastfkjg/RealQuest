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
      <button
        className="rq-button hc-training-entry"
        onClick={() => {
          useGame.setState({ studyEntry: "growth" });
          open("study");
        }}
      >
        <span>
          科学 {state.knowledge_growth?.science || 0} · 魔法{" "}
          {state.knowledge_growth?.magic || 0}
        </span>
        <span>{state.knowledge_points || 0} 知识点 · 翻开知识研修 →</span>
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
