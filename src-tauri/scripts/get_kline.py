#!/usr/bin/env python
"""
get_kline.py <code> <days> [frequency]
frequency: d (日线, default) | w (周线) | m (月线, 年线用)
拉取指定股票最近 <days> 个周期的 K 线数据 (OHLCV), 前复权.
输出 JSON 数组: [{"date","open","high","low","close","volume"}, ...]
"""

import sys
import json
from datetime import datetime, timedelta
import baostock as bs


def main():
    if len(sys.argv) < 3:
        print(json.dumps({"error": "usage: get_kline.py <code> <days> [frequency]"}))
        sys.exit(1)

    code = sys.argv[1]
    try:
        days = int(sys.argv[2])
    except ValueError:
        days = 250

    frequency = sys.argv[3] if len(sys.argv) >= 4 else "d"
    if frequency not in ("d", "w", "m"):
        frequency = "d"

    end_date = datetime.today().strftime("%Y-%m-%d")

    # 计算开始日期: 多取足够的日历日保证包含足够交易周期
    if frequency == "d":
        cal_days = int(days * 1.6)
    elif frequency == "w":
        cal_days = int(days * 7 * 1.2)
    else:  # monthly
        cal_days = int(days * 31 * 1.2)

    start_date = (datetime.today() - timedelta(days=cal_days)).strftime("%Y-%m-%d")

    lg = bs.login()
    if lg.error_code != "0":
        print(json.dumps({"error": f"baostock login failed: {lg.error_msg}"}))
        sys.exit(1)

    rs = bs.query_history_k_data_plus(
        code,
        fields="date,open,high,low,close,volume",
        start_date=start_date,
        end_date=end_date,
        frequency=frequency,
        adjustflag="2",  # 前复权
    )

    rows = []
    while rs.error_code == "0" and rs.next():
        row = rs.get_row_data()
        try:
            rows.append({
                "date":   row[0],
                "open":   float(row[1]) if row[1] else 0.0,
                "high":   float(row[2]) if row[2] else 0.0,
                "low":    float(row[3]) if row[3] else 0.0,
                "close":  float(row[4]) if row[4] else 0.0,
                "volume": float(row[5]) if row[5] else 0.0,
            })
        except (ValueError, IndexError):
            continue

    bs.logout()

    # 仅取最近 days 条
    rows = rows[-days:]
    print(json.dumps(rows))

if __name__ == "__main__":
    main()
