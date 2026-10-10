import { useState } from "react";
import { WelcomeView } from "../components/Welcome";

// Visual review only: no API, cookies, storage writes or player creation.
export default function WelcomePreview() {
  const [name, setName] = useState("唤醒者");
  const [appearance, setAppearance] = useState(0);
  const fixture = new URLSearchParams(location.search).get("state");
  return (
    <>
      <span className="welcome-preview-note">开发预览 · 不写入存档</span>
      <WelcomeView
        name={name}
        appearance={appearance}
        busy={fixture === "pending"}
        error={
          fixture === "error"
            ? "连接失败，请稍后重试。你的登记内容已保留。"
            : ""
        }
        onName={setName}
        onAppearance={setAppearance}
        onStart={() => {
          /* This preview intentionally cannot create a player. */
        }}
      />
    </>
  );
}
