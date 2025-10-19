/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useEffect, useCallback, useRef } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import PolaroidCard from './PolaroidCard';
import { useAppControls } from './uiContexts';
import { handleFileUpload } from './uiFileUtilities';
export * from './SearchableSelect'; // EXPORT THE NEW COMPONENT

/**
 * Renders a title with optional smart wrapping to keep a specified number of last words together.
 * This prevents orphaned words on a new line.
 * @param title The title string.
 * @param enabled A boolean to enable/disable the smart wrapping logic.
 * @param wordsToKeep The number of words to keep on the same line at the end.
 * @returns A React.ReactNode element for the title.
 */
export const renderSmartlyWrappedTitle = (title: string, enabled: boolean, wordsToKeep: number): React.ReactNode => {
    // Default wordsToKeep to 2 if not provided or invalid
    const numWordsToKeep = (typeof wordsToKeep === 'number' && wordsToKeep > 0) ? wordsToKeep : 2;

    if (!enabled) {
        return title;
    }

    const words = title.split(' ');
    // Only apply wrapping if there are more words than we want to keep together
    if (words.length > numWordsToKeep) {
        const partToKeepTogether = words.splice(-numWordsToKeep).join(' ');
        const firstPart = words.join(' ');
        return (
            <>
                {firstPart}{' '}
                <span className="whitespace-nowrap">{partToKeepTogether}</span>
            </>
        );
    }
    
    return title;
};

// --- Reusable Modal Component ---
interface RegenerationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirmImage: (prompt: string) => void;
    onConfirmVideo?: (prompt: string) => void;
    itemToModify: string | null;
    title?: string;
    description?: string;
    placeholder?: string;
}

