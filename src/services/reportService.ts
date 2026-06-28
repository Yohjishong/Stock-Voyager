import { invoke } from "@tauri-apps/api/core";
import { ResearchReport, ReportFormData } from "../types/report";

export async function listReports(): Promise<ResearchReport[]> {
  return invoke<ResearchReport[]>("list_research_reports");
}

export async function createReport(data: ReportFormData): Promise<ResearchReport> {
  return invoke<ResearchReport>("create_research_report", { data });
}

export async function updateReport(id: string, data: ReportFormData): Promise<ResearchReport> {
  return invoke<ResearchReport>("update_research_report", { id, data });
}

export async function deleteReport(id: string): Promise<void> {
  return invoke<void>("delete_research_report", { id });
}
