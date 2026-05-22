# Stock Voyager

本地离线股票资产管理桌面 App, 基于 Tauri 2 + React + TypeScript + SQLite 构建。所有数据保存在本机, 不联网, 不上传任何用户数据。

## 功能

- 股票持仓管理: 新增、编辑、删除、搜索、筛选、排序
- 资产概览: 总资产、总收益、持仓市值、当日涨跌、持仓收益、静态股息
- 交易记录: 加仓、减仓、做T、分红除权、手动记录
- 个股详情: 持仓指标、操作记录、分析笔记
- 现金与投入资金管理
- CSV / JSON 股票导入导出, SQLite 整库备份与恢复

## 技术栈

| 层 | 技术 |
|---|---|
| 桌面壳 | Tauri 2 |
| 前端 | React 18 + TypeScript + Vite |
| 本地数据库 | SQLite (rusqlite bundled) |
| 后端 | Rust |
| 样式 | 原生 CSS |
| 图标 | lucide-react |

## 开发

```bash
npm install
npm run tauri:dev
```

## 打包

```bash
npm run tauri:build
```

## 数据位置

```text
~/Library/Application Support/com.stockapp.local/stocks.db
```

## 目录

```text
src/
  App.tsx
  components/
  lib/
  services/
  types/
src-tauri/
  src/
    commands.rs
    db.rs
    import_export.rs
    lib.rs
```
