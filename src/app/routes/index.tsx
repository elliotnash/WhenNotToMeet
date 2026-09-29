import { buttonStyles } from '@/components/ui/button';
import { Link } from '@/components/ui/link';
import { createFileRoute } from '@tanstack/react-router';
import { AppHeader } from '~/components/app-header';
import { m, riseItem, staggerParent } from '~/components/motion';
import { useAuth } from '~/hooks/use-auth';

export const Route = createFileRoute('/')({
  component: Home,
});

function Home() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="flex min-h-svh flex-col">
      <AppHeader />

      <main className="flex flex-1 items-center justify-center px-6">
        <m.div
          variants={staggerParent}
          initial="hidden"
          animate="show"
          className="max-w-xl text-center"
        >
          <m.h1
            variants={riseItem}
            className="font-bold font-display text-4xl tracking-tight sm:text-5xl"
          >
            Find the times that <span className="text-primary">don't</span> work.
          </m.h1>
          <m.p variants={riseItem} className="mt-4 text-lg text-muted-fg">
            Create an event, share the link, and let everyone mark when they're busy. The gaps are
            when you meet.
          </m.p>
          <m.div variants={riseItem} className="mt-8 flex items-center justify-center gap-3">
            {isAuthenticated ? (
              <Link href="/dashboard" className={buttonStyles()}>
                Go to dashboard
              </Link>
            ) : (
              <>
                <Link href="/register" className={buttonStyles()}>
                  Get started
                </Link>
                <Link href="/login" className={buttonStyles({ intent: 'outline' })}>
                  Sign in
                </Link>
              </>
            )}
          </m.div>
        </m.div>
      </main>
    </div>
  );
}
