import assert from "node:assert/strict";

describe("Paperling native Tauri smoke", () => {
    it("launches the packaged WebView and renders the welcome screen", async () => {
        const title = await $("h1=Paperling");
        await title.waitForDisplayed();
        assert.equal(await title.getText(), "Paperling");
        await $("button=Open File").waitForDisplayed();
    });

    it("switches to Simplified Chinese through the native window", async () => {
        const settings = await $("button[aria-label='Settings']");
        await settings.click();
        const chinese = await $("button=Simplified Chinese");
        await chinese.waitForClickable();
        await chinese.click();
        const language = await $("h3=语言");
        await language.waitForDisplayed();
        assert.equal(await language.getText(), "语言");
        assert.equal(await browser.execute(() => document.documentElement.lang), "zh-CN");
    });
});
