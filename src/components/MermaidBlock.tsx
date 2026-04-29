import { useEffect, useRef, useState } from "react";

// Single shared mermaid module promise — loaded only on first use.
let mermaidPromise: Promise<typeof import("mermaid")["default"]> | null = null;

const loadMermaid = (): Promise<typeof import("mermaid")["default"]> => {
    if (mermaidPromise) return mermaidPromise;
    mermaidPromise = import("mermaid").then((m) => {
        const mermaid = m.default;
        mermaid.initialize({
            startOnLoad: false,
            securityLevel: "strict", // disallow embedded scripts
            theme: getMermaidTheme(),
            fontFamily: "var(--font-body)",
        });
        return mermaid;
    });
    return mermaidPromise;
};

const getMermaidTheme = (): "default" | "dark" => {
    const dataTheme = document.documentElement.getAttribute("data-theme");
    if (dataTheme === "light" || dataTheme === "github" || dataTheme === "paper") return "default";
    return "dark";
};

let nextMermaidId = 0;

interface MermaidBlockProps {
    code: string;
}

export function MermaidBlock({ code }: MermaidBlockProps) {
    const [svg, setSvg] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const idRef = useRef<string>(`marklite-mermaid-${++nextMermaidId}`);

    useEffect(() => {
        let cancelled = false;
        setError(null);
        loadMermaid()
            .then((mermaid) => mermaid.render(idRef.current, code))
            .then((result) => {
                if (cancelled) return;
                setSvg(result.svg);
            })
            .catch((err: unknown) => {
                if (cancelled) return;
                const msg = err instanceof Error ? err.message : "Diagram failed to render";
                setError(msg);
            });
        return () => { cancelled = true; };
    }, [code]);

    if (error) {
        return (
            <div className="my-4 p-4 border border-[var(--danger)] rounded-lg bg-[var(--bg-secondary)]">
                <div className="text-sm font-semibold text-[var(--danger)] mb-1">Mermaid error</div>
                <div className="text-xs font-mono text-[var(--text-secondary)] whitespace-pre-wrap">{error}</div>
                <pre className="mt-2 text-xs opacity-70 overflow-x-auto">{code}</pre>
            </div>
        );
    }

    if (!svg) {
        return (
            <div className="my-4 p-4 border border-[var(--border-subtle)] rounded-lg bg-[var(--bg-secondary)] animate-pulse text-xs text-[var(--text-muted)] text-center">
                Rendering diagram…
            </div>
        );
    }

    return (
        <div
            className="my-4 flex justify-center mermaid-rendered overflow-x-auto"
            // mermaid output is from our own module — safe to inject as HTML
            dangerouslySetInnerHTML={{ __html: svg }}
        />
    );
}

/** Quick check used in the components map to short-circuit normal code rendering. */
export const isMermaidLanguage = (className: string | undefined): boolean =>
    typeof className === "string" && /\blanguage-mermaid\b/.test(className);
