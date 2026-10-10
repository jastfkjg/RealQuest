import { useGame } from "../stores/game";
import { JournalView } from "./JournalView";
import { QuestActions } from "./Quests";

export function JournalPanel() {
  const { state, error, notice, noticePanel, open } = useGame();
  if (!state) return null;
  return (
    <JournalView
      quests={state.quest_log}
      trackedId={state.tracked_quest}
      activities={state.activities}
      renderActions={(quest) => <QuestActions quest={quest} journal />}
      onRecordGrowth={() => open("activity")}
      feedback={
        error ? (
          <p className="hj-feedback hj-error" role="alert">
            {error}
          </p>
        ) : noticePanel === "journal" && notice ? (
          <p className="hj-feedback" role="status">
            {notice}
          </p>
        ) : undefined
      }
    />
  );
}
