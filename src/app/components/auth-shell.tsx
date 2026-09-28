import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from '@/components/ui/link';
import type { ReactNode } from 'react';
import { m, riseItem, staggerParent } from '~/components/motion';

export function AuthShell({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center px-6 py-12">
      <m.div variants={staggerParent} initial="hidden" animate="show" className="w-full max-w-sm">
        <m.div variants={riseItem} className="mb-8 text-center">
          <Link href="/" className="font-bold text-fg text-xl tracking-tight">
            When<span className="text-primary">NotToMeet</span>
          </Link>
        </m.div>
        <m.div variants={riseItem}>
          <Card>
            <CardHeader>
              <CardTitle>{title}</CardTitle>
              {description ? <CardDescription>{description}</CardDescription> : null}
            </CardHeader>
            <CardContent>{children}</CardContent>
          </Card>
        </m.div>
        {footer ? (
          <m.div variants={riseItem} className="mt-6 text-center text-muted-fg text-sm">
            {footer}
          </m.div>
        ) : null}
      </m.div>
    </div>
  );
}
