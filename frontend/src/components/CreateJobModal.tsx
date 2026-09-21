import React, { useState } from 'react';
import { X, Plus, Trash2, Sliders } from 'lucide-react';
import { jobApi } from '../services/api';
import type { Job } from '../types';

interface CreateJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (job: Job) => void;
}

export const CreateJobModal: React.FC<CreateJobModalProps> = ({ isOpen, onClose, onCreated }) => {
  const [title, setTitle] = useState('');
  const [department, setDepartment] = useState('');
  const [description, setDescription] = useState('');
  const [reqSkills, setReqSkills] = useState<string[]>(['Python', 'FastAPI', 'PostgreSQL']);
  const [newReqSkill, setNewReqSkill] = useState('');
  const [prefSkills, setPrefSkills] = useState<string[]>(['Docker', 'Redis']);
  const [newPrefSkill, setNewPrefSkill] = useState('');
  const [minExp, setMinExp] = useState(2);
  const [education, setEducation] = useState('Đại học chuyên ngành CNTT / Khoa học máy tính');
  
  const [skillWeight, setSkillWeight] = useState(0.5);
  const [expWeight, setExpWeight] = useState(0.3);
  const [eduWeight, setEduWeight] = useState(0.2);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleAddReqSkill = () => {
    if (newReqSkill.trim() && !reqSkills.includes(newReqSkill.trim())) {
      setReqSkills([...reqSkills, newReqSkill.trim()]);
      setNewReqSkill('');
    }
  };

  const handleAddPrefSkill = () => {
    if (newPrefSkill.trim() && !prefSkills.includes(newPrefSkill.trim())) {
      setPrefSkills([...prefSkills, newPrefSkill.trim()]);
      setNewPrefSkill('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    try {
      const createdJob = await jobApi.create({
        title,
        department,
        description,
        criteria: {
          weights: {
            skills: skillWeight,
            experience: expWeight,
            education: eduWeight,
          },
          required_skills: reqSkills,
          preferred_skills: prefSkills,
          min_years_experience: minExp,
          education_level: education,
        },
      });
      onCreated(createdJob);
      onClose();
    } catch (err) {
      alert('Không thể tạo Vị trí tuyển dụng. Vui lòng kiểm tra kết nối Server.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-6">
        <div className="flex items-center justify-between border-b border-slate-700 pb-4 mb-6">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Sliders className="w-5 h-5 text-blue-400" /> Tạo Vị trí Tuyển dụng (JD) & Tiêu chuẩn AI
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 text-xs text-slate-200">
          <div>
            <label className="block text-slate-300 font-semibold mb-1">Tên vị trí tuyển dụng (Job Title) *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ví dụ: Senior Python Backend Developer"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Mô tả tóm tắt công việc (Job Description)</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Mô tả nhiệm vụ chính..."
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Phòng ban (Department)</label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="Ví dụ: Trung tâm phần mềm"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Số năm kinh nghiệm tối thiểu</label>
              <input
                type="number"
                step="0.5"
                value={minExp}
                onChange={(e) => setMinExp(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Yêu cầu trình độ học vấn</label>
            <input
              type="text"
              value={education}
              onChange={(e) => setEducation(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Required Skills */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1">Kỹ năng bắt buộc (Required Skills)</label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={newReqSkill}
                onChange={(e) => setNewReqSkill(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddReqSkill(); } }}
                placeholder="Nhập kỹ năng và bấm Thêm..."
                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-blue-500"
              />
              <button
                type="button"
                onClick={handleAddReqSkill}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg flex items-center gap-1 font-medium"
              >
                <Plus className="w-4 h-4" /> Thêm
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {reqSkills.map((s) => (
                <span key={s} className="px-2.5 py-1 bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-full flex items-center gap-1.5">
                  {s}
                  <button type="button" onClick={() => setReqSkills(reqSkills.filter((x) => x !== s))}>
                    <Trash2 className="w-3 h-3 hover:text-red-400" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Preferred Skills */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1">Kỹ năng ưu tiên / điểm thưởng (Preferred Skills)</label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={newPrefSkill}
                onChange={(e) => setNewPrefSkill(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddPrefSkill(); } }}
                placeholder="Nhập kỹ năng cộng điểm..."
                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-blue-500"
              />
              <button
                type="button"
                onClick={handleAddPrefSkill}
                className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg flex items-center gap-1 font-medium"
              >
                <Plus className="w-4 h-4" /> Thêm
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {prefSkills.map((s) => (
                <span key={s} className="px-2.5 py-1 bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 rounded-full flex items-center gap-1.5">
                  {s}
                  <button type="button" onClick={() => setPrefSkills(prefSkills.filter((x) => x !== s))}>
                    <Trash2 className="w-3 h-3 hover:text-red-400" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Criteria Weights */}
          <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-700/60 space-y-3">
            <h4 className="font-semibold text-slate-200">Trọng số phân bổ điểm số (% Total Match Score)</h4>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <span className="text-slate-400 block mb-1">Kỹ năng: {Math.round(skillWeight * 100)}%</span>
                <input
                  type="range"
                  min="0.1"
                  max="0.8"
                  step="0.05"
                  value={skillWeight}
                  onChange={(e) => setSkillWeight(parseFloat(e.target.value))}
                  className="w-full accent-blue-500"
                />
              </div>
              <div>
                <span className="text-slate-400 block mb-1">Kinh nghiệm: {Math.round(expWeight * 100)}%</span>
                <input
                  type="range"
                  min="0.1"
                  max="0.8"
                  step="0.05"
                  value={expWeight}
                  onChange={(e) => setExpWeight(parseFloat(e.target.value))}
                  className="w-full accent-cyan-500"
                />
              </div>
              <div>
                <span className="text-slate-400 block mb-1">Học vấn: {Math.round(eduWeight * 100)}%</span>
                <input
                  type="range"
                  min="0.1"
                  max="0.8"
                  step="0.05"
                  value={eduWeight}
                  onChange={(e) => setEduWeight(parseFloat(e.target.value))}
                  className="w-full accent-purple-500"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-xl font-medium"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium shadow-lg shadow-blue-500/25 disabled:opacity-50"
            >
              {isSubmitting ? 'Đang khởi tạo...' : 'Lưu Vị trí Tuyển dụng'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
