import React from "react";
import ReactDOM from "react-dom/client";
import "@fontsource-variable/nunito";
import "@fontsource-variable/jetbrains-mono";
import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/app.css";
import "./styles/problem.css";
import "./styles/progress.css";
import "./styles/trail.css";
import "./styles/motion.css";
import App from "./App";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
