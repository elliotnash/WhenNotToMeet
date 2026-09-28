import { buttonStyles } from '@/components/ui/button';
import { Link } from '@/components/ui/link';

export function NotFoundPage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="font-medium text-primary text-sm">404</p>
      <h1 className="font-bold text-3xl tracking-tight">Page not found</h1>
      <p className="max-w-md text-muted-fg">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Link href="/" className={buttonStyles({ className: 'mt-2' })}>
        Back home
      </Link>
    </div>
  );
}
