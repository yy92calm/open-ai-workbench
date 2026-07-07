export function ipynbToStarboard(ipynbJson: string): string {
  const nb = JSON.parse(ipynbJson);
  const cells = nb.cells ?? [];
  const lines: string[] = [];

  for (const cell of cells) {
    const source = Array.isArray(cell.source)
      ? cell.source.join("")
      : (cell.source ?? "");
    const cellType = cell.cell_type === "markdown" ? "markdown" : "python";

    lines.push(`# %% [${cellType}]`);
    for (const line of source.split("\n")) {
      lines.push(line);
    }
    lines.push("");
  }

  return lines.join("\n");
}

export function starboardToIpynb(starboardText: string): string {
  const lines = starboardText.split("\n");
  const cells: Array<{ cell_type: string; source: string[]; metadata: Record<string, unknown>; outputs: unknown[] }> = [];
  let currentType = "code";
  let currentSource: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const delimiterMatch = line.match(/^(#|\/\/)\s*%{2,}-*\s*\[([a-zA-Z0-9-_]*)\]/);

    if (delimiterMatch) {
      if (currentSource.length > 0) {
        cells.push({
          cell_type: currentType === "markdown" ? "markdown" : "code",
          source: currentSource,
          metadata: {},
          outputs: [],
        });
      }
      const type = delimiterMatch[2];
      currentType = type === "markdown" ? "markdown" : "code";
      currentSource = [];
    } else {
      currentSource.push(line);
    }
  }

  if (currentSource.length > 0) {
    cells.push({
      cell_type: currentType === "markdown" ? "markdown" : "code",
      source: currentSource,
      metadata: {},
      outputs: [],
    });
  }

  return JSON.stringify({
    cells,
    metadata: {
      kernelspec: { display_name: "Python 3", language: "python", name: "python3" },
      language_info: { name: "python" },
    },
    nbformat: 4,
    nbformat_minor: 5,
  }, null, 2);
}