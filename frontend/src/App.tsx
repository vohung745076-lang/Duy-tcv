import { useCallback, useEffect, useState } from 'react';
import { ShieldCheck, LogIn } from 'lucide-react';
import { AppSidebar, type AppNavTab } from './components/layout/AppSidebar';
import { AppHeader } from './components/layout/AppHeader';
import { CreateJobModal } from './components/CreateJobModal';
import { CandidateUploadModal } from './components/CandidateUploadModal';
import { JobsView } from './components/JobsView';
import { SplitViewWorkspace } from './components/SplitViewWorkspace';
import { DashboardView } from './components/DashboardView';
import { AuthModal } from './components/auth/AuthModal';
import { AuthErrorBanner } from './components/auth/AuthErrorBanner';
import { PendingApprovalGate } from './components/auth/PendingApprovalGate';
import { JobExportModal } from './components/jobs/JobExportModal';
import { MonthlyCandidatesView } from './components/candidates/MonthlyCandidatesView';
import { CandidatesManagementView } from './components/candidates/CandidatesManagementView';
import { jobApi, candidateApi, evaluationApi } from './services/api';
import type { Job, Candidate } from './types';
import { supabase, authService, type UserProfile } from './services/supabase';
import { parseOAuthCallback, translateOAuthError, cleanOAuthUrl } from './utils/oauthHandler';

