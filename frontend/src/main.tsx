import ReactDOM from "react-dom/client";
import App from "./App";
import "./style.css";
import "./game-ui.css";
import "./rpg-ui.css";
import "../../styles/realquest-tokens.css";
import "./inventory.css";
const root = ReactDOM.createRoot(document.getElementById("root")!);
if (import.meta.env.DEV && window.location.pathname === "/dev/ui") {
  void import("./dev/InventoryPreview").then(({ default: InventoryPreview }) =>
    root.render(<InventoryPreview />),
  );
} else {
  root.render(<App />);
}
