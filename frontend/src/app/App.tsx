import { Suspense } from 'react';

import { AppErrorBoundary, PageLoading } from '@shared/components/PageFeedback';
import { useI18n } from '@shared/i18n';

import { AppRoutes } from './routes';

export default function App() {
  return (
    <AppErrorBoundary>
      <Suspense fallback={<RouteFallback />}>
        <AppRoutes />
      </Suspense>
    </AppErrorBoundary>
  );
}

function RouteFallback() {
  const { t } = useI18n();
  return <PageLoading title={t('common.loading')} description={t('common.loadingDescription')} />;
}
