import { Toaster } from '@workspace/ui/components/sonner';
import type { Metadata } from 'next';
import { Inter_Tight, JetBrains_Mono } from 'next/font/google';
import { ConvexClientProvider } from '@/components/ConvexClientProvider';
import { ThemeProvider } from '@/components/theme-provider';
import './globals.css';

const inter_tight = Inter_Tight({
    subsets: ['latin'],
    display: 'swap',
    variable: '--font-inter',
});

const jetbrains_mono = JetBrains_Mono({
    subsets: ['latin'],
    display: 'swap',
    variable: '--font-jetbrains-mono',
});

export const metadata: Metadata = {
    title: 'LPRD',
    description: 'LPRD Core Application',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body
                className={`${inter_tight.variable} ${jetbrains_mono.variable} antialiased h-screen w-screen flex overflow-hidden`}
            >
                <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
                    <ConvexClientProvider>{children}</ConvexClientProvider>
                    <Toaster />
                </ThemeProvider>
            </body>
        </html>
    );
}
