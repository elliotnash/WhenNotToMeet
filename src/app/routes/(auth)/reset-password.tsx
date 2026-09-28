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
import { authClient } from '~/lib/auth-client';

export const Route = createFileRoute('/(auth)/reset-password')({
  validateSearch: z.object({
    token: z.string().optional(),
    error: z.string().optional(),
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const { token, error: tokenError } = Route.useSearch();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token) return;
    setError(null);
    setPending(true);
    const { error } = await authClient.resetPassword({ newPassword: password, token });
    setPending(false);
    if (error) {
      setError(error.message ?? 'Unable to reset password');
      return;
    }
    navigate({ to: '/login' });
  };

  if (tokenError || !token) {
    return (
      <AuthShell
        title="Invalid or expired link"
        footer={
          <Link href="/forgot-password" className="text-primary">
            Request a new link
          </Link>
        }
      >
        <p className="text-muted-fg text-sm">
          This password reset link is no longer valid. Request a new one to continue.
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Reset password" description="Choose a new password">
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <TextField
          name="password"
          type="password"
          autoComplete="new-password"
          isRequired
          minLength={8}
          value={password}
          onChange={setPassword}
        >
          <Label>New password</Label>
          <Input />
          <FieldError />
        </TextField>
        {error ? <p className="text-danger-subtle-fg text-sm">{error}</p> : null}
        <Button type="submit" isPending={pending} className="mt-1 w-full">
          {pending ? (
            <>
              <Loader /> Saving…
            </>
          ) : (
            'Reset password'
          )}
        </Button>
      </form>
    </AuthShell>
  );
}
