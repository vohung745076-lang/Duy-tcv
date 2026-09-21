import React, { useState, useEffect } from 'react';
import {
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle,
  Award,
  HelpCircle,
  Edit3,
  ShieldCheck,
  Zap,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Lock,
} from 'lucide-react';
import { candidateApi, evaluationApi } from '../services/api';
import type { Candidate, Evaluation, Job } from '../types';

interface SplitViewWorkspaceProps {
  candidate: Candidate;
  activeJob: Job;
  candidates: Candidate[];
  onSelectCandidate: (candidate: Candidate) => void;
  onEvaluationUpdated: () => void;
}

export const SplitViewWorkspace: React.FC<SplitViewWorkspaceProps> = ({
  candidate,
  activeJob,
  candidates,
  onSelectCandidate,
  onEvaluationUpdated,
}) => {
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [loading, setLoading] = useState(true);
  const [overrideModalOpen, setOverrideModalOpen] = useState(false);
  const [overrideScore, setOverrideScore] = useState<number>(85);
  const [overrideReason, setOverrideReason] = useState<string>('');
  const [isSubmittingOverride, setIsSubmittingOverride] = useState(false);
  const [activeTab, setActiveTab] = useState<'evidence' | 'interview' | 'raw_text'>('evidence');

  const pdfUrl = candidateApi.getPdfUrl(candidate.id);

  useEffect(() => {
    fetchEvaluation();
  }, [candidate.id]);

  const fetchEvaluation = async () => {
    setLoading(true);
    try {
      const data = await evaluationApi.getByCandidate(candidate.id);
      setEvaluation(data);
      setOverrideScore(data.hr_override_score ?? data.overall_score);
    } catch (err) {
      console.error('Failed to load evaluation:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenOverride = () => {
    if (evaluation) {
      setOverrideScore(evaluation.hr_override_score ?? evaluation.overall_score);
      setOverrideReason(evaluation.hr_override_reason || '');
      setOverrideModalOpen(true);
    }
  };

  const handleSaveOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!evaluation || !overrideReason.trim()) return;

    setIsSubmittingOverride(true);
    try {
      const updated = await evaluationApi.override(evaluation.id, overrideScore, overrideReason);
      setEvaluation(updated);
      setOverrideModalOpen(false);
      onEvaluationUpdated();
    } catch (err) {
      alert('Không thể cập nhật điểm số. Vui lòng nhập đầy đủ lý do bắt buộc.');
    } finally {
      setIsSubmittingOverride(false);
    }
  };

  const currentIndex = candidates.findIndex((c) => c.id === candidate.id);
  const prevCandidate = currentIndex > 0 ? candidates[currentIndex - 1] : null;
  const nextCandidate = currentIndex < candidates.length - 1 ? candidates[currentIndex + 1] : null;

  return (
    <div className="flex flex-col h-[calc(100vh-65px)] bg-slate-900 overflow-hidden">
      {/* Top Workspace Control Header */}
      <div className="bg-slate-800/90 border-b border-slate-700/80 px-6 py-2.5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white text-sm">{candidate.masked_name}</span>
            <span className="text-xs text-slate-400 font-mono">({candidate.original_filename})</span>
          </div>
          <span className="px-2.5 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-semibold rounded-full flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" /> PII Masked
          </span>
        </div>

        {/* Candidate Selector Navigation */}
        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={() => prevCandidate && onSelectCandidate(prevCandidate)}
            disabled={!prevCandidate}
            className="p-1.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-30 rounded-lg text-slate-200"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-slate-400 font-mono text-xs">
            {currentIndex + 1} / {candidates.length}
          </span>
          <button
            onClick={() => nextCandidate && onSelectCandidate(nextCandidate)}
            disabled={!nextCandidate}
            className="p-1.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-30 rounded-lg text-slate-200"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Split-View Workspace Area */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-700/80 overflow-hidden">
        {/* LEFT PANE: PDF Viewer */}
        <div className="flex flex-col bg-slate-950 h-full overflow-hidden">
          <div className="bg-slate-900 border-b border-slate-800 px-4 py-2 flex items-center justify-between text-xs text-slate-400 shrink-0">
            <span className="flex items-center gap-1.5 font-semibold text-slate-300">
              <FileText className="w-4 h-4 text-blue-400" /> BẢN CV GỐC (PDF VIEWER)
            </span>
            <a
              href={pdfUrl}
              target="_blank"
              rel="noreferrer"
              className="text-blue-400 hover:underline text-[11px]"
            >
              Mở trong cửa sổ mới ↗
            </a>
          </div>

          <div className="flex-1 w-full h-full bg-slate-950">
            <iframe
              src={pdfUrl}
              className="w-full h-full border-0"
              title={`PDF viewer for ${candidate.masked_name}`}
            />
          </div>
        </div>

        {/* RIGHT PANE: AI Evaluation & Evidence Citations */}
        <div className="flex flex-col bg-slate-900 h-full overflow-y-auto p-6 space-y-5">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-3">
              <Sparkles className="w-10 h-10 text-blue-400 animate-spin" />
              <p className="text-xs">AI đang phân tích ngữ nghĩa và trích xuất bằng chứng đối soát...</p>
            </div>
          ) : !evaluation ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              Chưa có dữ liệu đánh giá từ AI cho ứng viên này.
            </div>
          ) : (
            <>
              {/* Score Summary Box */}
              <div className="bg-gradient-to-r from-slate-800 to-slate-850 border border-slate-700 rounded-2xl p-5 shadow-xl relative overflow-hidden">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                      ĐIỂM TƯƠNG THÍCH QUYẾT ĐỊNH (FINAL SCORE)
                    </span>
                    <div className="flex items-baseline gap-3">
                      <span className="text-4xl font-black text-white tracking-tight">
                        {evaluation.hr_override_score !== null && evaluation.hr_override_score !== undefined
                          ? evaluation.hr_override_score
                          : evaluation.overall_score}
                        <span className="text-lg font-normal text-slate-400">%</span>
                      </span>

                      {evaluation.hr_override_score !== null && evaluation.hr_override_score !== undefined && (
                        <span className="px-2.5 py-1 bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-bold rounded-lg flex items-center gap-1">
                          <Lock className="w-3 h-3" /> HR Overridden (AI Score: {evaluation.overall_score}%)
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Override Action Button */}
                  <button
                    onClick={handleOpenOverride}
                    className="px-3.5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-purple-500/20 flex items-center gap-1.5 transition-all"
                  >
                    <Edit3 className="w-4 h-4" /> Điều chỉnh Điểm (Override)
                  </button>
                </div>

                {/* Score Breakdown Bar */}
                <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-700/80 text-xs">
                  <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-700/50">
                    <span className="text-slate-400 text-[11px] block">Kỹ năng ({Math.round(activeJob.criteria.weights.skills * 100)}%)</span>
                    <span className="text-base font-bold text-blue-400">{evaluation.skills_score}%</span>
                  </div>
                  <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-700/50">
                    <span className="text-slate-400 text-[11px]">Kinh nghiệm ({Math.round(activeJob.criteria.weights.experience * 100)}%)</span>
                    <span className="text-base font-bold text-cyan-400">{evaluation.experience_score}%</span>
                  </div>
                  <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-700/50">
                    <span className="text-slate-400 text-[11px]">Học vấn ({Math.round(activeJob.criteria.weights.education * 100)}%)</span>
                    <span className="text-base font-bold text-purple-400">{evaluation.education_score}%</span>
                  </div>
                </div>

                {/* HR Override Reason if exists */}
                {evaluation.hr_override_reason && (
                  <div className="mt-3 p-2.5 bg-purple-950/40 border border-purple-800/40 rounded-xl text-xs text-purple-200">
                    <strong className="block text-purple-300 font-semibold mb-0.5">Lý do HR điều chỉnh:</strong>
                    "{evaluation.hr_override_reason}"
                  </div>
                )}
              </div>

              {/* Navigation Sub-Tabs */}
              <div className="flex border-b border-slate-700 text-xs font-semibold gap-6">
                <button
                  onClick={() => setActiveTab('evidence')}
                  className={`pb-2 transition-all flex items-center gap-1.5 ${
                    activeTab === 'evidence'
                      ? 'text-blue-400 border-b-2 border-blue-500'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Award className="w-4 h-4" /> Trích xuất Bằng chứng đối soát (AI Evidence)
                </button>
                <button
                  onClick={() => setActiveTab('interview')}
                  className={`pb-2 transition-all flex items-center gap-1.5 ${
                    activeTab === 'interview'
                      ? 'text-blue-400 border-b-2 border-blue-500'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <HelpCircle className="w-4 h-4" /> Gợi ý Câu hỏi Phỏng vấn ({evaluation.interview_questions?.length || 0})
                </button>
              </div>

              {/* TAB 1: EVIDENCE CITATIONS */}
              {activeTab === 'evidence' && (
                <div className="space-y-4">
                  {/* AI Summary */}
                  {evaluation.ai_summary && (
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3.5 text-xs text-blue-200">
                      <span className="font-semibold text-blue-400 block mb-1 flex items-center gap-1">
                        <Zap className="w-3.5 h-3.5" /> Nhận định Tổng quan của AI Copilot:
                      </span>
                      {evaluation.ai_summary}
                    </div>
                  )}

                  {/* Skills Citations */}
                  <div className="space-y-2">
                    <h4 className="font-bold text-slate-200 text-xs uppercase tracking-wider text-blue-400">
                      1. Tiêu chí Kỹ năng (Skills Citations)
                    </h4>
                    {evaluation.breakdown?.skills?.evidence?.map((item, idx) => (
                      <div key={idx} className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-3.5 space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                            {item.matched ? (
                              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                            ) : (
                              <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                            )}
                            {item.criterion}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            item.matched ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                          }`}>
                            {item.matched ? `Match (${item.score}%)` : 'Not Matched'}
                          </span>
                        </div>

                        {/* Raw Quote from CV */}
                        {item.raw_quote && (
                          <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-amber-200/90 font-mono text-[11px] leading-relaxed">
                            <span className="text-slate-500 text-[10px] font-sans block mb-1 font-normal">Trích dẫn câu nguyên văn trong CV:</span>
                            "{item.raw_quote}"
                          </div>
                        )}

                        <p className="text-slate-400 text-[11px]">{item.explanation}</p>
                      </div>
                    ))}
                  </div>

                  {/* Experience Citations */}
                  <div className="space-y-2 pt-2">
                    <h4 className="font-bold text-slate-200 text-xs uppercase tracking-wider text-cyan-400">
                      2. Tiêu chí Kinh nghiệm (Experience Citations)
                    </h4>
                    {evaluation.breakdown?.experience?.evidence?.map((item, idx) => (
                      <div key={idx} className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-3.5 space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                            {item.matched ? (
                              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                            ) : (
                              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                            )}
                            {item.criterion}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            item.matched ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                          }`}>
                            {item.matched ? `Match (${item.score}%)` : 'Needs Verification'}
                          </span>
                        </div>
                        {item.raw_quote && (
                          <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-amber-200/90 font-mono text-[11px]">
                            "{item.raw_quote}"
                          </div>
                        )}
                        <p className="text-slate-400 text-[11px]">{item.explanation}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 2: INTERVIEW QUESTIONS */}
              {activeTab === 'interview' && (
                <div className="space-y-3">
                  <p className="text-xs text-slate-400">
                    AI đã phân tích các lỗ hổng kiến thức và điểm thiếu sót trong CV để tự động tạo ra bộ câu hỏi giúp HR phỏng vấn nhanh:
                  </p>
                  {evaluation.interview_questions?.map((q, idx) => (
                    <div key={idx} className="bg-slate-800 border border-slate-700 rounded-xl p-4 text-xs space-y-2">
                      <div className="flex items-start gap-2 font-semibold text-white">
                        <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                          Q{idx + 1}
                        </span>
                        <span>{q.question}</span>
                      </div>
                      <div className="pl-7 text-slate-400 text-[11px] italic bg-slate-900/50 p-2 rounded-lg border border-slate-800">
                        <strong className="text-cyan-400 not-italic">Lý do đào sâu:</strong> {q.reason_to_ask}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* HR OVERRIDE MODAL */}
      {overrideModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-slate-800 border border-purple-500/40 rounded-2xl w-full max-w-md shadow-2xl p-6">
            <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2">
              <Edit3 className="w-5 h-5 text-purple-400" /> Điều chỉnh Điểm số (Human Override)
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Theo quy tắc <span className="text-purple-300 font-semibold">Human-in-the-loop</span>, bạn có quyền ghi đè điểm số AI nhưng BẮT BUỘC phải nhập lý do kiểm toán.
            </p>

            <form onSubmit={handleSaveOverride} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Điểm quyết định mới (% Score): <span className="text-purple-400 text-sm font-bold">{overrideScore}%</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={overrideScore}
                  onChange={(e) => setOverrideScore(parseFloat(e.target.value))}
                  className="w-full accent-purple-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Lý do điều chỉnh (Bắt buộc cho Audit Log) *
                </label>
                <textarea
                  required
                  rows={3}
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="Ví dụ: Ứng viên có chứng chỉ chuyên môn quốc tế bổ trợ tốt cho kỹ năng..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-700">
                <button
                  type="button"
                  onClick={() => setOverrideModalOpen(false)}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-xl font-medium"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingOverride || !overrideReason.trim()}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-medium shadow-lg shadow-purple-500/25 disabled:opacity-50"
                >
                  {isSubmittingOverride ? 'Đang lưu...' : 'Xác nhận & Ghi Audit Log'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
