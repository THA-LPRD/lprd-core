'use client';

import { api } from '@convex/api';
import type { Id } from '@convex/dataModel';
import { Button } from '@workspace/ui/components/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@workspace/ui/components/dialog';
import { useMutation, useQuery } from 'convex/react';
import { CheckIcon, ImageIcon, TrashIcon, UploadIcon } from 'lucide-react';
import Image from 'next/image';
import * as React from 'react';
import { cn } from '@/lib/utils';

type Asset = {
    _id: Id<'siteAssets'>;
    storageId: Id<'_storage'>;
    filename: string;
    contentType: string;
    url: string | null;
};

const ASSET_PICKER_SKELETON_IDS = Array.from({ length: 8 }, (_, index) => `asset-picker-skeleton-${index}`);

interface AssetPickerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    siteId: Id<'sites'>;
    /** Called with the storageId of the selected asset */
    onSelect: (storageId: Id<'_storage'>) => void;
}

export function AssetPicker({ open, onOpenChange, siteId, onSelect }: AssetPickerProps) {
    const assets = useQuery(api.siteAssets.list, { siteId });
    const generateUploadUrl = useMutation(api.siteAssets.generateUploadUrl);
    const createAsset = useMutation(api.siteAssets.create);
    const removeAsset = useMutation(api.siteAssets.remove);

    const [uploading, setUploading] = React.useState(false);
    const [removingId, setRemovingId] = React.useState<Id<'siteAssets'> | null>(null);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        e.target.value = '';

        setUploading(true);
        try {
            const uploadUrl = await generateUploadUrl({ siteId });
            const res = await fetch(uploadUrl, {
                method: 'POST',
                headers: { 'Content-Type': file.type || 'application/octet-stream' },
                body: file,
            });
            if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
            const { storageId } = (await res.json()) as { storageId: Id<'_storage'> };
            await createAsset({ siteId, storageId, filename: file.name, contentType: file.type });
        } catch (err) {
            console.error('Asset upload failed:', err);
        } finally {
            setUploading(false);
        }
    };

    const handleRemove = async (asset: Asset, e: React.MouseEvent) => {
        e.stopPropagation();
        setRemovingId(asset._id);
        try {
            await removeAsset({ assetId: asset._id });
        } finally {
            setRemovingId(null);
        }
    };

    const handleSelect = (asset: Asset) => {
        onSelect(asset.storageId);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Site Images</DialogTitle>
                </DialogHeader>

                <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                        {assets?.length ?? 0} image{assets?.length !== 1 ? 's' : ''}
                    </p>
                    <Button
                        size="xs"
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                    >
                        <UploadIcon data-icon="inline-start" />
                        {uploading ? 'Uploading…' : 'Upload image'}
                    </Button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleFileChange}
                    />
                </div>

                {assets === undefined ? (
                    <div className="grid grid-cols-4 gap-2">
                        {ASSET_PICKER_SKELETON_IDS.map((id) => (
                            <div key={id} className="aspect-square rounded-md bg-muted animate-pulse" />
                        ))}
                    </div>
                ) : assets.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
                        <ImageIcon className="size-8 opacity-40" />
                        <p className="text-sm">No images yet. Upload one to get started.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-4 gap-2 max-h-96 overflow-y-auto">
                        {assets.map((asset) => (
                            <div
                                key={asset._id}
                                className={cn(
                                    'group relative aspect-square rounded-md border bg-muted overflow-hidden cursor-pointer',
                                    'hover:border-primary transition-colors',
                                )}
                                onClick={() => handleSelect(asset)}
                            >
                                {asset.url ? (
                                    <Image src={asset.url} alt={asset.filename} fill className="object-contain p-1" />
                                ) : (
                                    <div className="flex items-center justify-center h-full">
                                        <ImageIcon className="size-6 text-muted-foreground" />
                                    </div>
                                )}
                                <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-colors">
                                    <CheckIcon className="size-5 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow" />
                                </div>
                                <button
                                    type="button"
                                    className="absolute top-1 right-1 size-5 rounded bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                                    onClick={(e) => handleRemove(asset, e)}
                                    disabled={removingId === asset._id}
                                >
                                    <TrashIcon className="size-3" />
                                </button>
                                <div className="absolute bottom-0 left-0 right-0 p-1 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                                    <p className="text-[10px] text-white truncate">{asset.filename}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
