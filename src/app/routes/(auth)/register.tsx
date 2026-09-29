import { Button } from '@/components/ui/button';
import { FieldError, Label } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Link } from '@/components/ui/link';
import { Loader } from '@/components/ui/loader';
import { TextField } from '@/components/ui/text-field';
import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { z } from 'zod';
import { AuthShell } from '~/components/auth-shell';
import { GitHubIcon } from '~/components/github-icon';
import { authClient } from '~/lib/auth-client';

export const Route = createFileRoute('/(auth)/register')({
  validateSearch: z.object({
    redirect: z.string().optional().default('/'),
  }),
  component: RegisterPage,
});

function RegisterPage() {
  const { redirect } = Route.useSearch();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, setPending] = useState(false);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setPending(true);
    const { error } = await authClient.signUp.email({
      name,
      email,
      password,
      callbackURL: redirect,
    });
    setPending(false);
    if (error) {
      setError(error.message ?? 'Unable to create account');
      return;
    }
    // Email verification is required before sign-in, so prompt to check inbox.
    setDone(true);
  };

  if (done) {
    return (
      <AuthShell
        title="Check your email"
        description={`We sent a verification link to ${email}.`}
        footer={
          <Link href={`/login?redirect=${encodeURIComponent(redirect)}`} className="text-primary">
            Back to sign in
          </Link>
        }
      >
        <p className="text-muted-fg text-sm">
          Click the link in the email to activate your account, then sign in.
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Create your account"
      description="Get started with WhenNotToMeet"
      footer={
        <>
          Already have an account?{' '}
          <Link href={`/login?redirect=${encodeURIComponent(redirect)}`} className="text-primary">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <TextField
          name="name"
          type="text"
          autoComplete="name"
          isRequired
          value={name}
          onChange={setName}
        >
          <Label>Name</Label>
          <Input />
          <FieldError />
        </TextField>
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
          autoComplete="new-password"
          isRequired
          minLength={8}
          value={password}
          onChange={setPassword}
        >
          <Label>Password</Label>
          <Input />
          <FieldError />
        </TextField>
        {error ? <p className="text-danger-subtle-fg text-sm">{error}</p> : null}
        <Button type="submit" isPending={pending} className="mt-1 w-full">
          {pending ? (
            <>
              <Loader /> Creating account…
            </>
          ) : (
            'Create account'
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
