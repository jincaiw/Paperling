// Extends Vitest's `expect` with jest-dom matchers (toBeInTheDocument, etc.) and
// their TypeScript types. Loaded via vitest.config.ts `setupFiles`.
import "@testing-library/jest-dom/vitest";

// Node 26 exposes an experimental global `localStorage` whose value is
// undefined unless the process is started with --localstorage-file. That
// shadows jsdom's otherwise-valid implementation and makes persistence tests
// fail before they reach application code. Install a small standards-shaped
// in-memory store only when the active environment has no usable storage.
if (!globalThis.localStorage || typeof globalThis.localStorage.clear !== "function") {
    const values = new Map<string, string>();
    const storage: Storage = {
        get length() { return values.size; },
        clear: () => values.clear(),
        getItem: (key) => values.get(key) ?? null,
        key: (index) => Array.from(values.keys())[index] ?? null,
        removeItem: (key) => { values.delete(key); },
        setItem: (key, value) => { values.set(key, String(value)); },
    };
    Object.defineProperty(globalThis, "localStorage", { configurable: true, value: storage });
    if (typeof window !== "undefined") {
        Object.defineProperty(window, "localStorage", { configurable: true, value: storage });
    }
}
