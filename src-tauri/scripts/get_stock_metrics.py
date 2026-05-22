import argparse
import json
from datetime import datetime

import baostock as bs
import pandas as pd


def collect_rs(rs):
    rows = []
    while rs.error_code == "0" and rs.next():
        rows.append(rs.get_row_data())
    return pd.DataFrame(rows, columns=rs.fields)


def get_recent_quarters(n=12):
    today = datetime.today()
    year = today.year
    month = today.month

    if month <= 3:
        q = 4
        year -= 1
    elif month <= 6:
        q = 1
    elif month <= 9:
        q = 2
    else:
        q = 3

    quarters = []
    for _ in range(n):
        quarters.append((year, q))
        q -= 1
        if q == 0:
            q = 4
            year -= 1

    return quarters


def add_single_quarter_profit(df):
    df = df.sort_values(["year", "quarter"]).copy()
    df["single_q_netProfit"] = pd.NA

    for i in range(len(df)):
        year = int(df.iloc[i]["year"])
        quarter = int(df.iloc[i]["quarter"])
        net_profit = df.iloc[i]["netProfit"]

        if pd.isna(net_profit):
            continue

        if quarter == 1:
            df.iloc[i, df.columns.get_loc("single_q_netProfit")] = net_profit
        else:
            prev = df[
                (df["year"] == year) &
                (df["quarter"] == quarter - 1)
            ]

            if len(prev) > 0:
                prev_profit = prev.iloc[-1]["netProfit"]
                if not pd.isna(prev_profit):
                    df.iloc[i, df.columns.get_loc("single_q_netProfit")] = (
                        net_profit - prev_profit
                    )

    df["single_q_netProfit"] = pd.to_numeric(
        df["single_q_netProfit"],
        errors="coerce",
    )

    return df


def fetch_profit_data(code, n_quarters=12):
    profit_rows = []

    for year, quarter in get_recent_quarters(n=n_quarters):
        rs_profit = bs.query_profit_data(
            code=code,
            year=year,
            quarter=quarter,
        )
        df_q = collect_rs(rs_profit)

        if len(df_q) > 0:
            df_q["year"] = year
            df_q["quarter"] = quarter
            profit_rows.append(df_q)

    if len(profit_rows) == 0:
        raise ValueError(f"没有获取到利润数据: {code}")

    df_profit = pd.concat(profit_rows, ignore_index=True)

    num_cols = [
        "roeAvg",
        "npMargin",
        "gpMargin",
        "netProfit",
        "epsTTM",
        "MBRevenue",
        "totalShare",
        "liqaShare",
    ]

    for col in num_cols:
        if col in df_profit.columns:
            df_profit[col] = pd.to_numeric(df_profit[col], errors="coerce")

    return df_profit.sort_values(["year", "quarter"]).copy()


def fetch_express_net_assets(code, stat_date):
    rs = bs.query_performance_express_report(
        code=code,
        start_date="2010-01-01",
        end_date=datetime.today().strftime("%Y-%m-%d"),
    )
    df = collect_rs(rs)

    if df.empty or "performanceExpressNetAsset" not in df.columns:
        return pd.NA

    df["performanceExpressNetAsset"] = pd.to_numeric(
        df["performanceExpressNetAsset"],
        errors="coerce",
    )
    df["performanceExpStatDate"] = pd.to_datetime(
        df["performanceExpStatDate"],
        errors="coerce",
    )
    target = pd.to_datetime(stat_date, errors="coerce")
    df = df.dropna(subset=["performanceExpressNetAsset", "performanceExpStatDate"])
    df = df[df["performanceExpStatDate"] <= target]

    if df.empty:
        return pd.NA

    return df.sort_values("performanceExpStatDate").iloc[-1]["performanceExpressNetAsset"]


def estimate_net_assets(df_profit_q):
    df = df_profit_q.dropna(subset=["netProfit", "roeAvg"]).copy()

    if df.empty:
        raise ValueError("无法估算净资产, 缺少净利润或 ROE 数据")

    latest = df.iloc[-1]
    net_profit = latest["netProfit"]
    roe = latest["roeAvg"]

    if pd.isna(roe) or roe == 0:
        raise ValueError("最新季度 ROE 无效, 无法估算净资产")

    avg_equity = net_profit / roe

    if len(df) < 2:
        return float(avg_equity)

    prev = df.iloc[-2]
    prev_roe = prev["roeAvg"]

    if pd.isna(prev_roe) or prev_roe == 0:
        return float(avg_equity)

    equity_begin = float(prev["netProfit"] / prev_roe)
    return float(2 * avg_equity - equity_begin)


def get_stock_metrics(code):
    code = code.strip().lower()
    if not code.startswith(("sh.", "sz.")):
        raise ValueError("代码格式应为 sh.600989 或 sz.000001")

    lg = bs.login()
    if lg.error_code != "0":
        raise RuntimeError(f"baostock 登录失败: {lg.error_msg}")

    try:
        df_profit = fetch_profit_data(code)
        df_profit_q = add_single_quarter_profit(df_profit)

        df_last4_q = df_profit_q.dropna(
            subset=["single_q_netProfit", "totalShare"]
        ).tail(4)

        if df_last4_q.empty:
            raise ValueError("无法构造最近四个单季度利润")

        latest_row = df_profit_q.dropna(subset=["roeAvg", "totalShare"]).iloc[-1]

        net_profit_ttm = float(df_last4_q["single_q_netProfit"].sum())
        roe = float(latest_row["roeAvg"])
        total_share = float(latest_row["totalShare"])
        stat_date = latest_row.get("statDate")

        net_assets = fetch_express_net_assets(code, stat_date)
        if pd.isna(net_assets):
            net_assets = estimate_net_assets(df_profit_q)
        else:
            net_assets = float(net_assets)

        return {
            "code": code,
            "ROE": roe,
            "net_profit_ttm": net_profit_ttm,
            "net_assets": net_assets,
            "totalShare": total_share,
        }
    finally:
        bs.logout()


def main():
    parser = argparse.ArgumentParser(description="获取 A 股核心财务指标 JSON")
    parser.add_argument("code", help="A 股代码, 如 sh.600989")
    args = parser.parse_args()

    result = get_stock_metrics(args.code)
    print(json.dumps(result, ensure_ascii=False))


if __name__ == "__main__":
    main()
