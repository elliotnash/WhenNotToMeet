import { Button } from '@/components/ui/button';
import { FieldError, Label } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Link } from '@/components/ui/link';
import { Loader } from '@/components/ui/loader';
import { TextField } from '@/components/ui/text-field';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { z } from 'zod';
import { AuthShell } from '~/components/auth-shell';
import { GitHubIcon } from '~/components/github-icon';
import { authClient } from '~/lib/auth-client';

export const Route = createFileRoute('/(auth)/login')({
  validateSearch: z.object({
    redirect: z.string().optional().default('/'),
  }),
  component: LoginPage,
});

function LoginPage() {
  const { redirect } = Route.useSearch();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setPending(true);
    const { error } = await authClient.signIn.email({ email, password });
    setPending(false);
    if (error) {
      setError(error.message ?? 'Unable to sign in');
      return;
    }
    navigate({ to: redirect });
  };

  return (
    <AuthShell
      title="Welcome back"
      description="Sign in to your account"
      footer={
        <>
          Don't have an account?{' '}
          <Link
            href={`/register?redirect=${encodeURIComponent(redirect)}`}
            className="text-primary"
          >
            Sign up
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <TextField
          name="email"
          type="email"
          autoComplete="email"
          isRequired
          value={email}
          onChange={setEmail}
        >
          <Label>Email</Label>
          <Input />
          <FieldError />
        </TextField>
        <TextField
          name="password"
          type="password"
          autoComplete="current-password"
          isRequired
          value={password}
          onChange={setPassword}
        >
          <div className="flex items-center justify-between">
            <Label>Password</Label>
            <Link href="/forgot-password" className="text-muted-fg text-xs hover:text-fg">
              Forgot?
            </Link>
          </div>
          <Input />
          <FieldError />
        </TextField>
        {error ? <p className="text-danger-subtle-fg text-sm">{error}</p> : null}
        <Button type="submit" isPending={pending} className="mt-1 w-full">
          {pending ? (
            <>
              <Loader /> Signing in…
            </>
          ) : (
            'Sign in'
          )}
        </Button>
      </form>

      <div className="my-4 flex items-center gap-3 text-muted-fg text-xs">
        <span className="h-px flex-1 bg-border" />
        or
        <span className="h-px flex-1 bg-border" />
      </div>

      <Button
        intent="secondary"
        className="w-full"
        onPress={() => authClient.signIn.social({ provider: 'github', callbackURL: redirect })}
      >
        <GitHubIcon />
        Continue with GitHub
      </Button>
    </AuthShell>
  );
}
