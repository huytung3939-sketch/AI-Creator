/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, ChangeEvent, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { generateArchitecturalImage, editImageWithPrompt } from '../services/geminiService';
import ActionablePolaroidCard from './ActionablePolaroidCard';
import Lightbox from './Lightbox';
import { 
    AppScreenHeader,
    ImageUploader,
    ResultsView,
    ImageForZip,
    AppOptionsLayout,
    OptionsPanel,
    type ArchitectureIdeatorState,
    handleFileUpload,
    useLightbox,
    useVideoGeneration,
    processAndDownloadAll,
    SearchableSelect,
} from './uiUtils';

interface ArchitectureIdeatorProps {
    mainTitle: string;
    subtitle: string;
    useSmartTitleWrapping: boolean;
    smartTitleWrapWords: number;
    uploaderCaption: string;
    uploaderDescription: string;
    addImagesToGallery: (images: string[]) => void;
    appState: ArchitectureIdeatorState;
    onStateChange: (newState: ArchitectureIdeatorState) => void;
    onReset: () => void;
    onGoBack: () => void;
}

const CONTEXT_OPTIONS = ['Tự động', 'Đô thị hiện đại (Modern city)', 'Vùng quê yên tĩnh (Countryside)', 'Ven biển (Coastal)', 'Vùng núi (Mountainous)', 'Sa mạc (Desert)', 'Rừng rậm (Jungle)', 'Khu công nghiệp (Industrial zone)', 'Không gian vũ trụ (Outer space)', 'Thế giới thần tiên (Fairy tale world)', 'Thành phố tương lai (Cyberpunk city)', 'Thành phố dưới nước (Underwater city)', 'Thành phố trên mây (City on clouds)', 'Khu di tích cổ đại (Ancient ruins)', 'Vườn Nhật Bản (Japanese garden)', 'Đường phố London thời Victoria (Victorian London)', 'Khu nhà ổ chuột Brazil (Brazilian favela)', 'Trạm nghiên cứu Bắc Cực (Arctic station)', 'Colony trên sao Hỏa (Mars colony)', 'Vùng đất hoang tàn hậu tận thế (Post-apocalyptic wasteland)', 'Làng Địa Trung Hải (Mediterranean village)', 'Cảnh quan núi lửa (Volcanic landscape)'];
const STYLE_OPTIONS = ['Tự động', 'Hiện đại (Modern)', 'Tối giản (Minimalist)', 'Brutalist', 'Đông Dương (Indochine)', 'Cổ điển (Classical)', 'Nhiệt đới (Tropical)', 'Nhà gỗ (Cabin)', 'Go-tic (Gothic)', 'Art Deco', 'Deconstructivism', 'Bền vững (Sustainable)', 'Hữu cơ (Biophilic/Organic)', 'Tham số (Parametricism)', 'Công nghiệp (Industrial)', 'Scandinavian', 'Nhà nông trại hiện đại (Modern Farmhouse)', 'Địa Trung Hải (Mediterranean)', 'Tương lai (Futuristic)', 'Steampunk', 'Nhà trên cây (Treehouse)', 'Kiến trúc hang động (Cave architecture)', 'Nhà container (Container home)'];
const COLOR_OPTIONS = ['Tự động', 'Tông màu ấm (Warm tones)', 'Tông màu lạnh (Cool tones)', 'Màu trung tính (Neutral colors)', 'Đơn sắc (Monochromatic)', 'Tương phản cao (High contrast)', 'Màu Pastel nhẹ nhàng (Soft pastels)', 'Màu rực rỡ (Vibrant colors)', 'Màu đất (Earthy tones)', 'Màu đá quý (Jewel tones)', 'Neonoir (Neon colors)', 'Màu gỉ sét & kim loại (Rust & Metallic)', 'Trắng và gỗ (White & Wood)', 'Xám bê tông (Concrete gray)', 'Xanh bạc hà & hồng san hô (Mint & Coral)', 'Xanh navy & vàng đồng (Navy & Brass)', 'Sepia (Nâu đỏ)', 'Đen trắng (Black & White)', 'Màu hoàng hôn (Sunset palette)', 'Màu bình minh (Sunrise palette)', 'Màu cầu vồng (Rainbow)', 'Màu của đại dương (Oceanic colors)'];
const LIGHTING_OPTIONS = ['Tự động', 'Ánh sáng ban ngày tự nhiên (Natural daylight)', 'Bình minh/Hoàng hôn (Golden hour)', 'Ánh sáng ban đêm (Night lighting)', 'Ngày u ám, ánh sáng dịu (Overcast, soft light)', 'Nắng gắt, bóng đổ rõ (Harsh sun, hard shadows)', 'Ánh sáng Neon', 'Ánh sáng huyền ảo (Ethereal lighting)', 'Ánh sáng thể tích (Volumetric rays)', 'Ánh sáng sân khấu (Stage lighting)', 'Ánh sáng từ đèn lồng (Lantern light)', 'Ánh sáng lập lòe từ lửa (Flickering firelight)', 'Ánh sáng phát quang sinh học (Bioluminescent glow)', 'Phim noir (Film noir shadows)', 'Ánh sáng studio (Studio lighting)', 'Chiếu sáng từ dưới lên (Uplighting)', 'Ánh sáng lấp lánh (Twinkling/Twinkling lights)', 'Cháy sáng (Overexposed)', 'Tối và u ám (Dark and moody)', 'Ánh sáng phản chiếu từ nước (Water reflection)', 'Bóng đổ từ rèm cửa (Caustic shadows)'];

