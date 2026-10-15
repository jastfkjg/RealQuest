import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowRight, Leaf, MapPin, Sparkles } from "lucide-react";
import { useGame } from "../stores/game";
import { questStatuses } from "../game/questPresentation";
import { QuestDetails } from "./Quests";
import { PixelPerson } from "./PixelPerson";

/** Lia's encounter is a place and a conversation, with an optional quest letter. */
export function LibraryEncounter({ children }: { children: ReactNode }) {
  const { selected, state, open } = useGame();
  const [showRequest, setShowRequest] = useState(false);
  const requestRef = useRef<HTMLElement>(null);
  const speechRef = useRef<HTMLDivElement>(null);
  const replyRef = useRef<HTMLButtonElement>(null);
  const wasExpanded = useRef(false);
  useEffect(() => {
    if (showRequest)
      requestRef.current
        ?.querySelector<HTMLButtonElement>("button:not(:disabled)")
        ?.focus();
    else if (wasExpanded.current) replyRef.current?.focus();
    wasExpanded.current = showRequest;
  }, [showRequest]);
  if (!selected || !state) return null;
  const quests = state.quest_log.filter((q) => q.giver === selected.id);
  const quest =
    quests.find((q) => ["ready", "active", "available"].includes(q.status)) ||
    quests[0];
  return (
    <section
      className="library-encounter"
      aria-label={`与${selected.name}交谈`}
      onKeyDown={(event) => {
        if (event.key === "Escape" && showRequest) {
          event.preventDefault();
          event.stopPropagation();
          setShowRequest(false);
        }
      }}
    >
      <div className="library-stage" aria-hidden="true">
        <div className="library-actors">
          <div className="library-traveler">
            <PixelPerson variant={state.character?.appearance || 0} />
          </div>
          <img
            className="library-lia"
            src="/assets/hearthwood/village/character-lia.png"
            alt=""
          />
        </div>
      </div>
      <div className="library-place">
        <Leaf size={18} aria-hidden="true" /> 回响图书馆前
      </div>
      <div className="library-dialogue">
        <header className="library-speaker">
          <img
            src="/assets/hearthwood/encounters/lia-portrait.webp"
            alt=""
            className="library-portrait"
          />
          <div className="library-nameplate">
            <h3>{selected.name}</h3>
            <p>图书管理员</p>
          </div>
          <span className="library-relationship">
            <MapPin size={15} aria-hidden="true" />
            关系值 {state.relationships[selected.id] || 0}
          </span>
        </header>
        <div className="hp-speech library-speech" ref={speechRef}>
          {children}
        </div>
        {quest && !showRequest && (
          <div className="library-request-teaser" aria-label="莉亚的剧情委托">
            <Sparkles size={22} aria-hidden="true" />
            <div>
              <small>{questStatuses[quest.status]}</small>
              <h4>{quest.title}</h4>
            </div>
          </div>
        )}
        {quest && showRequest && (
          <section
            className="library-request-details"
            ref={requestRef}
            aria-label="委托详情"
          >
            <header>
              <h4>{quest.title}</h4>
              <small>{questStatuses[quest.status]}</small>
            </header>
            <QuestDetails quest={quest} conversational />
            <button
              className="library-fold"
              onClick={() => setShowRequest(false)}
            >
              收起委托
            </button>
          </section>
        )}
        <div className="library-replies">
          {quest && !showRequest && (
            <button
              className="primary"
              aria-label="继续 · 聊聊这份委托"
              ref={replyRef}
              onClick={() => {
                const reveal =
                  speechRef.current?.querySelector<HTMLButtonElement>("button");
                if (reveal) reveal.click();
                else setShowRequest(true);
              }}
            >
              <span className="library-reply-label">
                <span>继续 · </span>
                <span>聊聊这份委托</span>
              </span>
              <ArrowRight size={19} aria-hidden="true" />
            </button>
          )}
          <button className="hp-farewell" onClick={() => open(null)}>
            暂时离开
          </button>
        </div>
        <small className="library-provenance">预设剧情对话</small>
      </div>
    </section>
  );
}
