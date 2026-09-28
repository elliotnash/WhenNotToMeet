import { Button, buttonStyles } from '@/components/ui/button';
import { Link } from '@/components/ui/link';
import { createFileRoute, useRouter } from '@tanstack/react-router';
import { m, riseItem, staggerParent } from '~/components/motion';
import { useTheme } from '~/components/theme';
import { useAuth } from '~/hooks/use-auth';
import { authClient } from '~/lib/auth-client';

export const Route = createFileRoute('/')({
  component: Home,
});

function Home() {
  const { isAuthenticated, user } = useAuth();
  const theme = useTheme();
  const router = useRouter();

  const signOut = async () => {
    await authClient.signOut();
    await router.invalidate();
  };

  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex items-center justify-between px-6 py-4">
        <span className="font-bold text-lg tracking-tight">
          When<span className="text-primary">NotToMeet</span>
        </span>
        <Button intent="outline" size="sm" onPress={theme.toggle}>
          {theme.resolved === 'dark' ? 'Light' : 'Dark'} mode
        </Button>
      </header>

      <main className="flex flex-1 items-center justify-center px-6">
        <m.div
          variants={staggerParent}
          initial="hidden"
          animate="show"
          className="max-w-xl text-center"
        >
          <m.h1
            variants={riseItem}
            className="font-display font-bold text-4xl tracking-tight sm:text-5xl"
          >
            Find the times that <span className="text-primary">don't</span> work.
          </m.h1>
          <m.p variants={riseItem} className="mt-4 text-lg text-muted-fg">
            A group scheduling app built with TanStack Start, Drizzle, and Better Auth.
          </m.p>
          <m.div variants={riseItem} className="mt-8 flex items-center justify-center gap-3">
            {isAuthenticated ? (
              <>
                <span className="text-muted-fg text-sm">Signed in as {user?.email}</span>
                <Button intent="outline" onPress={signOut}>
                  Sign out
                </Button>
              </>
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