export const RegenerationModal: React.FC<RegenerationModalProps> = ({
    isOpen,
    onClose,
    onConfirmImage,
    onConfirmVideo,
    itemToModify,
    title = "Tinh chỉnh hoặc Tạo video",
    description = "Thêm yêu cầu để tinh chỉnh ảnh, hoặc dùng nó để tạo video cho",
    placeholder = "Ví dụ: tông màu ấm, phong cách phim xưa..."
}) => {
    const [customPrompt, setCustomPrompt] = useState('');

    useEffect(() => {
        // Reset prompt when modal is newly opened
        if (isOpen) {
            setCustomPrompt('');
        }
    }, [isOpen]);

    const handleConfirmImage = () => {
        onConfirmImage(customPrompt);
    };

    const handleConfirmVideo = () => {
        if (onConfirmVideo) {
            onConfirmVideo(customPrompt);
        }
    };

    if (!isOpen) {
        return null;
    }

    return ReactDOM.createPortal(
        <AnimatePresence>
            {isOpen && itemToModify && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="modal-overlay"
                    aria-modal="true"
                    role="dialog"
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        onClick={(e) => e.stopPropagation()}
                        className="modal-content"
                    >
                        <h3 className="base-font font-bold text-2xl text-yellow-400">{title}</h3>
                        <p className="text-neutral-300">
                            {description} <span className="font-bold text-white">"{itemToModify}"</span>.
                        </p>
                        <textarea
                            value={customPrompt}
                            onChange={(e) => setCustomPrompt(e.target.value)}
                            placeholder={placeholder}
                            className="modal-textarea"
                            rows={3}
                            aria-label="Yêu cầu chỉnh sửa bổ sung"
                        />
                        <div className="flex justify-end items-center gap-4 mt-2">
                            <button onClick={onClose} className="btn btn-secondary btn-sm">
                                Hủy
                            </button>
                            {onConfirmVideo && (
                                <button onClick={handleConfirmVideo} className="btn btn-secondary btn-sm">
                                    Tạo video
                                </button>
                            )}
                            <button onClick={handleConfirmImage} className="btn btn-primary btn-sm">
                                Tạo lại ảnh
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    );
};

// --- Reusable UI Components ---

interface AppScreenHeaderProps {
    mainTitle: string;
    subtitle: string;
    useSmartTitleWrapping: boolean;
    smartTitleWrapWords: number;
}

/**
 * A standardized header component for app screens.
 */
export const AppScreenHeader: React.FC<AppScreenHeaderProps> = ({ mainTitle, subtitle, useSmartTitleWrapping, smartTitleWrapWords }) => (
     <motion.div
        className="text-center mb-8"
        initial={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
    >
        <h1 className="text-5xl/[1.3] md:text-7xl/[1.3] title-font font-bold text-white [text-shadow:1px_1px_3px_rgba(0,0,0,0.4)] tracking-wider">
            {renderSmartlyWrappedTitle(mainTitle, useSmartTitleWrapping, smartTitleWrapWords)}
        </h1>
        <p className="sub-title-font font-bold text-neutral-200 mt-2 text-xl tracking-wide">{subtitle}</p>
    </motion.div>
);

interface ImageUploaderProps {
    onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onImageChange: (imageDataUrl: string) => void;
    uploaderCaption: string;
    uploaderDescription: string;
    placeholderType?: 'person' | 'architecture' | 'clothing' | 'magic' | 'style';
    id: string;
}

/**
 * A reusable image uploader component with a Polaroid card style.
 */
export const ImageUploader: React.FC<ImageUploaderProps> = ({ onImageUpload, onImageChange, uploaderCaption, uploaderDescription, placeholderType = 'person', id }) => {
    const [isGalleryPickerOpen, setGalleryPickerOpen] = useState(false);
    const { sessionGalleryImages } = useAppControls();

    const handleOpenGalleryPicker = useCallback(() => {
        setGalleryPickerOpen(true);
    }, []);

    const handleGalleryImageSelect = (selectedImageUrl: string) => {
        onImageChange(selectedImageUrl);
        setGalleryPickerOpen(false);
    };

    return (
        <div className="flex flex-col items-center justify-center w-full">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                <div className="group transform hover:scale-105 transition-transform duration-300">
                    <label htmlFor={id} className="cursor-pointer">
                        <PolaroidCard
                            caption={uploaderCaption}
                            status="done"
                            mediaUrl={undefined}
                            placeholderType={placeholderType}
                            onSelectFromGallery={handleOpenGalleryPicker}
                        />
                    </label>
                </div>
            </motion.div>
            <input 
                id={id} 
                type="file" 
                className="hidden" 
                accept="image/png, image/jpeg, image/webp" 
                onChange={onImageUpload} 
                onClick={(e) => (e.currentTarget.value = '')}
            />
            <p className="mt-8 base-font font-bold text-neutral-300 text-center max-w-lg text-lg">
                {uploaderDescription}
            </p>
            <GalleryPicker
                isOpen={isGalleryPickerOpen}
                onClose={() => setGalleryPickerOpen(false)}
                onSelect={handleGalleryImageSelect}
                images={sessionGalleryImages}
            />
        </div>
    );
};


interface ResultsViewProps {
    stage: 'generating' | 'results';
    originalImage: string | null;
    onOriginalClick?: () => void;
    children: React.ReactNode;
    actions: React.ReactNode;
    isMobile?: boolean;
    error?: string | null;
    hasPartialError?: boolean;
}

/**
 * A reusable component to display the results of an image generation process.
 */
export const ResultsView: React.FC<ResultsViewProps> = ({ stage, originalImage, onOriginalClick, children, actions, isMobile, error, hasPartialError }) => {
    const isTotalError = !!error;
    
    return (
        <div className="w-full flex-1 flex flex-col items-center justify-between pt-12">
            <AnimatePresence>
                {stage === 'results' && (
                    <motion.div
                        className="text-center"
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.4 }}
                    >
                        {isTotalError ? (
                            <>
                                <h2 className="base-font font-bold text-3xl text-red-400">Đã xảy ra lỗi</h2>
                                <p className="text-neutral-300 mt-1 max-w-md mx-auto">{error}</p>
                            </>
                        ) : (
                            <>
                                <h2 className="base-font font-bold text-3xl text-neutral-100">Đây là kết quả của bạn!</h2>
                                {hasPartialError ? (
                                    <p className="text-yellow-300 mt-1">Một vài ảnh đã gặp lỗi. Bạn có thể thử tạo lại chúng.</p>
                                ) : (
                                    <p className="text-neutral-300 mt-1">Bạn có thể tạo lại từng ảnh hoặc tải về máy.</p>
                                )}
                            </>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="w-full flex-1 flex items-start justify-center overflow-y-auto md:overflow-x-auto py-4">
                <motion.div
                    layout
                    className="flex flex-col md:flex-row flex-nowrap items-start md:items-stretch justify-start gap-8 px-4 md:px-8 w-full md:w-max mx-auto py-4"
                >
                    {originalImage && (
                        <motion.div
                            key="original-image-result"
                            className="w-full md:w-auto flex-shrink-0"
                            initial={{ opacity: 0, scale: 0.5, y: 100 }}
                            animate={{ opacity: 1, scale: 1, y: 0, rotate: 0 }}
                            transition={{ type: 'spring', stiffness: 80, damping: 15, delay: -0.15 }}
                            whileHover={{ scale: 1.05, rotate: 0, zIndex: 10 }}
                        >
                             <div className={cn("polaroid-card")}>
                                <div className={cn("polaroid-image-container has-image")}>
                                    <img src={originalImage} alt="Ảnh gốc" className="w-full h-auto md:w-auto md:h-full block" onClick={onOriginalClick}/>
                                </div>
                                <div className="absolute bottom-4 left-4 right-4 text-center px-2">
                                    <p className="polaroid-caption text-black">Ảnh gốc</p>
                                </div>
                            </div>
                        </motion.div>
                    )}
                    {children}
                </motion.div>
            </div>

            <div className="w-full px-4 my-6 flex items-center justify-center">
                {stage === 'results' && (
                    <motion.div
                        className="results-actions"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5, duration: 0.5 }}
                    >
                        {actions}
                    </motion.div>
                )}
            </div>
        </div>
    );
};


// --- Reusable Layout Components for App Screens ---

interface AppOptionsLayoutProps {
    children: React.ReactNode;
}

/**
 * A standardized single-column layout for screens that show an uploaded image and an options panel.
 */
export const AppOptionsLayout: React.FC<AppOptionsLayoutProps> = ({ children }) => (
    <motion.div
        className="flex flex-col items-center gap-8 w-full max-w-6xl py-6 overflow-y-auto"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
    >
        {children}
    </motion.div>
);

interface OptionsPanelProps {
    children: React.ReactNode;
    className?: string;
}

/**
 * A standardized panel for displaying app-specific options.
 */
export const OptionsPanel: React.FC<OptionsPanelProps> = ({ children, className }) => (
     <div className={cn("w-full max-w-3xl bg-black/20 p-6 rounded-lg border border-white/10 space-y-4", className)}>
        {children}
    </div>
);

// --- Slider Component ---

interface SliderProps {
    label: string;
    options: readonly string[];
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
}

export const Slider: React.FC<SliderProps> = ({ label, options, value, onChange, disabled = false }) => {
    const valueIndex = options.indexOf(value);
    const sliderValue = valueIndex >= 0 ? valueIndex : 0;

    const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (disabled) return;
        const newIndex = parseInt(e.target.value, 10);
        if (options[newIndex]) {
            onChange(options[newIndex]);
        }
    };

    return (
        <div>
            <label className="block text-left base-font font-bold text-lg text-neutral-200 mb-2">
                {label}
            </label>
            <div className="slider-container">
                <input
                    type="range"
                    min="0"
                    max={options.length - 1}
                    value={sliderValue}
                    onChange={handleSliderChange}
                    className="slider-track"
                    aria-label={label}
                    disabled={disabled}
                />
                <div className="slider-labels">
                    {options.map((option, index) => (
                        <span 
                            key={index} 
                            className={cn(
                                "slider-label",
                                { 'slider-label-active': index === sliderValue && !disabled }
                            )}
                        >
                            {option}
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
};


// --- Gallery Picker Component with Drag & Drop ---
interface GalleryPickerProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (imageUrl: string) => void;
    images: string[];
}

export const GalleryPicker: React.FC<GalleryPickerProps> = ({ isOpen, onClose, onSelect, images }) => {
    const { addImagesToGallery, removeImageFromGallery } = useAppControls();
    const [isDraggingOver, setIsDraggingOver] = useState(false);
    const isDroppingRef = useRef(false);

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingOver(true);
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingOver(false);
    };

    const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        isDroppingRef.current = true;
        setIsDraggingOver(false);

        const files = e.dataTransfer.files;
        if (!files || files.length === 0) {
            isDroppingRef.current = false;
            return;
        }

        // FIX: Cast `file` to `File` to access its `type` property and satisfy TypeScript.
        const imageFiles = Array.from(files).filter(file => (file as File).type.startsWith('image/'));
        if (imageFiles.length === 0) {
            isDroppingRef.current = false;
            return;
        }

        const readImageAsDataURL = (file: File): Promise<string> => {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    if (typeof reader.result === 'string') {
                        resolve(reader.result);
                    } else {
                        reject(new Error('Failed to read file as Data URL.'));
                    }
                };
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
        };

        try {
            const imageDataUrls = await Promise.all(imageFiles.map(readImageAsDataURL));
            addImagesToGallery(imageDataUrls);
        } catch (error) {
            console.error("Error reading dropped files:", error);
        } finally {
             setTimeout(() => { isDroppingRef.current = false; }, 100);
        }
    };

    const handleClose = () => {
        if (isDroppingRef.current) return;
        onClose();
    };

    if (!isOpen) {
        return null;
    }

    return ReactDOM.createPortal(
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={handleClose}
                    className="modal-overlay z-[70]"
                    aria-modal="true"
                    role="dialog"
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        onClick={(e) => e.stopPropagation()}
                        className="modal-content !max-w-4xl !h-[85vh] flex flex-col relative"
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                    >
                        <div className="flex justify-between items-center mb-4 flex-shrink-0">
                            <h3 className="base-font font-bold text-2xl text-yellow-400">Chọn ảnh từ Thư viện</h3>
                            <button onClick={handleClose} className="p-2 rounded-full hover:bg-white/10 transition-colors" aria-label="Đóng thư viện">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        {images.length > 0 ? (
                            <div className="gallery-grid">
                                {images.map((img, index) => (
                                    <motion.div
                                        key={`${img.slice(-20)}-${index}`}
                                        className="gallery-grid-item group relative"
                                        onClick={() => onSelect(img)}
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: index * 0.03 }}
                                    >
                                        <img src={img} alt={`Generated image ${index + 1}`} loading="lazy" />
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                removeImageFromGallery(index);
                                            }}
                                            className="absolute bottom-2 right-2 z-10 p-2 bg-black/60 rounded-full text-white hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 opacity-0 group-hover:opacity-100 transition-all duration-200"
                                            aria-label={`Xóa ảnh ${index + 1}`}
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                            </svg>
                                        </button>
                                    </motion.div>
                                ))}
                            </div>
                        ) : (
                             <div className="text-center text-neutral-400 py-8 flex-1 flex items-center justify-center">
                                <p>Chưa có ảnh nào trong thư viện.<br/>Bạn có thể kéo và thả ảnh vào đây để tải lên.</p>
                            </div>
                        )}
                         <AnimatePresence>
                            {isDraggingOver && (
                                <motion.div
                                    className="absolute inset-0 z-10 bg-black/70 border-4 border-dashed border-yellow-400 rounded-lg flex flex-col items-center justify-center pointer-events-none"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-yellow-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                    </svg>
                                    <p className="text-2xl font-bold text-yellow-400">Thả ảnh vào đây để tải lên</p>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    );
};

