// @vitest-environment node
import { describe, expect, it } from "vitest";
import { translate } from "./LocaleContext";

describe("translate", () => {
    it("returns Simplified Chinese for a known UI string", () => {
        expect(translate("zh-CN", "Settings")).toBe("设置");
    });

    it("keeps English as the stable fallback", () => {
        expect(translate("en", "Settings")).toBe("Settings");
        expect(translate("zh-CN", "A newly added string")).toBe("A newly added string");
    });

    it("interpolates values in both locales", () => {
        expect(translate("zh-CN", "Close {file}", { file: "notes.md" })).toBe("关闭 notes.md");
        expect(translate("en", "Close {file}", { file: "notes.md" })).toBe("Close notes.md");
    });
});
