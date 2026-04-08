import type { Id } from '@convex/dataModel';
import { replaceImgUrls } from '@/lib/template-data';

type UploadedImage = {
    externalUrl: string;
    file: File;
};

export async function uploadImagesAndReplaceUrls(input: {
    data: unknown;
    uploadedImages: UploadedImage[];
    createUploadUrl: () => Promise<string>;
    getStoredFileUrl: (storageId: Id<'_storage'>) => Promise<string | null>;
}) {
    const replacements = new Map<string, { url: string; storageId: string }>();

    for (const uploadedImage of input.uploadedImages) {
        const uploadUrl = await input.createUploadUrl();
        const uploadResponse = await fetch(uploadUrl, {
            method: 'POST',
            headers: { 'Content-Type': uploadedImage.file.type || 'application/octet-stream' },
            body: uploadedImage.file,
        });
        if (!uploadResponse.ok) {
            throw new Error(`Upload failed: ${uploadResponse.status}`);
        }

        const uploadBody = (await uploadResponse.json()) as { storageId?: Id<'_storage'> };
        if (!uploadBody.storageId) {
            throw new Error('Upload did not return storageId');
        }

        const url = await input.getStoredFileUrl(uploadBody.storageId);
        if (!url) {
            throw new Error('Storage URL not found after upload');
        }

        replacements.set(uploadedImage.externalUrl, {
            url,
            storageId: uploadBody.storageId,
        });
    }

    return replaceImgUrls(input.data, replacements);
}
