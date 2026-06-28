# Stock Voyager

本地离线股票资产管理桌面 App, 基于 Tauri 2 + React + TypeScript + SQLite 构建。所有数据保存在本机, 不联网, 不上传任何用户数据。

## 功能

- 股票持仓管理: 新增、编辑、删除、搜索、筛选、排序
- 资产概览: 总资产、总收益、持仓市值、当日涨跌、持仓收益、静态股息
- 交易记录: 加仓、减仓、做T、分红除权、手动记录
- 个股详情: 持仓指标、操作记录、分析笔记
- 现金与投入资金管理
- CSV / JSON 股票导入导出, SQLite 整库备份与恢复
- 一键刷新 A 股股价与基本面数据 (需 Python 环境, 见下方说明)

## 技术栈

| 层 | 技术 |
|---|---|
| 桌面壳 | Tauri 2 |
| 前端 | React 18 + TypeScript + Vite |
| 本地数据库 | SQLite (rusqlite bundled) |
| 后端 | Rust |
| 样式 | 原生 CSS |
| 图标 | lucide-react |
| 数据拉取 | Python 3 + baostock + pandas |

## 开发

### 基础启动 (不含行情刷新)

无需配置 Python 环境即可启动 App, 所有持仓管理功能正常使用。刷新股价和基本面功能在没有 Python 环境时会报错, 其余功能不受影响。

```bash
npm install
npm run tauri:dev
```

### 启用行情刷新 (Python 环境配置)

刷新股价与基本面数据依赖 `src-tauri/scripts/` 下的两个 Python 脚本, 需要安装 `baostock` 和 `pandas`。

#### 方式一: 使用 uv (推荐)

[uv](https://github.com/astral-sh/uv) 是一个快速的 Python 包管理器, 无需手动创建虚拟环境。

```bash
# 安装 uv (如未安装)
curl -LsSf https://astral.sh/uv/install.sh | sh

# 在项目根目录安装依赖
uv pip install baostock pandas
```

或者使用 `uv run` 直接运行脚本:

```bash
uv run --with baostock --with pandas python src-tauri/scripts/get_value.py sh.600989
```

#### 方式二: 使用系统 Python / pip

```bash
pip install baostock pandas
```

App 启动时会依次尝试以下 Python 路径:

```
/opt/homebrew/bin/python
/usr/local/bin/python
python
/usr/bin/python
```

确保上述任意路径中的 Python 已安装所需依赖即可。

## 打包

```bash
npm run tauri:build
```

打包前请确认 Python 环境已配置, 否则打包后的 App 刷新功能将无法使用。

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
  scripts/
    get_value.py          # 拉取 A 股最新与昨日收盘价
    get_stock_metrics.py  # 拉取 ROE、净利润 TTM、净资产等基本面指标
```
