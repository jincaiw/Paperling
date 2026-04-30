import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getRecentFiles, removeRecentFile, type RecentFile } from "../utils/persistence";

interface WelcomeScreenProps {
    onOpenFile: () => void;
    onNewFile?: () => void;
    onFileDrop: (path: string) => void;
    onOpenRecent?: (path: string) => void;
}

const formatRelative = (ts: number): string => {
    const diff = Date.now() - ts;
    const min = 60_000, hr = 60 * min, day = 24 * hr;
    if (diff < min) return "just now";
    if (diff < hr) return `${Math.floor(diff / min)}m ago`;
    if (diff < day) return `${Math.floor(diff / hr)}h ago`;
    if (diff < 7 * day) return `${Math.floor(diff / day)}d ago`;
    return new Date(ts).toLocaleDateString();
};

const parentFolderOf = (path: string): string => {
    const norm = path.replace(/\\/g, "/");
    const segs = norm.split("/").slice(0, -1);
    return segs.slice(-2).join("/") || segs.join("/");
};

export function WelcomeScreen({ onOpenFile, onNewFile, onFileDrop, onOpenRecent }: WelcomeScreenProps) {
    const [recents, setRecents] = useState<RecentFile[]>([]);
    const [missing, setMissing] = useState<Set<string>>(new Set());

    useEffect(() => {
        const list = getRecentFiles();
        setRecents(list);
        // Quick existence check for each — gray out missing entries
        let cancelled = false;
        Promise.all(
            list.map(async (f) => {
                try {
                    await invoke("get_file_info", { path: f.path });
                    return null;
                } catch {
                    return f.path;
                }
            })
        ).then((results) => {
            if (cancelled) return;
            setMissing(new Set(results.filter((p): p is string => !!p)));
        });
        return () => { cancelled = true; };
    }, []);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();

        const files = e.dataTransfer.files;
        if (files.length > 0) {
            const file = files[0];
            // @ts-expect-error - Tauri adds path to File objects
            const path = file.path || file.name;
            if (path.endsWith('.md') || path.endsWith('.markdown')) {
                onFileDrop(path);
            }
        }
    };

    const handleRemoveRecent = (e: React.MouseEvent, path: string) => {
        e.stopPropagation();
        setRecents(removeRecentFile(path));
    };

    return (
        <main
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className="flex-1 flex flex-col items-center justify-center p-6 no-select overflow-y-auto"
        >
            <div className="flex flex-col items-center gap-8 max-w-md w-full text-center animate-fade-in-up">
                <div className="flex items-center justify-center w-20 h-20">
                    <img src="/icon.svg" alt="MarkLite" className="w-full h-full" />
                </div>

                <div className="flex flex-col gap-2">
                    <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
                        MarkLite
                    </h1>
                    <p className="text-sm text-[var(--text-secondary)]">
                        A minimal markdown editor
                    </p>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={onOpenFile}
                        className="btn-press flex items-center gap-2 bg-[var(--accent)] hover:opacity-90 text-[var(--accent-text)] font-medium text-sm px-5 py-2.5 rounded-[var(--radius-md)] transition-all duration-200"
                    >
                        <span className="material-symbols-outlined text-[20px]">folder_open</span>
                        <span>Open File</span>
                    </button>
                    {onNewFile && (
                        <button
                            onClick={onNewFile}
                            className="btn-press flex items-center gap-2 bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] border border-[var(--border)] font-medium text-sm px-5 py-2.5 rounded-[var(--radius-md)] transition-all duration-200"
                        >
                            <span className="material-symbols-outlined text-[20px]">edit_note</span>
                            <span>New File</span>
                        </button>
                    )}
                </div>

                <p className="text-xs text-[var(--text-muted)]">
                    drag a <code className="bg-[var(--bg-secondary)] px-1.5 py-0.5 rounded text-[var(--text-secondary)] border border-[var(--border)]">.md</code> file · press <kbd className="px-1 py-0.5 font-mono rounded border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-secondary)]">Ctrl+P</kbd> for commands · <kbd className="px-1 py-0.5 font-mono rounded border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-secondary)]">?</kbd> for shortcuts
                </p>

                {recents.length > 0 && onOpenRecent && (
                    <div className="w-full mt-4 text-left">
                        <div className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2 px-1">
                            Recent
                        </div>
                        <ul className="flex flex-col">
                            {recents.map((f) => {
                                const isMissing = missing.has(f.path);
                                return (
                                <li key={f.path} className="group">
                                    <button
                                        onClick={() => !isMissing && onOpenRecent(f.path)}
                                        disabled={isMissing}
                                        className={`btn-press w-full flex items-center gap-3 px-3 py-2 rounded-[var(--radius-md)] transition-colors text-left ${isMissing ? "opacity-50 cursor-not-allowed" : "hover:bg-[var(--bg-hover)]"}`}
                                        title={isMissing ? `${f.path} (missing)` : f.path}
                                    >
                                        <span className="material-symbols-outlined text-[18px] text-[var(--text-secondary)] shrink-0">
                                            {isMissing ? "broken_image" : "description"}
                                        </span>
                                        <div className="flex-1 min-w-0">
                                            <div className={`text-sm truncate ${isMissing ? "line-through text-[var(--text-muted)]" : "text-[var(--text-primary)]"}`}>{f.name}</div>
                                            <div className="text-[11px] text-[var(--text-muted)] truncate">{parentFolderOf(f.path)}</div>
                                        </div>
                                        <span className="text-[11px] text-[var(--text-muted)] tabular-nums shrink-0">{isMissing ? "missing" : formatRelative(f.openedAt)}</span>
                                        <span
                                            role="button"
                                            tabIndex={0}
                                            aria-label={`Remove ${f.name} from recents`}
                                            onClick={(e) => handleRemoveRecent(e, f.path)}
                                            onKeyDown={(e) => { if (e.key === "Enter") handleRemoveRecent(e as unknown as React.MouseEvent, f.path); }}
                                            className="opacity-0 group-hover:opacity-100 w-5 h-5 rounded hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--danger)] transition-opacity flex items-center justify-center"
                                        >
                                            <span className="material-symbols-outlined text-[14px]">close</span>
                                        </span>
                                    </button>
                                </li>
                                );
                            })}
                        </ul>
                    </div>
                )}
            </div>
        </main>
    );
}
