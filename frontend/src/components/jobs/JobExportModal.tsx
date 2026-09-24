import { useState, useMemo } from 'react';
import {
  X,
  Copy,
  Check,
  Download,
  Share2,
  Globe,
  Briefcase,
  MessageSquare,
  FileText,
  Dices,
  Sparkles,
} from 'lucide-react';
import type { Job } from '../../types';
import {
  generateEnterpriseJD,
  generateDynamicCreativePost,
  CREATIVE_ANGLES,
  type CreativeAngle,
} from '../../services/jdGeneratorService';

interface JobExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: Job | null;
}

export const JobExportModal: React.FC<JobExportModalProps> = ({ isOpen, onClose, job }) => {
  const [activeMode, setActiveMode] = useState<'enterprise' | 'creative'>('enterprise');
  const [platform, setPlatform] = useState<'linkedin' | 'topcv' | 'social'>('linkedin');
  const [selectedAngle, setSelectedAngle] = useState<CreativeAngle>('tech_challenge');
  const [randomSeed, setRandomSeed] = useState<number>(0);
  const [copied, setCopied] = useState(false);

  // Sinh nội dung động
  const content = useMemo(() => {
    if (!job) return '';
    if (activeMode === 'enterprise') {
      return generateEnterpriseJD(job);
    }
    void randomSeed;
    return generateDynamicCreativePost(job, platform, selectedAngle);
  }, [job, activeMode, platform, selectedAngle, randomSeed]);

  if (!isOpen || !job) return null;

  // Xử lý random đổi ý tưởng sáng tạo
  const handleRandomizeAngle = () => {
    const otherAngles = CREATIVE_ANGLES.filter((a) => a.id !== selectedAngle);
    const nextAngle = otherAngles[Math.floor(Math.random() * otherAngles.length)];
    setSelectedAngle(nextAngle.id);
    setRandomSeed((prev) => prev + 1);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const prefix = activeMode === 'enterprise' ? 'JD_Doanh_Nghiep' : `Post_${platform}`;
    a.download = `${prefix}_${job.title.replace(/\s+/g, '_')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const currentAngleInfo = CREATIVE_ANGLES.find((a) => a.id === selectedAngle);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-4">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl sm:rounded-3xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-cyan-600 to-blue-500 flex items-center justify-center text-white shadow-md shrink-0">
              <Share2 className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm sm:text-base flex items-center gap-2">
                Xuất Văn Bản Tuyển Dụng & Sáng Tạo Content
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-400">
                Cho vị trí: <span className="text-cyan-300 font-semibold">{job.title}</span>
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

        {/* Mode Switcher Tabs (Bản JD Doanh Nghiệp vs Tin Đăng Tuyển Dụng) */}
        <div className="grid grid-cols-2 p-1.5 bg-slate-950/80 border-b border-slate-800 gap-1.5 shrink-0">
          <button
            onClick={() => setActiveMode('enterprise')}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeMode === 'enterprise'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-4 h-4 text-blue-300" />
            <span>📄 Bản JD Doanh Nghiệp Chi Tiết</span>
          </button>

          <button
            onClick={() => setActiveMode('creative')}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeMode === 'creative'
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-4 h-4 text-cyan-300" />
            <span>🚀 Tin Đăng Tuyển Dụng Sáng Tạo</span>
          </button>
        </div>

        {/* Sub-controls for Creative Mode */}
        {activeMode === 'creative' && (
          <div className="p-3 bg-slate-950/50 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shrink-0">
            {/* Platforms */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              <button
                onClick={() => setPlatform('linkedin')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0 ${
                  platform === 'linkedin'
                    ? 'bg-[#0077B5] text-white shadow-sm'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Briefcase className="w-3.5 h-3.5" /> LinkedIn
              </button>
              <button
                onClick={() => setPlatform('topcv')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0 ${
                  platform === 'topcv'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Globe className="w-3.5 h-3.5" /> TopCV
              </button>
              <button
                onClick={() => setPlatform('social')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0 ${
                  platform === 'social'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" /> Facebook / Zalo
              </button>
            </div>

            {/* Random Angle Button & Current Badge */}
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline-block px-2.5 py-1 bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 text-[11px] font-bold rounded-lg truncate max-w-[200px]">
                {currentAngleInfo?.badge}
              </span>

              <button
                onClick={handleRandomizeAngle}
                className="px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-lg text-xs font-bold shadow-md shadow-purple-500/20 flex items-center gap-1.5 transition-all active:scale-95 shrink-0"
                title="Bấm để tự động đổi góc nhìn và biến tấu nội dung ngẫu nhiên"
              >
                <Dices className="w-4 h-4 text-purple-200" />
                <span>🎲 Đổi Ý Tưởng Mới</span>
              </button>
            </div>
          </div>
        )}

        {/* Content Box */}
        <div className="p-4 sm:p-5 flex-1 overflow-y-auto">
          {activeMode === 'creative' && currentAngleInfo && (
            <div className="mb-3 p-2.5 bg-slate-950/70 border border-slate-800 rounded-xl flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-2">
                <span className="font-bold text-cyan-300">{currentAngleInfo.name}:</span>
                <span className="text-slate-300 text-[11px]">{currentAngleInfo.description}</span>
              </span>
              <span className="text-[10px] text-purple-300 font-mono">Biến thể #{randomSeed + 1}</span>
            </div>
          )}

          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 sm:p-5 font-mono text-xs text-slate-200 whitespace-pre-wrap leading-relaxed max-h-[380px] sm:max-h-[420px] overflow-y-auto select-all shadow-inner">
            {content}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-3.5 sm:p-4 border-t border-slate-800 bg-slate-900/90 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <span className="text-[11px] text-slate-400 text-center sm:text-left">
            {activeMode === 'enterprise'
              ? 'Tài liệu đầy đủ 6 phần chuẩn mực dùng cho lưu trữ nội bộ và cổng tuyển dụng'
              : 'Nội dung tự động biến tấu theo thuật toán sáng tạo đa góc nhìn'}
          </span>
          <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto justify-end">
            <button
              onClick={handleDownload}
              className="flex-1 sm:flex-none px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 flex items-center justify-center gap-1.5 transition-all"
            >
              <Download className="w-4 h-4" /> Tải file .txt
            </button>
            <button
              onClick={handleCopy}
              className="flex-1 sm:flex-none px-4 sm:px-5 py-2 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-500/25 flex items-center justify-center gap-1.5 transition-all"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Đã sao chép!' : 'Sao chép 1-Click'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
