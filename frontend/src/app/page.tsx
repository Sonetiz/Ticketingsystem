import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
      <div className="text-center space-y-6 p-8">
        <h1 className="text-4xl font-bold tracking-tight">ITSM Ticketing System</h1>
        <p className="text-muted-foreground max-w-md">
          Modern IT support ticketing for internal teams, projects, and recurring maintenance.
        </p>
        <div className="flex gap-4 justify-center flex-wrap">
          <Link
            href="/portal/login"
            className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition"
          >
            Support Portal
          </Link>
          <Link
            href="/manage/login"
            className="px-6 py-3 border border-border rounded-lg font-medium hover:bg-muted transition"
          >
            Management Portal
          </Link>
        </div>
      </div>
    </div>
  );
}
