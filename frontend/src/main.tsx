import ReactDOM from "react-dom/client";
import App from "./App";
import "./style.css";
import "./game-ui.css";
import "./rpg-ui.css";
import "../../styles/realquest-tokens.css";
import "./inventory.css";
import "./journal.css";
import "./character.css";
import "./welcome.css";
const root = ReactDOM.createRoot(document.getElementById("root")!);
if (import.meta.env.DEV && window.location.pathname === "/dev/ui") {
  void import("./dev/InventoryPreview").then(({ default: InventoryPreview }) =>
    root.render(<InventoryPreview />),
  );
} else if (import.meta.env.DEV && window.location.pathname === "/dev/journal") {
  void import("./dev/JournalPreview").then(({ default: JournalPreview }) =>
    root.render(<JournalPreview />),
  );
} else if (
  import.meta.env.DEV &&
  window.location.pathname === "/dev/character"
) {
  void import("./dev/CharacterPreview").then(({ default: CharacterPreview }) =>
    root.render(<CharacterPreview />),
  );
} else if (import.meta.env.DEV && window.location.pathname === "/dev/welcome") {
  void import("./dev/WelcomePreview").then(({ default: WelcomePreview }) =>
    root.render(<WelcomePreview />),
  );
} else {
  root.render(<App />);
}
