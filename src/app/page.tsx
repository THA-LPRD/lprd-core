'use client';

import {Authenticated, Unauthenticated, useMutation, useQuery} from 'convex/react';
import {api} from '../../convex/_generated/api';
import {useAuth} from '@workos-inc/authkit-nextjs/components';
import type {User} from '@workos-inc/node';
import {Button} from '@/components/ui/button';
import Link from 'next/link';

export default function Home() {
    const { user, signOut } = useAuth();

    return (
        <div className="flex min-h-screen flex-col">
            <header className="sticky top-0 z-10 border-b bg-background p-4 flex items-center justify-between">
                <h1 className="text-xl font-semibold">Convex + Next.js + WorkOS</h1>
                {user && <UserMenu user={user} onSignOut={signOut} />}
            </header>
            <main className="flex-1 container mx-auto p-8">
                <div className="mx-auto max-w-2xl space-y-8">
                    <div className="text-center">
                        <h1 className="text-4xl font-bold tracking-tight">
                            Convex + Next.js + WorkOS
                        </h1>
                    </div>
                    <Authenticated>
                        <Content />
                    </Authenticated>
                    <Unauthenticated>
                        <SignInForm />
                    </Unauthenticated>
                </div>
            </main>
        </div>
    );
}

function SignInForm() {
    return (
        <div className="mx-auto flex max-w-sm flex-col gap-4">
            <p className="text-center text-muted-foreground">
                Log in to see the numbers
            </p>
            <div className="flex flex-col gap-3">
                <Button
                    nativeButton={false}
                    render={(props) => <Link {...props} href="/sign-in">Sign in</Link>}
                />
                <Button
                    variant="outline"
                    nativeButton={false}
                    render={(props) => <Link {...props} href="/sign-up">Sign up</Link>}
                />
            </div>
        </div>
    );
}

function Content() {
    const { viewer, numbers } =
    useQuery(api.myFunctions.listNumbers, {
        count: 10,
    }) ?? {};
    const addNumber = useMutation(api.myFunctions.addNumber);

    if (viewer === undefined || numbers === undefined) {
        return (
            <div className="text-center">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="rounded-lg border bg-card p-6 space-y-4">
                <p className="text-lg">
                    Welcome <span className="font-semibold">{viewer ?? 'Anonymous'}</span>!
                </p>
                <p className="text-sm text-muted-foreground">
                    Click the button below and open this page in another window - this data is
                    persisted in the Convex cloud database!
                </p>
                <Button
                    onClick={() => {
                        void addNumber({ value: Math.floor(Math.random() * 10) });
                    }}
                >
                    Add a random number
                </Button>
                <div className="space-y-2">
                    <p className="text-sm font-medium">Numbers:</p>
                    <p className="text-2xl font-mono">
                        {numbers?.length === 0 ? 'Click the button!' : (numbers?.join(', ') ?? '...')}
                    </p>
                </div>
            </div>

            <div className="rounded-lg border bg-muted/50 p-6 space-y-3">
                <h2 className="text-lg font-semibold">Getting Started</h2>
                <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>
                        Edit{' '}
                        <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                            convex/myFunctions.ts
                        </code>{' '}
                        to change your backend
                    </li>
                    <li>
                        Edit{' '}
                        <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                            src/app/page.tsx
                        </code>{' '}
                        to change your frontend
                    </li>
                </ul>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                <ResourceCard
                    title="Convex docs"
                    description="Read comprehensive documentation for all Convex features."
                    href="https://docs.convex.dev/home"
                />
                <ResourceCard
                    title="Templates"
                    description="Browse our collection of templates to get started quickly."
                    href="https://www.convex.dev/templates"
                />
            </div>
        </div>
    );
}

function ResourceCard({title, description, href,}: {
    title: string;
    description: string;
    href: string;
}) {
    return (
        <Link
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded-lg border bg-card p-4 transition-colors hover:bg-accent"
        >
            <h3 className="font-semibold mb-2">{title}</h3>
            <p className="text-sm text-muted-foreground">{description}</p>
        </Link>
    );
}

function UserMenu({ user, onSignOut }: { user: User; onSignOut: () => void }) {
    return (
        <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">{user.email}</span>
            <Button variant="destructive" size="sm" onClick={onSignOut}>
                Sign out
            </Button>
        </div>
    );
}
