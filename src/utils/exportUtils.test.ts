import { describe, it, expect, vi } from "vitest";

// exportUtils imports Tauri plugins at module load; stub them so the pure
// HTML-generation helpers can be tested without a Tauri runtime. The functions
// under test (generateHTML, prepareExportHtml) never call these.
vi.mock("@tauri-apps/plugin-dialog", () => ({ save: vi.fn() }));
vi.mock("@tauri-apps/plugin-fs", () => ({ writeTextFile: vi.fn() }));

import { generateHTML, prepareExportHtml } from "./exportUtils";

describe("generateHTML", () => {
    it("wraps the content in a standalone HTML document", () => {
        const out = generateHTML("<p>Hello</p>", "My Doc", "dark", "inter", "medium");
        expect(out).toContain("<!DOCTYPE html>");
        expect(out).toContain("<title>My Doc</title>");
        expect(out).toContain("<p>Hello</p>");
        expect(out).toContain("<article>");
    });

    it("escapes HTML-special characters in the title (XSS-safe)", () => {
        const out = generateHTML("<p>x</p>", '<script>alert(1)</script>&"', "dark", "inter", "medium");
        expect(out).toContain("&lt;script&gt;alert(1)&lt;/script&gt;&amp;&quot;");
        expect(out).not.toContain("<title><script>");
    });

    it("includes the export footer by default and omits it when disabled", () => {
        expect(generateHTML("<p>x</p>", "t", "dark", "inter", "medium")).toContain("Exported from Paperling");
        expect(generateHTML("<p>x</p>", "t", "dark", "inter", "medium", false)).not.toContain("Exported from Paperling");
    });

    it("applies theme-specific colors", () => {
        expect(generateHTML("<p>x</p>", "t", "dark", "inter", "medium")).toContain("#0a0a0a");
        expect(generateHTML("<p>x</p>", "t", "paper", "inter", "medium")).toContain("#f5f0e6");
    });

    it("applies the selected font family and size", () => {
        const out = generateHTML("<p>x</p>", "t", "dark", "inter", "large");
        expect(out).toContain("'Inter'");
        expect(out).toContain("18px"); // large base size
    });
});

describe("prepareExportHtml", () => {
    it("strips leaked UI chrome (buttons and icon ligatures)", async () => {
        const html = '<p>Body</p><button>Copy</button><span class="material-symbols-outlined">link</span>';
        const out = await prepareExportHtml(html);
        expect(out).toContain("<p>Body</p>");
        expect(out).not.toContain("<button");
        expect(out).not.toContain("material-symbols-outlined");
    });

    it("neutralizes app-internal wikilink anchors into plain text", async () => {
        const out = await prepareExportHtml('<a href="wikilink:Foo">Foo</a>');
        expect(out).toContain("Foo");
        expect(out).not.toContain("wikilink:");
        expect(out).not.toContain("<a");
    });

    it("leaves ordinary links and non-blob images intact", async () => {
        const html = '<a href="https://example.com">site</a><img src="data:image/png;base64,AAAA">';
        const out = await prepareExportHtml(html);
        expect(out).toContain('href="https://example.com"');
        expect(out).toContain('src="data:image/png;base64,AAAA"');
    });
});
