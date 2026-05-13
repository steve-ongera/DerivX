// ─── src/main.jsx ─────────────────────────────────────────────────────────────
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/main.css";

// Remove the static loading screen once React is ready
const loader = document.getElementById("initial-loader");
if (loader) loader.style.display = "none";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);