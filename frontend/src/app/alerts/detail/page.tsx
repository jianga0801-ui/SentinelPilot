import { Suspense } from 'react';

import AlertDetailClient from './AlertDetailClient';

export default function AlertDetailPage() {
  return (
    <Suspense fallback={null}>
      <AlertDetailClient />
    </Suspense>
  );
}
