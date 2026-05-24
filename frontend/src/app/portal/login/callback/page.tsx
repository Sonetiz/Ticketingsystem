import { Suspense } from 'react';
import PortalLoginCallbackPage from './callback-content';

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><p>Signing you in...</p></div>}>
      <PortalLoginCallbackPage />
    </Suspense>
  );
}
