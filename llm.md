# LLM Context File — StockApp (自选股分析)

## 一句话定位

这是一个运行在 macOS 上的本地桌面股票资产管理 App, 使用 Tauri 2 + React + TypeScript + SQLite 构建.
**全程离线, 无任何远程 API, 所有数据只存在用户本机.**

---

## 技术栈

| 层 | 技术 | 版本 |
|---|---|---|
| 桌面壳 | Tauri | 2.x |
| 前端框架 | React + TypeScript | 18 / 5 |
| 构建工具 | Vite | 6.x |
| 本地数据库 | SQLite (rusqlite bundled) | — |
| 后端语言 | Rust | 1.95 (stable) |
| 图标库 | lucide-react | — |
| 样式 | 原生 CSS (无框架) | — |

---

## 项目目录结构

```
Shong_Stock/
├── llm.md                      ← 你正在读的文件
├── README.md                   ← 用户操作手册
├── package.json
├── vite.config.ts
├── tsconfig.json
├── index.html
│
├── src/                        ← 前端 (React + TS)
│   ├── main.tsx                ← React 入口, 挂载 App
│   ├── App.tsx                 ← 顶层组件, 持有全局状态
│   ├── styles.css              ← 全部样式 (CSS 变量 + 工具类)
│   │
│   ├── types/
│   │   └── stock.ts            ← 全项目 TypeScript 类型定义
│   │
│   ├── lib/
│   │   ├── calculations.ts     ← 纯函数: 单股计算 + 汇总统计
│   │   ├── format.ts           ← 纯函数: 金额/百分比/日期格式化
│   │   └── validators.ts       ← 纯函数: 表单字段校验
│   │
│   ├── components/
│   │   ├── SummaryCards.tsx        ← 顶部 6 块统计卡片
│   │   ├── StockTable.tsx          ← 股票列表表格 (搜索/筛选/排序/交易操作)
│   │   ├── StockForm.tsx           ← 新增/编辑股票弹窗表单
│   │   ├── StockTradeDialog.tsx    ← 交易操作弹窗 (做T / 减仓 / 加仓)
│   │   ├── CashBalanceDialog.tsx   ← 现金余额调整弹窗 (从总资产卡片打开)
│   │   ├── InvestedCapitalControl.tsx ← 导航栏投入资金按钮 (充值 / 提现)
│   │   ├── ImportExportPanel.tsx   ← 导入/导出操作面板弹窗
│   │   └── ConfirmDialog.tsx       ← 通用确认对话框 (删除时用)
│   │
│   └── services/
│       ├── stockService.ts         ← 调用 Tauri invoke: CRUD 股票
│       ├── settingsService.ts      ← 调用 Tauri invoke: 读写 settings (现金/投入资金)
│       └── importExportService.ts  ← 调用 Tauri invoke: 导入/导出/备份
│
└── src-tauri/                  ← 后端 (Rust + Tauri)
    ├── Cargo.toml
    ├── build.rs
    ├── tauri.conf.json         ← App 名称/窗口/图标/identifier 配置
    ├── capabilities/
    │   └── default.json        ← Tauri 权限声明 (dialog, fs 等)
    └── src/
        ├── main.rs             ← 二进制入口, 调用 lib::run()
        ├── lib.rs              ← Tauri Builder 配置, 注册 commands, 管理 AppState
        ├── db.rs               ← 数据库初始化 + 表结构建表 + 字段迁移
        ├── commands.rs         ← Tauri commands: 股票 CRUD + settings 读写
        └── import_export.rs    ← Tauri commands: CSV/JSON 导出, SQLite 备份/恢复
```

---

## 数据流向 (总览)

```
用户操作 (浏览器层 React)
    ↓ invoke("command_name", { args })
Tauri IPC 桥 (src-tauri/src/lib.rs 注册)
    ↓
Rust command 函数 (commands.rs / import_export.rs)
    ↓ rusqlite
SQLite 文件: ~/Library/Application Support/com.stockapp.local/stocks.db
    ↓
返回 JSON → 前端 service 层 → React state → 页面渲染
```

**前端永远不直接操作数据库, 所有 DB 读写都必须经过 Tauri command.**

---

## 数据库设计 (stocks.db)

### stocks 表