export function App() {
  const [activeTab, setActiveTab] = useState<AppNavTab>('dashboard');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [activeJob, setActiveJob] = useState<Job | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);

  // User Auth Profile State (Supabase RBAC) - Không dùng tài khoản ảo
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(true);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authErrorMessage, setAuthErrorMessage] = useState<string | null>(null);

  // Job Export State
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportJob, setExportJob] = useState<Job | null>(null);

  // Modals state
  const [createJobOpen, setCreateJobOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [evaluatingCandidateId, setEvaluatingCandidateId] = useState<string | null>(null);

  const fetchJobs = useCallback(async () => {
    try {
      const data = await jobApi.list();
      setJobs(data);
      if (data.length > 0) {
        setActiveJob((currentJob) => currentJob ?? data[0]);
      }
    } catch (err) {
      console.error('Failed to load jobs:', err);
    }
  }, []);

  const fetchCandidates = useCallback(async (jobId: string) => {
    try {
      const data = await candidateApi.listByJob(jobId);
      setCandidates(data);
    } catch (err) {
      console.error('Failed to load candidates:', err);
    }
  }, []);

  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefreshAll = async () => {
    if (!currentUser) return;
    setIsRefreshing(true);
    try {
      await fetchJobs();
      if (activeJob) {
        await fetchCandidates(activeJob.id);
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  // Lắng nghe phiên đăng nhập thực tế từ Supabase & Bóc tách kết quả OAuth Callback
  useEffect(() => {
    let isMounted = true;

    // 1. Kiểm tra URL Callback từ Google OAuth
    const callback = parseOAuthCallback();
    if (callback.hasCallback) {
      if (callback.error || callback.errorDescription) {
        const errorText = translateOAuthError(callback.error, callback.errorDescription);
        setAuthErrorMessage(errorText);
        cleanOAuthUrl();
        setIsAuthChecking(false);
      } else if (callback.code) {
        // Tự động hoàn tất trao đổi Auth Code lấy Session thật
        supabase.auth.exchangeCodeForSession(callback.code).then(({ error }) => {
          cleanOAuthUrl();
          if (error) {
            console.error('Lỗi khi hoàn tất xác thực Google:', error);
            setAuthErrorMessage(translateOAuthError(error.message));
            setIsAuthChecking(false);
          }
        }).catch((err) => {
          cleanOAuthUrl();
          console.error('Lỗi mạng khi xác thực code:', err);
          setIsAuthChecking(false);
        });
      }
    }

    // 2. Lấy Session hiện tại
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!isMounted) return;
      if (session?.user) {
        authService.fetchOrCreateProfile(session.user).then((profile) => {
          if (isMounted) {
            setCurrentUser(profile);
            setAuthModalOpen(false);
            setAuthErrorMessage(null);
            setIsAuthChecking(false);
          }
        }).catch((err) => {
          console.error('Lỗi lấy profile:', err);
          if (isMounted) {
            setCurrentUser(null);
            setIsAuthChecking(false);
          }
        });
      } else {
        if (!callback.code) {
          setCurrentUser(null);
          setIsAuthChecking(false);
        }
      }
    }).catch(() => {
      if (isMounted) {
        setCurrentUser(null);
        setIsAuthChecking(false);
      }
    });

    // 3. Lắng nghe thay đổi trạng thái đăng nhập
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        authService.fetchOrCreateProfile(session.user).then((profile) => {
          setCurrentUser(profile);
          setAuthModalOpen(false); // Tự động đóng Modal khi đăng nhập Google thành công
          setAuthErrorMessage(null);
          setIsAuthChecking(false);
        }).catch((err) => {
          console.error('Lỗi nạp profile onAuthStateChange:', err);
          setCurrentUser(null);
          setIsAuthChecking(false);
        });
      } else if (event === 'SIGNED_OUT') {
        setCurrentUser(null);
        setIsAuthChecking(false);
      }
    });

    // Lắng nghe sự kiện từ chối quyền hoặc token hết hạn (401)
    const handleUnauthorized = () => {
      setCurrentUser(null);
      setAuthModalOpen(true);
    };
    window.addEventListener('auth:unauthorized', handleUnauthorized);

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
    };
  }, []);

  // Chỉ gọi API tải dữ liệu sau khi tài khoản đã được phê duyệt (ADMIN hoặc RECRUITER)
  useEffect(() => {
    if (currentUser && currentUser.role !== 'PENDING') {
      void fetchJobs();
    } else {
      setJobs([]);
      setActiveJob(null);
      setCandidates([]);
      setSelectedCandidate(null);
    }
  }, [currentUser, fetchJobs]);

  useEffect(() => {
    if (currentUser && currentUser.role !== 'PENDING' && activeJob) {
      void fetchCandidates(activeJob.id);
    }
  }, [currentUser, activeJob, fetchCandidates]);

  // Tự động đồng bộ đa người dùng khi chuyển tab (chỉ chạy với tài khoản đã được duyệt)
  useEffect(() => {
    if (!currentUser || currentUser.role === 'PENDING') return;

    const handleSync = () => {
      void fetchJobs();
      if (activeJob) {
        void fetchCandidates(activeJob.id);
      }
    };

    window.addEventListener('focus', handleSync);
    const interval = setInterval(handleSync, 10000);

    return () => {
      window.removeEventListener('focus', handleSync);
      clearInterval(interval);
    };
  }, [currentUser, activeJob, fetchJobs, fetchCandidates]);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } finally {
      setCurrentUser(null);
      setJobs([]);
      setActiveJob(null);
      setCandidates([]);
      setSelectedCandidate(null);
    }
  };

  // Tra cứu lại trạng thái hồ sơ trực tiếp từ Supabase để tự động mở khóa khi Admin vừa duyệt
  const handleRecheckProfile = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const profile = await authService.fetchOrCreateProfile(session.user);
      setCurrentUser(profile);
      if (profile.role !== 'PENDING') {
        await fetchJobs();
      }
    }
  };

  const handleJobCreated = (newJob: Job) => {
    setJobs([newJob, ...jobs]);
    setActiveJob(newJob);
    setActiveTab('jobs');
  };

  const handleDeleteJob = async (jobId: string) => {
    try {
      await jobApi.delete(jobId);
      const remainingJobs = jobs.filter((j) => j.id !== jobId);
      setJobs(remainingJobs);
      if (activeJob?.id === jobId) {
        setActiveJob(remainingJobs.length > 0 ? remainingJobs[0] : null);
      }
    } catch (err: any) {
      console.error('Failed to delete job:', err);
      const msg = err?.response?.data?.detail || 'Không thể xóa vị trí tuyển dụng này.';
      alert(msg);
    }
  };

  const handleCandidatesUploaded = (newCandidates: Candidate[]) => {
    setCandidates([...newCandidates, ...candidates]);
    if (activeJob) {
      void fetchCandidates(activeJob.id);
    }
  };

  const handleSelectCandidateToWorkspace = (c: Candidate) => {
    setSelectedCandidate(c);
    setActiveTab('workspace');
  };

  const handleSelectCandidateById = (id: string) => {
    const found = candidates.find((c) => c.id === id);
    if (found) {
      setSelectedCandidate(found);
      setActiveTab('workspace');
    }
  };

  const handleRunAiEvaluation = async (candId: string) => {
    setEvaluatingCandidateId(candId);
    try {
      await evaluationApi.process(candId);
      if (activeJob) {
        await fetchCandidates(activeJob.id);
      }
    } catch (err: any) {
      console.error('Lỗi khi chấm điểm CV bằng AI:', err);
      const detail = err?.response?.data?.detail || 'Lỗi khi kích hoạt AI chấm điểm CV.';
      alert(detail);
    } finally {
      setEvaluatingCandidateId(null);
    }
  };

  const handleOpenExportJob = (job: Job) => {
    setExportJob(job);
    setExportModalOpen(true);
  };

  // Màn hình chờ kiểm tra phiên làm việc ban đầu
  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-300 gap-4">
        <div className="w-10 h-10 border-4 border-blue-500/20 border-t-cyan-400 rounded-full animate-spin" />
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Đang khởi tạo phiên làm việc bảo mật...
        </p>
      </div>
    );
  }

  const effectiveCandidate = selectedCandidate || (candidates.length > 0 ? candidates[0] : null);

  return (
    <div className="min-h-screen bg-[#0D0F14] text-white flex flex-col font-sans">
      {/* App Sidebar cố định bên trái (Desktop) hoặc Drawer (Mobile) */}
      {currentUser && currentUser.role !== 'PENDING' && (
        <AppSidebar
          activeTab={activeTab}
          onSelectTab={(tab) => {
            setActiveTab(tab);
            setMobileSidebarOpen(false);
          }}
          currentUser={currentUser}
          onLogout={handleLogout}
          onOpenAuth={() => setAuthModalOpen(true)}
          isOpenMobile={mobileSidebarOpen}
          onCloseMobile={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Main Container với padding bên trái cho Sidebar trên màn hình lớn */}
      <div className={`flex-1 flex flex-col min-h-screen ${currentUser && currentUser.role !== 'PENDING' ? 'lg:pl-64' : ''}`}>
        {/* Top Header */}
        <AppHeader
          activeJob={activeJob}
          jobs={jobs}
          onSelectJob={(job) => setActiveJob(job)}
          currentUser={currentUser}
          onOpenCreateJob={() => {
            if (!currentUser) {
              setAuthModalOpen(true);
              return;
            }
            if (currentUser.role === 'PENDING') {
              alert('Tài khoản của bạn đang ở trạng thái Chờ duyệt. Vui lòng liên hệ Quản trị viên để được cấp quyền Tạo JD.');
              return;
            }
            setCreateJobOpen(true);
          }}
          onOpenUpload={() => {
            if (!currentUser) {
              setAuthModalOpen(true);
              return;
            }
            if (currentUser.role === 'PENDING') {
              alert('Tài khoản của bạn đang ở trạng thái Chờ duyệt. Vui lòng liên hệ Quản trị viên để được cấp quyền Nạp CV.');
              return;
            }
            setUploadOpen(true);
          }}
          onRefresh={handleRefreshAll}
          isRefreshing={isRefreshing}
          onToggleMobileSidebar={() => setMobileSidebarOpen((prev) => !prev)}
        />

        {/* Thông báo lỗi đăng nhập Google nếu có */}
        <AuthErrorBanner
          message={authErrorMessage || ''}
          onDismiss={() => setAuthErrorMessage(null)}
          onRetry={() => {
            setAuthErrorMessage(null);
            setAuthModalOpen(true);
          }}
        />

        {/* MAIN VIEW - Gatekeeper nếu chưa đăng nhập hoặc chờ duyệt */}
        <main className="flex-1 flex flex-col">
          {!currentUser ? (
            <div className="flex-1 flex items-center justify-center p-4">
              <div className="bg-[#161922] border border-[#242834] rounded-3xl p-6 sm:p-10 max-w-md w-full text-center shadow-2xl space-y-6">
                <div className="w-16 h-16 rounded-2xl bg-[#1E293B] border border-[#60A5FA]/40 flex items-center justify-center mx-auto shadow-xl shadow-[#60A5FA]/15">
                  <ShieldCheck className="w-8 h-8 text-[#60A5FA]" />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-white">Hệ Thống Tuyển Dụng AI</h2>
                  <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed">
                    Khu vực kiểm soát và đối soát hồ sơ ứng viên bảo mật. Vui lòng đăng nhập bằng tài khoản HR hoặc Quản trị viên để truy cập dữ liệu.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setAuthModalOpen(true)}
                  className="w-full py-3 px-6 bg-[#1E293B] hover:bg-slate-700 text-white border border-[#60A5FA]/50 rounded-xl font-bold text-sm shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <LogIn className="w-4 h-4 text-[#60A5FA]" />
                  <span>Đăng Nhập Tài Khoản HR</span>
                </button>
                <p className="text-[11px] text-slate-400">
                  Chính sách bảo mật dữ liệu ứng viên & phân quyền RBAC theo quy định tuyển dụng
                </p>
              </div>
            </div>
          ) : currentUser.role === 'PENDING' ? (
            <PendingApprovalGate
              currentUser={currentUser}
              onRecheck={handleRecheckProfile}
              onLogout={handleLogout}
            />
          ) : (
            <>
              {/* Tab 1: Dashboard (Bảng Điều Khiển Tuyển Dụng AI) */}
              {activeTab === 'dashboard' && activeJob && (
                <DashboardView
                  activeJob={activeJob}
                  onSelectCandidateToWorkspace={handleSelectCandidateById}
                />
              )}

              {/* Tab: Quản lý Hồ sơ Ứng viên (Dark Enterprise SaaS) */}
              {activeTab === 'candidates' && (
                <CandidatesManagementView
                  jobs={jobs}
                  activeJob={activeJob}
                  onSelectJob={(job) => setActiveJob(job)}
                  candidates={candidates}
                  onSelectCandidateToWorkspace={handleSelectCandidateToWorkspace}
                  onOpenUploadModal={() => setUploadOpen(true)}
                  onRunAiEvaluation={handleRunAiEvaluation}
                  evaluatingCandidateId={evaluatingCandidateId}
                  currentUser={currentUser}
                  onRefreshCandidates={() => {
                    if (activeJob) fetchCandidates(activeJob.id);
                  }}
                />
              )}

              {/* Tab 2: Tin tuyển dụng (Quản lý Vị trí & JD) */}
              {activeTab === 'jobs' && (
                <JobsView
                  jobs={jobs}
                  activeJob={activeJob}
                  onSelectJob={(job) => setActiveJob(job)}
                  onOpenCreateJob={() => {
                    if (currentUser.role === 'PENDING') {
                      alert('Tài khoản của bạn đang ở trạng thái Chờ duyệt. Vui lòng liên hệ Quản trị viên để được cấp quyền Tạo JD.');
                      return;
                    }
                    setCreateJobOpen(true);
                  }}
                  onOpenExportJob={handleOpenExportJob}
                  onDeleteJob={handleDeleteJob}
                  candidates={candidates}
                  onSelectCandidateToWorkspace={handleSelectCandidateToWorkspace}
                  onRunAiEvaluation={handleRunAiEvaluation}
                  evaluatingCandidateId={evaluatingCandidateId}
                />
              )}

              {/* Tab 3: Sàng lọc AI (Workspace Thẩm định 2 Cột) */}
              {activeTab === 'workspace' && effectiveCandidate && activeJob && (
                <SplitViewWorkspace
                  candidate={effectiveCandidate}
                  activeJob={activeJob}
                  candidates={candidates}
                  currentUser={currentUser}
                  onSelectCandidate={(c) => setSelectedCandidate(c)}
                  onEvaluationUpdated={() => {
                    if (activeJob) fetchCandidates(activeJob.id);
                  }}
                />
              )}

              {activeTab === 'workspace' && !effectiveCandidate && activeJob && (
                <div className="p-16 text-center text-slate-400 text-xs sm:text-sm space-y-3">
                  <p>Vị trí này chưa có ứng viên nào để hiển thị Workspace.</p>
                  <button
                    type="button"
                    onClick={() => setUploadOpen(true)}
                    className="px-4 py-2 bg-[#1E293B] text-white rounded-xl font-bold border border-[#60A5FA]/40"
                  >
                    + Nạp hồ sơ CV ngay
                  </button>
                </div>
              )}

              {/* Tab 4: Báo cáo Tuyển dụng theo tháng */}
              {activeTab === 'monthly' && (
                <MonthlyCandidatesView currentUser={currentUser} />
              )}

              {/* Tab 5: Nhật ký Hoạt động & Kiểm toán (Audit Logs) */}
              {activeTab === 'audit' && activeJob && (
                <DashboardView
                  activeJob={activeJob}
                  onSelectCandidateToWorkspace={handleSelectCandidateById}
                  showAuditOnly={true}
                />
              )}

              {/* Tab 6: Cài đặt & Thông tin HR */}
              {activeTab === 'settings' && (
                <div className="p-4 sm:p-6 max-w-3xl space-y-5">
                  <div className="bg-[#161922] border border-[#242834] rounded-2xl p-5 shadow-xl space-y-4">
                    <h2 className="text-base sm:text-lg font-bold text-white">Cài Đặt Hệ Thống & Phân Quyền HR</h2>
                    <p className="text-xs text-slate-300">
                      Thông tin tài khoản đang đăng nhập và chính sách bảo mật dữ liệu ứng viên.
                    </p>

                    <div className="p-4 bg-[#141720] rounded-xl border border-[#242834] space-y-3 text-xs">
                      <div className="flex justify-between py-1 border-b border-[#242834]/80">
                        <span className="text-slate-400">Họ và tên:</span>
                        <strong className="text-white">{currentUser.full_name}</strong>
                      </div>
                      <div className="flex justify-between py-1 border-b border-[#242834]/80">
                        <span className="text-slate-400">Email:</span>
                        <strong className="text-white">{currentUser.email}</strong>
                      </div>
                      <div className="flex justify-between py-1 border-b border-[#242834]/80">
                        <span className="text-slate-400">Vai trò RBAC:</span>
                        <span className="px-2 py-0.5 rounded-full bg-[#064E3B] text-[#34D399] font-bold text-[10px]">
                          {currentUser.role === 'ADMIN' ? 'QUẢN TRỊ VIÊN (ADMIN)' : 'NHÂN SỰ (RECRUITER)'}
                        </span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-slate-400">Chế độ AI:</span>
                        <span className="text-cyan-300 font-semibold">Human-in-the-loop (Minh bạch 100%)</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* Supabase Authentication Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onAuthSuccess={(user) => {
          setCurrentUser(user);
          setAuthModalOpen(false);
        }}
      />

      {/* Job Multi-Platform Export Modal */}
      <JobExportModal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        job={exportJob}
      />

      {/* Create Job Modal */}
      <CreateJobModal
        isOpen={createJobOpen}
        onClose={() => setCreateJobOpen(false)}
        onCreated={handleJobCreated}
      />

      {/* Candidate Upload & Google Sheet Sync Modal */}
      <CandidateUploadModal
        isOpen={uploadOpen}
        activeJob={activeJob}
        onClose={() => setUploadOpen(false)}
        onUploaded={handleCandidatesUploaded}
      />
    </div>
  );
}

export default App;
