# 应用图标

正式形象是四脚站立的木乃伊猫，构建输入为 `design/brand/cat-mummy-standing-transparent-v1.png`。该透明 PNG 使用内置图像编辑工具，从 `cat-mummy-standing-v1.png` 去除轮廓外背景和地面阴影，保留猫的配色、表情与姿态；尾巴内侧及四脚之间也透明。编辑说明保存在同名 `.prompt.txt` 文件。其他设计稿不参与构建。

安装依赖后，在仓库根目录运行：

```bash
pnpm icons:generate
```

该命令使用 Sharp 和项目锁定的 Tauri CLI，可在 Windows、macOS、Linux 生成所有平台资源，不依赖 Xcode 或 Android SDK。输出已经纳入仓库，日常构建无需重新生成。

| 用途 | 输出 | 处理方式 |
| --- | --- | --- |
| 通用导出 | `design/brand/exports/` | 透明 PNG 16、32、48、64、128、256、512、1024；透明无损 WebP；ICO；ICNS；桌面留白 PNG |
| Windows | `packages/app/src-tauri/icons/icon.ico` | 多尺寸 ICO，包含 16、24、32、48、64、256 |
| macOS | `packages/app/src-tauri/icons/icon.icns` | 多尺寸 ICNS，猫轮廓外透明，不添加底板 |
| Linux | `packages/app/src-tauri/icons/*.png` | RGBA 图标，由 Tauri 打包到桌面菜单和安装包 |
| iOS / iPadOS | `packages/app/src-tauri/icons/ios/` | 系统要求不透明图标，单独合成浅灰底，含 1024 商店图标 |
| Android | `packages/app/src-tauri/icons/android/` | 五种屏幕密度、透明传统图标及自适应前景；自适应背景单独保留浅灰底，避免启动器将透明底渲染为黑色 |
| Web | `packages/app/public/` | favicon、Apple Touch Icon、Web App Manifest、普通及 maskable 图标 |

应用内 `Brand` 使用透明的 `public/icons/brand.webp`，容器不再添加底色或圆角裁切。普通 Web 图标和 favicon 保留透明；Apple Touch Icon 与 maskable 版本保留平台需要的实色背景。Web Manifest 提供添加到主屏幕的名称和图标，不代表实现了离线访问。

`pnpm icons:sync` 将已生成的移动图标同步到 `src-tauri/gen/`。本地 `init`、`dev`、`build` 脚本和 GitHub Actions 的移动构建会自动恢复资源，防止 Tauri 初始化覆盖图标。直接调用原始 `tauri android init` 或 `tauri ios init` 后，应再运行该同步命令。

`pnpm test:scripts` 检查 iOS 尺寸和透明通道、ICO 帧、Android 密度、Web Manifest 引用以及重复同步对其他资源的保留。修改图标后需重新构建并安装原生应用；已经安装的旧包不会因前端热更新而更新桌面图标。