| 字段 | 类型 | 说明 |
|---|---|---|
| id | TEXT PK | UUID v4 |
| name | TEXT | 股票名称 |
| symbol | TEXT | 股票代码 |
| market | TEXT | A股 / 港股 / 美股 / 其他 |
| currency | TEXT | CNY / HKD / USD |
| current_price | REAL | 当前股价 |
| previous_close | REAL | 昨日收盘价 (仍存库, 用于当日涨跌计算, 但表格不展示) |
| shares | REAL | 持仓数量 (做T/减仓/加仓后会更新) |
| cost_price | REAL | 成本价 (做T/加仓后会更新) |
| pe | REAL | PE 市盈率 |
| dividend_per_10_shares | REAL | **每十股分红金额 (去年, 例如每10股派息3.5元填3.5)** |
| note | TEXT | 备注 |
| created_at | TEXT | ISO 8601 |
| updated_at | TEXT | ISO 8601 |

> 重要: `dividend_per_10_shares` 存储的是去年每10股派息金额.
> 分红总额和股息率均不存库, 前端实时计算:
> - `dividend_total = dividend_per_10_shares / 10 × shares`
> - `dividend_yield_pct = dividend_total / market_value`

### settings 表

| 字段 | 类型 | 说明 |
|---|---|---|
| key | TEXT PK | 设置项名称 |
| value | TEXT | 设置项值 |

当前使用的 key:

| key | 说明 |
|---|---|
| `net_cash_cny` | 账户现金 (人民币), 与持仓市值相加得到总资产 |
| `invested_capital_cny` | 累计投入本金 (人民币), 用于计算总收益 |

前端读写分别通过 `settingsService.ts` 中的 `getCashCny / setCashCny` 和 `getInvestedCapitalCny / setInvestedCapitalCny`.

### snapshots 表 (预留, 暂未启用)

历史快照结构已建表, 字段: id, stock_id, date, current_price, shares, market_value, created_at.

---

## 核心计算逻辑 (src/lib/calculations.ts)

### 单只股票 calcStock(stock) → StockWithCalc

```
market_value        = current_price × shares
day_change_value    = (current_price - previous_close) × shares
day_change_pct      = (current_price - previous_close) / previous_close  (previous_close > 0 时)
profit_loss         = (current_price - cost_price) × shares
profit_loss_pct     = (current_price - cost_price) / cost_price           (cost_price > 0 时)
dividend_total      = dividend_per_10_shares / 10 × shares                (去年分红总额)
dividend_yield_pct  = dividend_total / market_value                        (静态股息率)
```

### 整体汇总 calcSummary(stocks, cash, invested_capital) → SummaryStats

```
total_market_value  = sum(market_value)
total_day_change    = sum(day_change_value)
total_profit_loss   = sum(profit_loss)
total_dividend      = sum(dividend_total)
total_assets        = total_market_value + cash         ← 总资产 = 持仓 + 现金
total_return        = total_assets - invested_capital   ← 总收益 = 总资产 - 投入资金
total_return_pct    = total_return / invested_capital   (invested_capital > 0 时)
```

**没有前瞻股息(forward dividend)这个概念, 已从项目中完全移除.**

### 交易操作计算 calcTradeResult (src/components/StockTradeDialog.tsx 导出)

| 模式 | 输入 | 计算结果 |
|---|---|---|
| 做T (`t_trade`) | traded_shares, net_profit_per_share | `new_cost = (old_shares × old_cost - traded_shares × net_profit) / old_shares`; 持仓数量不变. 净收益为负 = 反T (成本升高). |
| 减仓 (`reduce`) | sell_shares, price (仅参考) | `new_shares = old_shares - sell_shares`; 成本价不变. |
| 加仓 (`add`) | buy_shares, buy_price | `new_shares = old_shares + buy_shares`; `new_cost = (old_shares × old_cost + buy_shares × buy_price) / new_shares`. |

操作确认后调用 `updateStock`, 更新数据库中的 `shares` 和 `cost_price` 字段.

---

## TypeScript 类型体系 (src/types/stock.ts)

