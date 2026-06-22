//! Silent "Save as PDF" export.
//!
//! The previous PDF export drove the webview's print pipeline (`window.print()`),
//! which pops the OS print dialog — the user then has to pick "Save as PDF" and a
//! location inside that dialog. People expect "Export → PDF" to behave like
//! "Export → HTML": ask once where to save, then write the file.
//!
//! On Windows we render the export HTML in a hidden WebView2 and call its native
//! `PrintToPdf`, which writes a vector PDF straight to a path with no dialog (and
//! keeps selectable text, real Unicode and working links). macOS/Linux keep the
//! in-webview print flow — that lives entirely in the frontend, so this command
//! is a stub there.

#[cfg(target_os = "windows")]
use std::sync::atomic::{AtomicU64, Ordering};

#[cfg(target_os = "windows")]
static EXPORT_SEQ: AtomicU64 = AtomicU64::new(0);

#[cfg(target_os = "windows")]
#[tauri::command]
pub async fn export_pdf(app: tauri::AppHandle, html: String, path: String) -> Result<(), String> {
    use std::sync::{mpsc, Mutex};
    use tauri::{WebviewUrl, WebviewWindowBuilder};

    let seq = EXPORT_SEQ.fetch_add(1, Ordering::Relaxed);

    // WebView2's PrintToPdf renders whatever the webview currently shows, so we
    // need an isolated webview displaying ONLY the export document — not the
    // editor UI. A data: URL would blow past WebView2's ~2 MB navigation cap
    // once images are inlined as base64, so stage the HTML in a temp file and
    // load that instead.
    let mut temp = std::env::temp_dir();
    temp.push(format!("paperling-export-{}-{}.html", std::process::id(), seq));
    std::fs::write(&temp, &html).map_err(|e| format!("Failed to stage export HTML: {e}"))?;

    let url = tauri::Url::from_file_path(&temp)
        .map_err(|_| "Failed to build a URL for the export file".to_string())?;

    // Signalled once the hidden webview has finished loading the document.
    let (load_tx, load_rx) = mpsc::channel::<()>();
    // on_page_load is `Fn + Send + Sync` and fires for every load event, so the
    // sender lives behind a Mutex and is consumed on the first "Finished".
    let load_tx = Mutex::new(Some(load_tx));

    let label = format!("pdf-export-{seq}");
    let window = WebviewWindowBuilder::new(&app, &label, WebviewUrl::External(url))
        .visible(false)
        .skip_taskbar(true)
        .title("")
        // ~US Letter at 96dpi so the on-screen layout settles before the print
        // engine re-flows to the real page size.
        .inner_size(816.0, 1056.0)
        .on_page_load(move |_w, payload| {
            if matches!(payload.event(), tauri::webview::PageLoadEvent::Finished) {
                if let Ok(mut guard) = load_tx.lock() {
                    if let Some(tx) = guard.take() {
                        let _ = tx.send(());
                    }
                }
            }
        })
        .build()
        .map_err(|e| format!("Failed to create the export view: {e}"))?;

    // Wait for the document to load before printing so we never capture a blank
    // or half-rendered page. Bounded so a stuck load can't hang the export.
    if load_rx
        .recv_timeout(std::time::Duration::from_secs(30))
        .is_err()
    {
        cleanup(window, &temp);
        return Err("Timed out rendering the document for PDF export".into());
    }

    // The export CSS pulls no web fonts (system/local only) and images are
    // inlined, so a short settle is enough for layout to finalize.
    std::thread::sleep(std::time::Duration::from_millis(250));

    // PrintToPdf and its message-pump wait must run on the UI thread that owns
    // the WebView2, so do the work inside with_webview and report back.
    let (done_tx, done_rx) = mpsc::channel::<Result<(), String>>();
    let target = path.clone();
    if let Err(e) = window.with_webview(move |platform| {
        let result = unsafe { print_to_pdf(platform, &target) };
        let _ = done_tx.send(result);
    }) {
        cleanup(window, &temp);
        return Err(format!("Failed to access the export view: {e}"));
    }

    let outcome = done_rx
        .recv_timeout(std::time::Duration::from_secs(120))
        .unwrap_or_else(|_| Err("Timed out writing the PDF".into()));

    cleanup(window, &temp);
    outcome
}

/// Close the hidden export window and delete its staged HTML file. Best-effort:
/// a failure to clean up must never mask the export result.
#[cfg(target_os = "windows")]
fn cleanup(window: tauri::WebviewWindow, temp: &std::path::Path) {
    let _ = window.close();
    let _ = std::fs::remove_file(temp);
}

/// Drive WebView2's native `PrintToPdf` to `path` and block (pumping the message
/// loop) until it finishes. Must be called on the UI thread.
///
/// # Safety
/// Calls into the WebView2 COM interfaces; the controller must belong to a live
/// webview on the current (UI) thread.
#[cfg(target_os = "windows")]
unsafe fn print_to_pdf(
    platform: tauri::webview::PlatformWebview,
    path: &str,
) -> Result<(), String> {
    use webview2_com::Microsoft::Web::WebView2::Win32::{ICoreWebView2PrintSettings, ICoreWebView2_7};
    use webview2_com::PrintToPdfCompletedHandler;
    use windows::core::{Interface, HSTRING, PCWSTR};

    let webview = platform
        .controller()
        .CoreWebView2()
        .map_err(|e| format!("WebView2 unavailable: {e}"))?;
    // PrintToPdf arrived in ICoreWebView2_7 (WebView2 Runtime 87+); every
    // currently shipping Evergreen runtime is far newer, but fail clearly if a
    // machine somehow has an ancient one.
    let webview7: ICoreWebView2_7 = webview
        .cast()
        .map_err(|e| format!("This WebView2 runtime is too old to export PDF: {e}"))?;

    let path_h = HSTRING::from(path);

    PrintToPdfCompletedHandler::wait_for_async_operation(
        Box::new(move |handler| unsafe {
            // None = default print settings (portrait, default page size/margins,
            // which the document's @page CSS overrides).
            webview7
                .PrintToPdf(
                    PCWSTR(path_h.as_ptr()),
                    None::<&ICoreWebView2PrintSettings>,
                    &handler,
                )
                .map_err(Into::into)
        }),
        Box::new(|result, is_success| {
            result?;
            if is_success {
                Ok(())
            } else {
                Err(windows::core::Error::new(
                    windows::core::HRESULT(-1),
                    "WebView2 reported the PDF export failed",
                ))
            }
        }),
    )
    .map_err(|e| format!("PDF export failed: {e}"))
}

/// macOS/Linux fall back to the in-webview print flow handled in the frontend;
/// this command should never be called there. Kept so `generate_handler!`
/// resolves on every platform.
#[cfg(not(target_os = "windows"))]
#[tauri::command]
pub async fn export_pdf(
    _app: tauri::AppHandle,
    _html: String,
    _path: String,
) -> Result<(), String> {
    Err("Direct PDF export is only available on Windows".into())
}
