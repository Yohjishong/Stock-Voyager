export interface ResearchReport {
  id: string;
  title: string;
  summary: string;
  content: string;          // Markdown 正文
  stock_symbols: string;    // 逗号分隔的股票代码, 如 "600519,000858"
  tags: string;             // 逗号分隔的标签
  created_at: string;
  updated_at: string;
}

export type ReportFormData = Omit<ResearchReport, "id" | "created_at" | "updated_at">;

export const EMPTY_REPORT_FORM: ReportFormData = {
  title: "",
  summary: "",
  content: "",
  stock_symbols: "",
  tags: "",
};
