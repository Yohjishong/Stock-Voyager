import argparse
import json
from datetime import datetime, timedelta

import baostock as bs
import pandas as pd


def collect_rs(rs):
    rows = []
    while rs.error_code == "0" and rs.next():
        rows.append(rs.get_row_data())
    return pd.DataFrame(rows, columns=rs.fields)


def fetch_price_data(code, lookback_days=90):
    end_date = datetime.today().strftime("%Y-%m-%d")
    start_date = (datetime.today() - timedelta(days=lookback_days)).strftime("%Y-%m-%d")

    rs = bs.query_history_k_data_plus(
        code=code,
        fields="date,code,close,tradestatus",
        start_date=start_date,
        end_date=end_date,
        frequency="d",
        adjustflag="3",
    )
    df = collect_rs(rs)

    if df.empty:
        raise ValueError(f"没有获取到价格数据: {code}")

    df["close"] = pd.to_numeric(df["close"], errors="coerce")
    df = df[
        (df["tradestatus"] == "1") &
        (df["close"].notna())
    ].sort_values("date").copy()

    if df.empty:
        raise ValueError(f"没有有效交易日价格数据: {code}")

    return df


def get_stock_price(code):
    code = code.strip().lower()
    if not code.startswith(("sh.", "sz.")):
        raise ValueError("代码格式应为 sh.600989 或 sz.000001")

    lg = bs.login()
    if lg.error_code != "0":
        raise RuntimeError(f"baostock 登录失败: {lg.error_msg}")

    try:
        df_price = fetch_price_data(code)

        if len(df_price) < 2:
            raise ValueError(f"有效交易日不足两个, 无法获取昨日股价: {code}")

        latest = df_price.iloc[-1]
        prev = df_price.iloc[-2]

        return {
            "code": code,
            "latest_date": latest["date"],
            "close": float(latest["close"]),
            "prev_date": prev["date"],
            "prev_close": float(prev["close"]),
        }
    finally:
        bs.logout()


def main():
    parser = argparse.ArgumentParser(description="获取 A 股最新与昨日收盘价 JSON")
    parser.add_argument("code", help="A 股代码, 如 sh.600989")
    args = parser.parse_args()

    result = get_stock_price(args.code)
    print(json.dumps(result, ensure_ascii=False))


if __name__ == "__main__":
    main()
