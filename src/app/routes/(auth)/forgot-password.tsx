import { Button } from '@/components/ui/button';
import { FieldError, Label } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Link } from '@/components/ui/link';
import { Loader } from '@/components/ui/loader';
import { TextField } from '@/components/ui/text-field';
import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { AuthShell } from '~/components/auth-shell';
import { authClient } from '~/lib/auth-client';

export const Route = createFileRoute('/(auth)/forgot-password')({
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, setPending] = useState(false);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setPending(true);
    const { error } = await authClient.requestPasswordReset({
      email,
      redirectTo: '/reset-password',
    });
    setPending(false);
    if (error) {
      setError(error.message ?? 'Something went wrong');
      return;
    }
    setDone(true);
  };

  return (
    <AuthShell
      title="Forgot password"
      description="We'll email you a link to reset it"
      footer={
        <Link href="/login" className="text-primary">
          Back to sign in
        </Link>
      }
    >
      {done ? (
        <p className="text-muted-fg text-sm">
          If an account exists for {email}, a reset link is on its way.
        </p>
      ) : (
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
          {error ? <p className="text-danger-subtle-fg text-sm">{error}</p> : null}
          <Button type="submit" isPending={pending} className="mt-1 w-full">
            {pending ? (
              <>
                <Loader /> Sending…
              </>
            ) : (
              'Send reset link'
            )}
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