const ArchitectureIdeator: React.FC<ArchitectureIdeatorProps> = (props) => {
    const { 
        uploaderCaption, uploaderDescription, addImagesToGallery, 
        appState, onStateChange, onReset, onGoBack,
        ...headerProps 
    } = props;
    
    const { lightboxIndex, openLightbox, closeLightbox, navigateLightbox } = useLightbox();
    const { videoTasks, generateVideo } = useVideoGeneration();
    
    const lightboxImages = [appState.uploadedImage, ...appState.historicalImages].filter((img): img is string => !!img);
    
    const handleImageSelectedForUploader = (imageDataUrl: string) => {
        onStateChange({
            ...appState,
            stage: 'configuring',
            uploadedImage: imageDataUrl,
            generatedImage: null,
            historicalImages: [],
            error: null,
        });
        addImagesToGallery([imageDataUrl]);
    };

    const handleImageUpload = useCallback((e: ChangeEvent<HTMLInputElement>) => {
        handleFileUpload(e, handleImageSelectedForUploader);
    }, [appState, onStateChange]);
    
    const handleOptionChange = (field: keyof ArchitectureIdeatorState['options'], value: string | boolean) => {
        onStateChange({
            ...appState,
            options: {
                ...appState.options,
                [field]: value
            }
        });
    };

    const executeInitialGeneration = async () => {
        if (!appState.uploadedImage) return;
        
        onStateChange({ ...appState, stage: 'generating', error: null });

        try {
            // No need to transform options, the service handles '' and 'Tự động' correctly
            const resultUrl = await generateArchitecturalImage(appState.uploadedImage, appState.options);
            onStateChange({
                ...appState,
                stage: 'results',
                generatedImage: resultUrl,
                historicalImages: [...appState.historicalImages, resultUrl],
            });
            addImagesToGallery([resultUrl]);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
            onStateChange({ ...appState, stage: 'results', error: errorMessage });
        }
    };

    const handleRegeneration = async (prompt: string) => {
        if (!appState.generatedImage) return;

        onStateChange({ ...appState, stage: 'generating', error: null });

        try {
            const resultUrl = await editImageWithPrompt(appState.generatedImage, prompt);
            onStateChange({
                ...appState,
                stage: 'results',
                generatedImage: resultUrl,
                historicalImages: [...appState.historicalImages, resultUrl],
            });
            addImagesToGallery([resultUrl]);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
            onStateChange({ ...appState, stage: 'results', error: errorMessage });
        }
    };
    
    const handleUploadedImageChange = (newUrl: string) => {
        onStateChange({ ...appState, uploadedImage: newUrl });
        addImagesToGallery([newUrl]);
    };

    const handleGeneratedImageChange = (newUrl: string) => {
        const newHistorical = [...appState.historicalImages, newUrl];
        onStateChange({ ...appState, stage: 'results', generatedImage: newUrl, historicalImages: newHistorical });
        addImagesToGallery([newUrl]);
    };

    const handleBackToOptions = () => {
        onStateChange({ ...appState, stage: 'configuring', error: null });
    };

    const handleDownloadAll = () => {
        const inputImages: ImageForZip[] = [];
        if (appState.uploadedImage) {
            inputImages.push({
                url: appState.uploadedImage,
                filename: 'anh-phac-thao-goc',
                folder: 'input',
            });
        }
        
        processAndDownloadAll({
            inputImages,
            historicalImages: appState.historicalImages,
            videoTasks,
            zipFilename: 'ket-qua-kien-truc.zip',
            baseOutputFilename: 'ket-qua-kien-truc',
        });
    };
    
    const isLoading = appState.stage === 'generating';

    return (
        <div className="flex flex-col items-center justify-center w-full h-full flex-1 min-h-0">
            <AnimatePresence>
            {appState.stage === 'idle' || appState.stage === 'configuring' && (
                <AppScreenHeader {...headerProps} />
            )}
            </AnimatePresence>

            <div className="flex flex-col items-center justify-center w-full flex-1">
                {appState.stage === 'idle' && (
                    <ImageUploader
                        id="sketch-upload"
                        onImageUpload={handleImageUpload}
                        onImageChange={handleImageSelectedForUploader}
                        uploaderCaption={uploaderCaption}
                        uploaderDescription={uploaderDescription}
                        placeholderType="architecture"
                    />
                )}

                {appState.stage === 'configuring' && appState.uploadedImage && (
                    <AppOptionsLayout>
                        <div className="flex-shrink-0">
                            <ActionablePolaroidCard 
                                mediaUrl={appState.uploadedImage} 
                                caption="Ảnh phác thảo" 
                                status="done"
                                onClick={() => openLightbox(0)}
                                isEditable={true}
                                isSwappable={true}
                                isGallerySelectable={true}
                                onImageChange={handleUploadedImageChange}
                            />
                        </div>

                        <OptionsPanel>
                            <h2 className="base-font font-bold text-2xl text-yellow-400 border-b border-yellow-400/20 pb-2">Tùy chỉnh ý tưởng</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <SearchableSelect
                                    id="context"
                                    label="Bối cảnh"
                                    options={CONTEXT_OPTIONS}
                                    value={appState.options.context}
                                    onChange={(value) => handleOptionChange('context', value)}
                                    placeholder="Tìm hoặc nhập bối cảnh..."
                                />
                                <SearchableSelect
                                    id="style"
                                    label="Phong cách kiến trúc"
                                    options={STYLE_OPTIONS}
                                    value={appState.options.style}
                                    onChange={(value) => handleOptionChange('style', value)}
                                    placeholder="Tìm hoặc nhập phong cách..."
                                />
                                <SearchableSelect
                                    id="color"
                                    label="Tông màu"
                                    options={COLOR_OPTIONS}
                                    value={appState.options.color}
                                    onChange={(value) => handleOptionChange('color', value)}
                                    placeholder="Tìm hoặc nhập tông màu..."
                                />
                                <SearchableSelect
                                    id="lighting"
                                    label="Ánh sáng"
                                    options={LIGHTING_OPTIONS}
                                    value={appState.options.lighting}
                                    onChange={(value) => handleOptionChange('lighting', value)}
                                    placeholder="Tìm hoặc nhập ánh sáng..."
                                />
                            </div>
                            <div>
                                <label htmlFor="notes" className="block text-left base-font font-bold text-lg text-neutral-200 mb-2">Ghi chú bổ sung</label>
                                <textarea
                                    id="notes"
                                    value={appState.options.notes}
                                    onChange={(e) => handleOptionChange('notes', e.target.value)}
                                    placeholder="Ví dụ: thêm nhiều cây xanh, vật liệu kính..."
                                    className="form-input h-24"
                                    rows={3}
                                />
                            </div>
                             <div className="flex items-center pt-2">
                                <input
                                    type="checkbox"
                                    id="remove-watermark-arch"
                                    checked={appState.options.removeWatermark}
                                    onChange={(e) => handleOptionChange('removeWatermark', e.target.checked)}
                                    className="h-4 w-4 rounded border-neutral-500 bg-neutral-700 text-yellow-400 focus:ring-yellow-400 focus:ring-offset-neutral-800"
                                    aria-label="Xóa watermark nếu có"
                                />
                                <label htmlFor="remove-watermark-arch" className="ml-3 block text-sm font-medium text-neutral-300">
                                    Xóa watermark (nếu có)
                                </label>
                            </div>
                            <div className="flex items-center justify-end gap-4 pt-4">
                                <button onClick={onReset} className="btn btn-secondary">
                                    Đổi ảnh khác
                                </button>
                                <button 
                                    onClick={executeInitialGeneration} 
                                    className="btn btn-primary"
                                    disabled={isLoading}
                                >
                                    {isLoading ? 'Đang tạo...' : 'Tạo ảnh'}
                                </button>
                            </div>
                        </OptionsPanel>

                    </AppOptionsLayout>
                )}
            </div>

            {(appState.stage === 'generating' || appState.stage === 'results') && (
                <ResultsView
                    stage={appState.stage}
                    originalImage={appState.uploadedImage}
                    onOriginalClick={() => openLightbox(0)}
                    error={appState.error}
                    actions={
                        <>
                            {appState.generatedImage && !appState.error && (
                                <button onClick={handleDownloadAll} className="btn btn-primary">
                                    Tải về tất cả
                                </button>
                            )}
                            <button onClick={handleBackToOptions} className="btn btn-secondary">
                                Chỉnh sửa tùy chọn
                            </button>
                            <button onClick={onReset} className="btn btn-secondary !bg-red-500/20 !border-red-500/80 hover:!bg-red-500 hover:!text-white">
                                Bắt đầu lại
                            </button>
                        </>
                    }
                >
                    <motion.div
                        className="w-full md:w-auto flex-shrink-0"
                        key="generated-architecture"
                        initial={{ opacity: 0, scale: 0.5, y: 100 }}
                        animate={{ opacity: 1, scale: 1, y: 0, rotate: 0 }}
                        transition={{ type: 'spring', stiffness: 80, damping: 15, delay: 0.15 }}
                    >
                        <ActionablePolaroidCard
                            caption="Kết quả"
                            status={isLoading ? 'pending' : (appState.error ? 'error' : 'done')}
                            mediaUrl={appState.generatedImage ?? undefined}
                            error={appState.error ?? undefined}
                            onClick={!appState.error && appState.generatedImage ? () => openLightbox(lightboxImages.indexOf(appState.generatedImage!)) : undefined}
                            isDownloadable={true}
                            isEditable={true}
                            isRegeneratable={true}
                            onImageChange={handleGeneratedImageChange}
                            onRegenerate={handleRegeneration}
                            onGenerateVideoFromPrompt={(prompt) => appState.generatedImage && generateVideo(appState.generatedImage, prompt)}
                            regenerationTitle="Tinh chỉnh ảnh kiến trúc"
                            regenerationDescription="Thêm ghi chú để cải thiện ảnh"
                            regenerationPlaceholder="Ví dụ: thêm hồ bơi, vật liệu bằng gỗ, ánh sáng ban đêm..."
                        />
                    </motion.div>
                    {appState.historicalImages.map(sourceUrl => {
                        const videoTask = videoTasks[sourceUrl];
                        if (!videoTask) return null;
                        return (
                            <motion.div
                                className="w-full md:w-auto flex-shrink-0"
                                key={`${sourceUrl}-video`}
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ type: 'spring', stiffness: 100, damping: 20 }}
                            >
                                <ActionablePolaroidCard
                                    caption="Video"
                                    status={videoTask.status}
                                    mediaUrl={videoTask.resultUrl}
                                    error={videoTask.error}
                                    isDownloadable={videoTask.status === 'done'}
                                    onClick={videoTask.resultUrl ? () => openLightbox(lightboxImages.indexOf(videoTask.resultUrl!)) : undefined}
                                />
                            </motion.div>
                        );
                    })}
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

export default ArchitectureIdeator;