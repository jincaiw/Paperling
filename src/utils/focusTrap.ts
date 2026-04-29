/**
 * Focus trap helper — when active, Tab/Shift+Tab cycles within the container
 * instead of escaping. Used by sidebar panels and dialogs.
 */

const FOCUSABLE = [
    "button:not([disabled])",
    "[href]",
    "input:not([disabled])",
    "select:not([disabled])",
    "textarea:not([disabled])",
    '[tabindex]:not([tabindex="-1"])',
].join(",");

export function attachFocusTrap(container: HTMLElement | null): () => void {
    if (!container) return () => { };

    const handler = (e: KeyboardEvent) => {
        if (e.key !== "Tab") return;
        const focusable = container.querySelectorAll<HTMLElement>(FOCUSABLE);
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        const active = document.activeElement;

        if (e.shiftKey && active === first) {
            e.preventDefault();
            last.focus();
        } else if (!e.shiftKey && active === last) {
            e.preventDefault();
            first.focus();
        }
    };

    container.addEventListener("keydown", handler);
    return () => container.removeEventListener("keydown", handler);
}
