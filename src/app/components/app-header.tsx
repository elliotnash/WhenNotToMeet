import { Button, buttonStyles } from '@/components/ui/button';
import { Link } from '@/components/ui/link';
import { Menu, MenuContent, MenuHeader, MenuItem, MenuSection } from '@/components/ui/menu';
import { MoonIcon, SunIcon, UserCircleIcon } from '@heroicons/react/20/solid';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { useTheme } from '~/components/theme';
import { useAuth } from '~/hooks/use-auth';
import { authClient } from '~/lib/auth-client';

export function Wordmark() {
  return (
    <Link href="/" className="font-bold text-fg text-lg tracking-tight">
      When<span className="text-primary">NotToMeet</span>
    </Link>
  );
}

export function AppHeader({ children }: { children?: ReactNode }) {
  const { isAuthenticated, user } = useAuth();
  const theme = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();

  const signOut = async () => {
    await authClient.signOut();
    await queryClient.invalidateQueries();
    await router.invalidate();
    router.navigate({ to: '/' });
  };

  return (
    <header className="flex items-center justify-between gap-4 border-b px-4 py-3 sm:px-6">
      <div className="flex min-w-0 items-center gap-6">
        <Wordmark />
        {children}
      </div>
      <div className="flex items-center gap-2">
        <Button
          intent="plain"
          size="sq-sm"
          aria-label={theme.resolved === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          onPress={theme.toggle}
        >
          {theme.resolved === 'dark' ? <SunIcon /> : <MoonIcon />}
        </Button>
        {isAuthenticated ? (
          <>
            <Link href="/dashboard" className={buttonStyles({ intent: 'plain', size: 'sm' })}>
              Dashboard
            </Link>
            <Menu>
              <Button intent="outline" size="sm" aria-label="Account">
                <UserCircleIcon />
                <span className="max-w-32 truncate">{user?.name}</span>
              </Button>
              <MenuContent placement="bottom end" className="min-w-48">
                <MenuSection>
                  <MenuHeader separator>
                    <span className="block">{user?.name}</span>
                    <span className="block font-normal text-muted-fg">{user?.email}</span>
                  </MenuHeader>
                </MenuSection>
                <MenuItem href="/dashboard">Dashboard</MenuItem>
                <MenuItem onAction={signOut}>Sign out</MenuItem>
              </MenuContent>
            </Menu>
          </>
        ) : (
          <Link href="/login" className={buttonStyles({ intent: 'outline', size: 'sm' })}>
            Sign in
          </Link>
        )}
      </div>
    </header>
  );
}
