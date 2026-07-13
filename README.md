# Paperling

> 一款本地优先、开箱即用的 Markdown 编辑器。用原生性能写作，用实时预览阅读。

[![最新版本](https://img.shields.io/github/v/release/jincaiw/Paperling?label=%E6%9C%80%E6%96%B0%E7%89%88%E6%9C%AC)](https://github.com/jincaiw/Paperling/releases/latest)
[![许可证](https://img.shields.io/badge/%E8%AE%B8%E5%8F%AF%E8%AF%81-Apache--2.0-blue)](LICENSE)
[![平台](https://img.shields.io/badge/%E5%B9%B3%E5%8F%B0-Windows%20%7C%20macOS%20%7C%20Linux-555)](https://github.com/jincaiw/Paperling/releases/latest)

[下载最新版本](https://github.com/jincaiw/Paperling/releases/latest) · [安装与使用教程](https://paper.mujizi.com/guide/) · [问题反馈](https://github.com/jincaiw/Paperling/issues)

Paperling 打开任意 `.md` 文件即可开始。它提供编辑/阅读/分屏三种视图，并原生支持 GFM、数学公式、化学公式、Mermaid 图表、表格、图片、搜索替换和可选 AI 助手。文档默认保存在本地；AI 仅在你主动配置服务商后才会发起网络请求。

## 界面预览

| 分屏实时预览 | 文件浏览与阅读模式 |
| --- | --- |
| ![Paperling 分屏编辑与实时预览](images/split-view.png) | ![Paperling 文件浏览器](images/file-explorer.png) |

![Paperling 实时渲染公式、图表和代码](images/showcase.png)

## 功能

- **专注写作**：编辑、阅读与分屏模式；自动保存、标签页、文件浏览器与大纲。
- **实时渲染**：GitHub 风格 Markdown、任务列表、表格、KaTeX、化学公式、Mermaid、代码高亮与图片预览。
- **高效编辑**：命令面板、斜杠命令、格式工具栏、查找替换、智能粘贴、表格可视化编辑。
- **可控 AI**：兼容 OpenAI API 的模型；以差异形式提出修改，确认后才写入文件；密钥存于系统钥匙串。
- **本地优先**：不需要账号；可离线编辑；Windows、macOS、Linux 均有原生安装包。

## 安装

从 [Releases](https://github.com/jincaiw/Paperling/releases/latest) 下载与你的平台对应的文件：

| 平台 | 推荐安装包 | 免安装方式 |
| --- | --- | --- |
| Windows 10/11 | `.msi` 或 `-setup.exe` | `-portable.exe`，下载后直接运行 |
| macOS | `.dmg` | 将应用拖入“应用程序”后打开 |
| Debian / Ubuntu | `.deb` | `.AppImage` 可直接运行 |
| Fedora / RHEL | `.rpm` | `.AppImage` 可直接运行 |

首次打开未签名的安装包时，Windows SmartScreen 或 macOS Gatekeeper 可能提示风险；请确认来源是本仓库的 Release 后继续。完整的安装、更新、卸载和常见问题请看 [安装与使用教程](https://paper.mujizi.com/guide/)。

## 开发

```bash
git clone https://github.com/jincaiw/Paperling.git
cd Paperling
bun install
bun run tauri dev
```

提交前可执行：

```bash
npm test
npm run check:i18n
npm run build
cd src-tauri && cargo test --locked
```

## 发布与本地化规范

- 用户可见文案必须通过 `t()` / `tr()` 进入翻译表；CI 会执行 `check:i18n` 阻止缺失中文键。
- 发布前运行完整测试、检查 `CHANGELOG.md`，并同步三个版本来源：`package.json`、`src-tauri/Cargo.toml`、`src-tauri/tauri.conf.json`。
- 推送 `v*` 标签后，GitHub Actions 构建 Windows 安装包与 Portable、macOS DMG、Linux DEB/RPM/AppImage，并附加校验和。

## 许可证

[Apache License 2.0](LICENSE)。
