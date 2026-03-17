## VSCode 插件项目脚本与 tsc 参数学习记录

### package.json 中的脚本

- **`vscode:prepublish`: `npm run compile`**
  在使用 `vsce publish` 或 `vsce package` 打包 / 发布 VSCode 插件时，VS Code 打包工具会自动先执行这个脚本，用来在发布前先编译 TypeScript，确保打包的是最新的编译结果。

- **`compile`: `tsc -p ./`**
  一次性编译 TypeScript 项目。`tsc` 会以当前目录为项目根目录，读取这里的 `tsconfig.json` 配置，对整个项目进行编译。

- **`watch`: `tsc -watch -p ./`**
  监听模式编译 TypeScript。启动后进程会保持运行，监控源码变更，一旦有文件修改就自动重新编译，适合本地开发调试时使用。

- **`build`: `vsce package`**
  调用 VS Code 官方工具 `vsce`，把当前扩展打包成 `.vsix` 安装包。生成的 `.vsix` 可以本地安装测试，或者上传到 VSCode Marketplace。

### TypeScript 编译器 tsc 的 `-p` 参数

- **`-p` / `--project`**
  - 作用：指定 TypeScript 项目的根目录，`tsc` 会在这个目录下查找 `tsconfig.json`，并按其中的配置编译整个项目。
  - 示例：
    - `tsc -p ./` 等价于 `tsc --project ./`，表示”以当前目录作为项目根目录”。
  - 总结：**`-p` 就是在告诉 `tsc`：去这个目录找 `tsconfig.json`，并按项目配置进行编译。**

---

# TransGo 项目技术分析

## 项目概述

TransGo 是一个 VSCode 翻译插件，支持中英文互译、悬浮翻译、语音朗读、驼峰命名转换等功能。

## 技术栈

### 核心语言与运行时
- **TypeScript** - 主要开发语言
- **VSCode Extension API** - 插件开发框架
- **Node.js** - 运行时环境 (VSCode 基于 Electron + Node.js)

### 核心依赖
| 依赖 | 版本 | 用途 |
|------|------|------|
| axios | ^1.6.0 | HTTP 请求 (调用翻译 API) |
| crypto-js | ^4.2.0 | 加密 (API 签名计算) |
| say | ^0.13.1 | TTS 语音合成 |
| @types/vscode | ^1.74.0 | VSCode API 类型定义 |
| typescript | ^4.9.4 | TypeScript 编译 |

### 开发与构建工具
- **tsc** - TypeScript 编译器
- **vsce** - VSCode 插件打包工具
- **VSCode** - 开发与调试环境

## 架构设计

### 目录结构
```
src/
├── extension.ts          # 插件入口，注册命令和悬浮翻译
├── configManager.ts      # 配置管理，密钥安全存储
├── translationService.ts # 翻译服务（多提供商支持）
├── translationPanel.ts  # 侧边栏翻译面板 UI (WebView)
├── hoverProvider.ts      # 悬浮翻译提供器
├── ttsService.ts        # TTS 语音服务
├── textFormatter.ts     # 驼峰/下划线等格式转换
└── utils/
    ├── crypto.ts        # 加密工具（HMAC-SHA256, SHA256）
    └── md5.ts          # MD5 工具
```

### 核心架构模式

#### 1. 单例模式
所有核心服务都使用单例模式:
- `TranslationService.getInstance()`
- `ConfigManager` (静态类)
- `TTSService.getInstance()`

#### 2. 配置管理
- **非敏感配置**: 使用 `vscode.workspace.getConfiguration()` 存储在 `settings.json`
- **敏感配置 (API Key)**: 使用 `vscode.SecretStorage` 加密存储
- **迁移机制**: 支持从旧版本 `settings.json` 迁移到 `SecretStorage`

#### 3. 翻译服务架构
```
翻译请求
    │
    ▼
Language Detection (语言检测)
    │
    ├── 中文 → 英文
    └── 英文 → 中文
    │
    ▼
Provider Router
    ├── Google (免费，无需配置)
    ├── 百度 (需要 APPID + AppKey)
    ├── 有道 (需要 AppKey + AppSecret)
    ├── 腾讯 (需要 SecretId + SecretKey)
    └── AI (支持 OpenAI/Claude 等兼容 API)
```

#### 4. UI 架构
- **侧边栏面板**: 使用 WebView 实现，通过 `postMessage` 与主进程通信
- **悬浮翻译**: 使用 `vscode.languages.registerHoverProvider` 实现
- **命令面板**: 通过 `vscode.commands.registerCommand` 注册

### 关键特性

#### 悬浮翻译 (HoverProvider)
- 缓存机制: 内存缓存 5 分钟
- 频率控制: 最小间隔 2 秒，每分钟最多 2 次请求
- 文本选择: 支持选中文本和鼠标位置的单词
- 语言检测: 基于中文字符比例 (20% 阈值)

#### 文本格式转换
支持以下格式转换:
- PascalCase (大驼峰)
- camelCase (小驼峰)
- snake_case (下划线)
- kebab-case (中划线)

#### AI 翻译支持
- 支持任意兼容 OpenAI API 的服务 (OpenAI, Claude, DeepSeek 等)
- 可配置 Base URL、API Key、模型名称、Prompt
- 超时时间: 90 秒

### 配置项

| 配置项 | 类型 | 说明 |
|--------|------|------|
| provider | enum | 翻译提供商 (google/baidu/youdao/tencent/ai) |
| ai.configs | array | AI 翻译配置列表 |
| enableHoverTranslation | boolean | 启用悬浮翻译 |
| hoverTranslationDelay | number | 悬浮翻译延迟 (毫秒) |
| hoverReplaceFormat | enum | 悬浮翻译替换格式 |
| tts.provider | enum | TTS 提供商 (system/tencent) |

## 后续迭代建议

### 1. 性能优化
- 考虑将翻译缓存持久化到文件系统
- 实现 WebView 懒加载
- 添加 Web Worker 处理翻译请求

### 2. 功能扩展
- 添加更多翻译提供商
- 支持更多语言对
- 添加翻译历史记录
- 支持自定义快捷键

### 3. 代码质量
- 添加单元测试 (Jest/Vitest)
- 使用 ESLint + Prettier 规范代码
- 考虑拆分为更小的模块

### 4. 安全性
- 定期轮换 API 密钥提示
- 添加请求签名验证
- 考虑添加速率限制配置

## 版本信息

- 当前版本: 1.1.3
- 最低 VSCode 版本: 1.74.0
- 许可证: MIT

---

## 本地开发测试

可以在本地进行开发测试，不需要发布插件就能运行。

### 方式一：VSCode 调试模式（推荐）

1. 在 VSCode 中打开项目
2. 按 `F5` 或点击左侧的「运行和调试」图标
3. 点击「启动调试」按钮

这会启动一个新的 VSCode 窗口（称为「扩展开发主机」），里面会加载你的插件，你可以在这个窗口中测试所有功能。

**优点**：
- 可以设置断点调试
- 修改代码后自动重启插件
- 调试控制台可以看到日志输出

### 方式二：手动加载插件

```bash
# 编译 TypeScript
npm run compile

# 或监听模式（修改代码后自动编译）
npm run watch
```

编译后的代码在 `out/` 目录，然后：

1. 打开 VSCode
2. 按 `Cmd+Shift+P` 打开命令面板
3. 输入 `Developer: Install Extension from Location`
4. 选择你的项目目录

### 方式三：直接安装 .vsix

```bash
# 打包成 .vsix
npm run build

# 安装 .vsix
code --install-extension TransGo-1.1.3.vsix
```

