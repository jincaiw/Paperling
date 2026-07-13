import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { revealMainWindow } from "./utils/appWindow";
import { LocaleProvider } from "./context/LocaleContext";
// Bundled fonts — load BEFORE index.css so @font-face declarations are
// registered before any rule that references the family names. Without this
// import the app falls back to system fonts when there is no network.
import "./fonts";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <LocaleProvider>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </LocaleProvider>
  </React.StrictMode>,
);

// Failsafe: the window is created hidden and normally revealed from App's mount
// effect. If mount hangs or crashes before that runs, this still shows the
// window so the app can never end up running invisibly (#98). Safe to fire late
// since the inline script in index.html already painted the themed background.
setTimeout(() => {
  revealMainWindow();
}, 3000);
