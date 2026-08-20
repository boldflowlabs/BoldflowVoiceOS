import { getSignedUrlApiV1S3SignedUrlGet } from "@/client/sdk.gen";

export function normalizeMediaUrl(url: string | null): string | null {
    if (!url) return null;
    try {
        const clean = url.trim();
        if (clean.startsWith("http://") || clean.startsWith("https://")) {
            const parsed = new URL(clean);
            let pathname = parsed.pathname;
            pathname = pathname.replace(/^(\/voice-audio)+/, "/voice-audio");
            if (pathname.startsWith("/voice-audio/")) {
                return pathname + parsed.search;
            }
            return parsed.toString();
        } else if (clean.startsWith("/")) {
            return clean.replace(/^(\/voice-audio)+/, "/voice-audio");
        } else {
            const stripped = clean.replace(/^(voice-audio\/)+/, "");
            return `/voice-audio/${stripped}`;
        }
    } catch {
        // Return original on parse failure
    }
    return url;
}

/**
 * Get a signed URL and download a file
 */
export async function downloadFile(url: string | null) {
    if (!url) return;

    try {
        const response = await getSignedUrlApiV1S3SignedUrlGet({
            query: {
                key: url
            },
        });

        if (response.data?.url) {
            const resolvedUrl = normalizeMediaUrl(response.data.url as string);
            window.open(resolvedUrl || (response.data.url as string), '_blank');
        }
    } catch (error) {
        console.error('Error downloading file:', error);
    }
}

/**
 * Return a signed URL for a given S3 key without triggering a download.
 * Useful for previewing media (audio or transcript) in-browser first.
 */
export async function getSignedUrl(url: string | null, inline: boolean = false): Promise<string | null> {
    if (!url) return null;

    try {
        const response = await getSignedUrlApiV1S3SignedUrlGet({
            query: {
                key: url,
                inline: inline,
            },
        });

        if (response.data?.url) {
            return normalizeMediaUrl(response.data.url as string);
        }
    } catch (error) {
        console.error('Error getting signed URL:', error);
    }
    return null;
}
