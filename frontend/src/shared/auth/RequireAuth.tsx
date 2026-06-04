import { Navigate, useLocation } from 'react-router-dom';

import { FullPageLoading } from '@shared/components/PageFeedback';
import { useI18n } from '@shared/i18n';
import { useAuth } from './useAuth';

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const { t } = useI18n();
  const location = useLocation();

  if (isLoading) {
    return (
      <FullPageLoading
        title={t('auth.checkingTitle')}
        description={t('auth.checkingDescription')}
      />
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <>{children}</>;
}
