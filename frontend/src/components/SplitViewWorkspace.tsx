import React, { useCallback, useEffect, useState } from 'react';
import {
  FileText,
  CheckCircle,
  XCircle,
  Award,
  HelpCircle,
  Edit3,
  ShieldCheck,
  Zap,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Lock,
  Eye,
  Printer,
} from 'lucide-react';
import { candidateApi, evaluationApi } from '../services/api';
import type { Candidate, Evaluation, Job, IndustryCertification } from '../types';
import { supabase, type UserProfile } from '../services/supabase';
import { SmartCVViewer } from './cv-viewer/SmartCVViewer';
import { PDFInteractiveViewer } from './cv-viewer/PDFInteractiveViewer';
import { AdditionalHighlightsSection } from './cv-viewer/AdditionalHighlightsSection';
import { ManualHighlightModal } from './cv-viewer/ManualHighlightModal';
import { ExportAuditReportModal } from './cv-viewer/ExportAuditReportModal';

interface SplitViewWorkspaceProps {
  candidate: Candidate;
  activeJob: Job;
  candidates: Candidate[];
  currentUser?: UserProfile;
  onSelectCandidate: (candidate: Candidate) => void;
  onEvaluationUpdated: () => void;
}

export const SplitViewWorkspace: React.FC<SplitViewWorkspaceProps> = ({
  candidate,
  activeJob,
  candidates,
  currentUser,
  onSelectCandidate,
  onEvaluationUpdated,
}) => {
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [loading, setLoading] = useState(true);
  const [overrideModalOpen, setOverrideModalOpen] = useState(false);
  const [overrideScore, setOverrideScore] = useState<number>(85);
  const [overrideReason, setOverrideReason] = useState<string>('');
  const [isSubmittingOverride, setIsSubmittingOverride] = useState(false);
  const [activeTab, setActiveTab] = useState<'evidence' | 'additional' | 'interview' | 'raw_text'>('evidence');
  const [mobileTab, setMobileTab] = useState<'analysis' | 'pdf'>('analysis');
  const [leftPaneMode, setLeftPaneMode] = useState<'pdf_interactive' | 'smart_audit' | 'raw_pdf'>('pdf_interactive');
  const [activeHighlightQuote, setActiveHighlightQuote] = useState<string | null>(null);
  const [manualHighlightOpen, setManualHighlightOpen] = useState(false);
  const [manualHighlightQuote, setManualHighlightQuote] = useState('');
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [authToken, setAuthToken] = useState<string>('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.access_token) {
        setAuthToken(session.access_token);
      }
    });
  }, []);

  const pdfUrl = candidateApi.getPdfUrl(candidate.id, authToken);

  const fetchEvaluation = useCallback(async () => {
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
  }, [candidate.id]);

  useEffect(() => {
    void fetchEvaluation();
  }, [fetchEvaluation]);

  const handleOpenOverride = () => {
    if (currentUser?.role === 'PENDING') {
      alert('Tài khoản của bạn đang ở trạng thái Chờ duyệt. Chỉ HR chính thức mới có quyền điều chỉnh điểm số.');
      return;
    }
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
    } catch {
      alert('Không thể cập nhật điểm số. Vui lòng nhập đầy đủ lý do bắt buộc.');
    } finally {
      setIsSubmittingOverride(false);
    }
  };

  const currentIndex = candidates.findIndex((c) => c.id === candidate.id);
  const prevCandidate = currentIndex > 0 ? candidates[currentIndex - 1] : null;
  const nextCandidate = currentIndex < candidates.length - 1 ? candidates[currentIndex + 1] : null;

  // Trích xuất danh sách bằng chứng từ breakdown
  const skillEvidences = evaluation?.breakdown?.skills?.evidence || [];
  const matchedSkills = skillEvidences.filter((e) => e.matched);
  const missingSkills = skillEvidences.filter((e) => !e.matched);

  const allEvidences = [
    ...(evaluation?.breakdown?.skills?.evidence || []),
    ...(evaluation?.breakdown?.experience?.evidence || []),
    ...(evaluation?.breakdown?.education?.evidence || []),
  ];

  const additionalHighlights = evaluation?.breakdown?.additional_highlights || [];

  // Trích xuất danh mục "Chứng chỉ của ngành" độc lập
  const industryCertifications: IndustryCertification[] =
    evaluation?.breakdown?.industry_certifications && evaluation.breakdown.industry_certifications.length > 0
      ? evaluation.breakdown.industry_certifications
      : (additionalHighlights.filter(
          (h) =>
            h.category.toLowerCase().includes('chứng chỉ') ||
            h.title.toLowerCase().includes('analyst') ||
            h.title.toLowerCase().includes('certificate') ||
            h.title.toLowerCase().includes('associate')
        ) as IndustryCertification[]);

  const handleSelectQuoteForAudit = (quote: string) => {
    setActiveHighlightQuote(quote);
    if (leftPaneMode === 'raw_pdf') {
      setLeftPaneMode('pdf_interactive');
    }
  };

  const handleRequestAddHighlight = (quote: string) => {
    setManualHighlightQuote(quote);
    setManualHighlightOpen(true);
  };

  const handleSaveManualHighlight = async (data: {
    title: string;
    category: string;
    raw_quote: string;
    value_add_analysis?: string;
  }) => {
    if (!evaluation) return;
    const updated = await evaluationApi.addManualHighlight(evaluation.id, data);
    setEvaluation(updated);
    onEvaluationUpdated();
  };

  return (
    <div className="flex flex-col h-[calc(100vh-105px)] sm:h-[calc(100vh-110px)] bg-slate-900 overflow-hidden w-full max-w-full">
      {/* Top Workspace Control Header */}
      <div className="bg-slate-800/95 border-b border-slate-700/80 px-3 sm:px-6 py-2 sm:py-2.5 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          <div className="min-w-0">
            <span className="font-bold text-white text-xs sm:text-sm block sm:inline mr-1 truncate">
              {candidate.masked_name}
            </span>
            <span className="text-[10px] sm:text-xs text-slate-400 font-mono truncate max-w-[130px] sm:max-w-[200px] inline-block align-bottom">
              ({candidate.original_filename})
            </span>
          </div>
          <span className="hidden xs:flex px-2 sm:px-2.5 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] sm:text-xs font-semibold rounded-full items-center gap-1 shrink-0">
            <ShieldCheck className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> PII Masked
          </span>
        </div>

        {/* Actions & Candidate Navigation */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setExportModalOpen(true)}
            className="px-2.5 sm:px-3 py-1 sm:py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-blue-500/20 transition-all shrink-0 cursor-pointer"
            title="Xuất biên bản đối soát định dạng A4 PDF phục vụ lưu trữ và phỏng vấn"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Xuất Báo Cáo Đối Soát (PDF)</span>
            <span className="sm:hidden">Xuất PDF</span>
          </button>

          {/* Candidate Selector Navigation */}
          <div className="flex items-center gap-1.5 sm:gap-2 text-xs shrink-0">
            <button
              onClick={() => prevCandidate && onSelectCandidate(prevCandidate)}
              disabled={!prevCandidate}
              className="p-1 sm:p-1.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-30 rounded-lg text-slate-200"
              title="Ứng viên trước"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-slate-400 font-mono text-[11px] sm:text-xs px-1">
              {currentIndex + 1} / {candidates.length}
            </span>
            <button
              onClick={() => nextCandidate && onSelectCandidate(nextCandidate)}
              disabled={!nextCandidate}
              className="p-1 sm:p-1.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-30 rounded-lg text-slate-200"
              title="Ứng viên kế tiếp"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* MOBILE SEGMENTED TOGGLE (< lg screens) */}
      <div className="lg:hidden flex border-b border-slate-800 bg-slate-950/90 p-1 gap-1 shrink-0">
        <button
          onClick={() => setMobileTab('analysis')}
          className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            mobileTab === 'analysis'
              ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
          <span>Thẩm định AI ({evaluation ? `${evaluation.hr_override_score ?? evaluation.overall_score}%` : '...'})</span>
        </button>
        <button
          onClick={() => setMobileTab('pdf')}
          className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            mobileTab === 'pdf'
              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Eye className="w-3.5 h-3.5 text-emerald-300" />
          <span>Bản Đối Soát CV</span>
        </button>
      </div>

      {/* Split-View Workspace Area */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-700/80 overflow-hidden">
        {/* PANE 1: Smart Audit & PDF Viewer */}
        <div
          className={`${
            mobileTab === 'pdf' ? 'flex' : 'hidden lg:flex'
          } flex-col bg-slate-950 h-full overflow-hidden`}
        >
          <div className="bg-slate-900 border-b border-slate-800 px-3 sm:px-4 py-2 flex items-center justify-between text-xs text-slate-400 shrink-0">
            {/* View Mode Switcher */}
            <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-xl border border-slate-800">
              <button
                onClick={() => setLeftPaneMode('pdf_interactive')}
                className={`px-2.5 sm:px-3 py-1 rounded-lg text-[11px] sm:text-xs font-bold flex items-center gap-1.5 transition-all ${
                  leftPaneMode === 'pdf_interactive'
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Khoanh vùng màu trực tiếp trên tài liệu PDF gốc"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
                <span>Khoanh Vùng PDF (AI)</span>
              </button>
              <button
                onClick={() => setLeftPaneMode('smart_audit')}
                className={`px-2.5 sm:px-3 py-1 rounded-lg text-[11px] sm:text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  leftPaneMode === 'smart_audit'
                    ? 'bg-slate-700 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Xem văn bản CV tách dòng"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Văn Bản Tách Dòng</span>
              </button>
              <button
                onClick={() => setLeftPaneMode('raw_pdf')}
                className={`px-2.5 sm:px-3 py-1 rounded-lg text-[11px] sm:text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  leftPaneMode === 'raw_pdf'
                    ? 'bg-slate-700 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Xem bản file PDF gốc không khoanh vùng"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>PDF Gốc</span>
              </button>
            </div>

            <a
              href={pdfUrl}
              target="_blank"
              rel="noreferrer"
              className="text-blue-400 hover:underline text-[11px] shrink-0"
            >
              Mở file gốc ↗
            </a>
          </div>

          <div className="flex-1 w-full h-full bg-slate-950 overflow-hidden">
            {leftPaneMode === 'pdf_interactive' ? (
              <PDFInteractiveViewer
                pdfUrl={pdfUrl}
                matchedEvidences={allEvidences.filter((e) => e.matched)}
                industryCertifications={industryCertifications}
                additionalHighlights={additionalHighlights}
                activeHighlightQuote={activeHighlightQuote}
                candidateName={candidate.masked_name}
                onSelectQuote={(q) => setActiveHighlightQuote(q)}
              />
            ) : leftPaneMode === 'smart_audit' ? (
              <SmartCVViewer
                cvText={candidate.masked_text || candidate.raw_text || candidate.text_preview || ''}
                matchedEvidences={allEvidences.filter((e) => e.matched)}
                additionalHighlights={additionalHighlights}
                activeHighlightQuote={activeHighlightQuote}
                candidateName={candidate.masked_name}
                onClearActiveHighlight={() => setActiveHighlightQuote(null)}
                onRequestAddHighlight={handleRequestAddHighlight}
              />
            ) : (
              <iframe
                src={pdfUrl}
                className="w-full h-full border-0"
                title={`PDF viewer for ${candidate.masked_name}`}
              />
            )}
          </div>
        </div>

        {/* PANE 2: AI Evaluation & Evidence Citations */}
        <div
          className={`${
            mobileTab === 'analysis' ? 'flex' : 'hidden lg:flex'
          } flex-col bg-slate-900 h-full overflow-y-auto p-3.5 sm:p-6 space-y-4 sm:space-y-5`}
        >
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-3 py-16">
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
              <div className="bg-gradient-to-r from-slate-800 to-slate-850 border border-slate-700 rounded-2xl p-4 sm:p-5 shadow-xl relative overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div>
                    <span className="text-[10px] sm:text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                      ĐIỂM TƯƠNG THÍCH QUYẾT ĐỊNH (FINAL SCORE)
                    </span>
                    <div className="flex flex-wrap items-baseline gap-2 sm:gap-3">
                      <span className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                        {evaluation.hr_override_score !== null && evaluation.hr_override_score !== undefined
                          ? evaluation.hr_override_score
                          : evaluation.overall_score}
                        <span className="text-base sm:text-lg font-normal text-slate-400">%</span>
                      </span>

                      {evaluation.hr_override_score !== null && evaluation.hr_override_score !== undefined && (
                        <span className="px-2 py-0.5 sm:px-2.5 sm:py-1 bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] sm:text-xs font-bold rounded-lg flex items-center gap-1">
                          <Lock className="w-3 h-3" /> HR Overridden (AI: {evaluation.overall_score}%)
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Override Action Button */}
                  <button
                    onClick={handleOpenOverride}
                    disabled={currentUser?.role === 'PENDING'}
                    className={`px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs font-semibold shadow-lg flex items-center justify-center gap-1.5 transition-all self-start sm:self-auto ${
                      currentUser?.role === 'PENDING'
                        ? 'bg-slate-800/40 text-slate-500 border border-slate-700 cursor-not-allowed opacity-60'
                        : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-purple-500/20'
                    }`}
                    title={currentUser?.role === 'PENDING' ? 'Tài khoản đang chờ duyệt quyền, không thể điều chỉnh điểm' : 'Điều chỉnh Điểm (Override)'}
                  >
                    <Edit3 className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Điều chỉnh Điểm (Override)
                  </button>
                </div>

                {/* Score Breakdown Bar */}
                <div className="grid grid-cols-3 gap-2 sm:gap-3 mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-slate-700/80 text-xs">
                  <div className="bg-slate-900/60 p-2 sm:p-2.5 rounded-xl border border-slate-700/50">
                    <span className="text-slate-400 text-[10px] sm:text-[11px] block truncate">
                      Kỹ năng ({Math.round(activeJob.criteria.weights.skills * 100)}%)
                    </span>
                    <span className="text-sm sm:text-base font-bold text-blue-400">{evaluation.skills_score}%</span>
                  </div>
                  <div className="bg-slate-900/60 p-2 sm:p-2.5 rounded-xl border border-slate-700/50">
                    <span className="text-slate-400 text-[10px] sm:text-[11px] block truncate">
                      Kinh nghiệm ({Math.round(activeJob.criteria.weights.experience * 100)}%)
                    </span>
                    <span className="text-sm sm:text-base font-bold text-cyan-400">{evaluation.experience_score}%</span>
                  </div>
                  <div className="bg-slate-900/60 p-2 sm:p-2.5 rounded-xl border border-slate-700/50">
                    <span className="text-slate-400 text-[10px] sm:text-[11px] block truncate">
                      Học vấn ({Math.round(activeJob.criteria.weights.education * 100)}%)
                    </span>
                    <span className="text-sm sm:text-base font-bold text-purple-400">{evaluation.education_score}%</span>
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
              <div className="flex border-b border-slate-700 text-xs font-semibold gap-2 sm:gap-4 overflow-x-auto no-scrollbar">
                <button
                  onClick={() => setActiveTab('evidence')}
                  className={`pb-2 transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                    activeTab === 'evidence'
                      ? 'text-emerald-400 border-b-2 border-emerald-500 font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <CheckCircle className="w-4 h-4 text-emerald-400" /> Bảng Kiểm Định Nhanh ({skillEvidences.length + industryCertifications.length})
                </button>
                <button
                  onClick={() => setActiveTab('additional')}
                  className={`pb-2 transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                    activeTab === 'additional'
                      ? 'text-cyan-400 border-b-2 border-cyan-500 font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Sparkles className="w-4 h-4 text-cyan-400" /> Điểm Nêu Thêm ({additionalHighlights.length})
                </button>
                <button
                  onClick={() => setActiveTab('interview')}
                  className={`pb-2 transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                    activeTab === 'interview'
                      ? 'text-blue-400 border-b-2 border-blue-500 font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <HelpCircle className="w-4 h-4" /> Phỏng Vấn ({evaluation.interview_questions?.length || 0})
                </button>
                <button
                  onClick={() => setActiveTab('raw_text')}
                  className={`pb-2 transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                    activeTab === 'raw_text'
                      ? 'text-blue-400 border-b-2 border-blue-500 font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <FileText className="w-4 h-4" /> Văn bản CV gốc
                </button>
              </div>

              {/* TAB 1: BẢNG KIỂM ĐỊNH NHANH (EXECUTIVE SCREENING DASHBOARD) */}
              {activeTab === 'evidence' && (
                <div className="space-y-4 text-xs">
                  {/* AI Summary Banner */}
                  {evaluation.ai_summary && (
                    <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-3.5 space-y-1.5 shadow-sm">
                      <span className="font-semibold text-blue-300 flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-blue-400" /> Nhận xét tổng quan của AI:
                      </span>
                      <p className="text-slate-300 leading-relaxed">{evaluation.ai_summary}</p>
                    </div>
                  )}

                  {/* PHẦN 1: KỸ NĂNG CỐT LÕI BẮT BUỘC & ƯU TIÊN */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-200 flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                        1. Kỹ Năng Cốt Lõi Đối Soát ({matchedSkills.length}/{skillEvidences.length} Đạt)
                      </span>
                      <span className="text-[10px] text-slate-500">Bấm thẻ để định vị khoanh vùng trên PDF</span>
                    </div>

                    <div className="grid grid-cols-1 gap-2">
                      {skillEvidences.map((item, idx) => {
                        const isSelected = activeHighlightQuote && (
                          activeHighlightQuote === item.raw_quote ||
                          activeHighlightQuote === item.criterion ||
                          (item.raw_quote && activeHighlightQuote.includes(item.raw_quote))
                        );

                        return (
                          <div
                            key={idx}
                            onClick={() => handleSelectQuoteForAudit(item.raw_quote || item.criterion)}
                            className={`p-3 rounded-xl border transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-emerald-950/60 border-emerald-400 ring-2 ring-emerald-500/40 shadow-lg'
                                : item.matched
                                ? 'bg-slate-850 hover:bg-slate-800 border-slate-700/80 hover:border-emerald-500/40'
                                : 'bg-slate-900/60 border-rose-500/30'
                            }`}
                          >
                            <div className="flex items-center justify-between text-[11px] mb-1">
                              <span className="font-bold text-white flex items-center gap-1.5">
                                <span className={`w-2 h-2 rounded-full ${item.matched ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                                {item.criterion}
                              </span>
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  item.matched ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                }`}>
                                  {item.matched ? '✓ Đạt (100%)' : '✗ Chưa tìm thấy'}
                                </span>
                                {item.matched && (
                                  <span className="text-[10px] text-cyan-400 hover:text-cyan-300 flex items-center gap-0.5 font-medium">
                                    <Eye className="w-3 h-3" /> Xem PDF
                                  </span>
                                )}
                              </div>
                            </div>

                            {item.raw_quote ? (
                              <blockquote className="border-l-2 border-emerald-500 pl-3 italic text-emerald-200 text-[11px] my-1 bg-emerald-950/20 py-0.5 rounded-r">
                                "{item.raw_quote}"
                              </blockquote>
                            ) : null}

                            <p className="text-slate-400 text-[11px] pl-3">
                              {item.explanation || (item.matched ? 'Ứng viên có kỹ năng này trong hồ sơ.' : 'Không phát hiện trong nội dung văn bản CV.')}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* PHẦN 2: CHỨNG CHỈ CỦA NGÀNH (INDUSTRY CERTIFICATIONS) */}
                  <div className="space-y-2.5 pt-2 border-t border-slate-800">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-purple-300 flex items-center gap-1.5">
                        <Award className="w-4 h-4 text-purple-400" />
                        2. Chứng Chỉ Của Ngành ({industryCertifications.length} Chứng Chỉ)
                      </span>
                      <span className="text-[10px] text-purple-400/80 font-medium">Khoanh vùng màu Tím trên PDF</span>
                    </div>

                    {industryCertifications.length > 0 ? (
                      <div className="grid grid-cols-1 gap-2">
                        {industryCertifications.map((cert, idx) => {
                          const isSelected = activeHighlightQuote && (
                            activeHighlightQuote === cert.raw_quote ||
                            activeHighlightQuote === cert.title ||
                            (cert.raw_quote && activeHighlightQuote.includes(cert.raw_quote))
                          );

                          return (
                            <div
                              key={idx}
                              onClick={() => handleSelectQuoteForAudit(cert.raw_quote || cert.title)}
                              className={`p-3 rounded-xl border transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-purple-950/60 border-purple-400 ring-2 ring-purple-500/40 shadow-lg'
                                  : 'bg-slate-850 hover:bg-slate-800 border-purple-500/30 hover:border-purple-400/60'
                              }`}
                            >
                              <div className="flex items-center justify-between text-[11px] mb-1">
                                <span className="font-bold text-purple-200 flex items-center gap-1.5">
                                  <Award className="w-3.5 h-3.5 text-purple-400" />
                                  {cert.title}
                                </span>
                                <div className="flex items-center gap-2">
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40">
                                    ✓ Đã xác thực
                                  </span>
                                  <span className="text-[10px] text-purple-300 hover:text-white flex items-center gap-0.5 font-medium">
                                    <Eye className="w-3 h-3" /> Định vị PDF
                                  </span>
                                </div>
                              </div>

                              <blockquote className="border-l-2 border-purple-400 pl-3 italic text-purple-200 text-[11px] my-1 bg-purple-950/20 py-0.5 rounded-r">
                                "{cert.raw_quote}"
                              </blockquote>

                              <p className="text-slate-400 text-[11px] pl-3 leading-relaxed">
                                {cert.value_add_analysis}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl text-slate-500 italic text-[11px]">
                        Chưa phát hiện chứng chỉ chuyên môn quốc tế trong hồ sơ này.
                      </div>
                    )}
                  </div>

                  {/* PHẦN 3: ĐỐI SOÁT KINH NGHIỆM THỰC CHIẾN */}
                  <div className="space-y-2.5 pt-2 border-t border-slate-800">
                    <span className="font-bold text-cyan-300 flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
                      3. Kinh Nghiệm Thực Chiến ({evaluation.experience_score}%)
                    </span>

                    {(evaluation.breakdown?.experience?.evidence || []).map((exp, idx) => (
                      <div
                        key={idx}
                        onClick={() => handleSelectQuoteForAudit(exp.raw_quote || exp.criterion)}
                        className="p-3 bg-slate-850 hover:bg-slate-800 border border-cyan-500/30 rounded-xl space-y-1 cursor-pointer transition-all"
                      >
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-white">{exp.criterion}</span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                            {exp.matched ? '✓ Đạt tiêu chuẩn' : 'Cần đối chiếu'}
                          </span>
                        </div>
                        {exp.raw_quote && (
                          <blockquote className="border-l-2 border-cyan-400 pl-3 italic text-cyan-200 text-[11px] my-1 bg-cyan-950/20 py-0.5 rounded-r">
                            "{exp.raw_quote}"
                          </blockquote>
                        )}
                        <p className="text-slate-400 text-[11px] pl-3">{exp.explanation}</p>
                      </div>
                    ))}
                  </div>

                  {/* PHẦN 4: THẨM ĐỊNH HỌC VẤN & BẰNG CẤP */}
                  <div className="space-y-2.5 pt-2 border-t border-slate-800">
                    <span className="font-bold text-indigo-300 flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-indigo-400" />
                      4. Trình Độ Học Vấn & Bằng Cấp ({evaluation.education_score}%)
                    </span>

                    {(evaluation.breakdown?.education?.evidence || []).map((edu, idx) => (
                      <div
                        key={idx}
                        onClick={() => handleSelectQuoteForAudit(edu.raw_quote || edu.criterion)}
                        className="p-3 bg-slate-850 hover:bg-slate-800 border border-indigo-500/30 rounded-xl space-y-1 cursor-pointer transition-all"
                      >
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-white">{edu.criterion}</span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                            {edu.matched ? '✓ Cử nhân đạt chuẩn' : 'Cần xác nhận'}
                          </span>
                        </div>
                        {edu.raw_quote && (
                          <blockquote className="border-l-2 border-indigo-400 pl-3 italic text-indigo-200 text-[11px] my-1 bg-indigo-950/20 py-0.5 rounded-r">
                            "{edu.raw_quote}"
                          </blockquote>
                        )}
                        <p className="text-slate-400 text-[11px] pl-3">{edu.explanation}</p>
                      </div>
                    ))}
                  </div>

                  {/* PHẦN 5: TIÊU CHUẨN CÒN THIẾU & GỢI Ý PHỎNG VẤN */}
                  {missingSkills.length > 0 && (
                    <div className="space-y-2.5 pt-2 border-t border-slate-800">
                      <span className="font-bold text-rose-300 flex items-center gap-1.5">
                        <XCircle className="w-4 h-4 text-rose-400" />
                        5. Khoảng Trống Kỹ Năng & Câu Hỏi Phỏng Vấn Sâu ({missingSkills.length})
                      </span>

                      <div className="p-3 bg-rose-950/30 border border-rose-500/30 rounded-xl space-y-2.5">
                        <p className="text-slate-300 text-[11px]">
                          Các kỹ năng sau chưa được tìm thấy trong hồ sơ. HR nên phỏng vấn làm rõ:
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {missingSkills.map((m, i) => (
                            <span key={i} className="px-2.5 py-1 bg-rose-500/20 border border-rose-500/40 text-rose-200 rounded-lg text-[11px] font-semibold">
                              ✗ {m.criterion.replace('Kỹ năng bắt buộc: ', '')}
                            </span>
                          ))}
                        </div>

                        {evaluation.interview_questions && evaluation.interview_questions.length > 0 && (
                          <div className="pt-2 border-t border-rose-800/40 space-y-1.5">
                            <span className="font-semibold text-rose-200 text-[11px] block">
                              Gợi ý câu hỏi phỏng vấn chuẩn bị sẵn:
                            </span>
                            {evaluation.interview_questions.slice(0, 2).map((q, qi) => (
                              <div key={qi} className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800 text-[11px]">
                                <p className="font-medium text-white mb-0.5">"{q.question}"</p>
                                <p className="text-slate-400 text-[10px]">Mục đích: {q.reason_to_ask || q.purpose}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: Additional Highlights */}
              {activeTab === 'additional' && (
                <div className="space-y-3">
                  <div className="p-3 bg-cyan-950/30 border border-cyan-800/40 rounded-xl text-cyan-200 text-xs">
                    Các kỹ năng chuyên sâu, chứng chỉ quốc tế hoặc năng lực công nghệ mà ứng viên sở hữu nhưng <strong>không nằm trong danh sách bắt buộc của JD</strong>. Đây là giá trị thặng dư giúp gia tăng hiệu suất công việc:
                  </div>

                  <AdditionalHighlightsSection
                    highlights={additionalHighlights}
                    activeQuote={activeHighlightQuote}
                    onSelectHighlight={(hl) => handleSelectQuoteForAudit(hl.title)}
                  />
                </div>
              )}

              {/* TAB 3: Interview Questions */}
              {activeTab === 'interview' && (
                <div className="space-y-3 text-xs">
                  <div className="p-3 bg-blue-950/30 border border-blue-800/40 rounded-xl text-blue-200">
                    Bộ câu hỏi do AI tự động đề xuất dựa trên các khoảng trống kỹ năng và kinh nghiệm thực tế của ứng viên này:
                  </div>

                  {evaluation.interview_questions && evaluation.interview_questions.length > 0 ? (
                    evaluation.interview_questions.map((q: any, i: number) => (
                      <div key={i} className="bg-slate-850 border border-slate-700 rounded-xl p-3.5 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 font-bold flex items-center justify-center text-[10px] shrink-0">
                            {i + 1}
                          </span>
                          <span className="font-semibold text-white">{q.question}</span>
                        </div>
                        <p className="text-[11px] text-slate-400 pl-7">Mục đích: {q.reason_to_ask || q.purpose}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-slate-500">Chưa có câu hỏi phỏng vấn nào được sinh ra.</p>
                  )}
                </div>
              )}

              {/* TAB 4: Raw Masked Text */}
              {activeTab === 'raw_text' && (
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-[11px] text-slate-300 whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto">
                  {candidate.masked_text || candidate.raw_text || candidate.text_preview || 'Không có văn bản trích xuất.'}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* HR OVERRIDE MODAL */}
      {overrideModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3">
          <div className="bg-slate-800 border border-purple-500/40 rounded-2xl w-full max-w-md shadow-2xl p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-sm sm:text-base font-bold text-white mb-1 flex items-center gap-2">
              <Edit3 className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400" /> Điều chỉnh Điểm số (Human Override)
            </h3>
            <p className="text-[11px] sm:text-xs text-slate-400 mb-4">
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

              <div className="flex justify-end gap-2 sm:gap-3 pt-3 border-t border-slate-700">
                <button
                  type="button"
                  onClick={() => setOverrideModalOpen(false)}
                  className="px-3 sm:px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-xl font-medium"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingOverride || !overrideReason.trim()}
                  className="px-4 sm:px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-medium shadow-lg shadow-purple-500/25 disabled:opacity-50"
                >
                  {isSubmittingOverride ? 'Đang lưu...' : 'Xác nhận & Ghi Log'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manual Highlight Modal (Khi HR bôi đen chữ trên CV và bấm "Ghi nhận kỹ năng") */}
      <ManualHighlightModal
        isOpen={manualHighlightOpen}
        onClose={() => setManualHighlightOpen(false)}
        rawQuote={manualHighlightQuote}
        onSave={handleSaveManualHighlight}
      />

      {/* Export Audit Report Modal (Xuất Báo Cáo Đối Soát A4 / PDF) */}
      <ExportAuditReportModal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        candidate={candidate}
        job={activeJob}
        evaluation={evaluation}
        currentUser={currentUser}
      />
    </div>
  );
};
