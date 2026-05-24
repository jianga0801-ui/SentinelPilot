import { Suspense } from 'react';

import InvestigationDetailClient from './InvestigationDetailClient';

export default function InvestigationDetailPage() {
  return (
    <Suspense fallback={null}>
      <InvestigationDetailClient />
    </Suspense>
  );
}
