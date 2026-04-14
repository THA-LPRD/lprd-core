'use client';

import Link from 'next/link';
import { Button } from '@workspace/ui/components/button';

export default function NotFound() {
    return (
        <div className="flex-1 flex min-h-screen flex-col">
            <main className="flex-1 container mx-auto p-8 flex items-center justify-center">
                <div className="mx-auto max-w-md text-center space-y-6">
                    <div className="space-y-2">
                        <p className="text-8xl font-bold text-muted-foreground/50">404</p>
                        <h1 className="text-2xl font-bold tracking-tight">Page not found</h1>
                        <p className="text-muted-foreground">
                            The page you are looking for does not exist or has been moved.
                        </p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <Button nativeButton={false} render={(props) => <Link {...props} href="/" />}>
                            Go home
                        </Button>
                    </div>
                </div>
            </main>
        </div>
    );
}
