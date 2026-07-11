import { Window } from "@tauri-apps/api/window";

/**
 * Reveal the main window, which is created hidden (`visible: false` in
 * tauri.conf.json) to kill the white startup flash: the webview would otherwise
 * paint an empty white surface before the themed UI loaded, which is jarring on
 * the dark theme. We keep it hidden until the React tree has mounted and painted
 * the correct background, then show it here.
 *
 * Idempotent: calling it more than once is harmless, so several call sites (the
 * normal mount effect, a crash fallback, and a failsafe timeout) can all invoke
 * it without coordination. Errors are swallowed so browser dev mode, where there
 * is no Tauri window, is a no-op.
 */
export async function revealMainWindow(): Promise<void> {
    try {
        const win = Window.getCurrent();
        await win.show();
        await win.setFocus();
    } catch {
        /* no Tauri window (browser dev mode) or already shown */
    }
}
