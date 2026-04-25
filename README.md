# Shong-Stock

本地股票资产管理桌面 App, 基于 Tauri + React + TypeScript + SQLite 构建.
所有数据保存在本机, 不联网, 不上传任何数据.

## 功能特性

- 股票列表管理 (新增 / 编辑 / 删除)
- 自动计算持仓市值、当日涨跌、浮动盈亏、股息总额
- 顶部统计卡片 (持仓市值、当日涨跌、净利润、净资产、净现金、静态股息、前瞻股息)
- 按名称搜索、按市场筛选、多字段排序
- 现金余额设置
- 导出为 CSV / JSON / SQLite 备份
- 从 CSV / JSON 追加导入, 或从 SQLite 备份恢复

## 技术栈

| 层 | 技术 |
|---|---|
| 桌面壳 | Tauri 2 |
| 前端 | React 18 + TypeScript + Vite |
| 本地数据库 | SQLite (rusqlite bundled) |
| 样式 | 原生 CSS |
| 图标 | lucide-react |

## 环境要求

- macOS 12 或更高
- Node.js >= 18
- Rust (stable, >= 1.70)
- Xcode Command Line Tools

安装 Rust:
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
rustup default stable
```

安装 Xcode CLT:
```bash
xcode-select --install
```

## 安装依赖

```bash
# 安装 Node 依赖
npm install
```

## 启动开发环境

```bash
npm run tauri dev
# 或
npx tauri dev
```

首次运行会编译 Rust 代码, 需要等待 3-5 分钟 (后续热重载很快).

## 打包 macOS App

```bash
npm run tauri build
# 或
npx tauri build
```

打包产物在:
```
src-tauri/target/release/bundle/macos/StockApp.app
src-tauri/target/release/bundle/dmg/StockApp_0.1.0_aarch64.dmg
```

## 数据库文件位置

```
~/Library/Application Support/com.stockapp.local/stocks.db
```

开发模式下:
```
~/Library/Application Support/com.stockapp.local/stocks.db
```

## 如何备份数据

方法一 (推荐, 通过 App):
1. 点击导航栏「导出」按钮
2. 选择「备份数据库」
3. 选择保存位置

方法二 (手动):
```bash
cp ~/Library/Application\ Support/com.stockapp.local/stocks.db ~/Desktop/stocks_backup.db
```

## 如何恢复数据

方法一 (通过 App):
1. 点击导航栏「导入」按钮
2. 选择「从备份恢复」
3. 选择备份文件

方法二 (手动, App 关闭时操作):
```bash
cp ~/Desktop/stocks_backup.db ~/Library/Application\ Support/com.stockapp.local/stocks.db
```

## 数据结构说明

股息率在数据库中以小数形式存储 (例如 3.5% 存为 0.035), 在界面中显示为百分比.

导出的 CSV/JSON 中 `dividend_yield` 和 `forward_dividend_yield` 同样为小数格式.
导入时请确保格式一致.

## 目录结构

```
StockApp/
├── package.json
├── vite.config.ts
├── index.html
├── src/
│   ├── main.tsx              # 入口
│   ├── App.tsx               # 主 App
│   ├── styles.css            # 全局样式
│   ├── types/
│   │   └── stock.ts          # TypeScript 类型定义
│   ├── lib/
│   │   ├── calculations.ts   # 计算函数
│   │   ├── format.ts         # 格式化函数
│   │   └── validators.ts     # 表单校验
│   ├── components/
│   │   ├── SummaryCards.tsx  # 顶部统计卡片
│   │   ├── StockTable.tsx    # 股票表格
│   │   ├── StockForm.tsx     # 新增/编辑表单
│   │   ├── CashSettingsDialog.tsx  # 现金设置
│   │   ├── ImportExportPanel.tsx   # 导入导出面板
│   │   └── ConfirmDialog.tsx       # 确认对话框
│   └── services/
│       ├── stockService.ts         # 股票 CRUD
│       ├── settingsService.ts      # 设置读写
│       └── importExportService.ts  # 导入导出
└── src-tauri/
    ├── Cargo.toml
    ├── tauri.conf.json
    └── src/
        ├── main.rs           # 入口
        ├── lib.rs            # Tauri 应用设置
        ├── db.rs             # 数据库初始化
        ├── commands.rs       # Tauri commands (CRUD)
        └── import_export.rs  # 导入导出 commands
```
