import { Suspense } from 'react';
import ManageLoginCallbackPage from './callback-content';

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-900 text-white"><p>Signing you in...</p></div>}>
      <ManageLoginCallbackPage />
    </Suspense>
  );
}
