import React from 'react';
import { X, Award, GraduationCap, Clock, CheckCircle2, Star, Percent, Share2, FileText } from 'lucide-react';
import type { Job } from '../../types';

interface JobDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: Job | null;
  onOpenExportJob: (job: Job) => void;
}

export const JobDetailModal: React.FC<JobDetailModalProps> = ({
  isOpen,
  onClose,
  job,
  onOpenExportJob,
}) => {
  if (!isOpen || !job) return null;

  const { title, department, description, criteria, created_at } = job;
  const weights = criteria.weights || { skills: 0.5, experience: 0.3, education: 0.2 };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-4">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl sm:rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center text-white font-bold text-lg shadow-md shrink-0">
              {title.charAt(0)}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white text-base sm:text-lg truncate">{title}</h3>
                <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-bold rounded-full shrink-0">
                  {job.status || 'OPEN'}
                </span>
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                <span>{department || 'Tuyển dụng'}</span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-500" />
                  {new Date(created_at).toLocaleDateString('vi-VN')}
                </span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 flex-1 overflow-y-auto space-y-5 text-xs">
          {/* Description Section */}
          {description && (
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-2">
              <span className="font-bold text-slate-300 text-xs flex items-center gap-1.5 uppercase tracking-wider">
                <FileText className="w-4 h-4 text-blue-400" /> Mô Tả Tóm Tắt Vị Trí
              </span>
              <p className="text-slate-300 leading-relaxed text-xs whitespace-pre-wrap">{description}</p>
            </div>
          )}

          {/* Key Overview Cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-3 space-y-1">
              <span className="text-slate-400 text-[11px] flex items-center gap-1">
                <Award className="w-3.5 h-3.5 text-cyan-400" /> Kinh nghiệm Yêu cầu
              </span>
              <span className="font-bold text-slate-100 text-sm block">
                {criteria.min_years_experience}+ Năm thực tế
              </span>
            </div>
            <div className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-3 space-y-1">
              <span className="text-slate-400 text-[11px] flex items-center gap-1">
                <GraduationCap className="w-3.5 h-3.5 text-purple-400" /> Yêu cầu Học vấn
              </span>
              <span className="font-bold text-slate-100 text-sm block truncate">
                {criteria.education_level || 'Đại học'}
              </span>
            </div>
          </div>

          {/* Required Skills */}
          <div className="space-y-2">
            <span className="font-bold text-slate-200 text-xs flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Kỹ năng Bắt buộc (Required Skills)
            </span>
            <div className="flex flex-wrap gap-1.5 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
              {criteria.required_skills && criteria.required_skills.length > 0 ? (
                criteria.required_skills.map((skill, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 rounded-lg font-semibold text-xs"
                  >
                    {skill}
                  </span>
                ))
              ) : (
                <span className="text-slate-500 italic">Chưa liệt kê kỹ năng bắt buộc</span>
              )}
            </div>
          </div>

          {/* Preferred Skills */}
          <div className="space-y-2">
            <span className="font-bold text-slate-200 text-xs flex items-center gap-1.5">
              <Star className="w-4 h-4 text-yellow-400" /> Kỹ năng Ưu tiên / Điểm thưởng (Preferred Skills)
            </span>
            <div className="flex flex-wrap gap-1.5 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
              {criteria.preferred_skills && criteria.preferred_skills.length > 0 ? (
                criteria.preferred_skills.map((skill, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 bg-yellow-500/10 text-yellow-300 border border-yellow-500/20 rounded-lg font-semibold text-xs"
                  >
                    {skill}
                  </span>
                ))
              ) : (
                <span className="text-slate-500 italic">Không có kỹ năng cộng điểm thêm</span>
              )}
            </div>
          </div>

          {/* AI Score Weights Distribution */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <span className="font-bold text-slate-200 text-xs flex items-center gap-1.5">
              <Percent className="w-4 h-4 text-blue-400" /> Phân Bổ Trọng Số Chấm Điểm AI (Match Weights)
            </span>
            <div className="grid grid-cols-3 gap-2.5">
              <div className="bg-slate-800/80 p-3 rounded-xl border border-blue-500/30 text-center">
                <span className="text-slate-400 text-[10px] block">Trọng số Kỹ năng</span>
                <span className="font-black text-blue-400 text-base">{Math.round(weights.skills * 100)}%</span>
              </div>
              <div className="bg-slate-800/80 p-3 rounded-xl border border-cyan-500/30 text-center">
                <span className="text-slate-400 text-[10px] block">Trọng số Kinh nghiệm</span>
                <span className="font-black text-cyan-400 text-base">{Math.round(weights.experience * 100)}%</span>
              </div>
              <div className="bg-slate-800/80 p-3 rounded-xl border border-purple-500/30 text-center">
                <span className="text-slate-400 text-[10px] block">Trọng số Học vấn</span>
                <span className="font-black text-purple-400 text-base">{Math.round(weights.education * 100)}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between shrink-0">
          <button
            onClick={() => {
              onClose();
              onOpenExportJob(job);
            }}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all"
          >
            <Share2 className="w-4 h-4" /> Xuất tin JD này
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-500/20 transition-all"
          >
            Đóng Cửa Sổ
          </button>
        </div>
      </div>
    </div>
  );
};
