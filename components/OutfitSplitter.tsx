/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { ChangeEvent, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { splitOutfitFromImage } from '../services/geminiService';
import ActionablePolaroidCard from './ActionablePolaroidCard';
import Lightbox from './Lightbox';
import { 
    AppScreenHeader,
    ImageUploader,
    ResultsView,
    ImageForZip,
    type OutfitSplitterState,
    handleFileUpload,
    useLightbox,
    useMediaQuery,
    processAndDownloadAll,
} from './uiUtils';

interface OutfitSplitterProps {
    mainTitle: string;
    subtitle: string;
    useSmartTitleWrapping: boolean;
    smartTitleWrapWords: number;
    uploaderCaption: string;
    uploaderDescription: string;
    addImagesToGallery: (images: string[]) => void;
    appState: OutfitSplitterState;
    onStateChange: (newState: OutfitSplitterState) => void;
    onReset: () => void;
    onGoBack: () => void;
}

const OutfitSplitter: React.FC<OutfitSplitterProps> = (props) => {
    const { 
        uploaderCaption, uploaderDescription, addImagesToGallery, 
        appState, onStateChange, onReset,
        ...headerProps 
    } = props;
    
    const { lightboxIndex, openLightbox, closeLightbox, navigateLightbox } = useLightbox();
    const isMobile = useMediaQuery('(max-width: 768px)');
    
    const lightboxImages = [appState.uploadedImage, ...appState.generatedItems].filter((img): img is string => !!img);

    const executeOutfitSplit = async (imageUrl: string) => {
        try {
            const resultUrls = await splitOutfitFromImage(imageUrl);
            onStateChange({
                ...appState,
                stage: 'results',
                uploadedImage: imageUrl,
                generatedItems: resultUrls,
                historicalImages: [...appState.historicalImages, ...resultUrls],
            });
            addImagesToGallery(resultUrls);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
            onStateChange({ ...appState, uploadedImage: imageUrl, stage: 'results', error: errorMessage, generatedItems: [] });
        }
    };

    const handleImageSelectedForUploader = (imageDataUrl: string) => {
        onStateChange({
            ...appState,
            stage: 'generating', // Go straight to generating after upload
            uploadedImage: imageDataUrl,
            generatedItems: [],
            historicalImages: [],
            error: null,
        });
        addImagesToGallery([imageDataUrl]);
        executeOutfitSplit(imageDataUrl); // Trigger the API call
    };

    const handleImageUpload = useCallback((e: ChangeEvent<HTMLInputElement>) => {
        handleFileUpload(e, handleImageSelectedForUploader);
    }, []);


    const handleDownloadAll = () => {
        const inputImages: ImageForZip[] = [];
        if (appState.uploadedImage) {
            inputImages.push({
                url: appState.uploadedImage,
                filename: 'anh-goc',
                folder: 'input',
            });
        }
        
        processAndDownloadAll({
            inputImages,
            historicalImages: appState.historicalImages,
            zipFilename: 'trang-phuc-da-tach.zip',
            baseOutputFilename: 'item-trang-phuc',
        });
    };
    
    const isLoading = appState.stage === 'generating';

    return (
        <div className="flex flex-col items-center justify-center w-full h-full flex-1 min-h-0">
            <AnimatePresence>
                {appState.stage === 'idle' && (<AppScreenHeader {...headerProps} />)}
            </AnimatePresence>

            <div className="flex flex-col items-center justify-center w-full flex-1">
                {appState.stage === 'idle' && (
                    <ImageUploader
                        id="outfit-split-upload"
                        onImageUpload={handleImageUpload}
                        onImageChange={handleImageSelectedForUploader}
                        uploaderCaption={uploaderCaption}
                        uploaderDescription={uploaderDescription}
                        placeholderType="person"
                    />
                )}
            </div>

            {(appState.stage === 'generating' || appState.stage === 'results') && (
                <ResultsView
                    stage={appState.stage}
                    originalImage={appState.uploadedImage}
                    onOriginalClick={() => appState.uploadedImage && openLightbox(lightboxImages.indexOf(appState.uploadedImage))}
                    error={appState.error}
                    isMobile={isMobile}
                    actions={
                        <>
                            {appState.generatedItems.length > 0 && !appState.error && (<button onClick={handleDownloadAll} className="btn btn-primary">Tải về tất cả</button>)}
                            <button onClick={onReset} className="btn btn-secondary !bg-red-500/20 !border-red-500/80 hover:!bg-red-500 hover:!text-white">Thử ảnh khác</button>
                        </>
                    }>
                    
                    {isLoading ? 
                        Array.from({ length: 3 }).map((_, index) => (
                             <motion.div
                                className="w-full md:w-auto flex-shrink-0"
                                key={`pending-${index}`}
                                initial={{ opacity: 0, scale: 0.5, y: 100 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                transition={{ type: 'spring', stiffness: 80, damping: 15, delay: 0.2 + index * 0.1 }}
                            >
                                <ActionablePolaroidCard caption={`Đang tách item ${index + 1}...`} status="pending" />
                            </motion.div>
                        ))
                       :
                       appState.generatedItems.map((url, index) => (
                             <motion.div
                                className="w-full md:w-auto flex-shrink-0"
                                key={url}
                                initial={{ opacity: 0, scale: 0.5, y: 100 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                transition={{ type: 'spring', stiffness: 80, damping: 15, delay: 0.2 + index * 0.1 }}
                                whileHover={{ scale: 1.05, zIndex: 10 }}
                            >
                                <ActionablePolaroidCard
                                    caption={`Item ${index + 1}`}
                                    status={'done'}
                                    mediaUrl={url}
                                    isDownloadable={true}
                                    isEditable={true} // Allow editing of separated items
                                    isRegeneratable={false}
                                    onClick={() => openLightbox(lightboxImages.indexOf(url))}
                                    isMobile={isMobile}
                                />
                            </motion.div>
                       ))
                    }
                    {appState.generatedItems.length === 0 && appState.stage === 'results' && !appState.error && (
                         <motion.div
                            className="w-full md:w-auto flex-shrink-0"
                            key="no-items-card"
                            initial={{ opacity: 0, scale: 0.5, y: 100 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            transition={{ type: 'spring', stiffness: 80, damping: 15 }}
                        >
                            <ActionablePolaroidCard
                                caption="Không tìm thấy"
                                status="error"
                                error="Không thể xác định được món đồ nào từ ảnh của bạn."
                                isMobile={isMobile}
                            />
                        </motion.div>
                    )}
                </ResultsView>
            )}

            <Lightbox
                images={lightboxImages}
                selectedIndex={lightboxIndex}
                onClose={closeLightbox}
                onNavigate={navigateLightbox}
            />
        </div>
    );
};

export default OutfitSplitter;