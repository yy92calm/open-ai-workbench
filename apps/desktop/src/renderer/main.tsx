import "./lib/polyfills";
import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { ThemeProvider } from "./app/providers/ThemeProvider";
import { I18nProvider } from "./lib/i18n";
import { useUiStore } from "./lib/store";
import { router } from "./app/router";
import "./index.css";

function App() {
  const locale = useUiStore((s) => s.locale);

  return (
    <I18nProvider locale={locale}>
      <ThemeProvider>
        <RouterProvider router={router} />
      </ThemeProvider>
    </I18nProvider>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
