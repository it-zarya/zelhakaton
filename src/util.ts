export function esc(s: string): string {
  return s.replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]!);
}

/** Текст с абзацами через пустую строку → <p> */
export function paragraphs(text: string): string {
  return text
    .split(/\n\s*\n/)
    .map((p) => `<p>${esc(p.trim())}</p>`)
    .join("");
}
