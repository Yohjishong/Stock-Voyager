/** A 股红利税常见分档 (用于估算到手现金, 非税务申报依据) */

export type DividendHoldingPeriod = "within_1m" | "between_1m_1y" | "over_1y";

export const HOLDING_PERIOD_LABEL: Record<DividendHoldingPeriod, string> = {
  within_1m: "一个月以内 (税率 20%)",
  between_1m_1y: "一个月至一年 (税率 10%)",
  over_1y: "一年以上 (免税)",
};

export function dividendIncomeTaxRate(period: DividendHoldingPeriod): number {
  switch (period) {
    case "within_1m":
      return 0.2;
    case "between_1m_1y":
      return 0.1;
    case "over_1y":
      return 0;
    default:
      return 0;
  }
}

/** 税前现金分红 = (每十股分红 / 10) × 登记日股数 */
export function grossDividendCash(
  dividendPer10Shares: number,
  registrationShares: number
): number {
  if (dividendPer10Shares <= 0 || registrationShares < 0) return 0;
  return (dividendPer10Shares / 10) * registrationShares;
}

export function netDividendAfterTax(
  gross: number,
  period: DividendHoldingPeriod
): number {
  const r = dividendIncomeTaxRate(period);
  return gross * (1 - r);
}
