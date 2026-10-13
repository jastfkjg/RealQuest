import { useEffect, useRef, useState } from "react";
import { BookOpen, Download, KeyRound, Upload, X } from "lucide-react";
import { api } from "../services/api";
import { useGame } from "../stores/game";
import { PixelPerson } from "./PixelPerson";
import type { GameState } from "../types";

type Credential = {
  format: string;
  version: number;
  recovery_key: string;
  character_name: string;
  saved_at: number;
};
type Preview = {
  character: NonNullable<GameState["character"]>;
  plan_count: number;
  record_count: number;
  timer: GameState["timer"];
  revision: number;
};
async function downloadCredential() {
  const data = await api<Credential>("recovery-file", "POST");
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = "realquest-recovery.json";
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function RecoveryPanel() {
  const character = useGame((s) => s.state?.character);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [key, setKey] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [backedUp, setBackedUp] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const previewHeading = useRef<HTMLHeadingElement>(null);
  const lock = useRef(false);
  async function run(action: () => Promise<void>) {
    if (lock.current) return;
    lock.current = true;
    setPending(true);
    setError("");
    setNotice("");
    try {
      await action();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      lock.current = false;
      setPending(false);
    }
  }
  return (
    <section
      className="recovery-content"
      aria-label="旅程存档与恢复"
      aria-busy={pending}
    >
      <KeyRound
        className="recovery-emblem"
        size={48}
        strokeWidth={1.3}
        aria-hidden="true"
      />
      <h2>把旅程的钥匙收好</h2>
      <p>
        每次研习都会自动存档。下载旅程凭证后，换浏览器或清除
        Cookie，也能找回这台服务器上最新的旅程。
      </p>
      {character && (
        <button
          className="rq-button rq-button--primary"
          disabled={pending}
          onClick={() =>
            void run(async () => {
              await downloadCredential();
              setBackedUp(true);
              setNotice(
                "已发起下载，请确认文件已保存；以前下载的凭证也仍然有效。",
              );
            })
          }
        >
          <Download size={18} aria-hidden="true" />
          {pending ? "正在处理…" : "下载旅程凭证"}
        </button>
      )}
      <p className="recovery-note">
        凭证可以进入你的存档，请自行保管。它用于找回服务端进度；服务器数据已删除或丢失时，无法仅凭此文件重建。
      </p>
      <div className="recovery-import">
        <h3>
          <BookOpen size={20} aria-hidden="true" /> 找回一段旅程
        </h3>
        <input
          ref={fileInput}
          className="recovery-file"
          type="file"
          accept=".json,application/json"
          aria-label="选择旅程凭证文件"
          disabled={pending}
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;
            void run(async () => {
              setPreview(null);
              setKey("");
              setConfirmed(false);
              if (file.size > 8192)
                throw new Error(
                  "请选择下载的旅程凭证；普通存档导出文件不能用于恢复。",
                );
              let data: Credential;
              try {
                data = JSON.parse(await file.text());
              } catch {
                throw new Error("文件不是有效的 JSON 旅程凭证。");
              }
              if (
                !data ||
                data.format !== "realquest-recovery" ||
                data.version !== 1 ||
                typeof data.recovery_key !== "string" ||
                !/^[A-Za-z0-9_-]{43}$/.test(data.recovery_key)
              )
                throw new Error(
                  "这不是可用的旅程凭证。旧版存档导出仅供查看，不能导入。",
                );
              const result = await api<Preview>("recovery-preview", "POST", {
                recovery_key: data.recovery_key,
              });
              setKey(data.recovery_key);
              setPreview(result);
              requestAnimationFrame(() => previewHeading.current?.focus());
            });
          }}
        />
        <button
          className="rq-button"
          disabled={pending}
          onClick={() => fileInput.current?.click()}
        >
          <Upload size={17} aria-hidden="true" /> 选择旅程凭证
        </button>
        {preview && (
          <div className="recovery-preview">
            <PixelPerson variant={preview.character.appearance} />
            <h3 ref={previewHeading} tabIndex={-1}>
              {preview.character.name}的旅程
            </h3>
            <p>
              {preview.plan_count} 本研习计划 · {preview.record_count}{" "}
              条成长记录
            </p>
            <p>
              {preview.timer
                ? `${preview.timer.topic} · ${preview.timer.running ? "计时仍在继续" : "计时已暂停"}`
                : "没有进行中的学习计时"}
            </p>
            {character && (
              <>
                <p>
                  当前旅程仍保留在服务器。切换前，请先下载当前旅程的凭证，以便回来。
                </p>
                <label className="recovery-confirm">
                  <input
                    type="checkbox"
                    checked={confirmed}
                    disabled={pending || !backedUp}
                    onChange={(e) => setConfirmed(e.target.checked)}
                  />{" "}
                  我已保存当前旅程凭证
                </label>
              </>
            )}
            <button
              className="rq-button rq-button--primary"
              disabled={pending || (!!character && !confirmed)}
              onClick={() =>
                void run(async () => {
                  await api("recover", "POST", { recovery_key: key });
                  try {
                    sessionStorage.removeItem("realquest-study-selected");
                    sessionStorage.removeItem("realquest-study-view");
                  } catch {
                    /* Optional view preferences. */
                  }
                  window.location.hash = "study";
                  window.location.reload();
                })
              }
            >
              {pending ? "正在找回…" : "恢复这段旅程"}
            </button>
          </div>
        )}
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {notice && <p role="status">{notice}</p>}
    </section>
  );
}

export function RecoveryDialog({ onClose }: { onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    dialog.current?.showModal();
    return () => opener?.focus();
  }, []);
  return (
    <dialog
      className="recovery-dialog rq-theme"
      ref={dialog}
      aria-label="找回旅程"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <button
        className="rq-button recovery-close"
        aria-label="关闭存档恢复"
        onClick={onClose}
      >
        <X size={18} aria-hidden="true" />
      </button>
      <RecoveryPanel />
    </dialog>
  );
}
