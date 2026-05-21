import { useNavigate } from 'react-router-dom';

import { PageError } from '@shared/components/PageFeedback';
import { useI18n } from '@shared/i18n';

export function NotFound() {
  const navigate = useNavigate();
  const { t } = useI18n();

  return (
    <PageError
      title={t('notFound.title')}
      description={t('notFound.description')}
      actionLabel={t('notFound.action')}
      onRetry={() => navigate('/')}
    />
  );
}
