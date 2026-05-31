'use client';

import { useEffect } from 'react';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
    useEffect(() => {
        console.error(error);
    }, [error]);

    return (
        <html lang="en">
            <body className="flex-1 bg-background text-foreground">
                <div className="flex min-h-screen flex-col">
                    <main className="flex-1 container mx-auto p-8 flex items-center justify-center">
                        <div className="mx-auto max-w-md text-center space-y-6">
                            <div className="space-y-2">
                                <p className="text-8xl font-bold opacity-30">500</p>
                                <h1 className="text-2xl font-bold tracking-tight">Something went wrong</h1>
                                <p className="opacity-70">A critical error occurred. Please try again.</p>
                            </div>
                            {error.digest && <p className="text-xs opacity-50 font-mono">Error ID: {error.digest}</p>}
                            <div className="flex flex-col sm:flex-row gap-3 justify-center">
                                <button
                                    type="button"
                                    onClick={reset}
                                    className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity"
                                >
                                    Try again
                                </button>
                                <button
                                    type="button"
                                    onClick={() => (window.location.href = '/')}
                                    className="px-4 py-2 rounded-lg border border-border bg-background font-medium text-sm hover:bg-muted transition-colors"
                                >
                                    Go home
                                </button>
                            </div>
                        </div>
                    </main>
                </div>
            </body>
        </html>
    );
}
