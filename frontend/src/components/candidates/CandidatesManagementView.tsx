import React, { useState, useMemo } from 'react';
import {
  Users, CheckSquare, Square, ShieldCheck, RefreshCw
} from 'lucide-react';
import type { Job, Candidate } from '../../types';
import type { UserProfile } from '../../services/supabase';
import { CandidateTableToolbar } from './CandidateTableToolbar';
import { CandidateTableRow } from './CandidateTableRow';
import { FloatingBulkActionBar } from './FloatingBulkActionBar';
import { BatchEmailInviteModal } from './BatchEmailInviteModal';
import { RejectionEmailModal } from './RejectionEmailModal';
import { candidateApi } from '../../services/api';
import { monthlyReportService } from '../../services/monthlyReportService';

interface CandidatesManagementViewProps {
  jobs: Job[];
  activeJob: Job | null;
  onSelectJob: (job: Job) => void;
  candidates: Candidate[];
  onSelectCandidateToWorkspace: (candidate: Candidate) => void;
  onOpenUploadModal: () => void;
  onRunAiEvaluation?: (candidateId: string) => void;
  evaluatingCandidateId?: string | null;
  currentUser?: UserProfile | null;
  onRefreshCandidates?: () => void;
}

export const CandidatesManagementView: React.FC<CandidatesManagementViewProps> = ({
  jobs,
  activeJob,
  onSelectJob,
  candidates,
  onSelectCandidateToWorkspace,
  onOpenUploadModal,
  onRunAiEvaluation,
  currentUser,
  onRefreshCandidates,
}) => {
  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedJobId, setSelectedJobId] = useState<string>(activeJob?.id || 'ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modals & Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [rejectingCandidate, setRejectingCandidate] = useState<Candidate | null>(null);
  const [showBatchEmailModal, setShowBatchEmailModal] = useState(false);

  // Filter Logic
  const filteredCandidates = useMemo(() => {
    return candidates.filter((c) => {
      // 1. Job Filter
      if (selectedJobId !== 'ALL' && c.job_id !== selectedJobId) {
        return false;
      }

      // 2. Status Filter
      if (statusFilter !== 'ALL') {
        if (statusFilter === 'APPROVED' && c.status !== 'APPROVED') return false;
        if (statusFilter === 'REJECTED' && c.status !== 'REJECTED') return false;
        if (statusFilter === 'PENDING' && c.status !== 'INTERVIEW_SCHEDULED' && c.status !== 'APPROVED_FOR_INTERVIEW' && c.status !== 'EVALUATED') return false;
        if (statusFilter === 'AI_PENDING' && c.status === 'EVALUATED') return false;
      }

      // 3. Search Query
      const query = searchQuery.toLowerCase().trim();
      if (query) {
        const nameMatch = c.masked_name?.toLowerCase().includes(query);
        const fileMatch = c.original_filename?.toLowerCase().includes(query);
        const emailMatch = (c as any).email?.toLowerCase().includes(query);
        if (!nameMatch && !fileMatch && !emailMatch) return false;
      }

      return true;
    });
  }, [candidates, selectedJobId, statusFilter, searchQuery]);

  // Selection Logic
  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleToggleSelectAll = () => {
    if (selectedIds.size === filteredCandidates.length && filteredCandidates.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredCandidates.map((c) => c.id)));
    }
  };

  const isAllSelected = selectedIds.size > 0 && selectedIds.size === filteredCandidates.length;

  // Single candidate actions
  const handleViewDetail = (candidate: Candidate) => {
    // Direct link to 2-column workspace or open detail drawer
    onSelectCandidateToWorkspace(candidate);
  };

  const handleConfirmReject = async (candidate: Candidate) => {
    setRejectingCandidate(candidate);
  };

  // Batch actions
  const handleRunAiBatch = () => {
    if (!onRunAiEvaluation) return;
    Array.from(selectedIds).forEach((id) => {
      onRunAiEvaluation(id);
    });
    alert(`Đang khởi chạy phân tích AI cho ${selectedIds.size} ứng viên đã chọn...`);
    setSelectedIds(new Set());
  };

  const handleExportBatch = async () => {
    try {
      await monthlyReportService.exportMonthlyExcel();
    } catch (err) {
      alert('Không thể xuất file Excel.');
    }
  };

  const handleDeleteBatch = async () => {
    if (!window.confirm(`Bạn có chắc chắn muốn loại ${selectedIds.size} ứng viên đã chọn?`)) {
      return;
    }
    for (const id of selectedIds) {
      try {
        await candidateApi.delete(id);
      } catch (e) {}
    }
    setSelectedIds(new Set());
    if (onRefreshCandidates) onRefreshCandidates();
  };

  // Map job ID to title
  const jobMap = useMemo(() => {
    const map: Record<string, string> = {};
    jobs.forEach((j) => {
      map[j.id] = j.title;
    });
    return map;
  }, [jobs]);

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100 py-6 sm:py-8 px-4 sm:px-6 lg:px-8 space-y-5 max-w-[1600px] mx-auto animate-in fade-in duration-150">
      {/* 1. Page Header (Mockup Style) */}
      <div className="space-y-1">
        <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight uppercase">
          QUẢN LÝ HỒ SƠ ỨNG VIÊN
        </h1>
        <p className="text-xs text-zinc-400">
          Tiếp nhận, phân tích và quản lý ứng viên bằng AI
        </p>
      </div>

      {/* 2. Candidate Toolbar (Search + Filters + Batch Upload Button) */}
      <CandidateTableToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        jobs={jobs}
        selectedJobId={selectedJobId}
        onSelectJobId={(id) => {
          setSelectedJobId(id);
          const found = jobs.find((j) => j.id === id);
          if (found) onSelectJob(found);
        }}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        onOpenUpload={onOpenUploadModal}
      />

      {/* 3. AI Trust UX Disclaimer Banner */}
      <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#0E1117] border border-[#1E2433] text-[11px] text-zinc-400">
        <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0" />
        <span>
          <strong className="text-blue-300">Minh bạch AI:</strong> AI hỗ trợ đánh giá ứng viên dựa trên thông tin trong CV và yêu cầu tuyển dụng. Quyết định tuyển dụng cuối cùng thuộc về HR.
        </span>
      </div>

      {/* 4. Candidate Table Card (Black / Dark Enterprise SaaS) */}
      <div className="bg-[#111111] border border-[#272727] rounded-2xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            {/* Table Header */}
            <thead>
              <tr className="border-b border-[#272727] bg-[#0A0A0A] text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                <th className="py-3.5 pl-4 pr-2 w-10">
                  <button
                    type="button"
                    onClick={handleToggleSelectAll}
                    className="text-zinc-500 hover:text-blue-400 transition-colors cursor-pointer"
                  >
                    {isAllSelected ? (
                      <CheckSquare className="w-4 h-4 text-blue-500" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th className="py-3.5 px-3">ỨNG VIÊN</th>
                <th className="py-3.5 px-3">VỊ TRÍ ỨNG TUYỂN</th>
                <th className="py-3.5 px-3">AI ĐÁNH GIÁ</th>
                <th className="py-3.5 px-3">TRẠNG THÁI</th>
                <th className="py-3.5 px-3 pr-4">HÀNH ĐỘNG</th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-[#1C1C1C]">
              {filteredCandidates.length > 0 ? (
                filteredCandidates.map((candidate) => (
                  <CandidateTableRow
                    key={candidate.id}
                    candidate={candidate}
                    jobTitle={jobMap[candidate.job_id || ''] || activeJob?.title}
                    isSelected={selectedIds.has(candidate.id)}
                    onToggleSelect={handleToggleSelect}
                    onViewDetail={handleViewDetail}
                    onReject={handleConfirmReject}
                  />
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-zinc-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Users className="w-8 h-8 text-zinc-600" />
                      <p className="text-xs font-semibold text-zinc-400">
                        {searchQuery || statusFilter !== 'ALL' || selectedJobId !== 'ALL'
                          ? 'Không tìm thấy ứng viên phù hợp với bộ lọc.'
                          : 'Chưa có ứng viên nào trong hệ thống.'}
                      </p>
                      <button
                        type="button"
                        onClick={onOpenUploadModal}
                        className="mt-2 px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 rounded-xl text-xs font-bold transition-all"
                      >
                        + Tiếp nhận hồ sơ CV ngay
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer Count */}
        <div className="p-3.5 bg-[#0D0D0D] border-t border-[#222222] flex items-center justify-between text-xs text-zinc-400">
          <span>
            Hiển thị <strong className="text-zinc-200">{filteredCandidates.length}</strong> / {candidates.length} hồ sơ ứng viên
          </span>
          {onRefreshCandidates && (
            <button
              type="button"
              onClick={onRefreshCandidates}
              className="text-zinc-400 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 text-blue-400" />
              <span>Làm mới danh sách</span>
            </button>
          )}
        </div>
      </div>

      {/* 5. Floating Bulk Actions Bar */}
      <FloatingBulkActionBar
        selectedCount={selectedIds.size}
        onClearSelection={() => setSelectedIds(new Set())}
        onRunAiBatch={handleRunAiBatch}
        onSendEmailBatch={() => setShowBatchEmailModal(true)}
        onExportBatch={handleExportBatch}
        onDeleteBatch={handleDeleteBatch}
      />

      {/* 6. Batch Email Modal */}
      {showBatchEmailModal && (
        <BatchEmailInviteModal
          candidates={candidates
            .filter((c) => selectedIds.has(c.id))
            .map((c) => ({
              id: c.id,
              masked_name: c.masked_name,
              email: (c as any).email || `${c.masked_name.toLowerCase().replace(/\s+/g, '')}@student.hub.edu.vn`,
              approval_status: c.status as any,
              month: new Date().getMonth() + 1,
              year: new Date().getFullYear(),
              created_at: c.created_at || new Date().toISOString(),
              status: c.status,
              original_filename: c.original_filename,
              overall_score: 80,
              skills_score: 80,
              experience_score: 80,
              education_score: 80,
              phone: '',
            }))}
          onClose={() => setShowBatchEmailModal(false)}
          onSuccess={() => {
            setShowBatchEmailModal(false);
            setSelectedIds(new Set());
            if (onRefreshCandidates) onRefreshCandidates();
          }}
          currentUser={currentUser as any}
        />
      )}

      {/* 7. Rejection Email / Confirmation Modal */}
      {rejectingCandidate && (
        <RejectionEmailModal
          candidate={{
            id: rejectingCandidate.id,
            masked_name: rejectingCandidate.masked_name,
            email: (rejectingCandidate as any).email || `${rejectingCandidate.masked_name.toLowerCase().replace(/\s+/g, '')}@student.hub.edu.vn`,
            approval_status: 'REJECTED',
            month: new Date().getMonth() + 1,
            year: new Date().getFullYear(),
            created_at: rejectingCandidate.created_at || new Date().toISOString(),
            status: 'REJECTED',
            original_filename: rejectingCandidate.original_filename,
            overall_score: 50,
            skills_score: 50,
            experience_score: 50,
            education_score: 50,
            phone: '',
            job_title: activeJob?.title || 'Data Analyst',
          }}
          onClose={() => setRejectingCandidate(null)}
          onSuccess={() => {
            setRejectingCandidate(null);
            if (onRefreshCandidates) onRefreshCandidates();
          }}
          currentUser={currentUser as any}
        />
      )}
    </div>
  );
};