```typescript
// 数据库原始字段
interface Stock {
  id, name, symbol, market, currency, current_price,
  previous_close, shares, cost_price, pe,
  dividend_per_10_shares, note, created_at, updated_at
}

// 计算后扩展 (前端 in-memory, 不入库)
interface StockWithCalc extends Stock {
  market_value, day_change_value, day_change_pct,
  profit_loss, profit_loss_pct,
  dividend_total,       // = dividend_per_10_shares / 10 × shares
  dividend_yield_pct    // = dividend_total / market_value
}

// 表单绑定 (所有数字字段用 string, 防止受控组件问题)
interface StockFormData { ..., dividend_per_10_shares: string, ... }

// 顶部卡片数据
interface SummaryStats {
  total_market_value, total_day_change, total_profit_loss, total_dividend,
  cash,               // 账户现金
  invested_capital,   // 投入资金
  total_assets,       // = total_market_value + cash
  total_return,       // = total_assets - invested_capital
  total_return_pct    // = total_return / invested_capital
}

// 交易模式
type TradeMode = "t_trade" | "reduce" | "add"
```

---

## Tauri Commands 对照表

| 前端调用 | Rust 函数 | 所在文件 |
|---|---|---|
| `invoke("list_stocks")` | `list_stocks()` | commands.rs |
| `invoke("create_stock", { stock })` | `create_stock()` | commands.rs |
| `invoke("update_stock", { stock })` | `update_stock()` | commands.rs |
| `invoke("delete_stock", { id })` | `delete_stock()` | commands.rs |
| `invoke("get_setting", { key })` | `get_setting()` | commands.rs |
| `invoke("set_setting", { key, value })` | `set_setting()` | commands.rs |
| `invoke("get_database_path")` | `get_database_path()` | commands.rs |
| `invoke("export_stocks_csv", { path })` | `export_stocks_csv()` | import_export.rs |
| `invoke("export_stocks_json", { path })` | `export_stocks_json()` | import_export.rs |
| `invoke("backup_database", { path })` | `backup_database()` | import_export.rs |
| `invoke("import_stocks_json", { path })` | `import_stocks_json()` | import_export.rs |
| `invoke("import_stocks_csv", { path })` | `import_stocks_csv()` | import_export.rs |
| `invoke("restore_database", { path })` | `restore_database()` | import_export.rs |

---

## UI 结构与状态管理

### App.tsx 顶层状态

```
stocks: Stock[]            ← 从 DB 加载的原始数据
cash: number               ← settings.net_cash_cny, 账户现金
investedCapital: number    ← settings.invested_capital_cny, 累计投入本金
loading: boolean           ← 数据加载中
actionLoading: boolean     ← 写操作 (新增/编辑/删除/交易/现金) 进行中
stocksWithCalc             ← 每次 render 由 stocks.map(calcStock) 派生, 无缓存
stats                      ← 每次 render 由 calcSummary(stocksWithCalc, cash, investedCapital) 派生
```

### 弹窗状态

| 状态 | 控制的弹窗 |
|---|---|
| `showForm` + `editStock` | 新增 (editStock=null) / 编辑股票表单 |
| `deleteTarget` | 删除确认对话框 |
| `showCashDialog` | 调整现金弹窗 (点击总资产卡片触发) |
| `showIE` | 导入/导出面板 |
| `tradeTarget` (在 StockTable 内部) | 交易操作弹窗 (点击表格中交易图标触发) |

### Toast 系统

`useToast()` hook, 自动 3.5s 消失, 支持 `success` / `error` / `info` 三种类型.

---

## 顶部统计卡片 (SummaryCards.tsx)

6 张卡片, 从左到右顺序:

| # | 卡片名称 | 说明 | 可交互 |
|---|---|---|---|
| 1 | 总资产 | `持仓市值 + 现金`, 副标题显示持股数量和现金余额 | 点击打开调整现金弹窗 |
| 2 | 总收益 | `总资产 - 投入资金`, 副标题显示收益率 | — |
| 3 | 持仓市值 | 各股票 `current_price × shares` 之和 | — |
| 4 | 当日涨跌 | 当日市值变化, 副标题显示估算涨跌幅 | — |
| 5 | 持仓收益 | 相对成本的浮动盈亏, 副标题显示盈亏率 | — |
| 6 | 静态股息 | 去年分红总额, 副标题显示整体静态股息率 | — |

