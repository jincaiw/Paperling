import type { EditorResult, EditorState } from "../utils/editorActions";
import { wrapSelection, insertLink } from "../utils/editorActions";
import { useLocale } from "../context/LocaleContext";

interface FormatToolbarProps {
    /** Returns the current editor text + selection, or null if not mounted. */
    getState: () => EditorState | null;
    /** Apply an EditorResult: parent updates content + restores selection. */
    apply: (r: EditorResult) => void;
    /** Insert plain text at the caret. */
    insert: (text: string) => void;
    /** Open the AI assist bubble on the current selection. Renders an AI button
     *  when provided — the primary visible affordance for the AI feature
     *  (it was keyboard-only before). */
    onAIAssist?: () => void;
}

interface ToolButtonProps {
    icon: string;
    title: string;
    onClick: () => void;
}

function ToolButton({ icon, title, onClick }: ToolButtonProps) {
    return (
        <button
            type="button"
            onMouseDown={(e) => e.preventDefault()} // keep editor focus
            onClick={onClick}
            title={title}
            aria-label={title}
            className="w-8 h-8 flex items-center justify-center rounded-[var(--radius-sm)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-colors"
        >
            <span className="material-symbols-outlined text-[18px]">{icon}</span>
        </button>
    );
}

const Sep = () => <div className="w-px h-5 bg-[var(--border)] mx-0.5" />;

export function FormatToolbar({ getState, apply, insert, onAIAssist }: FormatToolbarProps) {
    const { t } = useLocale();
    const wrap = (left: string, right: string, ph: string) => () => {
        const st = getState();
        if (!st) return;
        apply(wrapSelection(st, left, right, ph));
    };

    const link = () => {
        const st = getState();
        if (!st) return;
        apply(insertLink(st));
    };

    const heading = (level: number) => () => {
        const st = getState();
        if (!st) return;
        const pos = st.selStart;
        const before = st.text.slice(0, pos);
        const ls = before.lastIndexOf("\n") + 1;
        const lineEnd = st.text.indexOf("\n", pos);
        const end = lineEnd === -1 ? st.text.length : lineEnd;
        const line = st.text.slice(ls, end);
        // Strip existing heading markers, then re-add
        const stripped = line.replace(/^#{1,6}\s+/, "");
        const newLine = `${"#".repeat(level)} ${stripped}`;
        apply({
            text: st.text.slice(0, ls) + newLine + st.text.slice(end),
            selStart: ls + newLine.length,
            selEnd: ls + newLine.length,
        });
    };

    const block = (prefix: string) => () => {
        const st = getState();
        if (!st) return;
        const pos = st.selStart;
        const before = st.text.slice(0, pos);
        const ls = before.lastIndexOf("\n") + 1;
        const lineEnd = st.text.indexOf("\n", pos);
        const end = lineEnd === -1 ? st.text.length : lineEnd;
        const line = st.text.slice(ls, end);
        const newLine = line.startsWith(prefix) ? line.slice(prefix.length) : prefix + line;
        const delta = newLine.length - line.length;
        apply({
            text: st.text.slice(0, ls) + newLine + st.text.slice(end),
            selStart: pos + delta,
            selEnd: pos + delta,
        });
    };

    const codeBlock = () => {
        const st = getState();
        if (!st) return;
        const sel = st.text.slice(st.selStart, st.selEnd) || "code";
        const inserted = `\n\`\`\`\n${sel}\n\`\`\`\n`;
        apply({
            text: st.text.slice(0, st.selStart) + inserted + st.text.slice(st.selEnd),
            selStart: st.selStart + 4, // place caret after opening fence
            selEnd: st.selStart + 4 + sel.length,
        });
    };

    const insertTable = () => {
        const tpl = "\n| Header 1 | Header 2 |\n| --- | --- |\n| Cell | Cell |\n";
        insert(tpl);
    };

    const insertHr = () => insert("\n\n---\n\n");

    return (
        <div className="flex items-center gap-0.5 px-2 h-9 bg-[var(--bg-secondary)] border-b border-[var(--border-subtle)] no-select shrink-0">
            <ToolButton icon="format_h1" title={t("Heading 1")} onClick={heading(1)} />
            <ToolButton icon="format_h2" title={t("Heading 2")} onClick={heading(2)} />
            <ToolButton icon="format_h3" title={t("Heading 3")} onClick={heading(3)} />
            <Sep />
            <ToolButton icon="format_bold" title={t("Bold (Ctrl+B)")} onClick={wrap("**", "**", "bold")} />
            <ToolButton icon="format_italic" title={t("Italic (Ctrl+I)")} onClick={wrap("*", "*", "italic")} />
            <ToolButton icon="strikethrough_s" title={t("Strikethrough")} onClick={wrap("~~", "~~", "text")} />
            <ToolButton icon="code" title={t("Inline code")} onClick={wrap("`", "`", "code")} />
            <Sep />
            <ToolButton icon="format_list_bulleted" title={t("Bullet list")} onClick={block("- ")} />
            <ToolButton icon="format_list_numbered" title={t("Numbered list")} onClick={block("1. ")} />
            <ToolButton icon="check_box" title={t("Task list")} onClick={block("- [ ] ")} />
            <ToolButton icon="format_quote" title={t("Blockquote (Ctrl+/)")} onClick={block("> ")} />
            <Sep />
            <ToolButton icon="link" title={t("Link (Ctrl+K)")} onClick={link} />
            <ToolButton icon="data_object" title={t("Code block")} onClick={codeBlock} />
            <ToolButton icon="table_chart" title={t("Insert table")} onClick={insertTable} />
            <ToolButton icon="horizontal_rule" title={t("Horizontal rule")} onClick={insertHr} />
            {onAIAssist && (
                <>
                    <Sep />
                    <ToolButton icon="auto_awesome" title={t("AI assist (Alt+J)")} onClick={onAIAssist} />
                </>
            )}
        </div>
    );
}
