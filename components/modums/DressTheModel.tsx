/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useCallback, ChangeEvent, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { generateDressedModelImage, editImageWithPrompt } from '../services/geminiService';
import ActionablePolaroidCard from './ActionablePolaroidCard';
import Lightbox from './Lightbox';
import { 
    AppScreenHeader,
    handleFileUpload,
    useMediaQuery,
    ImageForZip,
    ResultsView,
    type DressTheModelState,
    useLightbox,
    OptionsPanel,
    useVideoGeneration,
    processAndDownloadAll,
    SearchableSelect,
} from './uiUtils';

interface DressTheModelProps {
    mainTitle: string;
    subtitle: string;
    useSmartTitleWrapping: boolean;
    smartTitleWrapWords: number;
    uploaderCaptionModel: string;
    uploaderDescriptionModel: string;
    uploaderCaptionClothing: string;
    uploaderDescriptionClothing: string;
    uploaderCaptionAccessory: string;
    uploaderDescriptionAccessory: string;
    addImagesToGallery: (images: string[]) => void;
    appState: DressTheModelState;
    onStateChange: (newState: DressTheModelState) => void;
    onReset: () => void;
    onGoBack: () => void;
}


const BACKGROUND_OPTIONS = ['Tự động', 'Giữ nguyên bối cảnh gốc', 'Studio (đơn sắc, xám, trắng)', 'Đường phố Paris', 'Đường phố Tokyo ban đêm', 'Đường phố New York', 'Thiên nhiên (bãi biển, rừng cây, núi non)', 'Nội thất sang trọng (khách sạn, biệt thự)', 'Sự kiện (thảm đỏ, sàn diễn thời trang)', 'Bối cảnh nghệ thuật (abstract, gradient)', 'Quán cà phê ấm cúng', 'Thư viện cổ kính', 'Khu vườn thượng uyển', 'Sân thượng thành phố lúc hoàng hôn', 'Hẻm nhỏ graffiti', 'Bên trong một viện bảo tàng nghệ thuật', 'Lâu đài cổ tích', 'Khu chợ địa phương sầm uất', 'Cánh đồng hoa oải hương', 'Bến du thuyền sang trọng', 'Ga tàu hỏa cổ điển', 'Loft công nghiệp (Industrial loft)'];
const POSE_OPTIONS = ['Tự động', 'Giữ nguyên tư thế gốc', 'Đứng thẳng (chuyên nghiệp, lookbook)', 'Tạo dáng high-fashion (ấn tượng, nghệ thuật)', 'Ngồi (trên ghế, bậc thang, sofa)', 'Đi bộ (tự nhiên, sải bước trên phố)', 'Chuyển động (xoay người, nhảy múa)', 'Dựa vào tường', 'Nhìn qua vai', 'Tay trong túi quần', 'Chân bắt chéo', 'Cúi người', 'Nằm trên sàn/cỏ', 'Chạy/Nhảy', 'Tạo dáng hành động (action pose)', 'Tương tác với phụ kiện (cầm túi, đội mũ)', 'Tư thế yoga/thiền', 'Cười rạng rỡ', 'Biểu cảm suy tư', 'Chống hông', 'Giơ tay lên trời'];
const PHOTO_STYLE_OPTIONS = ['Tự động', 'Ảnh bìa tạp chí (Vogue, Harper\'s Bazaar)', 'Ảnh lookbook sản phẩm', 'Chân dung cận cảnh', 'Ảnh chụp đường phố (Street style)', 'Phong cách phim điện ảnh (Cinematic)', 'Ảnh chụp tự nhiên (Candid)', 'Ảnh chụp bằng máy phim (35mm film grain)', 'Ảnh Polaroid', 'Ảnh đen trắng cổ điển', 'Ảnh high-key (sáng, ít bóng)', 'Ảnh low-key (tối, tương phản cao)', 'Góc máy Hà Lan (Dutch angle)', 'Ảnh mắt cá (Fisheye lens)', 'Chồng ảnh (Double exposure)', 'Phong cách Lomography (màu sắc rực rỡ, vignette)', 'Chụp từ góc thấp', 'Chụp từ góc cao (bird\'s eye view)', 'Chuyển động mờ (Motion blur)', 'Chân dung siêu thực (Surreal portrait)', 'Ảnh có vệt sáng (Light leaks)'];
const ASPECT_RATIO_OPTIONS = ['Giữ nguyên', '1:1', '2:3', '4:5', '9:16', '1:2', '3:2', '5:4', '16:9', '2:1'];

