import React from 'react';
import {
  LayoutDashboard,
  Briefcase,
  Users,
  Sparkles,
  BarChart3,
  ShieldCheck,
  Settings,
  LogOut,
  User,
  Bot,
  X,
} from 'lucide-react';
import type { UserProfile } from '../../services/supabase';

export type AppNavTab = 'jobs' | 'workspace' | 'dashboard' | 'audit' | 'monthly' | 'candidates' | 'settings';

interface AppSidebarProps {
  activeTab: AppNavTab;
  onSelectTab: (tab: AppNavTab) => void;
  currentUser: UserProfile | null;
  onLogout?: () => void;
  onOpenAuth?: () => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export const AppSidebar: React.FC<AppSidebarProps> = ({
  activeTab,
  onSelectTab,
  currentUser,
  onLogout,
  onOpenAuth,
  isOpenMobile = false,
  onCloseMobile,
}) => {
  const navItems = [
    {
      id: 'dashboard' as AppNavTab,
      label: 'Dashboard',
      sublabel: 'Bảng Điều Khiển AI',
      icon: LayoutDashboard,
    },
    {
      id: 'jobs' as AppNavTab,
      label: 'Tin tuyển dụng',
      sublabel: 'Quản lý vị trí & JD',
      icon: Briefcase,
    },
    {
      id: 'candidates' as AppNavTab,
      label: 'Ứng viên',
      sublabel: 'Danh sách & Hồ sơ',
      icon: Users,
    },
    {
      id: 'workspace' as AppNavTab,
      label: 'Sàng lọc AI',
      sublabel: 'Thẩm định PDF & Evidence',
      icon: Sparkles,
    },
    {
      id: 'monthly' as AppNavTab,
      label: 'Báo cáo',
      sublabel: 'Thống kê & Phê duyệt',
      icon: BarChart3,
    },
    {
      id: 'audit' as AppNavTab,
      label: 'Nhật ký hoạt động',
      sublabel: 'Audit Trail bất biến',
      icon: ShieldCheck,
    },
    {
      id: 'settings' as AppNavTab,
      label: 'Cài đặt',
      sublabel: 'Phân quyền & Hệ thống',
      icon: Settings,
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm lg:hidden transition-opacity"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-[#161922] border-r border-[#242834] flex flex-col justify-between transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Top Branding */}
        <div>
          <div className="h-16 px-5 border-b border-[#242834] flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#60A5FA] to-[#34D399] flex items-center justify-center shadow-lg shadow-[#60A5FA]/20 shrink-0">
                <Bot className="w-5 h-5 text-[#0D0F14]" />
              </div>
              <div className="min-w-0">
                <span className="font-black text-sm text-white tracking-wide block truncate">
                  AI Recruitment
                </span>
                <span className="text-[10px] text-slate-400 block font-mono truncate">
                  Screening Assistant
                </span>
              </div>
            </div>

            {/* Mobile close button */}
            <button
              type="button"
              onClick={onCloseMobile}
              className="lg:hidden text-slate-400 hover:text-white p-1 rounded-lg hover:bg-[#141720]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1 overflow-y-auto max-h-[calc(100vh-170px)]">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onSelectTab(item.id);
                    if (onCloseMobile) onCloseMobile();
                  }}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-3 transition-all cursor-pointer group text-left ${
                    isActive
                      ? 'bg-[#1E293B] text-white shadow-md border border-[#60A5FA]/30'
                      : 'text-slate-300 hover:text-white hover:bg-[#141720] border border-transparent'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${
                      isActive ? 'text-[#60A5FA]' : 'text-slate-400 group-hover:text-slate-200'
                    }`}
                  />
                  <div className="min-w-0 flex-1 truncate">
                    <span className="block truncate font-bold">{item.label}</span>
                    <span className="block text-[10px] text-slate-400 truncate font-normal">
                      {item.sublabel}
                    </span>
                  </div>
                  {isActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#60A5FA] shrink-0" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom HR Profile Card */}
        <div className="p-3 border-t border-[#242834] bg-[#141720]">
          {currentUser ? (
            <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-[#161922] border border-[#242834]">
              <div className="flex items-center gap-2.5 min-w-0">
                {currentUser.avatar_url ? (
                  <img
                    src={currentUser.avatar_url}
                    alt={currentUser.full_name}
                    className="w-8 h-8 rounded-lg object-cover border border-[#60A5FA]/40"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-[#1E293B] border border-[#60A5FA]/30 flex items-center justify-center text-white text-xs font-bold">
                    <User className="w-4 h-4 text-[#60A5FA]" />
                  </div>
                )}
                <div className="min-w-0 truncate">
                  <div className="font-bold text-xs text-white truncate max-w-[110px]">
                    {currentUser.full_name || 'Nhân sự HR'}
                  </div>
                  <span className="text-[10px] text-[#34D399] font-mono block">
                    {currentUser.role === 'ADMIN' ? 'Quản trị viên' : 'HR Recruiter'}
                  </span>
                </div>
              </div>

              {onLogout && (
                <button
                  type="button"
                  onClick={onLogout}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-[#FB7185] hover:bg-[#141720] transition-colors cursor-pointer"
                  title="Đăng xuất khỏi hệ thống"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={onOpenAuth}
              className="w-full py-2.5 px-3 rounded-xl bg-[#1E293B] hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
            >
              <User className="w-3.5 h-3.5 text-[#60A5FA]" />
              <span>Đăng nhập HR</span>
            </button>
          )}
        </div>
      </aside>
    </>
  );
};
