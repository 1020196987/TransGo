# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TransGo 是一个 VSCode 翻译插件，支持中英文互译、悬浮翻译、语音朗读、驼峰命名转换等功能。

## Common Commands

```bash
# 开发调试
npm run watch     # 监听模式编译 TypeScript
npm run compile  # 一次性编译

# 打包发布
npm run build    # 使用 vsce 打包为 .vsix 文件
```

## Architecture

```
src/
├── extension.ts       # 插件入口，注册命令和悬浮翻译
├── configManager.ts   # 配置管理，密钥安全存储
├── translationService.ts  # 翻译服务（Google/百度/有道/腾讯/AI）
├── translationPanel.ts    # 侧边栏翻译面板 UI
├── hoverProvider.ts       # 悬浮翻译提供器
├── ttsService.ts         # TTS 语音服务
└── textFormatter.ts      # 驼峰/下划线等格式转换
```

## Key Patterns

- **TranslationService**: 支持多种翻译商，通过 `ConfigManager.getProvider()` 获取当前配置的翻译服务
- **ConfigManager**: 使用 VSCode `context.secrets` 存储敏感 API 密钥，使用 `context.globalState` 存储迁移标志
- **TranslationPanelProvider**: 使用 Webview 实现侧边栏面板，与主进程通过 `postMessage` 通信

## API 翻译超时问题排查

AI 翻译报 "请求超时" 时检查：
1. **Base URL 格式**: 必须填写完整端点地址，如 `https://api.deepseek.com/v1/chat/completions`，不能只是域名
2. **网络连接**: 确认能访问 AI 服务商
3. **API Key**: 检查是否正确配置

## VSCode 插件发布流程

1. 修改 `package.json` 中的版本号 `version`
2. 运行 `npm run build` 生成 `.vsix` 文件
3. 在 [VSCode Marketplace](https://marketplace.visualstudio.com/) 发布，或直接安装 `.vsix` 文件进行测试
