import { useCallback, useEffect, useState } from 'react';
import { Navbar } from './components/Navbar';
import { CreateJobModal } from './components/CreateJobModal';
import { CandidateUploadModal } from './components/CandidateUploadModal';
import { JobsView } from './components/JobsView';
import { SplitViewWorkspace } from './components/SplitViewWorkspace';
import { DashboardView } from './components/DashboardView';
import { AuthModal } from './components/auth/AuthModal';
import { JobExportModal } from './components/jobs/JobExportModal';
import { jobApi, candidateApi, evaluationApi } from './services/api';
import type { Job, Candidate } from './types';
import type { UserProfile } from './services/supabase';

export function App() {
  const [activeTab, setActiveTab] = useState<'jobs' | 'workspace' | 'dashboard' | 'audit'>('jobs');
  const [jobs, setJobs] = useState<Job[]>([]);
  const [activeJob, setActiveJob] = useState<Job | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);

  // User Auth Profile State (Supabase RBAC)
  const [currentUser, setCurrentUser] = useState<UserProfile>({
    id: 'demo-hr-id',
    email: 'hr@company.com',
    full_name: 'Chuyên viên Tuyển dụng (HR)',
    role: 'RECRUITER',
  });
  const [authModalOpen, setAuthModalOpen] = useState(false);

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

  useEffect(() => {
    void fetchJobs();
  }, [fetchJobs]);

  useEffect(() => {
    if (activeJob) {
      void fetchCandidates(activeJob.id);
    }
  }, [activeJob, fetchCandidates]);

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
    } catch (err) {
      console.error('Failed to delete job:', err);
      alert('Không thể xóa vị trí tuyển dụng này.');
    }
  };

  const handleOpenExportJob = (job: Job) => {
    setExportJob(job);
    setExportModalOpen(true);
  };

  const handleCandidatesUploaded = (_newCandidates: Candidate[]) => {
    if (activeJob) {
      fetchCandidates(activeJob.id);
    }
  };

  const handleSelectCandidateToWorkspace = async (candidate: Candidate) => {
    setSelectedCandidate(candidate);
    setActiveTab('workspace');
  };

  const handleSelectCandidateById = (candidateId: string) => {
    const found = candidates.find((c) => c.id === candidateId);
    if (found) {
      setSelectedCandidate(found);
      setActiveTab('workspace');
    }
  };

  const handleRunAiEvaluation = async (candidateId: string) => {
    setEvaluatingCandidateId(candidateId);
    try {
      await evaluationApi.process(candidateId);
      if (activeJob) {
        fetchCandidates(activeJob.id);
      }
    } catch {
      alert('Không thể hoàn tất phân tích AI.');
    } finally {
      setEvaluatingCandidateId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-white w-full max-w-full overflow-x-hidden">
      <Navbar
        activeJob={activeJob}
        currentUser={currentUser}
        onOpenAuth={() => setAuthModalOpen(true)}
        onOpenCreateJob={() => setCreateJobOpen(true)}
        onOpenUpload={() => setUploadOpen(true)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      <main className="flex-1">
        {activeTab === 'jobs' && (
          <JobsView
            jobs={jobs}
            activeJob={activeJob}
            onSelectJob={(job) => setActiveJob(job)}
            onOpenCreateJob={() => setCreateJobOpen(true)}
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
      </main>

      {/* Supabase Authentication Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onAuthSuccess={(user) => setCurrentUser(user)}
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