// This component was not implemented, causing it to return 'void'.
const DressTheModel: React.FC<DressTheModelProps> = (props) => {
    const { 
        uploaderCaptionModel, uploaderDescriptionModel,
        uploaderCaptionClothing, uploaderDescriptionClothing,
        uploaderCaptionAccessory, uploaderDescriptionAccessory,
        addImagesToGallery,
        appState, onStateChange, onReset,
        ...headerProps
    } = props;

    const { lightboxIndex, openLightbox, closeLightbox, navigateLightbox } = useLightbox();
    const { videoTasks, generateVideo } = useVideoGeneration();
    const isMobile = useMediaQuery('(max-width: 768px)');
    
    const lightboxImages = [appState.modelImage, appState.clothingImage, appState.accessoryImage, ...appState.historicalImages].filter((img): img is string => !!img);

    const handleImageUpload = (field: 'modelImage' | 'clothingImage' | 'accessoryImage') => (e: ChangeEvent<HTMLInputElement>) => {
        handleFileUpload(e, (imageDataUrl) => {
            onStateChange({
                ...appState,
                [field]: imageDataUrl,
                generatedImage: null,
                historicalImages: [],
                error: null,
            });
            addImagesToGallery([imageDataUrl]);
        });
    };

    const handleImageChange = (field: 'modelImage' | 'clothingImage' | 'accessoryImage') => (newUrl: string) => {
        onStateChange({ ...appState, [field]: newUrl });
        addImagesToGallery([newUrl]);
    };

    const handleGeneratedImageChange = (newUrl: string) => {
        const newHistorical = [...appState.historicalImages, newUrl];
        onStateChange({ ...appState, stage: 'results', generatedImage: newUrl, historicalImages: newHistorical });
        addImagesToGallery([newUrl]);
    };

    const handleOptionChange = (field: keyof DressTheModelState['options'], value: string | boolean) => {
        onStateChange({ ...appState, options: { ...appState.options, [field]: value } });
    };

    const executeInitialGeneration = async () => {
        if (!appState.modelImage || (!appState.clothingImage && !appState.accessoryImage)) return;
        onStateChange({ ...appState, stage: 'generating', error: null });
        try {
            const resultUrl = await generateDressedModelImage(
                appState.modelImage, 
                appState.clothingImage ?? undefined,
                appState.accessoryImage ?? undefined,
                appState.options
            );
            onStateChange({ ...appState, stage: 'results', generatedImage: resultUrl, historicalImages: [...appState.historicalImages, resultUrl] });
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
            onStateChange({ ...appState, stage: 'results', generatedImage: resultUrl, historicalImages: [...appState.historicalImages, resultUrl] });
            addImagesToGallery([resultUrl]);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
            onStateChange({ ...appState, stage: 'results', error: errorMessage });
        }
    };

    const handleDownloadAll = () => {
        const inputImages: ImageForZip[] = [];
        if (appState.modelImage) inputImages.push({ url: appState.modelImage, filename: 'model-goc', folder: 'input' });
        if (appState.clothingImage) inputImages.push({ url: appState.clothingImage, filename: 'trang-phuc-goc', folder: 'input' });
        if (appState.accessoryImage) inputImages.push({ url: appState.accessoryImage, filename: 'phu-kien-goc', folder: 'input' });
        
        processAndDownloadAll({
            inputImages,
            historicalImages: appState.historicalImages,
            videoTasks,
            zipFilename: 'ket-qua-thu-do.zip',
            baseOutputFilename: 'ket-qua-thu-do',
        });
    };

    const Uploader = ({ id, onUpload, caption, description, currentImage, onImageChange, placeholderType }: any) => (
        <div className="flex flex-col items-center gap-4">
            <label htmlFor={id} className="cursor-pointer group transform hover:scale-105 transition-transform duration-300">
                <ActionablePolaroidCard
                    caption={caption} status="done" mediaUrl={currentImage || undefined} placeholderType={placeholderType}
                    onClick={currentImage ? () => openLightbox(lightboxImages.indexOf(currentImage)) : undefined}
                    isEditable={!!currentImage} isSwappable={true} isGallerySelectable={true} onImageChange={onImageChange}
                />
            </label>
            <input id={id} type="file" className="hidden" accept="image/png, image/jpeg, image/webp" onChange={onUpload} />
            {description && <p className="base-font font-bold text-neutral-300 text-center max-w-xs text-md">{description}</p>}
        </div>
    );

    const isLoading = appState.stage === 'generating';
    const canGenerate = !!appState.modelImage && (!!appState.clothingImage || !!appState.accessoryImage);

    return (
        <div className="flex flex-col items-center justify-center w-full h-full flex-1 min-h-0">
            <AnimatePresence>
                {appState.stage !== 'generating' && appState.stage !== 'results' && (<AppScreenHeader {...headerProps} />)}
            </AnimatePresence>

            {appState.stage === 'idle' && (
                 <motion.div className="flex flex-col items-center gap-8 w-full max-w-7xl py-6 overflow-y-auto" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                    <div className="flex flex-col lg:flex-row items-start justify-center gap-8">
                        <Uploader id="model-upload" onUpload={handleImageUpload('modelImage')} onImageChange={handleImageChange('modelImage')} caption={uploaderCaptionModel} description={uploaderDescriptionModel} currentImage={appState.modelImage} placeholderType="person" />
                        <Uploader id="clothing-upload" onUpload={handleImageUpload('clothingImage')} onImageChange={handleImageChange('clothingImage')} caption={uploaderCaptionClothing} description={uploaderDescriptionClothing} currentImage={appState.clothingImage} placeholderType="clothing" />
                        <Uploader id="accessory-upload" onUpload={handleImageUpload('accessoryImage')} onImageChange={handleImageChange('accessoryImage')} caption={uploaderCaptionAccessory} description={uploaderDescriptionAccessory} currentImage={appState.accessoryImage} placeholderType="magic" />
                    </div>
                    
                     <AnimatePresence>
                        {canGenerate && (
                            <motion.div
                                className="w-full"
                                initial={{ opacity: 0, y: 20, height: 0 }}
                                animate={{ opacity: 1, y: 0, height: 'auto', marginTop: '2rem' }}
                                exit={{ opacity: 0, y: 20, height: 0 }}
                                transition={{ duration: 0.4, ease: 'easeInOut' }}
                            >
                                <OptionsPanel className="max-w-4xl mx-auto">
                                    <h2 className="base-font font-bold text-2xl text-yellow-400 border-b border-yellow-400/20 pb-2">Tùy chỉnh</h2>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <SearchableSelect id="background" label="Bối cảnh" options={BACKGROUND_OPTIONS} value={appState.options.background} onChange={(value) => handleOptionChange('background', value)} placeholder="Tìm hoặc nhập bối cảnh..." />
                                        <SearchableSelect id="pose" label="Tư thế" options={POSE_OPTIONS} value={appState.options.pose} onChange={(value) => handleOptionChange('pose', value)} placeholder="Tìm hoặc nhập tư thế..." />
                                        <SearchableSelect id="style" label="Phong cách ảnh" options={PHOTO_STYLE_OPTIONS} value={appState.options.style} onChange={(value) => handleOptionChange('style', value)} placeholder="Tìm hoặc nhập phong cách..." />
                                        <div>
                                            <label htmlFor="aspect-ratio-dress" className="block text-left base-font font-bold text-lg text-neutral-200 mb-2">Tỷ lệ khung ảnh</label>
                                            <select id="aspect-ratio-dress" value={appState.options.aspectRatio} onChange={(e) => handleOptionChange('aspectRatio', e.target.value)} className="form-input">
                                                {ASPECT_RATIO_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                    <div>
                                        <label htmlFor="notes" className="block text-left base-font font-bold text-lg text-neutral-200 mb-2">Ghi chú bổ sung</label>
                                        <textarea id="notes" value={appState.options.notes} onChange={(e) => handleOptionChange('notes', e.target.value)} placeholder="Ví dụ: thêm phụ kiện vòng cổ, ánh sáng ban đêm..." className="form-input h-24" rows={3} />
                                    </div>
                                    <div className="flex items-center pt-2">
                                        <input type="checkbox" id="remove-watermark-dress" checked={appState.options.removeWatermark} onChange={(e) => handleOptionChange('removeWatermark', e.target.checked)} className="h-4 w-4 rounded border-neutral-500 bg-neutral-700 text-yellow-400 focus:ring-yellow-400 focus:ring-offset-neutral-800" aria-label="Xóa watermark nếu có" />
                                        <label htmlFor="remove-watermark-dress" className="ml-3 block text-sm font-medium text-neutral-300">Xóa watermark (nếu có)</label>
                                    </div>
                                    <div className="flex items-center justify-end gap-4 pt-4">
                                        <button onClick={onReset} className="btn btn-secondary">Bắt đầu lại</button>
                                        <button onClick={executeInitialGeneration} className="btn btn-primary" disabled={!canGenerate || isLoading}>{isLoading ? 'Đang thử đồ...' : 'Thử đồ'}</button>
                                    </div>
                                </OptionsPanel>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
            )}
            
            {(appState.stage === 'generating' || appState.stage === 'results') && (
                <ResultsView stage={appState.stage} originalImage={appState.modelImage} onOriginalClick={() => appState.modelImage && openLightbox(lightboxImages.indexOf(appState.modelImage))} error={appState.error} isMobile={isMobile} actions={
                    <>
                        {appState.generatedImage && !appState.error && (<button onClick={handleDownloadAll} className="btn btn-primary">Tải về tất cả</button>)}
                         <button onClick={() => onStateChange({...appState, stage: 'idle', generatedImage: null, error: null})} className="btn btn-secondary">Chỉnh sửa tùy chọn</button>
                        <button onClick={onReset} className="btn btn-secondary !bg-red-500/20 !border-red-500/80 hover:!bg-red-500 hover:!text-white">Bắt đầu lại</button>
                    </>
                }>
                    {appState.clothingImage && (
                        <motion.div key="clothing" className="w-full md:w-auto flex-shrink-0" whileHover={{ scale: 1.05, zIndex: 10 }} transition={{ duration: 0.2 }}>
                            <ActionablePolaroidCard caption="Trang phục" status="done" mediaUrl={appState.clothingImage} isMobile={isMobile} onClick={() => appState.clothingImage && openLightbox(lightboxImages.indexOf(appState.clothingImage))} isEditable={true} isSwappable={true} isGallerySelectable={true} onImageChange={handleImageChange('clothingImage')} />
                        </motion.div>
                    )}
                    {appState.accessoryImage && (
                        <motion.div key="accessory" className="w-full md:w-auto flex-shrink-0" whileHover={{ scale: 1.05, zIndex: 10 }} transition={{ duration: 0.2 }}>
                            <ActionablePolaroidCard caption="Phụ kiện/Sản phẩm" status="done" mediaUrl={appState.accessoryImage} isMobile={isMobile} onClick={() => appState.accessoryImage && openLightbox(lightboxImages.indexOf(appState.accessoryImage))} isEditable={true} isSwappable={true} isGallerySelectable={true} onImageChange={handleImageChange('accessoryImage')} />
                        </motion.div>
                    )}
                    <motion.div className="w-full md:w-auto flex-shrink-0" key="generated-dress" initial={{ opacity: 0, scale: 0.5, y: 100 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ type: 'spring', stiffness: 80, damping: 15, delay: 0.2 }} whileHover={{ scale: 1.05, zIndex: 10 }}>
                        <ActionablePolaroidCard
                            caption="Kết quả"
                            status={isLoading ? 'pending' : (appState.error ? 'error' : 'done')}
                            mediaUrl={appState.generatedImage ?? undefined} error={appState.error ?? undefined}
                            isDownloadable={true} isEditable={true} isRegeneratable={true}
                            onImageChange={handleGeneratedImageChange}
                            onRegenerate={handleRegeneration}
                            onGenerateVideoFromPrompt={(prompt) => appState.generatedImage && generateVideo(appState.generatedImage, prompt)}
                            regenerationTitle="Tinh chỉnh ảnh"
                            regenerationDescription="Thêm ghi chú để cải thiện ảnh"
                            regenerationPlaceholder="Ví dụ: thay đổi kiểu tóc, thêm một chiếc túi xách..."
                            onClick={!appState.error && appState.generatedImage ? () => openLightbox(lightboxImages.indexOf(appState.generatedImage!)) : undefined}
                            isMobile={isMobile}
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
                                    isMobile={isMobile}
                                />
                            </motion.div>
                        );
                    })}
                </ResultsView>
            )}

            <Lightbox images={lightboxImages} selectedIndex={lightboxIndex} onClose={closeLightbox} onNavigate={navigateLightbox} />
        </div>
    );
};

export default DressTheModel;
