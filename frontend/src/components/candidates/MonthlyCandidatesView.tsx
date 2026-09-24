import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar, Users, CheckCircle2, XCircle, Clock, Search, Mail, Eye, RefreshCw, Trash2
} from 'lucide-react';
import type { MonthlyCandidate } from '../../types';
import { monthlyReportService } from '../../services/monthlyReportService';
import { candidateApi } from '../../services/api';
import { EmailInviteModal } from './EmailInviteModal';
import { ApprovalWorkflowModal } from './ApprovalWorkflowModal';
import { CandidateDetailDrawer } from './CandidateDetailDrawer';

export const MonthlyCandidatesView: React.FC = () => {
  const [candidates, setCandidates] = useState<MonthlyCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  const [selectedMonth, setSelectedMonth] = useState<number | 'ALL'>(currentMonth);
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [inspectCandidate, setInspectCandidate] = useState<MonthlyCandidate | null>(null);
  const [inviteCandidate, setInviteCandidate] = useState<MonthlyCandidate | null>(null);
  const [rejectCandidate, setRejectCandidate] = useState<MonthlyCandidate | null>(null);

  const loadCandidates = async () => {
    setLoading(true);
    try {
      const monthParam = selectedMonth === 'ALL' ? undefined : selectedMonth;
      const data = await monthlyReportService.fetchMonthlyCandidates(monthParam, selectedYear);
      setCandidates(data);
    } catch (err) {
      console.error('Lỗi khi tải danh sách ứng viên theo tháng:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadCandidates();

    const handleSync = () => {
      const monthParam = selectedMonth === 'ALL' ? undefined : selectedMonth;
      monthlyReportService.fetchMonthlyCandidates(monthParam, selectedYear).then(setCandidates).catch(() => {});
    };

    window.addEventListener('focus', handleSync);
    const interval = setInterval(handleSync, 10000);

    return () => {
      window.removeEventListener('focus', handleSync);
      clearInterval(interval);
    };
  }, [selectedMonth, selectedYear]);

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDeleteCandidate = async (candidate: MonthlyCandidate) => {
    const confirmMsg = `Bạn có chắc chắn muốn xóa vĩnh viễn hồ sơ của ${candidate.masked_name} (${candidate.original_filename}) không?\n\nToàn bộ dữ liệu điểm AI, câu hỏi phỏng vấn và file CV gốc sẽ bị xóa sạch khỏi hệ thống.`;
    if (!window.confirm(confirmMsg)) {
      return;
    }

    try {
      setDeletingId(candidate.id);
      await candidateApi.delete(candidate.id);
      setCandidates((prev) => prev.filter((c) => c.id !== candidate.id));
      if (inspectCandidate?.id === candidate.id) {
        setInspectCandidate(null);
      }
    } catch (err: any) {
      console.error('Lỗi khi xóa ứng viên:', err);
      const detail = err?.response?.data?.detail || 'Không thể xóa hồ sơ ứng viên này.';
      alert(detail);
    } finally {
      setDeletingId(null);
    }
  };

  // Statistics
  const stats = useMemo(() => {
    const total = candidates.length;
    const pending = candidates.filter((c) => c.approval_status === 'PENDING').length;
    const approved = candidates.filter((c) => c.approval_status === 'APPROVED').length;
    const rejected = candidates.filter((c) => c.approval_status === 'REJECTED').length;
    return { total, pending, approved, rejected };
  }, [candidates]);

  // Filtered List
  const filteredCandidates = useMemo(() => {
    return candidates.filter((c) => {
      const matchesStatus =
        statusFilter === 'ALL' || c.approval_status === statusFilter;
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !query ||
        c.masked_name.toLowerCase().includes(query) ||
        (c.job_title && c.job_title.toLowerCase().includes(query)) ||
        c.original_filename.toLowerCase().includes(query) ||
        (c.reviewed_by && c.reviewed_by.toLowerCase().includes(query));
      return matchesStatus && matchesSearch;
    });
  }, [candidates, statusFilter, searchQuery]);

  const handleUpdateSuccess = (updated: MonthlyCandidate) => {
    setCandidates((prev) =>
      prev.map((c) => (c.id === updated.id ? updated : c))
    );
    if (inspectCandidate?.id === updated.id) {
      setInspectCandidate(updated);
    }
    setInviteCandidate(null);
    setRejectCandidate(null);
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-7 space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900/90 to-blue-950/40 p-4 sm:p-6 rounded-3xl border border-slate-800 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 mb-2">
            <Calendar className="w-3.5 h-3.5" />
            <span>Kho Hồ sơ & Tổng hợp Nhân sự theo Tháng</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Bản Tổng hợp Nhân sự Theo Tháng
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
            Lưu trữ ứng viên độc lập (kể cả khi xóa thẻ JD), theo dõi người đã kiểm tra, phê duyệt và gửi email mời phỏng vấn tự động.
          </p>
        </div>

        <button
          onClick={loadCandidates}
          disabled={loading}
          className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${loading ? 'animate-spin' : ''}`} />
          <span>Làm mới dữ liệu</span>
        </button>
      </div>

      {/* Filter and Month Selector Bar */}
      <div className="bg-slate-900/90 p-4 rounded-3xl border border-slate-800 shadow-lg space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Month & Year Selectors */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-400 font-semibold flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-cyan-400" /> Chọn Tháng:
            </span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white font-semibold focus:outline-none focus:border-cyan-500 cursor-pointer"
            >
              <option value="ALL">Tất cả các tháng</option>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  Tháng {m}
                </option>
              ))}
            </select>

            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white font-semibold focus:outline-none focus:border-cyan-500 cursor-pointer"
            >
              <option value={2026}>Năm 2026</option>
              <option value={2025}>Năm 2025</option>
            </select>
          </div>

          {/* Search box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm ứng viên, file, vị trí..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-800/80">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              statusFilter === 'ALL'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            Tất cả ({stats.total})
          </button>
          <button
            onClick={() => setStatusFilter('PENDING')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              statusFilter === 'PENDING'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-500/20'
                : 'text-amber-400/80 hover:text-amber-300 hover:bg-amber-500/10'
            }`}
          >
            <Clock className="w-3 h-3" />
            Chờ HR duyệt ({stats.pending})
          </button>
          <button
            onClick={() => setStatusFilter('APPROVED')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              statusFilter === 'APPROVED'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
                : 'text-emerald-400/80 hover:text-emerald-300 hover:bg-emerald-500/10'
            }`}
          >
            <CheckCircle2 className="w-3 h-3" />
            Đã duyệt phỏng vấn ({stats.approved})
          </button>
          <button
            onClick={() => setStatusFilter('REJECTED')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              statusFilter === 'REJECTED'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-500/20'
                : 'text-rose-400/80 hover:text-rose-300 hover:bg-rose-500/10'
            }`}
          >
            <XCircle className="w-3 h-3" />
            Đã bị loại ({stats.rejected})
          </button>
        </div>
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-3xl bg-slate-900 border border-slate-800 shadow-md">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Tổng ứng viên {selectedMonth !== 'ALL' ? `Tháng ${selectedMonth}` : 'cả năm'}</span>
            <Users className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-black text-white">{stats.total}</div>
          <div className="text-[10px] text-slate-500 mt-1">Được lưu an toàn trong kho</div>
        </div>

        <div className="p-4 rounded-3xl bg-slate-900 border border-amber-900/40 shadow-md">
          <div className="flex items-center justify-between text-amber-300 text-xs mb-1">
            <span>Chờ HR phê duyệt</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400">{stats.pending}</div>
          <div className="text-[10px] text-slate-500 mt-1">Cần đánh giá & gửi lịch</div>
        </div>

        <div className="p-4 rounded-3xl bg-slate-900 border border-emerald-900/40 shadow-md">
          <div className="flex items-center justify-between text-emerald-300 text-xs mb-1">
            <span>Đã duyệt & Mời PV</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400">{stats.approved}</div>
          <div className="text-[10px] text-slate-500 mt-1">Đã tự động gửi email</div>
        </div>

        <div className="p-4 rounded-3xl bg-slate-900 border border-rose-900/40 shadow-md">
          <div className="flex items-center justify-between text-rose-300 text-xs mb-1">
            <span>Đã bị loại</span>
            <XCircle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-black text-rose-400">{stats.rejected}</div>
          <div className="text-[10px] text-slate-500 mt-1">Có lưu vết lý do loại</div>
        </div>
      </div>

      {/* Candidates List / Cards */}
      <div className="space-y-3">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs flex flex-col items-center justify-center space-y-2">
            <RefreshCw className="w-6 h-6 animate-spin text-cyan-400" />
            <span>Đang tổng hợp dữ liệu ứng viên theo tháng...</span>
          </div>
        ) : filteredCandidates.length === 0 ? (
          <div className="p-12 rounded-3xl bg-slate-900/60 border border-slate-800 text-center text-slate-400 text-xs">
            Không tìm thấy ứng viên nào phù hợp với bộ lọc trong tháng {selectedMonth} năm {selectedYear}.
          </div>
        ) : (
          filteredCandidates.map((candidate) => (
            <div
              key={candidate.id}
              className="p-4 sm:p-5 rounded-3xl bg-slate-900/90 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm"
            >
              {/* Left Candidate Info */}
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-blue-600/30 to-cyan-500/20 border border-blue-500/30 flex items-center justify-center text-blue-300 font-bold text-base shrink-0">
                  {candidate.masked_name.charAt(0)}
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-bold text-white text-sm">{candidate.masked_name}</h3>
                    {candidate.approval_status === 'APPROVED' && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Đã duyệt PV
                      </span>
                    )}
                    {candidate.approval_status === 'REJECTED' && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center gap-1">
                        <XCircle className="w-3 h-3" /> Đã loại
                      </span>
                    )}
                    {candidate.approval_status === 'PENDING' && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Chờ HR duyệt
                      </span>
                    )}
                    <span className="text-[10px] text-slate-500 font-medium">
                      Tháng {candidate.month}/{candidate.year}
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 mt-0.5">
                    Vị trí: <strong className="text-slate-300">{candidate.job_title}</strong> • File: <span className="text-slate-400">{candidate.original_filename}</span>
                  </p>

                  <div className="flex flex-wrap items-center gap-3 mt-1.5 text-[11px] text-slate-400">
                    <span>
                      Người/AI kiểm tra: <strong className="text-cyan-300">{candidate.reviewed_by || 'AI & HR'}</strong>
                    </span>
                    <span>•</span>
                    <span>
                      Điểm AI: <strong className="text-blue-300">{Math.round(candidate.overall_score || 0)}/100</strong>
                    </span>
                    {candidate.interview_time && (
                      <>
                        <span>•</span>
                        <span className="text-emerald-400 font-medium">
                          Lịch PV: {candidate.interview_time} ({candidate.interview_type === 'ONLINE' ? 'Online' : 'Trực tiếp'})
                        </span>
                      </>
                    )}
                  </div>

                  {/* Show Rejection Reason if Rejected */}
                  {candidate.approval_status === 'REJECTED' && candidate.rejection_reason && (
                    <div className="mt-2 text-[11px] text-rose-300 bg-rose-950/30 px-2.5 py-1.5 rounded-xl border border-rose-900/40">
                      <strong>Lý do loại:</strong> {candidate.rejection_reason}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Action Buttons */}
              <div className="flex items-center gap-2 w-full md:w-auto justify-end border-t md:border-t-0 pt-3 md:pt-0 border-slate-800">
                <button
                  type="button"
                  onClick={() => setInspectCandidate(candidate)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all"
                  title="Xem chi tiết CV & Thẩm định"
                >
                  <Eye className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Xem CV</span>
                </button>

                <button
                  type="button"
                  disabled={deletingId === candidate.id}
                  onClick={() => handleDeleteCandidate(candidate)}
                  className="p-2 bg-slate-800/80 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-700/60 hover:border-rose-500/30 rounded-xl transition-all disabled:opacity-50"
                  title="Xóa vĩnh viễn hồ sơ ứng viên này"
                >
                  {deletingId === candidate.id ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-rose-400" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5" />
                  )}
                </button>

                {candidate.approval_status !== 'REJECTED' && (
                  <button
                    type="button"
                    onClick={() => setRejectCandidate(candidate)}
                    className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all"
                    title="Loại ứng viên & ghi nhận lý do"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Loại</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setInviteCandidate(candidate)}
                  className="px-3.5 py-1.5 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 flex items-center gap-1.5 transition-all"
                  title="Phê duyệt và tự động gửi email phỏng vấn"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>{candidate.approval_status === 'APPROVED' ? 'Gửi lại Lịch PV' : 'Duyệt & Mời PV'}</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Inspect Candidate Drawer */}
      {inspectCandidate && (
        <CandidateDetailDrawer
          candidate={inspectCandidate}
          onClose={() => setInspectCandidate(null)}
          onApprove={(c) => {
            setInspectCandidate(null);
            setInviteCandidate(c);
          }}
          onReject={(c) => {
            setInspectCandidate(null);
            setRejectCandidate(c);
          }}
        />
      )}

      {/* Email Invite Modal */}
      {inviteCandidate && (
        <EmailInviteModal
          candidate={inviteCandidate}
          onClose={() => setInviteCandidate(null)}
          onSuccess={handleUpdateSuccess}
        />
      )}

      {/* Reject Modal */}
      {rejectCandidate && (
        <ApprovalWorkflowModal
          candidate={rejectCandidate}
          onClose={() => setRejectCandidate(null)}
          onSuccess={handleUpdateSuccess}
        />
      )}
    </div>
  );
};
