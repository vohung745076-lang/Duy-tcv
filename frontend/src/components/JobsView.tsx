import React, { useState } from 'react';
import { Briefcase, Users, ArrowRight, Play, FileText, Clock, Share2, Sparkles, Plus, Eye } from 'lucide-react';
import type { Job, Candidate } from '../types';
import { JobDetailModal } from './jobs/JobDetailModal';
import { EnterpriseJDModal } from './jobs/EnterpriseJDModal';

interface JobsViewProps {
  jobs: Job[];
  activeJob: Job | null;
  onSelectJob: (job: Job) => void;
  onOpenCreateJob: () => void;
  onOpenExportJob: (job: Job) => void;
  candidates: Candidate[];
  onSelectCandidateToWorkspace: (candidate: Candidate) => void;
  onRunAiEvaluation: (candidateId: string) => void;
  evaluatingCandidateId: string | null;
}

export const JobsView: React.FC<JobsViewProps> = ({
  jobs,
  activeJob,
  onSelectJob,
  onOpenCreateJob,
  onOpenExportJob,
  candidates,
  onSelectCandidateToWorkspace,
  onRunAiEvaluation,
  evaluatingCandidateId,
}) => {
  const [detailJob, setDetailJob] = useState<Job | null>(null);
  const [enterpriseJdJob, setEnterpriseJdJob] = useState<Job | null>(null);

  return (
    <div className="p-3.5 sm:p-6 space-y-4 sm:space-y-6 w-full max-w-full overflow-x-hidden">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-slate-700/80 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative overflow-hidden">
        <div className="absolute -top-16 -right-16 w-48 h-48 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[11px] sm:text-xs font-bold rounded-full flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> AI Job & JD Engine
            </span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
            <Briefcase className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400" /> Quản lý Vị trí Tuyển dụng & Tiêu chuẩn AI
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            Tạo JD chuẩn hóa, phân bổ trọng số tiêu chí (Kỹ năng, Kinh nghiệm, Học vấn) và xuất tin đăng trực tiếp sang TopCV, LinkedIn, Facebook.
          </p>
        </div>
        <div className="flex items-center gap-3 relative z-10 shrink-0 w-full sm:w-auto">
          <button
            onClick={onOpenCreateJob}
            className="w-full sm:w-auto px-4 sm:px-5 py-2 sm:py-2.5 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Tạo Vị trí Tuyển dụng Mới</span>
          </button>
        </div>
      </div>

      {/* Jobs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-5">
        {jobs.length === 0 ? (
          <div className="col-span-full bg-slate-900/60 border border-dashed border-slate-800 rounded-2xl sm:rounded-3xl p-10 sm:p-16 text-center text-slate-400 text-xs space-y-3">
            <Briefcase className="w-10 h-10 sm:w-12 sm:h-12 text-slate-600 mx-auto" />
            <p>Chưa có vị trí tuyển dụng nào. Hãy nhấn nút "+ Tạo Vị trí Tuyển dụng Mới" để bắt đầu!</p>
          </div>
        ) : (
          jobs.map((job) => {
            const isSelected = activeJob?.id === job.id;
            return (
              <div
                key={job.id}
                onClick={() => onSelectJob(job)}
                className={`cursor-pointer rounded-2xl sm:rounded-3xl p-4 sm:p-5 border transition-all duration-300 relative overflow-hidden group hover:scale-[1.01] ${
                  isSelected
                    ? 'bg-slate-900 border-blue-500 ring-2 ring-blue-500/30 shadow-2xl shadow-blue-500/10'
                    : 'bg-slate-900/80 hover:bg-slate-900 border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Top Corner Actions */}
                <div className="absolute top-3 right-3 sm:top-4 sm:right-4 flex items-center gap-1.5 z-10">
                  {isSelected && (
                    <span className="hidden xs:inline-block px-2 py-0.5 bg-blue-500/20 text-blue-400 border border-blue-500/30 text-[10px] font-bold rounded-full">
                      Đang chọn
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEnterpriseJdJob(job);
                    }}
                    className="px-2 py-0.5 sm:px-2.5 sm:py-1 bg-gradient-to-r from-indigo-600/30 to-blue-600/30 hover:from-indigo-600/50 hover:to-blue-600/50 text-indigo-200 border border-indigo-500/40 rounded-lg text-[10px] sm:text-[11px] font-semibold flex items-center gap-1 transition-all hover:scale-105 shadow-sm"
                    title="Xem, Thêm/Sửa và In/Xuất Bản JD Doanh nghiệp chuẩn A4"
                  >
                    <FileText className="w-3 h-3 text-indigo-300" />
                    <span>Bản JD (In/Xuất PDF)</span>
                  </button>
                </div>

                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-blue-600/30 to-cyan-500/20 border border-blue-500/30 flex items-center justify-center text-blue-300 font-bold text-base shrink-0">
                    {job.title.charAt(0)}
                  </div>
                  <div className="truncate pr-36 sm:pr-44">
                    <h3 className="font-bold text-white text-sm truncate">{job.title}</h3>
                    <span className="text-[11px] text-slate-400">{job.department || 'Tuyển dụng'}</span>
                  </div>
                </div>

                {/* Criteria Details */}
                <div className="space-y-2 mb-3 text-xs">
                  <div className="flex items-center justify-between text-slate-400 bg-slate-950/60 p-2 sm:p-2.5 rounded-xl border border-slate-800 text-[11px] sm:text-xs">
                    <span>Kinh nghiệm: <strong className="text-slate-200">{job.criteria.min_years_experience}+ năm</strong></span>
                    <span>Học vấn: <strong className="text-slate-200 truncate max-w-[100px] sm:max-w-[120px]">{job.criteria.education_level}</strong></span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {job.criteria.required_skills.slice(0, 4).map((skill) => (
                      <span key={skill} className="px-2 py-0.5 bg-slate-950 text-slate-300 rounded-lg text-[10px] border border-slate-800">
                        {skill}
                      </span>
                    ))}
                    {job.criteria.required_skills.length > 4 && (
                      <span className="px-1.5 py-0.5 bg-slate-950 text-slate-500 rounded-lg text-[10px]">
                        +{job.criteria.required_skills.length - 4}
                      </span>
                    )}
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                  <span className="text-slate-400 flex items-center gap-1 text-[11px]">
                    <Clock className="w-3.5 h-3.5 text-slate-500" /> {new Date(job.created_at).toLocaleDateString('vi-VN')}
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenExportJob(job);
                      }}
                      className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-all"
                      title="Xuất tin tuyển dụng sang TopCV/LinkedIn/Facebook"
                    >
                      <Share2 className="w-3 h-3" /> Xuất tin
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectJob(job);
                        setDetailJob(job);
                      }}
                      className="px-2.5 py-1 bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 border border-blue-500/30 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-all hover:scale-105"
                      title="Mở cửa sổ xem chi tiết thông tin công việc"
                    >
                      <Eye className="w-3 h-3" /> Chi tiết
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Selected Job Candidates Section */}
      {activeJob && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 space-y-4 shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3 sm:pb-4">
            <div>
              <h3 className="font-bold text-white text-sm sm:text-base flex items-center gap-2">
                <Users className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400" /> Danh sách Hồ sơ CV Ứng viên ({candidates.length})
              </h3>
              <p className="text-xs text-slate-400">
                Cho vị trí tuyển dụng: <span className="text-blue-400 font-semibold">{activeJob.title}</span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setDetailJob(activeJob)}
                className="px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all"
              >
                <Eye className="w-3.5 h-3.5" /> Xem chi tiết JD này
              </button>
              <button
                onClick={() => onOpenExportJob(activeJob)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all"
              >
                <Share2 className="w-3.5 h-3.5" /> Xuất tin tuyển dụng
              </button>
            </div>
          </div>

          {candidates.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-400 space-y-2">
              <p>Chưa có ứng viên nào cho vị trí này.</p>
              <p>Nhấn nút <strong className="text-cyan-400 font-semibold">"Nạp CV"</strong> ở thanh trên để upload PDF hoặc đồng bộ từ Google Sheets!</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-800/80">
              {candidates.map((cand) => (
                <div
                  key={cand.id}
                  className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-800/40 px-2 sm:px-3 rounded-2xl transition-all"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="w-8 h-8 sm:w-9 sm:h-9 text-blue-400/80 bg-blue-500/10 p-1.5 sm:p-2 rounded-xl border border-blue-500/20 shrink-0" />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-bold text-white text-xs">{cand.masked_name}</span>
                        <span className="text-[10px] text-slate-400 font-mono truncate max-w-[140px] sm:max-w-[220px]">
                          ({cand.original_filename})
                        </span>
                      </div>
                      <span
                        className={`text-[9px] sm:text-[10px] font-semibold px-2 py-0.5 rounded-full inline-block mt-1 ${
                          cand.status === 'SHORTLISTED'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : cand.status === 'EVALUATED'
                            ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                            : 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                        }`}
                      >
                        {cand.status === 'SHORTLISTED'
                          ? 'Đã duyệt vào vòng trong'
                          : cand.status === 'EVALUATED'
                          ? 'Đã AI thẩm định'
                          : 'Chưa thẩm định'}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 self-end sm:self-auto">
                    <button
                      onClick={() => onRunAiEvaluation(cand.id)}
                      disabled={evaluatingCandidateId === cand.id}
                      className="px-2.5 sm:px-3.5 py-1.5 sm:py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-medium border border-slate-700 flex items-center gap-1.5 transition-all"
                    >
                      {evaluatingCandidateId === cand.id ? (
                        <>Đang chạy AI...</>
                      ) : (
                        <>
                          <Play className="w-3 h-3 text-blue-400" />
                          <span>Chạy lại AI</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => onSelectCandidateToWorkspace(cand)}
                      className="px-3 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 flex items-center gap-1 transition-all"
                    >
                      <span>Mở đối soát</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* JOB DETAIL MODAL */}
      <JobDetailModal
        isOpen={!!detailJob}
        onClose={() => setDetailJob(null)}
        job={detailJob}
        onOpenExportJob={onOpenExportJob}
        onOpenEnterpriseJD={(j) => setEnterpriseJdJob(j)}
      />

      {/* ENTERPRISE JD MODAL (IN / XUẤT PDF & CHỈNH SỬA ĐỘC LẬP) */}
      <EnterpriseJDModal
        isOpen={!!enterpriseJdJob}
        onClose={() => setEnterpriseJdJob(null)}
        job={enterpriseJdJob}
      />
    </div>
  );
};

