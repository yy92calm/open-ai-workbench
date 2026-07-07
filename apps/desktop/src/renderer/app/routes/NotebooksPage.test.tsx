/** @vitest-environment jsdom */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NotebookEntry } from "@/lib/artifactFile";

// Mock runtime + tauri early so the component import doesn't attempt to
// resolve the real aliases in the test runner.
vi.mock("@/lib/runtime", () => {
  const mockOpen = vi.fn();
  const fn: any = (sel: any) => sel({ workspace: null });
  fn.getState = () => ({ openArtifact: mockOpen, workspace: null });
  return { useRuntimeStore: fn };
});
vi.mock("@/lib/tauri", () => ({ isTauri: false, addTextToWorkspace: async (name: string) => name }));
vi.mock("@/lib/notebook-file", () => ({ emptyIpynb: (lang: string) => `empty-${lang}` }));
vi.mock("@/components/notebook/StarboardEditor", () => ({ StarboardEditor: ({ path, root, onBack }: any) => (
  <div data-testid="starboard">starboard:{path} root:{root}</div>
) }));
vi.mock("@/lib/toast", () => ({ toast: { error: (s: string) => null } }));

import { NotebooksPage } from "./NotebooksPage";

// Mock artifacts helper used by NotebooksPage (avoids Vite alias resolution in tests)
vi.mock("@/lib/artifacts", () => ({
  refToArtifactBlock: (path: string) => ({ path }),
}));

const listNotebooks = vi.fn();
vi.mock("@/lib/artifactFile", () => ({
  listNotebooks: (root?: string) => listNotebooks(root),
}));
vi.mock("@/components/notebook/NotebookEditor", () => ({
  NotebookEditor: ({ path, root }: { path: string; root?: string }) => (
    <div data-testid="nb">
      nb:{path} root:{root}
    </div>
  ),
}));

const entries: NotebookEntry[] = [
  { path: "2026-07-05-0319/nature_figure.ipynb", modified: 200 },
  { path: "live-demo.ipynb", modified: 100 },
];

describe("NotebooksPage", () => {
  beforeEach(() => {
    listNotebooks.mockReset();
    listNotebooks.mockResolvedValue(entries);
    return (async () => {
      const mod = await import("@/lib/runtime");
      mod.useRuntimeStore.getState().openArtifact = vi.fn();
    })();
  });

  it("lists notebooks across all session folders (base scope) with their folder", async () => {
    render(<NotebooksPage />);
    expect(await screen.findByText("nature_figure.ipynb")).toBeInTheDocument();
    // The containing session folder is visible; base-folder notebooks show none.
    expect(screen.getByText("2026-07-05-0319")).toBeInTheDocument();
    expect(screen.getByText("live-demo.ipynb")).toBeInTheDocument();
    expect(listNotebooks).toHaveBeenCalledWith("base");
  });

  it("opens a listed notebook in the editor scoped to the base tree", async () => {
    render(<NotebooksPage />);
    await userEvent.click(await screen.findByText("nature_figure.ipynb"));
    expect(screen.getByTestId("nb")).toHaveTextContent(
      "nb:2026-07-05-0319/nature_figure.ipynb root:base",
    );
  });

  it("calls runtime.openArtifact when 'Open in session' is clicked", async () => {
    render(<NotebooksPage />);
    const btn = await screen.findByTitle("Open in session");
    await userEvent.click(btn);
    expect(useRuntimeStore.getState().openArtifact).toHaveBeenCalled();
  });
});
