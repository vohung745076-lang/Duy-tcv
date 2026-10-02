import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  History,
  Sparkles,
  BarChart3,
  Award,
} from 'lucide-react';
import { analyticsApi } from '../services/api';
import type { CandidateRanking, AuditLog, Job, GoogleSyncResult } from '../types';
import { monthlyReportService } from '../services/monthlyReportService';
import { DashboardHeader } from './dashboard/DashboardHeader';
import { CandidateIngestionBar } from './dashboard/CandidateIngestionBar';
import { DashboardMetricsCards } from './dashboard/DashboardMetricsCards';
import { LiveScanProgressFeed, type ScanProgressItem } from './dashboard/LiveScanProgressFeed';
import { RankingToolbar } from './dashboard/RankingToolbar';
import { CandidateRankingTable } from './dashboard/CandidateRankingTable';

interface DashboardViewProps {
  activeJob: Job;
  onSelectCandidateToWorkspace: (candidateId: string) => void;
  showAuditOnly?: boolean;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  activeJob,
  onSelectCandidateToWorkspace,
  showAuditOnly = false,
}) => {
  const [rankings, setRankings] = useState<CandidateRanking[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [liveScanItems, setLiveScanItems] = useState<ScanProgressItem[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      if (showAuditOnly) {
        const logs = await analyticsApi.getAuditLogs();
        setAuditLogs(logs);
      } else {
        const [res, logs] = await Promise.all([
          analyticsApi.getRanking(activeJob.id),
          analyticsApi.getAuditLogs().catch(() => [] as AuditLog[]),
        ]);
        setRankings(res.rankings);

        // Nạp các tiến trình đồng bộ thật từ AuditLog nếu có
        const syncLogs = logs
          .filter((l) => l.action === 'SYNC_GOOGLE_SHEET')
          .slice(0, 4)
          .map((l, index) => {
            const timeStr = l.created_at ? new Date(l.created_at).toTimeString().split(' ')[0] : 'Gần đây';
            return {
              id: l.id || `sync-log-${index}`,
              sourceUrl: 'Google Sheets / Form CV',
              timestamp: timeStr,
              status: 'SUCCESS' as const,
              badgeText: l.details || 'Đồng bộ Google Sheet thành công',
            };
          });

        if (syncLogs.length > 0) {
          setLiveScanItems((prev) => (prev.length === 0 ? syncLogs : prev));
        }
      }
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
    } finally {
      setLoading(false);
    }
  }, [activeJob.id, showAuditOnly]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  // Metrics KPI calculations
  const totalCount = rankings.length;
  const passedCount = rankings.filter((r) => r.final_score >= 70).length;
  const rejectedCount = rankings.filter((r) => r.final_score < 60).length;
  const processingCount = rankings.filter((r) => r.final_score >= 60 && r.final_score < 70).length;
  const passRate = totalCount > 0 ? Math.round((passedCount / totalCount) * 100) : 0;
  const highMatchCount = rankings.filter((r) => r.final_score >= 80).length;

  // Filtered rankings
  const filteredRankings = useMemo(() => {
    return rankings.filter((r) => {
      const matchSearch =
        r.masked_name.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        r.original_filename.toLowerCase().includes(searchKeyword.toLowerCase());

      if (!matchSearch) return false;

      if (statusFilter === 'passed') return r.final_score >= 70;
      if (statusFilter === 'rejected') return r.final_score < 60;
      if (statusFilter === 'review') return r.final_score >= 60 && r.final_score < 70;
      return true;
    });
  }, [rankings, searchKeyword, statusFilter]);

  const handleSyncCompleted = (result: GoogleSyncResult) => {
    // Thêm tiến trình quét vào feed
    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0];
    const newItem: ScanProgressItem = {
      id: `scan-${Date.now()}`,
      sourceUrl: result.sheet_title || 'Google Sheet / Form CV',
      timestamp: timeStr,
      status: result.success ? 'SUCCESS' : 'ERROR',
      badgeText: result.success
        ? `Thành công (+${result.newly_imported} Hồ Sơ Mới)`
        : 'Lỗi đồng bộ nguồn',
    };
    setLiveScanItems((prev) => [newItem, ...prev.slice(0, 3)]);

    // Làm mới danh sách ứng viên
    void fetchData();
  };

  const handleApproveCandidate = async (candidateId: string) => {
    try {
      await monthlyReportService.updateApprovalStatus(candidateId, 'APPROVED');
      void fetchData();
    } catch (e) {
      console.error('Lỗi khi duyệt ứng viên:', e);
    }
  };

  if (loading) {
    return (
      <div className="p-16 text-center text-xs text-slate-300 flex flex-col items-center justify-center gap-3">
        <Sparkles className="w-8 h-8 text-[#60A5FA] animate-spin" />
        <span className="font-medium text-white">Đang tải số liệu Bảng Điều Khiển Tuyển Dụng AI...</span>
      </div>
    );
  }

  // AUDIT LOGS VIEW (Giữ nguyên khi showAuditOnly === true)
  if (showAuditOnly) {
    return (
      <div className="p-4 sm:p-6 space-y-5 w-full max-w-full overflow-x-hidden">
        <div className="bg-[#161922] border border-[#242834] rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-2xl relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 sm:mb-6">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <History className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400" />
                <span>Nhật ký Hoạt động & Kiểm toán (Audit Trail Log)</span>
              </h2>
              <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                Ghi vết bất biến toàn bộ hành động chấm điểm AI và các can thiệp ghi đè (Override) từ HR để đảm bảo tính minh bạch và trách nhiệm giải trình.
              </p>
            </div>
            <span className="px-3 py-1 bg-purple-500/10 text-purple-300 border border-purple-500/20 text-xs font-semibold rounded-full self-start sm:self-auto">
              {auditLogs.length} sự kiện kiểm toán
            </span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-[#242834]">
            <table className="w-full min-w-[640px] text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#242834] text-slate-300 font-semibold bg-[#141720]">
                  <th className="p-3">Thời gian</th>
                  <th className="p-3">Tác tử (Actor)</th>
                  <th className="p-3">Hành động</th>
                  <th className="p-3">Điểm cũ → Điểm mới</th>
                  <th className="p-3">Lý do giải trình (Justification)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#242834]/80">
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400">
                      Chưa có bản ghi nhật ký audit nào.
                    </td>
                  </tr>
                ) : (
                  auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-[#1A1E29] text-slate-200 transition-colors">
                      <td className="p-3 font-mono text-[11px] text-slate-300 whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString('vi-VN')}
                      </td>
                      <td className="p-3 font-semibold text-cyan-300 whitespace-nowrap">
                        {log.user_id || 'HR_RECRUITER'}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            log.action === 'HR_SCORE_OVERRIDE'
                              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                              : 'bg-[#1E293B] text-[#60A5FA] border border-[#60A5FA]/30'
                          }`}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td className="p-3 font-mono whitespace-nowrap text-white">
                        {log.old_value?.score ?? 'N/A'}% →{' '}
                        <strong className="text-purple-300">{log.new_value?.score ?? 'N/A'}%</strong>
                      </td>
                      <td className="p-3 text-slate-200 max-w-sm">{log.justification || 'N/A'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // MAIN DASHBOARD VIEW (Dark SaaS Enterprise, Crisp White Font, Clean Architecture)
  return (
    <div className="p-3.5 sm:p-6 space-y-4 sm:space-y-6 w-full max-w-full overflow-x-hidden">
      {/* 1. Header */}
      <DashboardHeader jobTitle={activeJob?.title} />

      {/* 2. Ingestion Bar: Tiếp nhận hồ sơ ứng viên + Ai quét CV */}
      <CandidateIngestionBar
        jobId={activeJob.id}
        onSyncCompleted={handleSyncCompleted}
      />

      {/* 3. 4 KPI Metrics Cards */}
      <DashboardMetricsCards
        totalCount={totalCount}
        processingCount={processingCount}
        passedCount={passedCount}
        rejectedCount={rejectedCount}
      />

      {/* 4. Tiến Trình Quét AI Live */}
      <LiveScanProgressFeed items={liveScanItems} />

      {/* 5. Bộ lọc & Bảng Xếp Hạng Ứng Viên */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
              <Award className="w-4 h-4 text-[#60A5FA]" />
              <span>Bảng Xếp Hạng Ứng Viên Tuyển Dụng</span>
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Tự động phân loại dựa trên điểm tương thích AI & Quyết định thẩm định của HR
            </p>
          </div>
        </div>

        <RankingToolbar
          searchKeyword={searchKeyword}
          onSearchChange={setSearchKeyword}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
        />

        <CandidateRankingTable
          rankings={filteredRankings}
          onSelectCandidateToWorkspace={onSelectCandidateToWorkspace}
          onApproveCandidate={handleApproveCandidate}
          jobTitle={activeJob?.title}
        />
      </div>

      {/* 6. Recruitment Funnel (Phễu Tuyển dụng Tự động) */}
      <div className="bg-[#161922] border border-[#242834] rounded-2xl p-4 sm:p-5 shadow-xl space-y-3">
        <h3 className="font-bold text-white text-xs sm:text-sm flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-[#60A5FA]" />
          <span>Phễu Tuyển Dụng Tự Động (Recruitment Funnel)</span>
        </h3>

        <div className="space-y-2.5 pt-1">
          <div>
            <div className="flex justify-between text-xs text-slate-200 mb-1">
              <span>1. Tiếp nhận hồ sơ qua PDF / Google Forms</span>
              <strong className="text-white">{totalCount} (100%)</strong>
            </div>
            <div className="w-full h-2.5 bg-[#141720] rounded-full overflow-hidden border border-[#242834]">
              <div className="h-full bg-[#60A5FA] rounded-full transition-all duration-700" style={{ width: '100%' }} />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs text-slate-200 mb-1">
              <span>2. AI thẩm định & trích xuất bằng chứng</span>
              <strong className="text-white">{totalCount} (100%)</strong>
            </div>
            <div className="w-full h-2.5 bg-[#141720] rounded-full overflow-hidden border border-[#242834]">
              <div className="h-full bg-cyan-400 rounded-full transition-all duration-700" style={{ width: '100%' }} />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs text-slate-200 mb-1">
              <span>3. Ứng viên đạt tiêu chuẩn (≥ 70%)</span>
              <strong className="text-[#34D399]">{passedCount} ({passRate}%)</strong>
            </div>
            <div className="w-full h-2.5 bg-[#141720] rounded-full overflow-hidden border border-[#242834]">
              <div className="h-full bg-[#34D399] rounded-full transition-all duration-700" style={{ width: `${passRate}%` }} />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs text-slate-200 mb-1">
              <span>4. Đề xuất phỏng vấn Top Tier (≥ 80%)</span>
              <strong className="text-purple-300">
                {highMatchCount} ({totalCount > 0 ? Math.round((highMatchCount / totalCount) * 100) : 0}%)
              </strong>
            </div>
            <div className="w-full h-2.5 bg-[#141720] rounded-full overflow-hidden border border-[#242834]">
              <div
                className="h-full bg-purple-500 rounded-full transition-all duration-700"
                style={{ width: `${totalCount > 0 ? (highMatchCount / totalCount) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
