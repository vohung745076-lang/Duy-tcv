import { useState } from 'react';
import { X, Copy, Check, Download, Share2, Globe, Briefcase, MessageSquare } from 'lucide-react';
import type { Job } from '../../types';

interface JobExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: Job | null;
}

export const JobExportModal: React.FC<JobExportModalProps> = ({ isOpen, onClose, job }) => {
  const [platform, setPlatform] = useState<'topcv' | 'linkedin' | 'social'>('linkedin');
  const [copied, setCopied] = useState(false);

  if (!isOpen || !job) return null;

  const generateContent = () => {
    const { title, department, criteria } = job;
    const skillsList = criteria.required_skills.join(', ');
    const prefSkillsList = criteria.preferred_skills.join(', ');
    const expYears = criteria.min_years_experience;
    const edu = criteria.education_level;

    if (platform === 'topcv') {
      return `[TUYỂN DỤNG] ${title.toUpperCase()}
Phòng ban: ${department || 'Phát triển Phần mềm'}
Địa điểm: Hà Nội / TP.HCM / Hybrid

1. MÔ TẢ CÔNG VIỆC:
- Trực tiếp tham gia thiết kế, phát triển và tối ưu hóa hệ thống microservices.
- Phối hợp cùng Product Owner, Tech Lead để triển khai các tính năng mới theo chuẩn Agile.
- Đảm bảo chất lượng mã nguồn, viết Unit Test và tối ưu hiệu năng cơ sở dữ liệu.

2. YÊU CẦU ỨNG VIÊN:
- Có tối thiểu ${expYears} năm kinh nghiệm thực tế với vị trí tương đương.
- Thành thạo các kỹ năng chuyên môn cốt lõi: ${skillsList}.
${prefSkillsList ? `- Ưu tiên ứng viên có kiến thức hoặc kinh nghiệm về: ${prefSkillsList}.` : ''}
- Trình độ học vấn: ${edu}.
- Tinh thần trách nhiệm cao, tư duy giải quyết vấn đề tốt.

3. QUYỀN LỢI & CHẾ ĐỘ:
- Mức lương cạnh tranh theo năng lực (Thỏa thuận $1,500 - $3,000).
- Thưởng hiệu suất hàng quý, lương tháng 13+.
- Gói bảo hiểm sức khỏe cao cấp cho nhân viên & người thân.
- Review lương định kỳ 2 lần/năm.

📩 ỨNG TUYỂN NGAY: Gửi CV về email hr@company.com hoặc nộp trực tiếp qua hệ thống!`;
    }

    if (platform === 'linkedin') {
      return `🚀 We're Hiring: ${title}!

Are you looking for an impactful opportunity to build scalable, high-performance systems? Join our dynamic engineering team today!

Key Highlights:
🔹 Role: ${title}
🔹 Department: ${department || 'Engineering'}
🔹 Experience: ${expYears}+ years
🔹 Tech Stack: ${skillsList}

What we're looking for:
• Strong hands-on experience in ${skillsList}.
${prefSkillsList ? `• Bonus points for: ${prefSkillsList}.` : ''}
• Degree in ${edu} or equivalent practical background.
• Passion for clean code, robust architecture, and teamwork.

What we offer:
✨ Attractive compensation package & bi-annual performance bonuses.
✨ Hybrid flexible working mode.
✨ Comprehensive health insurance & annual training budget.

👉 Apply directly or drop your CV to: hr@company.com
Let's build the future together!

#Hiring #${title.replace(/\s+/g, '')} #TechJobs #SoftwareEngineering #CareerOpportunity #JoinOurTeam`;
    }

    // Social (Facebook / Zalo)
    return `🔥 [HOT JOB] CHÚNG MÌNH TÌM KIẾM ĐỒNG ĐỘI: ${title.toUpperCase()} 🔥

Bạn đang tìm kiếm môi trường công nghệ xịn sò, đãi ngộ hấp dẫn và đồng nghiệp thân thiện? Đừng bỏ lỡ cơ hội này nhé!

💼 Vị trí: ${title}
🏢 Phòng ban: ${department || 'Công nghệ'}
💰 Thu nhập: Deal trực tiếp theo năng lực (Up to $3,000)

🎯 ĐIỀU KIỆN ỨNG TUYỂN:
✅ Kinh nghiệm từ ${expYears} năm trở lên
✅ Chiến tốt các công nghệ: ${skillsList}
${prefSkillsList ? `✅ Điểm cộng nếu biết: ${prefSkillsList}\n` : ''}✅ Tốt nghiệp ${edu}

🎁 ĐÃI NGỘ XỊN XÒ:
⚡ Lương tháng 13 + Thưởng dự án
⚡ Du lịch hàng năm, teambuilding tẹt ga
⚡ Môi trường làm việc trẻ trung, năng động, thoải mái sáng tạo

👉 Nộp CV ngay tại bài viết này hoặc gửi về: hr@company.com!
Tag ngay bạn bè đang tìm việc vào bên dưới nhé! 👇`;
  };

  const content = generateContent();

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
    a.download = `JD_${job.title.replace(/\s+/g, '_')}_${platform}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-500 flex items-center justify-center text-white shadow-md">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Xuất tin Tuyển dụng Đa nền tảng</h3>
              <p className="text-xs text-slate-400">Đăng tải lên TopCV, LinkedIn hoặc Facebook chỉ với 1 click</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Platform Selector Tabs */}
        <div className="p-4 bg-slate-950/60 border-b border-slate-800 flex items-center gap-3">
          <button
            onClick={() => setPlatform('linkedin')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
              platform === 'linkedin'
                ? 'bg-[#0077B5] text-white shadow-lg shadow-blue-500/25'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Briefcase className="w-4 h-4" /> LinkedIn Post
          </button>
          <button
            onClick={() => setPlatform('topcv')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
              platform === 'topcv'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/25'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Globe className="w-4 h-4" /> TopCV / Job Portals
          </button>
          <button
            onClick={() => setPlatform('social')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
              platform === 'social'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <MessageSquare className="w-4 h-4" /> Facebook / Mạng xã hội
          </button>
        </div>

        {/* Content Box */}
        <div className="p-5 flex-1 overflow-y-auto">
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs text-slate-200 whitespace-pre-wrap leading-relaxed max-h-[380px] overflow-y-auto select-all">
            {content}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            Nội dung đã được chuẩn hóa tự động theo tiêu chuẩn từng kênh
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={handleDownload}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 flex items-center gap-1.5 transition-all"
            >
              <Download className="w-4 h-4" /> Tải file .txt
            </button>
            <button
              onClick={handleCopy}
              className="px-5 py-2 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-500/25 flex items-center gap-1.5 transition-all"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Đã sao chép vào Clipboard!' : 'Sao chép 1-Click'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
