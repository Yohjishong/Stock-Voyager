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


def get_stock_metrics(code):
    code = code.strip().lower()
    if not code.startswith(("sh.", "sz.")):
        raise ValueError("代码格式应为 sh.600989 或 sz.000001")

    lg = bs.login()
    if lg.error_code != "0":
        raise RuntimeError(f"baostock 登录失败: {lg.error_msg}")

    try:
        today = datetime.today()
        # 往前取 10 个交易日，确保能拿到最新一条有效数据
        start_date = (today - timedelta(days=14)).strftime("%Y-%m-%d")
        end_date = today.strftime("%Y-%m-%d")

        rs = bs.query_history_k_data_plus(
            code,
            fields="date,code,close,peTTM,pbMRQ,psTTM,pcfNcfTTM",
            start_date=start_date,
            end_date=end_date,
            frequency="d",
            adjustflag="3",
        )
        df_kdata = collect_rs(rs)

        if df_kdata.empty:
            raise ValueError(f"无法获取 K 线估值数据: {code}")

        for col in ["peTTM", "pbMRQ"]:
            df_kdata[col] = pd.to_numeric(df_kdata[col], errors="coerce")

        df_valid = df_kdata.dropna(subset=["peTTM", "pbMRQ"])
        df_valid = df_valid[(df_valid["peTTM"] != 0) & (df_valid["pbMRQ"] != 0)]

        if df_valid.empty:
            raise ValueError(f"K 线数据中 peTTM/pbMRQ 均为空或零: {code}")

        latest = df_valid.iloc[-1]
        pe_ttm = float(latest["peTTM"])
        pb = float(latest["pbMRQ"])

        # 获取最新季度 ROE
        roe = 0.0
        for delta_q in range(8):
            year = today.year
            month = today.month
            # 当前最新可能有数据的季度，往前推 delta_q 个季度
            total_q = (year * 4 + (month - 1) // 3) - delta_q
            q_year = total_q // 4
            q = total_q % 4
            if q == 0:
                q = 4
                q_year -= 1

            rs_profit = bs.query_profit_data(code=code, year=q_year, quarter=q)
            df_profit = collect_rs(rs_profit)

            if df_profit.empty:
                continue

            df_profit["roeAvg"] = pd.to_numeric(df_profit["roeAvg"], errors="coerce")
            df_profit = df_profit.dropna(subset=["roeAvg"])

            if not df_profit.empty:
                roe = float(df_profit.iloc[-1]["roeAvg"])
                break

        return {
            "code": code,
            "pe_ttm": pe_ttm,
            "pb": pb,
            "roe": roe,
        }
    finally:
        bs.logout()


def main():
    parser = argparse.ArgumentParser(description="获取 A 股估值指标 JSON")
    parser.add_argument("code", help="A 股代码, 如 sh.600989")
    args = parser.parse_args()

    result = get_stock_metrics(args.code)
    print(json.dumps(result, ensure_ascii=False))


if __name__ == "__main__":
    main()
