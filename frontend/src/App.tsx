import { useCallback, useEffect, useState } from 'react';
import { ShieldCheck, LogIn } from 'lucide-react';
import { Navbar } from './components/Navbar';
import { CreateJobModal } from './components/CreateJobModal';
import { CandidateUploadModal } from './components/CandidateUploadModal';
import { JobsView } from './components/JobsView';
import { SplitViewWorkspace } from './components/SplitViewWorkspace';
import { DashboardView } from './components/DashboardView';
import { AuthModal } from './components/auth/AuthModal';
import { AuthErrorBanner } from './components/auth/AuthErrorBanner';
import { JobExportModal } from './components/jobs/JobExportModal';
import { MonthlyCandidatesView } from './components/candidates/MonthlyCandidatesView';
import { jobApi, candidateApi, evaluationApi } from './services/api';
import type { Job, Candidate } from './types';
import { supabase, authService, type UserProfile } from './services/supabase';
import { parseOAuthCallback, translateOAuthError, cleanOAuthUrl } from './utils/oauthHandler';

export function App() {
  const [activeTab, setActiveTab] = useState<'jobs' | 'workspace' | 'dashboard' | 'audit' | 'monthly'>('jobs');
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

  // Chỉ gọi API tải dữ liệu sau khi đã xác thực người dùng thành công
  useEffect(() => {
    if (currentUser) {
      void fetchJobs();
    } else {
      setJobs([]);
      setActiveJob(null);
      setCandidates([]);
      setSelectedCandidate(null);
    }
  }, [currentUser, fetchJobs]);

  useEffect(() => {
    if (currentUser && activeJob) {
      void fetchCandidates(activeJob.id);
    }
  }, [currentUser, activeJob, fetchCandidates]);

  // Tự động đồng bộ đa người dùng khi chuyển tab
  useEffect(() => {
    if (!currentUser) return;

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

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col font-['Be_Vietnam_Pro',sans-serif]">
      {/* Top Navbar */}
      <Navbar
        activeJob={activeJob}
        currentUser={currentUser}
        onOpenAuth={() => setAuthModalOpen(true)}
        onLogout={handleLogout}
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
        activeTab={activeTab}
        setActiveTab={setActiveTab}
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

      {/* Warning Banner khi tài khoản Chờ duyệt */}
      {currentUser && currentUser.role === 'PENDING' && (
        <div className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-2 flex items-center justify-center text-xs text-amber-200">
          <div className="flex items-center gap-2 max-w-5xl mx-auto w-full">
            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold uppercase tracking-wider text-[10px] border border-amber-500/40 shrink-0">
              Chế độ chờ duyệt
            </span>
            <span className="text-amber-200">
              Tài khoản <strong>{currentUser.email}</strong> đang đợi Admin duyệt.
            </span>
          </div>
        </div>
      )}

      {/* MAIN VIEW - Gatekeeper nếu chưa đăng nhập */}
      <main className="flex-1 flex flex-col">
        {!currentUser ? (
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-10 max-w-md w-full text-center shadow-2xl space-y-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center mx-auto shadow-xl shadow-blue-500/25">
                <ShieldCheck className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white">Hệ Thống Tuyển Dụng Nội Bộ</h2>
                <p className="text-xs sm:text-sm text-slate-400 mt-2 leading-relaxed">
                  Khu vực kiểm soát và đối soát hồ sơ ứng viên bảo mật. Vui lòng đăng nhập bằng tài khoản HR hoặc Quản trị viên để truy cập dữ liệu.
                </p>
              </div>
              <button
                onClick={() => setAuthModalOpen(true)}
                className="w-full py-3 px-6 bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                <span>Đăng Nhập Tài Khoản HR</span>
              </button>
              <p className="text-[11px] text-slate-500">
                Chính sách bảo mật dữ liệu ứng viên & phân quyền RBAC theo quy định tuyển dụng
              </p>
            </div>
          </div>
        ) : (
          <>
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

            {activeTab === 'workspace' && selectedCandidate && activeJob && (
              <SplitViewWorkspace
                candidate={selectedCandidate}
                activeJob={activeJob}
                candidates={candidates}
                currentUser={currentUser}
                onSelectCandidate={(c) => setSelectedCandidate(c)}
                onEvaluationUpdated={() => {
                  if (activeJob) fetchCandidates(activeJob.id);
                }}
              />
            )}

            {activeTab === 'dashboard' && activeJob && (
              <DashboardView
                activeJob={activeJob}
                onSelectCandidateToWorkspace={handleSelectCandidateById}
              />
            )}

            {activeTab === 'audit' && activeJob && (
              <DashboardView
                activeJob={activeJob}
                onSelectCandidateToWorkspace={handleSelectCandidateById}
                showAuditOnly={true}
              />
            )}

            {activeTab === 'monthly' && (
              <MonthlyCandidatesView currentUser={currentUser} />
            )}
          </>
        )}
      </main>

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
