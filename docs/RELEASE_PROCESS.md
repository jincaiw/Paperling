# Paperling 中文化与发布流程

## 中文化

1. 所有新用户可见文本通过 `t()` 或 `tr()` 进入 `LocaleContext`。
2. 同步补充简体中文翻译；教程、对话框、空状态和错误信息都属于用户可见文本。
3. 运行 `npm run check:i18n`。CI 会阻止缺少中文翻译键的改动。
4. 在中文界面手工检查至少一个欢迎页、设置页和新增功能流程。

## 发布

1. 完成 `npm test`、`npm run build`、`npm run release:check`，并在 `src-tauri` 运行 `cargo test --locked`。
2. 将 `package.json`、`src-tauri/Cargo.toml`、`src-tauri/tauri.conf.json` 更新为同一版本号。
3. 在 `CHANGELOG.md` 添加对应版本的小节和面向用户的变更说明。
4. 合并到 `main` 后创建并推送带注释的标签：`git tag -a vX.Y.Z -m "Paperling vX.Y.Z" && git push origin vX.Y.Z`。
5. GitHub Actions 发布 Windows MSI/NSIS/Portable、macOS DMG、Linux DEB/RPM/AppImage，并生成更新元数据。
6. 在 Release 页面逐个下载检查产物；确认 `latest.json`、签名文件、Windows Portable 和三个系统的安装包均存在。
7. 确认 Pages 构建完成、`https://paper.mujizi.com/guide/` 可访问，README 的教程链接正常。

签名私钥仅存放于仓库 Secrets：`TAURI_SIGNING_PRIVATE_KEY` 与 `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`。不要将私钥、密码或临时签名文件提交到仓库。
