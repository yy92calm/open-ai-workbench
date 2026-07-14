import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { CommandPalette } from "@/components/command-palette/CommandPalette";
import { Toaster } from "@/components/ui/Toaster";
import { mockProject } from "@/lib/mock";
import { useRuntimeStore } from "@/lib/runtime";
import { openExternal } from "@/lib/electron";
import { useResizable } from "@/lib/useResizable";

export function AppShell() {
  const { targetRef: sidebarRef, handleProps: sidebarHandle } = useResizable(232, 180, 400);

  useEffect(() => {
    void useRuntimeStore.getState().bootstrap();
  }, []);

  // External links open in the system browser. Navigating the webview away
  // from the app would strand the user — there is no back button.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest?.("a[href]");
      const href = anchor?.getAttribute("href") ?? "";
      if (/^https?:\/\//i.test(href)) {
        e.preventDefault();
        void openExternal(href);
      }
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-bg text-text">
      <div ref={sidebarRef as React.RefObject<HTMLDivElement>} style={{ width: 232 }} className="shrink-0">
        <Sidebar project={mockProject} />
      </div>
      {/* Drag handle to resize the left sidebar */}
      <div
        {...sidebarHandle}
        className="w-1 shrink-0 cursor-col-resize hover:bg-accent/30 active:bg-accent/50 transition-colors"
      />
      <main className="min-w-0 flex-1">
        <Outlet />
      </main>
      <CommandPalette />
      <Toaster />
    </div>
  );
}
