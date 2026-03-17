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
    - `tsc -p ./` 等价于 `tsc --project ./`，表示“以当前目录作为项目根目录”。  
  - 总结：**`-p` 就是在告诉 `tsc`：去这个目录找 `tsconfig.json`，并按项目配置进行编译。**

