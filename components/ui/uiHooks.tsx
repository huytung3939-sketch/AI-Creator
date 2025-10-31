/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { useState, useEffect, useCallback } from 'react';
import { useAppControls } from './uiContexts';
import { startVideoGenerationFromImage, pollVideoOperation } from '../services/geminiService';
import { type VideoTask } from './uiTypes';

/**
 * Custom hook to track media query status.
 * @param query The media query string (e.g., '(max-width: 768px)').
 * @returns boolean indicating if the query matches.
 */
export const useMediaQuery = (query: string) => {
    const [matches, setMatches] = useState(false);
    useEffect(() => {
        const media = window.matchMedia(query);
        if (media.matches !== matches) {
            setMatches(media.matches);
        }
        const listener = () => setMatches(media.matches);
        window.addEventListener('resize', listener);
        return () => window.removeEventListener('resize', listener);
    }, [matches, query]);
    return matches;
};

/**
 * Custom hook to manage the state and actions for the Lightbox component.
 * @returns An object with the lightbox's current index and functions to control it.
 */
export const useLightbox = () => {
    const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

    const openLightbox = useCallback((index: number) => {
        setLightboxIndex(index);
    }, []);

    const closeLightbox = useCallback(() => {
        setLightboxIndex(null);
    }, []);

    const navigateLightbox = useCallback((newIndex: number) => {
        setLightboxIndex(newIndex);
    }, []);

    return {
        lightboxIndex,
        openLightbox,
        closeLightbox,
        navigateLightbox,
    };
};

// --- NEW: Video Generation Hook ---

export const useVideoGeneration = () => {
    const { addImagesToGallery } = useAppControls();
    // FIX: Explicitly type useState to correctly infer the type of `videoTasks` and its elements. This prevents properties like 'status' and 'operation' being accessed on an 'unknown' type and resolves spread operator errors.
    const [videoTasks, setVideoTasks] = useState<Record<string, VideoTask>>({});

    const generateVideo = useCallback(async (sourceUrl: string, prompt: string) => {
        const finalPrompt = prompt.trim() || "Animate this image, bringing it to life with subtle, cinematic motion.";
        setVideoTasks(prev => ({ ...prev, [sourceUrl]: { status: 'pending' } }));
        try {
            const op = await startVideoGenerationFromImage(sourceUrl, finalPrompt);
            setVideoTasks(prev => ({ ...prev, [sourceUrl]: { status: 'pending', operation: op } }));
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
            setVideoTasks(prev => ({ ...prev, [sourceUrl]: { status: 'error', error: errorMessage } }));
        }
    }, [addImagesToGallery]);

    useEffect(() => {
        const tasksToPoll = Object.entries(videoTasks).filter(([, task]) => task.status === 'pending' && task.operation);
        if (tasksToPoll.length === 0) return;
    
        let isCancelled = false;
    
        const poll = async () => {
            if (isCancelled) return;
    
            const newTasks: Record<string, VideoTask> = { ...videoTasks };
            let tasksUpdated = false;
    
            await Promise.all(tasksToPoll.map(async ([sourceUrl, task]) => {
                if (!task.operation) return;
                try {
                    const updatedOp = await pollVideoOperation(task.operation);
                    if (isCancelled) return;
    
                    if (updatedOp.done) {
                        if (updatedOp.response?.generatedVideos?.[0]?.video?.uri) {
                            const downloadLink = updatedOp.response.generatedVideos[0].video.uri;
                            const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
                            if (!response.ok) throw new Error(`Failed to fetch video: ${response.statusText}`);
                            const blob = await response.blob();
                            const blobUrl = URL.createObjectURL(blob);
                            newTasks[sourceUrl] = { status: 'done', resultUrl: blobUrl };
                            addImagesToGallery([blobUrl]);
                        } else {
                            throw new Error(updatedOp.error?.message || "Video generation finished but no URI was found.");
                        }
                    } else {
                        newTasks[sourceUrl] = { ...task, operation: updatedOp };
                    }
                    tasksUpdated = true;
                } catch (err) {
                    const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
                    newTasks[sourceUrl] = { status: 'error', error: errorMessage };
                    tasksUpdated = true;
                }
            }));
    
            if (!isCancelled && tasksUpdated) {
                setVideoTasks(newTasks);
            }
    
            const stillPending = Object.values(newTasks).some(t => t.status === 'pending');
            if (!isCancelled && stillPending) {
                setTimeout(poll, 10000);
            }
        };
    
        const timeoutId = setTimeout(poll, 5000);
    
        return () => {
            isCancelled = true;
            clearTimeout(timeoutId);
        };
    }, [videoTasks, addImagesToGallery]);

    return { videoTasks, generateVideo };
};