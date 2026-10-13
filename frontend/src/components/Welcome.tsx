import { useRef, useState } from "react";
import { ArrowRight, Check, Feather } from "lucide-react";
import { appearances, getAppearance } from "../game/appearances";
import { useGame } from "../stores/game";
import { RecoveryDialog } from "./RecoveryPanel";
import { PixelPerson } from "./PixelPerson";

type Props = {
  name: string;
  appearance: number;
  busy: boolean;
  error: string;
  onName: (name: string) => void;
  onAppearance: (appearance: number) => void;
  onStart: () => void;
  onRecover?: () => void;
};

export function WelcomeView({
  name,
  appearance,
  busy,
  error,
  onName,
  onAppearance,
  onStart,
  onRecover,
}: Props) {
  const composing = useRef(false);
  return (
    <main className="arrival-welcome rq-theme">
      <div className="welcome-landscape" aria-hidden="true">
        <div className="welcome-world">
          <div
            className="welcome-traveler"
            key={appearance}
            data-appearance={appearance}
          >
            <PixelPerson variant={appearance} />
          </div>
        </div>
      </div>
      <header className="welcome-brand">
        <h1>RealQuest</h1>
        <span>现实副本</span>
        <p>森林醒来之前，你的故事先开始了。</p>
      </header>
      <form
        className="welcome-register"
        aria-labelledby="welcome-title"
        aria-busy={busy}
        onSubmit={(event) => {
          event.preventDefault();
          if (!busy && !composing.current && name.trim()) onStart();
        }}
      >
        <div className="welcome-paper-content">
          <header className="welcome-paper-heading">
            <p>第一章 · 万物生长</p>
            <h2 id="welcome-title">旅人登记</h2>
          </header>
          <label className="welcome-signature">
            <span>旅人之名</span>
            <span className="welcome-signature-line">
              <input
                aria-label="你的名字"
                value={name}
                maxLength={16}
                required
                autoComplete="off"
                placeholder="在这里写下名字"
                disabled={busy}
                onChange={(event) => onName(event.target.value)}
                onCompositionStart={() => {
                  composing.current = true;
                }}
                onCompositionEnd={() => {
                  composing.current = false;
                }}
                onKeyDown={(event) => {
                  if (
                    event.key === "Enter" &&
                    (composing.current ||
                      event.nativeEvent.isComposing ||
                      event.nativeEvent.keyCode === 229)
                  )
                    event.preventDefault();
                }}
              />
              <Feather size={22} aria-hidden="true" />
            </span>
          </label>
          <fieldset className="welcome-appearances" disabled={busy}>
            <legend>选择你的模样</legend>
            <div className="welcome-portrait-row">
              {appearances.map(({ id, label, name: outfit }) => (
                <button
                  type="button"
                  key={id}
                  className="welcome-portrait"
                  aria-label={`外观 ${id + 1}`}
                  aria-description={outfit}
                  aria-pressed={appearance === id}
                  onClick={() => onAppearance(id)}
                >
                  <span className="welcome-portrait-art">
                    <PixelPerson variant={id} />
                  </span>
                  <span className="welcome-portrait-label">{label}</span>
                  {appearance === id && (
                    <span className="welcome-portrait-seal">
                      <Check size={13} aria-hidden="true" />
                    </span>
                  )}
                </button>
              ))}
            </div>
            <p className="welcome-outfit" aria-live="polite">
              {getAppearance(appearance).name}
              <span> · 外观不影响属性</span>
            </p>
          </fieldset>
          <button
            className="welcome-start"
            id="start-btn"
            disabled={busy || !name.trim()}
          >
            <span>{busy ? "正在开启旅程…" : "进入回响大陆"}</span>
            <ArrowRight size={21} aria-hidden="true" />
          </button>
          {error && (
            <p className="welcome-error" role="alert">
              {error}
            </p>
          )}
          <p className="welcome-save-note">
            旅程会自动保存。
            <br />
            可在设置中下载旅程恢复凭证。
          </p>
          {onRecover && (
            <button
              type="button"
              className="welcome-recover"
              onClick={onRecover}
            >
              已有旅程凭证？找回存档
            </button>
          )}
        </div>
      </form>
    </main>
  );
}

export function Welcome() {
  const [recovering, setRecovering] = useState(false);
  const [name, setName] = useState("唤醒者");
  const [appearance, setAppearance] = useState(0);
  const { command, busy, error } = useGame();
  return (
    <>
      {recovering && <RecoveryDialog onClose={() => setRecovering(false)} />}
      <WelcomeView
        onRecover={() => setRecovering(true)}
        name={name}
        appearance={appearance}
        busy={busy}
        error={error}
        onName={setName}
        onAppearance={setAppearance}
        onStart={() => {
          void command("create", { name: name.trim(), appearance });
        }}
      />
    </>
  );
}
