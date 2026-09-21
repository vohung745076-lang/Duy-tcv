import { useState, useEffect, useMemo } from 'react';
import {
  Trophy,
  History,
  Users,
  CheckCircle2,
  Clock,
  TrendingUp,
  Search,
  Filter,
  BarChart3,
  Award,
  Sparkles,
} from 'lucide-react';
import { analyticsApi } from '../services/api';
import type { CandidateRanking, AuditLog, Job } from '../types';

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
  const [scoreFilter, setScoreFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');

  useEffect(() => {
    fetchData();
  }, [activeJob.id, showAuditOnly]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (showAuditOnly) {
        const logs = await analyticsApi.getAuditLogs();
        setAuditLogs(logs);
      } else {
        const res = await analyticsApi.getRanking(activeJob.id);
        setRankings(res.rankings);
      }
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  // Metrics KPI calculations
  const totalApplicants = rankings.length;
  const highMatchCount = rankings.filter((r) => r.final_score >= 80).length;
  const shortlistedCount = rankings.filter((r) => r.status === 'SHORTLISTED' || r.final_score >= 70).length;
  const passRate = totalApplicants > 0 ? Math.round((shortlistedCount / totalApplicants) * 100) : 0;
  const minutesSaved = totalApplicants * 15; // Ước tính tiết kiệm 15 phút mỗi CV

  // Filtered rankings
  const filteredRankings = useMemo(() => {
    return rankings.filter((r) => {
      const matchSearch =
        r.masked_name.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        r.original_filename.toLowerCase().includes(searchKeyword.toLowerCase());

      if (!matchSearch) return false;

      if (scoreFilter === 'high') return r.final_score >= 80;
      if (scoreFilter === 'medium') return r.final_score >= 60 && r.final_score < 80;
      if (scoreFilter === 'low') return r.final_score < 60;
      return true;
    });
  }, [rankings, searchKeyword, scoreFilter]);

  if (loading) {
    return (
      <div className="p-16 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-3">
        <Sparkles className="w-8 h-8 text-blue-400 animate-spin" />
        <span>Đang tải số liệu Bảng xếp hạng & Phân tích tuyển dụng...</span>
      </div>
    );
  }

  if (showAuditOnly) {
    return (
      <div className="p-6 space-y-6">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <History className="w-5 h-5 text-purple-400" /> Nhật ký Kiểm toán Hoạt động (Audit Trail Log)
              </h2>
              <p className="text-xs text-slate-400">
                Ghi vết bất biến toàn bộ hành động chấm điểm AI và các can thiệp ghi đè (Override) từ HR để đảm bảo tính minh bạch.
              </p>
            </div>
            <span className="px-3 py-1 bg-purple-500/10 text-purple-300 border border-purple-500/20 text-xs font-semibold rounded-full">
              {auditLogs.length} sự kiện kiểm toán
            </span>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-800">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-semibold bg-slate-950/80">
                  <th className="p-3.5">Thời gian</th>
                  <th className="p-3.5">Tác tử (Actor)</th>
                  <th className="p-3.5">Hành động</th>
                  <th className="p-3.5">Điểm cũ → Điểm mới</th>
                  <th className="p-3.5">Lý do giải trình (Justification)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-500">Chưa có bản ghi nhật ký audit nào.</td>
                  </tr>
                ) : (
                  auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-800/40 text-slate-300 transition-colors">
                      <td className="p-3.5 font-mono text-[11px] text-slate-400">
                        {new Date(log.created_at).toLocaleString('vi-VN')}
                      </td>
                      <td className="p-3.5 font-semibold text-cyan-400">{log.user_id || 'HR_RECRUITER'}</td>
                      <td className="p-3.5">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          log.action === 'HR_SCORE_OVERRIDE'
                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                            : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                        }`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="p-3.5 font-mono">
                        {log.old_value?.score ?? 'N/A'}% → <strong className="text-purple-400">{log.new_value?.score ?? 'N/A'}%</strong>
                      </td>
                      <td className="p-3.5 text-slate-200 max-w-sm">{log.justification || 'N/A'}</td>
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

  return (
    <div className="p-6 space-y-6">
      {/* 4 Metric KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700/80 rounded-2xl p-5 shadow-xl relative overflow-hidden group hover:border-blue-500/60 transition-all duration-300">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Tổng số Hồ sơ</span>
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-black text-white">{totalApplicants}</span>
            <span className="text-xs text-blue-400 ml-2 font-medium">hồ sơ nộp</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-emerald-400" /> Tự động bóc tách và che mờ PII
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700/80 rounded-2xl p-5 shadow-xl relative overflow-hidden group hover:border-emerald-500/60 transition-all duration-300">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Tỷ lệ Đạt chuẩn</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-black text-emerald-400">{passRate}%</span>
            <span className="text-xs text-slate-400 ml-2 font-medium">({shortlistedCount}/{totalApplicants})</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500">Ứng viên có điểm tương thích ≥ 70%</div>
        </div>

        <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700/80 rounded-2xl p-5 shadow-xl relative overflow-hidden group hover:border-cyan-500/60 transition-all duration-300">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Thời gian tiết kiệm</span>
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-black text-cyan-400">~{minutesSaved}</span>
            <span className="text-xs text-slate-400 ml-2 font-medium">phút làm việc</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500">Giảm từ 15 phút xuống 10 giây/CV</div>
        </div>

        <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700/80 rounded-2xl p-5 shadow-xl relative overflow-hidden group hover:border-purple-500/60 transition-all duration-300">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Phù hợp Xuất sắc</span>
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Award className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-black text-purple-400">{highMatchCount}</span>
            <span className="text-xs text-slate-400 ml-2 font-medium">ứng viên Top Tier</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500">Điểm tương thích ≥ 80%</div>
        </div>
      </div>

      {/* Funnel & Visual Analytics Bar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recruitment Funnel */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
          <h3 className="font-bold text-white text-sm flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-blue-400" /> Phễu Tuyển dụng Tự động (Recruitment Funnel)
          </h3>
          <div className="space-y-2.5 pt-1">
            <div>
              <div className="flex justify-between text-xs text-slate-300 mb-1">
                <span>1. Tiếp nhận hồ sơ qua PDF / Google Forms</span>
                <strong>{totalApplicants} (100%)</strong>
              </div>
              <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-blue-600 rounded-full transition-all duration-700" style={{ width: '100%' }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs text-slate-300 mb-1">
                <span>2. AI thẩm định & trích xuất bằng chứng</span>
                <strong>{totalApplicants} (100%)</strong>
              </div>
              <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-cyan-500 rounded-full transition-all duration-700" style={{ width: '100%' }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs text-slate-300 mb-1">
                <span>3. Ứng viên đạt tiêu chuẩn (≥ 70%)</span>
                <strong>{shortlistedCount} ({passRate}%)</strong>
              </div>
              <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full transition-all duration-700" style={{ width: `${passRate}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs text-slate-300 mb-1">
                <span>4. Ứng viên Top Tier đề xuất phỏng vấn ngay (≥ 80%)</span>
                <strong>{highMatchCount} ({totalApplicants > 0 ? Math.round((highMatchCount / totalApplicants) * 100) : 0}%)</strong>
              </div>
              <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-purple-500 rounded-full transition-all duration-700" style={{ width: `${totalApplicants > 0 ? (highMatchCount / totalApplicants) * 100 : 0}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* Skills Summary Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
          <h3 className="font-bold text-white text-sm flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" /> Tiêu chí Trọng tâm JD
          </h3>
          <p className="text-xs text-slate-400">
            Vị trí: <strong className="text-cyan-400">{activeJob.title}</strong>
          </p>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between p-2 bg-slate-800/60 rounded-xl">
              <span className="text-slate-400">Kỹ năng bắt buộc:</span>
              <strong className="text-slate-200">{activeJob.criteria.required_skills.length} skills</strong>
            </div>
            <div className="flex justify-between p-2 bg-slate-800/60 rounded-xl">
              <span className="text-slate-400">Kinh nghiệm tối thiểu:</span>
              <strong className="text-slate-200">{activeJob.criteria.min_years_experience}+ năm</strong>
            </div>
            <div className="flex justify-between p-2 bg-slate-800/60 rounded-xl">
              <span className="text-slate-400">Học vấn:</span>
              <strong className="text-slate-200 truncate max-w-[120px]">{activeJob.criteria.education_level}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Leaderboard Table Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-400" /> Bảng xếp hạng Ứng viên Tuyển dụng (Leaderboard)
            </h2>
            <p className="text-xs text-slate-400">
              Sắp xếp tự động theo Điểm quyết định cuối cùng (ưu tiên điểm HR can thiệp)
            </p>
          </div>

          {/* Search & Filter Controls */}
          <div className="flex items-center gap-2.5 w-full sm:w-auto text-xs">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                placeholder="Tìm ứng viên / file CV..."
                className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-white focus:outline-none focus:border-blue-500 text-xs"
              />
            </div>

            <div className="flex items-center gap-1 bg-slate-800 border border-slate-700 rounded-xl px-2 py-1">
              <Filter className="w-3.5 h-3.5 text-slate-400 ml-1" />
              <select
                value={scoreFilter}
                onChange={(e) => setScoreFilter(e.target.value as any)}
                className="bg-transparent text-slate-300 text-xs py-1 px-1 focus:outline-none"
              >
                <option value="all" className="bg-slate-800">Tất cả điểm</option>
                <option value="high" className="bg-slate-800">Điểm cao (≥ 80%)</option>
                <option value="medium" className="bg-slate-800">Điểm khá (60-79%)</option>
                <option value="low" className="bg-slate-800">Điểm thấp (&lt; 60%)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-800">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-semibold bg-slate-950/80">
                <th className="p-3.5 text-center">Hạng</th>
                <th className="p-3.5">Ứng viên (Bí danh PII)</th>
                <th className="p-3.5 text-center">Kỹ năng</th>
                <th className="p-3.5 text-center">Kinh nghiệm</th>
                <th className="p-3.5 text-center">Học vấn</th>
                <th className="p-3.5 text-center">Điểm AI</th>
                <th className="p-3.5 text-center">Điểm Quyết định (Final)</th>
                <th className="p-3.5 text-center">Trạng thái</th>
                <th className="p-3.5 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredRankings.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-10 text-center text-slate-500">
                    {searchKeyword || scoreFilter !== 'all'
                      ? 'Không tìm thấy ứng viên phù hợp với bộ lọc.'
                      : 'Chưa có ứng viên nào trong danh sách.'}
                  </td>
                </tr>
              ) : (
                filteredRankings.map((cand) => (
                  <tr key={cand.candidate_id} className="hover:bg-slate-800/40 text-slate-300 transition-colors">
                    <td className="p-3.5 text-center font-bold text-sm">
                      {cand.rank === 1 ? (
                        <span className="text-amber-400 font-black">🥇 #1</span>
                      ) : cand.rank === 2 ? (
                        <span className="text-slate-300 font-black">🥈 #2</span>
                      ) : cand.rank === 3 ? (
                        <span className="text-amber-600 font-black">🥉 #3</span>
                      ) : (
                        `#${cand.rank}`
                      )}
                    </td>
                    <td className="p-3.5 font-bold text-white">
                      {cand.masked_name}
                      <span className="block text-[10px] text-slate-400 font-normal truncate max-w-[150px]">
                        {cand.original_filename}
                      </span>
                    </td>
                    <td className="p-3.5 text-center font-mono">{cand.skills_score}%</td>
                    <td className="p-3.5 text-center font-mono">{cand.experience_score}%</td>
                    <td className="p-3.5 text-center font-mono">{cand.education_score}%</td>
                    <td className="p-3.5 text-center font-mono text-blue-400">{cand.ai_score}%</td>
                    <td className="p-3.5 text-center font-mono font-bold text-sm">
                      <span className={cand.is_overridden ? 'text-purple-400' : 'text-emerald-400'}>
                        {cand.final_score}%
                      </span>
                      {cand.is_overridden && (
                        <span className="block text-[9px] text-purple-300 font-sans font-normal">(HR Overridden)</span>
                      )}
                    </td>
                    <td className="p-3.5 text-center">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                        cand.status === 'SHORTLISTED' || cand.final_score >= 70
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                      }`}>
                        {cand.status === 'SHORTLISTED' || cand.final_score >= 70 ? 'Phù hợp phỏng vấn' : 'Cần xem xét thêm'}
                      </span>
                    </td>
                    <td className="p-3.5 text-right">
                      <button
                        onClick={() => onSelectCandidateToWorkspace(cand.candidate_id)}
                        className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-500/20 transition-all"
                      >
                        Mở Split-View ↗
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