---

## 导航栏 (Navbar)

从左到右:
1. **品牌名** "自选股分析"
2. **投入资金** 按钮 (InvestedCapitalControl) — 点击展开下拉菜单:
   - **充值**: 输入金额后 `invested_capital += amount`, 写库
   - **提现**: 输入金额后 `invested_capital -= amount`, 写库
3. **刷新** — 重新从数据库加载全量数据
4. **新增股票** — 打开 StockForm 弹窗
5. **导入/导出** — 打开 ImportExportPanel 弹窗

---

## 股票表格列 (StockTable.tsx)

| 列 | 说明 | 可排序 |
|---|---|---|
| 股票名称 | — | ✓ |
| 市场 | A股/港股/美股/其他 徽章 | ✓ |
| 代码 | — | — |
| 货币 | CNY/HKD/USD | — |
| 当前股价 | — | — |
| 持仓数量 | — | — |
| 成本价 | — | — |
| 持仓市值 | — | ✓ |
| 当日涨跌 | — | ✓ |
| 涨跌幅 | — | ✓ |
| 浮动盈亏 | — | ✓ |
| 盈亏率 | — | — |
| PE | — | — |
| 每十股分红 | — | — |
| 分红总额 | — | ✓ |
| 静态股息率 | — | ✓ |
| **交易** | 点击图标打开 StockTradeDialog (做T/减仓/加仓) | — |
| 备注 | — | — |
| 更新时间 | — | ✓ |
| 操作 | 编辑 / 删除 按钮 | — |

> 注意: 昨日收盘价不在表格中展示, 但仍存库用于计算当日涨跌.

---

## 颜色约定 (src/styles.css CSS 变量)

```css
--color-up:      #e84c4c   /* 红色, 涨 */
--color-down:    #1aad19   /* 绿色, 跌 */
--color-neutral: #333333   /* 平盘 */
```

> 遵循 A 股惯例: 涨红跌绿. `changeColor(value)` 函数统一返回对应颜色变量.

---

## 格式化规则 (src/lib/format.ts)

- `formatCurrency(v, currency)` → `¥12.34万` / `HK$1.23万` / `$456.78`
- `formatNumber(v)` → 万元以上自动换算: `12.34万`, 否则保留 2 位小数
- `formatPercent(v)` → 输入小数 `0.035` → 输出 `3.50%`
- `formatPrice(v)` → 保留 3 位小数 (股价精度)
- `changeColor(v)` → 正数返回红色变量, 负数返回绿色变量, 零返回中性色

---

## 导入/导出规则

| 操作 | 行为 |
|---|---|
| 导出 CSV | 所有股票 → .csv 文件, 字段与数据库一致 |
| 导出 JSON | 所有股票 → .json 数组 |
| 备份数据库 | 直接 fs::copy stocks.db 到用户指定路径 |
| 导入 JSON/CSV | **追加**模式, 不删除现有数据, 跳过 name 为空的行 |
| 恢复数据库 | **替换**整个 stocks.db, 操作前验证文件是否为有效 SQLite |

---

## 启动与编译

```bash
# 安装前端依赖
npm install

# 开发模式 (热重载)
npx tauri dev

# 生产打包 (输出 .app 和 .dmg)
npx tauri build
```

数据库文件路径:
```
~/Library/Application Support/com.stockapp.local/stocks.db
```

---

## 当前已知待改进点 / 扩展预留

1. **snapshots 表** 已建表, 未实现历史快照记录功能, 预留给后续版本.
2. **汇率换算** 未实现, 所有货币的持仓市值直接加总 (忽略汇率), 现金和投入资金均只支持 CNY 口径.
3. **当日涨跌幅** 使用近似算法 `total_day_change / (total_market_value - total_day_change)` 估算, 非加权精确值.
4. **做T / 减仓 / 加仓** 当前仅更新 `shares` 和 `cost_price` 字段, 不产生独立的交易记录/历史.

---

## 禁止事项 (设计约束)

- 不接入任何远程 API 或云服务
- 不使用云数据库
- 不发送任何用户数据到外部
- 不引入统计 SDK / 埋点 / 自动更新服务
- 不支持账号登录
- 前端组件不得直接操作数据库文件, 必须通过 Tauri command
