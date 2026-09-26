import React from 'react';
import { AlertCircle, X, RefreshCw } from 'lucide-react';

interface AuthErrorBannerProps {
  message: string;
  onDismiss: () => void;
  onRetry?: () => void;
}

export const AuthErrorBanner: React.FC<AuthErrorBannerProps> = ({
  message,
  onDismiss,
  onRetry,
}) => {
  if (!message) return null;

  return (
    <div className="bg-rose-500/15 border-b border-rose-500/30 px-4 py-3 text-xs text-rose-200 shadow-md">
      <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span className="font-medium">{message}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {onRetry && (
            <button
              onClick={onRetry}
              className="px-2.5 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 rounded-lg font-semibold flex items-center gap-1.5 transition-colors border border-rose-500/30"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Thử lại</span>
            </button>
          )}
          <button
            onClick={onDismiss}
            className="text-rose-400 hover:text-white p-1 rounded transition-colors"
            title="Đóng thông báo"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