// --- Reusable Prompt Result Card ---

interface PromptResultCardProps {
    title: string;
    promptText: string | null;
    className?: string;
}

export const PromptResultCard: React.FC<PromptResultCardProps> = ({ title, promptText, className }) => {
    const [isCopied, setIsCopied] = useState(false);

    const handleCopyPrompt = useCallback(() => {
        if (promptText) {
            navigator.clipboard.writeText(promptText).then(() => {
                setIsCopied(true);
                setTimeout(() => setIsCopied(false), 2000);
            }).catch(err => {
                console.error('Failed to copy text: ', err);
                alert('Không thể sao chép prompt.');
            });
        }
    }, [promptText]);

    return (
        <div className={cn("bg-neutral-100 p-4 flex flex-col w-full rounded-md shadow-lg relative", className)}>
            {promptText && (
                <button
                    onClick={handleCopyPrompt}
                    className="absolute top-3 right-3 p-1.5 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-200 rounded-full transition-colors"
                    aria-label="Sao chép prompt"
                    title="Sao chép prompt"
                >
                    {isCopied ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                    )}
                </button>
            )}
            <h4 className="polaroid-caption !text-left !text-lg !text-black !pb-2 border-b border-neutral-300 mb-2 !p-0 pr-8">
                {title}
            </h4>
            <div className="flex-1 min-h-0 overflow-y-auto pr-2 -mr-2">
                <p className="text-sm whitespace-pre-wrap text-neutral-700 base-font">
                    {promptText || '...'}
                </p>
            </div>
        </div>
    );
};