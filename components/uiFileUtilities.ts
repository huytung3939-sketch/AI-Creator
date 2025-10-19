/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { type ImageForZip, type VideoTask } from './uiTypes';
// FIX: Import React to provide type definitions for event handlers.
import type React from 'react';

// Declare JSZip for creating zip files
declare const JSZip: any;

/**
 * Handles file input change events, reads the file as a Data URL, and executes a callback.
 * @param e The React change event from the file input.
 * @param callback A function to call with the resulting file data URL.
 */
export const handleFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    callback: (result: string) => void
) => {
    if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onloadend = () => {
            if (typeof reader.result === 'string') {
                callback(reader.result);
            }
        };
        reader.readAsDataURL(file);
    }
};

/**
 * Triggers a browser download for a given URL.
 * @param url The URL of the file to download (can be a data URL).
 * @param filename The desired name for the downloaded file.
 */
export const downloadImage = (url: string, filename: string) => {
    if (!url) return;
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

/**
 * Converts a data URL string to a Blob object.
 * @param dataurl The data URL to convert.
 * @returns A Blob object.
 */
export const dataURLtoBlob = async (dataurl: string): Promise<Blob> => {
    // Handle blob URLs directly
    if (dataurl.startsWith('blob:')) {
        const response = await fetch(dataurl);
        return await response.blob();
    }
    
    const arr = dataurl.split(',');
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch) {
        throw new Error('Invalid data URL');
    }
    const mime = mimeMatch[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
};

/**
 * Creates a zip file from a list of images and triggers a download.
 * @param images An array of ImageForZip objects.
 * @param zipFilename The desired name for the downloaded zip file.
 */
export const downloadAllImagesAsZip = async (images: ImageForZip[], zipFilename: string = 'results.zip') => {
    if (!images || images.length === 0) {
        alert('Không có ảnh nào để tải về.');
        return;
    }

    try {
        const zip = new JSZip();

        for (const img of images) {
            if (!img.url) continue;

            const blob = await dataURLtoBlob(img.url);
            let targetFolder = zip;
            if (img.folder) {
                targetFolder = zip.folder(img.folder) || zip;
            }
            
            const fileExtension = img.extension || (blob.type.split('/')[1] || 'jpg').toLowerCase();
            const baseFileName = img.filename.replace(/\s+/g, '-').toLowerCase();

            // Handle duplicates by appending a number
            let finalFilename = `${baseFileName}.${fileExtension}`;
            let count = 1;
            // Use the file method to check for existence within the target folder
            while (targetFolder.file(finalFilename)) {
                count++;
                finalFilename = `${baseFileName}-${count}.${fileExtension}`;
            }

            targetFolder.file(finalFilename, blob);
        }

        if (Object.keys(zip.files).length === 0) {
            alert('Không có ảnh hợp lệ nào để tải về.');
            return;
        }

        const content = await zip.generateAsync({ type: 'blob' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(content);
        link.download = zipFilename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);

    } catch (error) {
        console.error('Lỗi khi tạo file zip:', error);
        alert('Đã xảy ra lỗi khi tạo file zip. Vui lòng thử lại.');
    }
};

/**
 * A centralized utility to process and download all generated assets (images and videos) as a zip file.
 * @param inputImages Array of input images for the zip.
 * @param historicalImages Array of generated images/videos. Can be simple URLs or objects with details for naming.
 * @param videoTasks The video generation task object to find completed videos.
 * @param zipFilename The final name for the downloaded zip file.
 * @param baseOutputFilename A base prefix for all generated output files.
 */
export const processAndDownloadAll = async ({
    inputImages = [],
    historicalImages = [],
    videoTasks = {},
    zipFilename,
    baseOutputFilename,
}: {
    inputImages?: ImageForZip[];
    historicalImages?: Array<string | { url: string; idea?: string; prompt?: string; }>;
    videoTasks?: Record<string, VideoTask>;
    zipFilename: string;
    baseOutputFilename: string;
}) => {
    const allItemsToZip: ImageForZip[] = [...inputImages];
    const processedUrls = new Set<string>();

    // Add historical images first
    historicalImages.forEach((item, index) => {
        const url = typeof item === 'string' ? item : item.url;
        if (processedUrls.has(url)) return;

        // Generate a descriptive filename part
        const namePartRaw = (typeof item !== 'string' && (item.idea || item.prompt))
            ? (item.idea || item.prompt!)
            : `${index + 1}`;
        
        // Sanitize the filename part
        const namePart = namePartRaw.substring(0, 30).replace(/[\s()]/g, '_').replace(/[^\w-]/g, '');
        
        const isVideo = url.startsWith('blob:');

        allItemsToZip.push({
            url,
            filename: `${baseOutputFilename}-${namePart}`,
            folder: 'output',
            extension: isVideo ? 'mp4' : undefined,
        });
        processedUrls.add(url);
    });

    // Add any completed videos from videoTasks that weren't already in historicalImages
    Object.values(videoTasks).forEach((task, index) => {
        if (task.status === 'done' && task.resultUrl && !processedUrls.has(task.resultUrl)) {
            allItemsToZip.push({
                url: task.resultUrl,
                filename: `${baseOutputFilename}-video-${index + 1}`,
                folder: 'output',
                extension: 'mp4',
            });
            processedUrls.add(task.resultUrl);
        }
    });

    if (allItemsToZip.length === inputImages.length) {
        alert('Không có ảnh hoặc video nào đã tạo để tải về.');
        return;
    }

    await downloadAllImagesAsZip(allItemsToZip, zipFilename);
};