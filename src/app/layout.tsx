import type {Metadata} from "next";
import {Inter_Tight, JetBrains_Mono} from "next/font/google";
import {ThemeProvider} from "@/components/theme-provider"
import {ConvexClientProvider} from "@/components/ConvexClientProvider";
import "./globals.css";

const inter_tight = Inter_Tight({
    subsets: ["latin"],
    display: "swap",
    variable: "--font-inter",
});

const jetbrains_mono = JetBrains_Mono({
    subsets: ["latin"],
    display: "swap",
    variable: "--font-jetbrains-mono",
});

export const metadata: Metadata = {
    title: "LPRD",
    description: "LPRD Core Application",
};

export default function RootLayout({children}: Readonly<{children: React.ReactNode}>) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body
                className={`${inter_tight.variable} ${jetbrains_mono.variable} antialiased`}
            >
                <ThemeProvider
                    attribute="class"
                    defaultTheme="system"
                    enableSystem
                    disableTransitionOnChange
                >
                    <ConvexClientProvider>
                        {children}
                    </ConvexClientProvider>
                </ThemeProvider>
            </body>
        </html>
    );
}
