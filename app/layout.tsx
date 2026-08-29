import type { Metadata } from 'next';
import './globals.css';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { AppProvider } from '@/context/AppContext';
import { ExtensionErrorGuard } from '@/components/common/ExtensionErrorGuard';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-jetbrains-mono',
});

export const metadata: Metadata = {
  title: 'FailureOps X — Organizational Early-Warning Intelligence',
  description: 'AI-powered organizational intelligence that detects weak failure signals, connects them into hidden patterns, constructs Failure DNA, and predicts future failure trajectories.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`dark ${inter.variable} ${jetbrainsMono.variable}`} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                var origError = console.error;
                console.error = function() {
                  var str = '';
                  for (var i = 0; i < arguments.length; i++) {
                    str += ' ' + String(arguments[i]);
                  }
                  if (
                    str.indexOf('bis_skin_checked') !== -1 ||
                    str.indexOf('__processed_') !== -1 ||
                    str.indexOf('M_ID') !== -1 ||
                    str.indexOf('eppiocemhmnlbhjplcgkofciiegomcon') !== -1
                  ) {
                    return;
                  }
                  return origError.apply(console, arguments);
                };
              })();
            `,
          }}
        />
      </head>
      <body
        className="min-h-screen bg-background text-foreground selection:bg-primary/20 selection:text-primary font-sans"
        suppressHydrationWarning
      >
        <ExtensionErrorGuard>
          <AppProvider>{children}</AppProvider>
        </ExtensionErrorGuard>
      </body>
    </html>
  );
}
