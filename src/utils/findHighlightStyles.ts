const STYLE_ID = "paperling-find-highlight-styles";

/** Install Custom Highlight API styles without sending ::highlight() through
 * the production CSS optimizer. The rules are inserted once per document. */
export function ensureFindHighlightStyles(): void {
    if (typeof document === "undefined" || document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
        ::highlight(paperling-find) { background-color: rgba(255, 196, 0, 0.35); }
        ::highlight(paperling-find-active) { background-color: rgba(255, 145, 0, 0.65); color: #1a1a1a; }
    `;
    document.head.appendChild(style);
}
