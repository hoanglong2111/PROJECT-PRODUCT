import { Suspense } from 'react';

import { PageLoading } from '@shared/components/PageFeedback';

import { AppRoutes } from './routes';

export default function App() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <AppRoutes />
    </Suspense>
  );
}

function RouteFallback() {
  return <PageLoading title="Đang tải" description="Đang chuẩn bị màn hình làm việc." />;
}
