/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';

type ImageStatus = 'pending' | 'done' | 'error';

interface PolaroidCardProps {
    mediaUrl?: string;
    caption: string;
    status: ImageStatus;
    error?: string;
    onShake?: (caption: string) => void;
    onDownload?: (caption: string) => void;
    onEdit?: (caption: string) => void;
    onSwapImage?: () => void;
    onSelectFromGallery?: () => void;
    isMobile?: boolean;
    placeholderType?: 'person' | 'architecture' | 'clothing' | 'magic' | 'style';
    onClick?: () => void;
}

const LoadingSpinner = () => (
    <div className="flex items-center justify-center h-full">
        <svg className="animate-spin h-8 w-8 text-neutral-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
    </div>
);

const ErrorDisplay = ({ message }: { message?: string }) => (
    <div className="flex flex-col items-center justify-center h-full text-center p-4">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-red-400 mb-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        {message && <p className="text-sm text-red-300 max-w-full break-words base-font">{message}</p>}
    </div>
);

const Placeholder = ({ type = 'person' }: { type?: 'person' | 'architecture' | 'clothing' | 'magic' | 'style' }) => {
    const icons = {
        person: (
            <svg xmlns="http://www.w3.org/2000/svg" className="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={0.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
        ),
        architecture: (
            <svg xmlns="http://www.w3.org/2000/svg" className="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={0.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z" />
            </svg>
        ),
        clothing: (
            <svg xmlns="http://www.w3.org/2000/svg" className="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={0.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
            </svg>
        ),
        magic: (
            <svg xmlns="http://www.w3.org/2000/svg" className="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={0.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
            </svg>
        ),
        style: (
             <svg xmlns="http://www.w3.org/2000/svg" className="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={0.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 4.5h14.25M3 9h9.75M3 13.5h5.25m5.25-.75L17.25 9m0 0L21 12.75M17.25 9v12" />
            </svg>
        ),
    };

    return (
        <div className="flex items-center justify-center h-full p-8 placeholder-icon-wrapper">
            {icons[type]}
        </div>
    );
};


