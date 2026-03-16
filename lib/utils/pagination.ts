export function encodeCursor(sortValue: string, id: string): string {
  return Buffer.from(`${sortValue}|${id}`).toString("base64url");
}

export function decodeCursor(cursor: string): { sortValue: string; id: string } {
  const decoded = Buffer.from(cursor, "base64url").toString();
  const pipeIdx = decoded.indexOf("|");
  return {
    sortValue: pipeIdx >= 0 ? decoded.slice(0, pipeIdx) : decoded,
    id: pipeIdx >= 0 ? decoded.slice(pipeIdx + 1) : "",
  };
}
