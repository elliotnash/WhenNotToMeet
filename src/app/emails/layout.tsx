import { Body, Container, Head, Hr, Html, Preview, Tailwind, Text } from '@react-email/components';
import type { ReactNode } from 'react';

// Email clients can't use the app's CSS variables or dark mode, so the theme is
// baked in as light-only hex tokens.
export const emailTheme = {
  primary: '#6d28d9',
  ink: '#18181b',
  muted: '#71717a',
  border: '#e4e4e7',
  surface: '#f4f4f5',
  page: '#fafafa',
};

const tailwindConfig = {
  theme: {
    extend: {
      colors: emailTheme,
    },
  },
};

const fontStack = "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";

export function EmailLayout({ preview, children }: { preview: string; children: ReactNode }) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Tailwind config={tailwindConfig}>
        <Body className="bg-page py-[40px]" style={{ fontFamily: fontStack }}>
          <Container className="mx-auto max-w-[480px] rounded-[8px] border border-solid border-border bg-white px-[40px] py-[32px]">
            <Text className="m-0 mb-[24px] text-[20px] font-bold tracking-tight text-ink">
              When<span className="text-primary">NotToMeet</span>
            </Text>
            {children}
            <Hr className="mt-[32px] border-border" />
            <Text className="m-0 mt-[16px] text-[12px] leading-[18px] text-muted">
              You're receiving this email because of your WhenNotToMeet account. If this wasn't you,
              you can safely ignore it.
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}

export function EmailTitle({ children }: { children: ReactNode }) {
  return <Text className="m-0 text-[18px] font-semibold text-ink">{children}</Text>;
}

export function EmailBodyText({ children }: { children: ReactNode }) {
  return <Text className="m-0 mt-[12px] text-[14px] leading-[22px] text-muted">{children}</Text>;
}

export function EmailFallbackLink({ url }: { url: string }) {
  return (
    <Text className="m-0 mt-[16px] break-all text-[12px] leading-[18px] text-muted">
      Or copy and paste this link into your browser: {url}
    </Text>
  );
}
