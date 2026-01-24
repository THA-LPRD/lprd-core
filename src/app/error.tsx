'use client';

import {useEffect} from 'react';
import {Button} from '@/components/ui/button';

export default function Error({error, reset,}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error(error);
    }, [error]);

    return (
        <div className="flex min-h-screen flex-col">
            <main className="flex-1 container mx-auto p-8 flex items-center justify-center">
                <div className="mx-auto max-w-md text-center space-y-6">
                    <div className="space-y-2">
                        <p className="text-8xl font-bold text-muted-foreground/50">500</p>
                        <h1 className="text-2xl font-bold tracking-tight">Something went wrong</h1>
                        <p className="text-muted-foreground">
                            An unexpected error occurred. Please try again.
                        </p>
                    </div>
                    {error.digest && (
                        <p className="text-xs text-muted-foreground font-mono">
                            Error ID: {error.digest}
                        </p>
                    )}
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <Button onClick={reset}>Try again</Button>
                        <Button
                            variant="outline"
                            onClick={() => (window.location.href = '/')}
                        >
                            Go home
                        </Button>
                    </div>
                </div>
            </main>
        </div>
    );
}
