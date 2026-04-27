import { invoke } from "@tauri-apps/api/core";
import type { DividendHoldingPeriod } from "../lib/dividendTax";
import { OperationRecord, Stock } from "../types/stock";

export type CreateOperationRecordInput = Omit<
  OperationRecord,
  "id" | "created_at" | "updated_at"
>;

/** 与后端 apply_dividend_ex_rights 一致, 使用 camelCase 供 invoke */
export interface ApplyDividendExRightsPayload {
  stockId: string;
  operationDate: string;
  dividendPer10Shares: number;
  registrationShares: number;
  holdingPeriod: DividendHoldingPeriod;
  /** 不传则按税前 × (1 - 税率) 计算税后到手 */
  cashAmount?: number;
  note?: string;
}

export async function listOperationRecords(
  stockId: string
): Promise<OperationRecord[]> {
  return await invoke<OperationRecord[]>("list_operation_records", {
    stockId,
  });
}

export async function createOperationRecord(
  input: CreateOperationRecordInput
): Promise<OperationRecord> {
  return await invoke<OperationRecord>("create_operation_record", {
    record: input,
  });
}

export async function applyDividendExRights(
  payload: ApplyDividendExRightsPayload
): Promise<Stock> {
  // Rust 命令签名为 apply_dividend_ex_rights(..., input: ApplyDividendExRightsInput), IPC 必须用键名 input 包裹
  return await invoke<Stock>("apply_dividend_ex_rights", {
    input: payload as unknown as Record<string, unknown>,
  });
}

export async function sumDividendCashReceived(): Promise<number> {
  return await invoke<number>("sum_dividend_cash_received");
}

export async function deleteOperationRecord(id: string): Promise<void> {
  return await invoke<void>("delete_operation_record", { id });
}
