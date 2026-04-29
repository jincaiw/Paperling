import { useRef, useCallback, useEffect, useMemo, useState } from "react";
import { getImageFromClipboard, saveImageToFile, createMarkdownImage, insertAtCursor } from "../utils/imageUtils";

interface CodeEditorProps {
    content: string;
    onChange: (content: string) => void;
    onCursorChange?: (line: number, column: number) => void;
    onImagePaste?: () => void; // Callback when image is successfully pasted
    onError?: (message: string) => void; // Callback for error messages
    filePath?: string | null; // Current file path for saving images
}

// Locked metrics for perfect alignment between textarea and highlight layer.
// Both layers MUST use these exact values to keep the caret on top of the rendered text.
const EDITOR_FONT_FAMILY =
    "'JetBrains Mono', ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace";
const EDITOR_FONT_SIZE = 14; // px
const EDITOR_LINE_HEIGHT = 24; // px
const EDITOR_PADDING = 16; // px
const EDITOR_TAB_SIZE = 4;

const sharedTextStyle: React.CSSProperties = {
    fontFamily: EDITOR_FONT_FAMILY,
    fontSize: `${EDITOR_FONT_SIZE}px`,
    lineHeight: `${EDITOR_LINE_HEIGHT}px`,
    padding: `${EDITOR_PADDING}px`,
    tabSize: EDITOR_TAB_SIZE,
    MozTabSize: EDITOR_TAB_SIZE,
    fontVariantLigatures: "none",
    fontKerning: "none",
    letterSpacing: "0px",
    whiteSpace: "pre",
    wordBreak: "normal",
    overflowWrap: "normal",
    boxSizing: "border-box",
};

