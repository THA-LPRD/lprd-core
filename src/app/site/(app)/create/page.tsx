'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from 'convex/react';
import { api } from '@convex/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

function generateSlug(name: string): string {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
}

export default function CreateSitePage() {
    const [name, setName] = useState('');
    const [slug, setSlug] = useState('');
    const [slugSynced, setSlugSynced] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const createSite = useMutation(api.sites.create);
    const setLastSite = useMutation(api.users.setLastSite);
    const router = useRouter();

    const handleNameChange = (newName: string) => {
        setName(newName);
        if (slugSynced) {
            setSlug(generateSlug(newName));
        }
    };

    const handleSlugChange = (newSlug: string) => {
        setSlugSynced(false);
        setSlug(newSlug);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!name.trim()) {
            setError('Site name is required');
            return;
        }

        if (!slug.trim()) {
            setError('Site slug is required');
            return;
        }

        setIsSubmitting(true);

        try {
            await createSite({ name: name.trim(), slug: slug.trim() });
            await setLastSite({ slug: slug.trim() });
            router.push(`/site/${slug.trim()}/devices`);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create site');
            setIsSubmitting(false);
        }
    };

    return (
        <main className="flex-1 flex items-center justify-center p-6">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle>Create Site</CardTitle>
                    <CardDescription>Set up your new site to start managing devices.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Site Name</Label>
                            <Input
                                id="name"
                                value={name}
                                onChange={(e) => handleNameChange(e.target.value)}
                                placeholder="Acme Corporation"
                                disabled={isSubmitting}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="slug">URL Slug</Label>
                            <Input
                                id="slug"
                                value={slug}
                                onChange={(e) => handleSlugChange(e.target.value)}
                                placeholder="acme-corporation"
                                disabled={isSubmitting}
                            />
                            <p className="text-xs text-muted-foreground">
                                Your site will be available at /site/{slug || 'your-slug'}
                            </p>
                        </div>

                        {error && <p className="text-sm text-destructive">{error}</p>}

                        <Button type="submit" className="w-full" disabled={isSubmitting}>
                            {isSubmitting ? 'Creating...' : 'Create Site'}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </main>
    );
}
