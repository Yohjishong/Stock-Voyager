import { X, Download, Upload } from "lucide-react";

interface Props {
  onClose: () => void;
  onExportCsv: () => Promise<void>;
  onExportJson: () => Promise<void>;
  onBackupDb: () => Promise<void>;
  onImportJson: () => Promise<void>;
  onImportCsv: () => Promise<void>;
  onRestoreDb: () => Promise<void>;
  loading?: boolean;
}

interface IEBtnProps {
  icon: React.ReactNode;
  title: string;
  desc: string;
  onClick: () => void;
  disabled?: boolean;
}

function IEBtn({ icon, title, desc, onClick, disabled }: IEBtnProps) {
  return (
    <button className="ie-btn" onClick={onClick} disabled={disabled}>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {icon}
        <span className="ie-btn-title">{title}</span>
      </div>
      <span className="ie-btn-desc">{desc}</span>
    </button>
  );
}

export default function ImportExportPanel({
  onClose,
  onExportCsv,
  onExportJson,
  onBackupDb,
  onImportJson,
  onImportCsv,
  onRestoreDb,
  loading,
}: Props) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">导入/导出</span>
          <button className="modal-close" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="modal-body">
          <div className="ie-grid">
            <div className="ie-section-title">
              <Download size={14} style={{ display: "inline", marginRight: 5 }} />
              导出数据
            </div>
            <IEBtn
              icon={<Download size={14} />}
              title="导出为 CSV"
              desc="将股票列表导出为 Excel 可打开的 CSV 文件"
              onClick={onExportCsv}
              disabled={loading}
            />
            <IEBtn
              icon={<Download size={14} />}
              title="导出为 JSON"
              desc="将股票列表导出为 JSON 格式, 可用于数据迁移"
              onClick={onExportJson}
              disabled={loading}
            />
            <IEBtn
              icon={<Download size={14} />}
              title="备份数据库"
              desc="备份完整的 SQLite 数据库文件"
              onClick={onBackupDb}
              disabled={loading}
            />

            <div className="ie-section-title" style={{ marginTop: 6 }}>
              <Upload size={14} style={{ display: "inline", marginRight: 5 }} />
              导入数据
              <span
                style={{
                  marginLeft: 8,
                  fontSize: 11,
                  color: "#ef4444",
                  fontWeight: 400,
                }}
              >
                导入为追加操作, 恢复数据库将替换所有数据
              </span>
            </div>
            <IEBtn
              icon={<Upload size={14} />}
              title="从 JSON 导入"
              desc="从之前导出的 JSON 文件追加导入股票"
              onClick={onImportJson}
              disabled={loading}
            />
            <IEBtn
              icon={<Upload size={14} />}
              title="从 CSV 导入"
              desc="从 CSV 文件追加导入股票数据"
              onClick={onImportCsv}
              disabled={loading}
            />
            <IEBtn
              icon={<Upload size={14} />}
              title="从备份恢复"
              desc="从 SQLite 备份文件恢复, 将替换当前所有数据"
              onClick={onRestoreDb}
              disabled={loading}
            />
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}
