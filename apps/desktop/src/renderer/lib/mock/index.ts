import type { Project, Session } from "@workbench/shared";

const exampleSession: Session = {
  id: "example-session",
  projectId: "workbench",
  title: "Welcome to Workbench",
  group: "Examples",
  status: "done",
  blocks: [
    {
      kind: "agent",
      markdown: "This is a demo artifact. The agent creates files, figures, and notebooks here.",
    },
  ],
};

export const mockProject: Project = {
  id: "workbench",
  name: "Workbench",
  sessions: [exampleSession],
};

export const mockProjects: Project[] = [mockProject];

export function findSession(sessionId: string): Session | undefined {
  return mockProject.sessions.find((s) => s.id === sessionId);
}

export const defaultSessionId = exampleSession.id;