const PolaroidCard: React.FC<PolaroidCardProps> = ({ mediaUrl, caption, status, error, onShake, onDownload, onEdit, onSwapImage, onSelectFromGallery, isMobile, placeholderType, onClick }) => {
    const hasMedia = status === 'done' && mediaUrl;
    const isVideo = hasMedia && mediaUrl!.startsWith('blob:');
    const isClickable = !!onClick;

    const [activeTooltip, setActiveTooltip] = useState<{ id: string; rect: DOMRect } | null>(null);
    const tooltipTimeoutRef = useRef<number | null>(null);

    const TOOLTIPS = {
        edit: { title: 'Sửa ảnh nâng cao', description: 'Mở trình chỉnh sửa ảnh với nhiều công cụ để tinh chỉnh chi tiết.' },
        swap: { title: 'Đổi ảnh', description: 'Tải lên một ảnh khác từ máy tính để thay thế ảnh này.' },
        gallery: { title: 'Chọn từ thư viện', description: 'Chọn một ảnh đã tạo hoặc tải lên trước đó trong phiên này.' },
        shake: { title: 'Tinh chỉnh / Tạo video', description: 'Nhập prompt để tinh chỉnh ảnh hoặc tạo video từ ảnh này.' },
        download: { title: 'Tải về', description: 'Lưu ảnh hoặc video này về máy của bạn.' }
    };

    const showTooltip = (id: string, e: React.MouseEvent) => {
        if (tooltipTimeoutRef.current) clearTimeout(tooltipTimeoutRef.current);
        const target = e.currentTarget as HTMLElement;
        tooltipTimeoutRef.current = window.setTimeout(() => {
            if (document.body.contains(target)) {
                const rect = target.getBoundingClientRect();
                setActiveTooltip({ id, rect });
            }
        }, 500);
    };

    const hideTooltip = () => {
        if (tooltipTimeoutRef.current) clearTimeout(tooltipTimeoutRef.current);
        setActiveTooltip(null);
    };

    const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (isClickable && onClick) {
            e.preventDefault();
            e.stopPropagation();
            onClick();
        }
    };

    const tooltipId = activeTooltip?.id as keyof typeof TOOLTIPS | undefined;
    const tooltipStyle: React.CSSProperties = {
        position: 'fixed',
        zIndex: 100,
    };
    if (activeTooltip) {
        tooltipStyle.top = activeTooltip.rect.top + activeTooltip.rect.height / 2;
        if (activeTooltip.rect.left < 300) { // If button is too close to left edge, show on right
            tooltipStyle.left = activeTooltip.rect.right + 8;
            tooltipStyle.transform = 'translate(0, -50%)';
        } else { // Default to showing on the left
            tooltipStyle.left = activeTooltip.rect.left - 8;
            tooltipStyle.transform = 'translate(-100%, -50%)';
        }
    }

    return (
        <>
            <div className={cn("polaroid-card", isClickable && "cursor-pointer")} onClick={handleClick}>
                <div className={cn(
                    "polaroid-image-container group",
                    !hasMedia && 'aspect-square',
                    hasMedia && 'has-image'
                )}>
                    {status === 'pending' && <LoadingSpinner />}
                    {status === 'error' && <ErrorDisplay message={error} />}
                    {hasMedia && (
                        <>
                            {isClickable && (
                                <div className="absolute inset-0 z-10 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 1v4m0 0h-4m4 0l-5-5" />
                                    </svg>
                                </div>
                            )}
                            {isVideo ? (
                                <video
                                    key={mediaUrl}
                                    src={mediaUrl}
                                    autoPlay
                                    loop
                                    muted
                                    playsInline
                                    className="w-full h-auto md:w-auto md:h-full block"
                                />
                            ) : (
                                <img
                                    key={mediaUrl}
                                    src={mediaUrl}
                                    alt={caption}
                                    className="w-full h-auto md:w-auto md:h-full block"
                                />
                            )}
                        </>
                    )}
                    {status === 'done' && !mediaUrl && <Placeholder type={placeholderType} />}

                    {/* --- BUTTON CONTAINER --- */}
                    <div className={cn(
                        "absolute top-2 right-2 z-20 flex flex-col gap-2 transition-opacity duration-300",
                        (hasMedia || onSelectFromGallery) ? (!isMobile ? 'opacity-0 group-hover:opacity-100' : '') : 'opacity-0 pointer-events-none'
                    )}>
                         {hasMedia && onEdit && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onEdit(caption); }}
                                onMouseEnter={(e) => showTooltip('edit', e)} onMouseLeave={hideTooltip}
                                className="p-2 bg-black/50 rounded-full text-white hover:bg-black/75 focus:outline-none focus:ring-2 focus:ring-white"
                                aria-label={`Sửa ảnh cho ${caption}`}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M5 4a1 1 0 00-2 0v7.268a2 2 0 000 3.464V16a1 1 0 102 0v-1.268a2 2 0 000-3.464V4zM11 4a1 1 0 10-2 0v1.268a2 2 0 000 3.464V16a1 1 0 102 0V8.732a2 2 0 000-3.464V4zM16 3a1 1 0 011 1v7.268a2 2 0 010 3.464V16a1 1 0 11-2 0v-1.268a2 2 0 010-3.464V4a1 1 0 011-1z" />
                                </svg>
                            </button>
                        )}
                         {hasMedia && onSwapImage && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onSwapImage(); }}
                                onMouseEnter={(e) => showTooltip('swap', e)} onMouseLeave={hideTooltip}
                                className="p-2 bg-black/50 rounded-full text-white hover:bg-black/75 focus:outline-none focus:ring-2 focus:ring-white"
                                aria-label={`Đổi ảnh cho ${caption}`}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 12L4 13m3 3l3-3m6 0v12m0-12l3 3m-3-3l-3 3" />
                                </svg>
                            </button>
                        )}
                        {onSelectFromGallery && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onSelectFromGallery(); }}
                                onMouseEnter={(e) => showTooltip('gallery', e)} onMouseLeave={hideTooltip}
                                className="p-2 bg-black/50 rounded-full text-white hover:bg-black/75 focus:outline-none focus:ring-2 focus:ring-white"
                                aria-label={`Chọn ảnh từ thư viện`}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                            </button>
                        )}
                         {hasMedia && onShake && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onShake(caption); }}
                                onMouseEnter={(e) => showTooltip('shake', e)} onMouseLeave={hideTooltip}
                                className="p-2 bg-black/50 rounded-full text-white hover:bg-black/75 focus:outline-none focus:ring-2 focus:ring-white"
                                aria-label={`Tinh chỉnh ảnh cho ${caption}`}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                  <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
                                  <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" />
                                </svg>
                            </button>
                        )}
                        {hasMedia && onDownload && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onDownload(caption); }}
                                onMouseEnter={(e) => showTooltip('download', e)} onMouseLeave={hideTooltip}
                                className="p-2 bg-black/50 rounded-full text-white hover:bg-black/75 focus:outline-none focus:ring-2 focus:ring-white"
                                aria-label={`Tải ảnh cho ${caption}`}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                            </button>
                        )}
                    </div>
                </div>
                <div className="absolute bottom-4 left-4 right-4 text-center px-2">
                    <p className={cn(
                        "polaroid-caption",
                        status === 'done' && mediaUrl ? 'text-black' : 'text-neutral-800'
                    )}>
                        {caption}
                    </p>
                </div>
            </div>
            <AnimatePresence>
                {activeTooltip && tooltipId && TOOLTIPS[tooltipId] && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ duration: 0.15 }}
                        className="p-3 text-sm text-left text-white bg-neutral-900/80 backdrop-blur-sm border border-white/10 rounded-md shadow-lg pointer-events-none w-64"
                        style={tooltipStyle}
                    >
                        <div className="font-bold text-yellow-400 mb-1">{TOOLTIPS[tooltipId].title}</div>
                        <div className="text-neutral-300 text-xs">{TOOLTIPS[tooltipId].description}</div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

export default PolaroidCard;