/** @vitest-environment jsdom */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DirEntry } from "@/lib/artifactFile";

// Mock the runtime hook early so the component import doesn't require the
// real alias resolution in the test environment.
vi.mock("@/lib/runtime", () => {
  const mockOpen = vi.fn();
  const fn: any = (sel: any) => sel({ workspace: null });
  fn.getState = () => ({ openArtifact: mockOpen, workspace: null });
  return { useRuntimeStore: fn };
});

// Mock artifacts helper used by FilesPage (avoids Vite alias resolution in tests)
vi.mock("@/lib/artifacts", () => ({
  extOf: (name: string) => name.split(".").pop() ?? "",
  extToKind: (ext: string) => (ext === "py" ? "code" : "text"),
  previewKindForName: (_: string) => "text",
  refToArtifactBlock: (path: string) => ({ path }),
}));
vi.mock("@/lib/tauri", () => ({ isTauri: false, workspaceBase: async () => "/tmp" }));
vi.mock("@/components/thread/WorkspaceChip", () => ({ baseName: (p: string | null) => (p ? p.split("/").pop() : "Workspace") }));
vi.mock("@/components/notebook/StarboardEditor", () => ({ StarboardEditor: ({ path, root, onBack }: any) => (
  <div data-testid="starboard">starboard:{path} root:{root}</div>
) }));
vi.mock("@/lib/cn", () => ({ cn: (...xs: any[]) => xs.filter(Boolean).join(" ") }));
import { FilesPage } from "./FilesPage";

const listDir = vi.fn();
vi.mock("@/lib/artifactFile", () => ({
  listDir: (rel: string, root?: string) => listDir(rel, root),
}));
vi.mock("@/components/inspector/FilePreviewInspector", () => ({
  FilePreviewInspector: ({ data }: { data: { filename: string } }) => (
    <div data-testid="preview">preview:{data.filename}</div>
  ),
}));
vi.mock("@/components/notebook/NotebookEditor", () => ({
  NotebookEditor: ({ path }: { path: string }) => <div data-testid="nb">nb:{path}</div>,
}));

const root: DirEntry[] = [
  { path: "data", name: "data", isDir: true, size: 0, modified: 2 },
  { path: "figure.png", name: "figure.png", isDir: false, size: 2048, modified: 3 },
  { path: "run.ipynb", name: "run.ipynb", isDir: false, size: 500, modified: 1 },
];
const sub: DirEntry[] = [{ path: "data/genes.bed", name: "genes.bed", isDir: false, size: 120, modified: 4 }];

describe("FilesPage", () => {
  beforeEach(() => {
    listDir.mockReset();
    listDir.mockImplementation((rel: string) => Promise.resolve(rel === "data" ? sub : root));
    // ensure openArtifact is a mock so we can assert it's called
    return (async () => {
      const mod = await import("@/lib/runtime");
      mod.useRuntimeStore.getState().openArtifact = vi.fn();
    })();
  });

  it("lists workspace entries with sizes and opens a file in the previewer", async () => {
    render(<FilesPage />);
    expect(await screen.findByText("figure.png")).toBeInTheDocument();
    expect(screen.getByText("2 KB")).toBeInTheDocument();

    await userEvent.click(screen.getByText("figure.png"));
    expect(screen.getByTestId("preview")).toHaveTextContent("preview:figure.png");
  });

  it("opens notebooks in the runnable editor", async () => {
    render(<FilesPage />);
    await userEvent.click(await screen.findByText("run.ipynb"));
    expect(screen.getByTestId("nb")).toHaveTextContent("nb:run.ipynb");
  });

  it("navigates into a folder and back via the breadcrumb", async () => {
    render(<FilesPage />);
    await userEvent.click(await screen.findByText("data"));
    expect(await screen.findByText("genes.bed")).toBeInTheDocument();
    // The page is GLOBAL: every listing resolves in the base folder tree.
    expect(listDir).toHaveBeenCalledWith("data", "base");

    await userEvent.click(screen.getByRole("button", { name: "Workspace" }));
    await waitFor(() => expect(screen.getByText("figure.png")).toBeInTheDocument());
  });

  it("calls runtime.openArtifact when 'Open in session' is clicked", async () => {
    render(<FilesPage />);
    const btn = await screen.findByTitle("Open in session");
    await userEvent.click(btn);
    expect(useRuntimeStore.getState().openArtifact).toHaveBeenCalled();
  });
});
