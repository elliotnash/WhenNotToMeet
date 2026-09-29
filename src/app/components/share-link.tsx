import { Button } from '@/components/ui/button';
import { CheckIcon, LinkIcon } from '@heroicons/react/20/solid';
import { useClipboard } from '@mantine/hooks';
import { useEffect, useState } from 'react';

export function sharePath(token: string) {
  return `/event?token=${encodeURIComponent(token)}`;
}

export function useShareUrl(token: string) {
  const [origin, setOrigin] = useState('');
  useEffect(() => setOrigin(window.location.origin), []);
  return `${origin}${sharePath(token)}`;
}

export function CopyLinkButton({
  token,
  size = 'sm',
  intent = 'outline',
}: {
  token: string;
  size?: 'xs' | 'sm' | 'md';
  intent?: 'outline' | 'primary' | 'secondary';
}) {
  const url = useShareUrl(token);
  const clipboard = useClipboard({ timeout: 1500 });
  return (
    <Button intent={intent} size={size} onPress={() => clipboard.copy(url)}>
      {clipboard.copied ? <CheckIcon /> : <LinkIcon />}
      {clipboard.copied ? 'Copied' : 'Copy link'}
    </Button>
  );
}

export function ShareLinkField({ token }: { token: string }) {
  const url = useShareUrl(token);
  return (
    <div className="flex items-center gap-2">
      <input
        readOnly
        value={url}
        aria-label="Share link"
        onFocus={(e) => e.currentTarget.select()}
        className="min-w-0 flex-1 rounded-lg border bg-muted/40 px-3 py-1.5 font-mono text-sm outline-hidden focus:border-ring"
      />
      <CopyLinkButton token={token} intent="primary" />
    </div>
  );
}