export function CodeEditor({ content, onChange, onCursorChange, onImagePaste, onError, filePath }: CodeEditorProps) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const gutterRef = useRef<HTMLDivElement>(null);
    const highlightRef = useRef<HTMLDivElement>(null);
    const [activeLine, setActiveLine] = useState(1);

    const lines = useMemo(() => content.split("\n"), [content]);
    const lineCount = lines.length;

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        onChange(e.target.value);
    };

    // Handle paste events - check for images in clipboard
    const handlePaste = useCallback(async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
        const imageFile = getImageFromClipboard(e.nativeEvent);

        if (imageFile) {
            e.preventDefault();

            if (!filePath) {
                onError?.('Please save your file first before pasting images.');
                return;
            }

            try {
                const imagePath = await saveImageToFile(imageFile, filePath);
                const timestamp = Date.now();
                const altText = `image-${timestamp}`;
                const markdownImage = createMarkdownImage(imagePath, altText);

                const textarea = textareaRef.current;
                if (!textarea) return;

                const cursorPos = textarea.selectionStart;
                const { newText, newCursorPosition } = insertAtCursor(content, cursorPos, markdownImage);
                onChange(newText);

                requestAnimationFrame(() => {
                    if (textareaRef.current) {
                        textareaRef.current.selectionStart = newCursorPosition;
                        textareaRef.current.selectionEnd = newCursorPosition;
                        textareaRef.current.focus();
                    }
                });

                onImagePaste?.();
            } catch (error) {
                console.error('Failed to paste image:', error);
                onError?.('Failed to save image. Please try again.');
            }
        }
    }, [content, onChange, onImagePaste, filePath]);

    // Calculate cursor position (line and column) and active line for highlight
    const updateCursorPosition = useCallback(() => {
        if (!textareaRef.current) return;

        const textarea = textareaRef.current;
        const cursorPos = textarea.selectionStart;
        const textBeforeCursor = textarea.value.substring(0, cursorPos);
        const linesBeforeCursor = textBeforeCursor.split("\n");
        const line = linesBeforeCursor.length;
        const column = linesBeforeCursor[linesBeforeCursor.length - 1].length + 1;

        setActiveLine(line);
        onCursorChange?.(line, column);
    }, [onCursorChange]);

    // Track cursor on every relevant event (selectionchange catches all caret moves)
    useEffect(() => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const handler = () => {
            // selectionchange fires on document; only react if our textarea is focused
            if (document.activeElement === textarea) {
                updateCursorPosition();
            }
        };

        document.addEventListener("selectionchange", handler);
        textarea.addEventListener("keyup", updateCursorPosition);
        textarea.addEventListener("click", updateCursorPosition);
        textarea.addEventListener("focus", updateCursorPosition);

        updateCursorPosition();

        return () => {
            document.removeEventListener("selectionchange", handler);
            textarea.removeEventListener("keyup", updateCursorPosition);
            textarea.removeEventListener("click", updateCursorPosition);
            textarea.removeEventListener("focus", updateCursorPosition);
        };
    }, [updateCursorPosition]);

    // Use rAF-based scroll sync for sub-frame accuracy. The native scroll event
    // can lag the caret by 1 frame; rAF lets us catch up before paint.
    useEffect(() => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        let rafId: number | null = null;
        let lastTop = -1;
        let lastLeft = -1;

        const sync = () => {
            const t = textareaRef.current;
            if (!t) {
                rafId = null;
                return;
            }
            const top = t.scrollTop;
            const left = t.scrollLeft;
            if (top !== lastTop || left !== lastLeft) {
                if (highlightRef.current) {
                    highlightRef.current.scrollTop = top;
                    highlightRef.current.scrollLeft = left;
                }
                if (gutterRef.current) {
                    gutterRef.current.scrollTop = top;
                }
                lastTop = top;
                lastLeft = left;
            }
            rafId = requestAnimationFrame(sync);
        };

        rafId = requestAnimationFrame(sync);

        return () => {
            if (rafId !== null) cancelAnimationFrame(rafId);
        };
    }, []);

    // Memoize highlighted lines to avoid recalculating on non-content re-renders
    const highlightedLines = useMemo(() => lines.map((line) => highlightLine(line)), [lines]);

    // Syntax highlighting for markdown
    function highlightLine(line: string): React.ReactNode {
        if (line.startsWith("# ")) {
            return <span className="text-[var(--syntax-h1)] font-bold">{line}</span>;
        }
        if (line.startsWith("## ")) {
            return <span className="text-[var(--syntax-h2)] font-bold">{line}</span>;
        }
        if (line.startsWith("### ") || line.startsWith("#### ")) {
            return <span className="text-[var(--syntax-h3)] font-semibold">{line}</span>;
        }
        if (line.startsWith("```")) {
            return <span className="text-[var(--syntax-code)]">{line}</span>;
        }
        if (line.match(/^[\s]*[-*+]\s/)) {
            const marker = line.match(/^[\s]*[-*+]/)?.[0] || "";
            const rest = line.slice(marker.length);
            return (
                <>
                    <span className="text-[var(--syntax-list)]">{marker}</span>
                    <span>{rest}</span>
                </>
            );
        }
        if (line.match(/^[\s]*\d+\.\s/)) {
            const match = line.match(/^([\s]*\d+\.)/);
            const marker = match?.[0] || "";
            const rest = line.slice(marker.length);
            return (
                <>
                    <span className="text-[var(--syntax-number)]">{marker}</span>
                    <span>{rest}</span>
                </>
            );
        }
        if (line.startsWith(">")) {
            return <span className="text-[var(--syntax-quote)] italic">{line}</span>;
        }
        if (line.includes("![") && line.includes("](")) {
            return highlightImages(line);
        }
        if (line.includes("[") && line.includes("](")) {
            return highlightLinks(line);
        }
        if (line.includes("**")) {
            return highlightBold(line);
        }
        // Empty lines must render something with zero width but real height.
        // Using "" lets the parent line-height (24px) own vertical metrics —
        // identical to how a textarea renders an empty line. NBSP would shift
        // baseline metrics on some fonts and desync the caret.
        return <span>{line}</span>;
    }

    function highlightImages(text: string): React.ReactNode {
        const parts: React.ReactNode[] = [];
        const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
        let lastIndex = 0;
        let match;
        let key = 0;

        while ((match = imageRegex.exec(text)) !== null) {
            if (match.index > lastIndex) {
                parts.push(<span key={key++}>{text.slice(lastIndex, match.index)}</span>);
            }

            const altText = match[1];
            const url = match[2];
            const displayUrl = url.startsWith('data:')
                ? `data:image/...`
                : url.length > 40
                    ? url.slice(0, 37) + '...'
                    : url;

            parts.push(
                <span key={key++} className="text-[var(--syntax-link)]">
                    <span className="text-[var(--syntax-bold)]">!</span>
                    [{altText}]
                    <span className="text-[var(--syntax-code)] opacity-70">({displayUrl})</span>
                </span>
            );
            lastIndex = match.index + match[0].length;
        }

        if (lastIndex < text.length) {
            parts.push(<span key={key++}>{text.slice(lastIndex)}</span>);
        }

        return parts.length > 0 ? <>{parts}</> : <span>{text}</span>;
    }

    function highlightLinks(text: string): React.ReactNode {
        const parts: React.ReactNode[] = [];
        const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
        let lastIndex = 0;
        let match;
        let key = 0;

        while ((match = linkRegex.exec(text)) !== null) {
            if (match.index > lastIndex) {
                parts.push(<span key={key++}>{text.slice(lastIndex, match.index)}</span>);
            }
            parts.push(
                <span key={key++} className="text-[var(--syntax-link)]">
                    [{match[1]}]
                    <span className="text-[var(--syntax-code)]">({match[2]})</span>
                </span>
            );
            lastIndex = match.index + match[0].length;
        }

        if (lastIndex < text.length) {
            parts.push(<span key={key++}>{text.slice(lastIndex)}</span>);
        }

        return parts.length > 0 ? <>{parts}</> : <span>{text}</span>;
    }

    function highlightBold(text: string): React.ReactNode {
        const parts: React.ReactNode[] = [];
        const boldRegex = /\*\*([^*]+)\*\*/g;
        let lastIndex = 0;
        let match;
        let key = 0;

        while ((match = boldRegex.exec(text)) !== null) {
            if (match.index > lastIndex) {
                parts.push(<span key={key++}>{text.slice(lastIndex, match.index)}</span>);
            }
            parts.push(
                <span key={key++} className="text-[var(--syntax-bold)] font-bold">
                    {match[0]}
                </span>
            );
            lastIndex = match.index + match[0].length;
        }

        if (lastIndex < text.length) {
            parts.push(<span key={key++}>{text.slice(lastIndex)}</span>);
        }

        return parts.length > 0 ? <>{parts}</> : <span>{text}</span>;
    }

    return (
        <main className="flex-1 flex overflow-hidden relative">
            {/* Line Numbers Gutter */}
            <div
                ref={gutterRef}
                className="w-14 shrink-0 bg-[var(--bg-gutter)] border-r border-[var(--border-subtle)] no-select text-xs text-[var(--text-muted)] overflow-hidden transition-colors"
                style={{
                    fontFamily: EDITOR_FONT_FAMILY,
                    fontSize: `${EDITOR_FONT_SIZE}px`,
                    lineHeight: `${EDITOR_LINE_HEIGHT}px`,
                    paddingTop: `${EDITOR_PADDING}px`,
                    paddingBottom: `${EDITOR_PADDING}px`,
                    paddingRight: "12px",
                }}
            >
                <div className="flex flex-col items-end">
                    {Array.from({ length: lineCount }, (_, i) => {
                        const isActive = i + 1 === activeLine;
                        return (
                            <div
                                key={i}
                                className={isActive ? "text-[var(--text-primary)] font-medium" : ""}
                                style={{ height: `${EDITOR_LINE_HEIGHT}px`, lineHeight: `${EDITOR_LINE_HEIGHT}px` }}
                            >
                                {i + 1}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Editor Container */}
            <div className="flex-1 relative bg-[var(--bg-editor)] transition-colors">
                {/* Syntax Highlighted Layer (visual only).
                    Active-line band lives inside this scroll container so it tracks
                    scroll naturally — no JS scrollTop math required. */}
                <div
                    ref={highlightRef}
                    className="absolute inset-0 text-[var(--text-primary)] pointer-events-none overflow-hidden"
                    aria-hidden="true"
                    style={sharedTextStyle}
                >
                    <div
                        className="absolute left-0 right-0 pointer-events-none"
                        style={{
                            top: `${EDITOR_PADDING + (activeLine - 1) * EDITOR_LINE_HEIGHT}px`,
                            height: `${EDITOR_LINE_HEIGHT}px`,
                            background: "var(--bg-hover)",
                            opacity: 0.45,
                        }}
                    />
                    {highlightedLines.map((highlighted, i) => (
                        <div key={i} style={{ height: `${EDITOR_LINE_HEIGHT}px`, lineHeight: `${EDITOR_LINE_HEIGHT}px`, position: "relative" }}>
                            {highlighted}
                        </div>
                    ))}
                </div>

                {/* Actual Editable Textarea — transparent text, real caret */}
                <textarea
                    ref={textareaRef}
                    value={content}
                    onChange={handleChange}
                    onPaste={handlePaste}
                    spellCheck={false}
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    className="absolute inset-0 w-full h-full bg-transparent text-transparent caret-[var(--accent)] resize-none outline-none overflow-auto border-0"
                    style={{
                        ...sharedTextStyle,
                        caretColor: "var(--accent)",
                    }}
                />
            </div>
        </main>
    );
}
