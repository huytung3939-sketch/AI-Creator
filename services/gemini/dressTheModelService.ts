/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { 
    processApiError, 
    padImageToAspectRatio,
    parseDataUrl, 
    callGeminiWithRetry, 
    processGeminiResponse 
} from './baseService';

interface DressModelOptions {
    background: string;
    pose: string;
    style: string;
    aspectRatio: string;
    notes?: string;
    removeWatermark?: boolean;
}

/**
 * Generates an image of a model wearing specified clothing and/or holding an accessory/product.
 * @param modelImageDataUrl Data URL for the model's image.
 * @param clothingImageDataUrl Optional data URL for the clothing's image.
 * @param accessoryImageDataUrl Optional data URL for the accessory/product image.
 * @param options User-selected options for background, pose, and notes.
 * @returns A promise that resolves to the generated image's data URL.
 */
export async function generateDressedModelImage(
    modelImageDataUrl: string, 
    clothingImageDataUrl: string | undefined, 
    accessoryImageDataUrl: string | undefined,
    options: DressModelOptions
): Promise<string> {
    const modelImageToProcess = await padImageToAspectRatio(modelImageDataUrl, options.aspectRatio ?? 'Giữ nguyên');
    const { mimeType: modelMime, data: modelData } = parseDataUrl(modelImageToProcess);

    const modelImagePart = { inlineData: { mimeType: modelMime, data: modelData } };
    const partsToCall: any[] = [];
    const providedItems: string[] = [];
    let imageCounter = 1;

    let clothingImagePart = null;
    if (clothingImageDataUrl) {
        const { mimeType: clothingMime, data: clothingData } = parseDataUrl(clothingImageDataUrl);
        clothingImagePart = { inlineData: { mimeType: clothingMime, data: clothingData } };
        partsToCall.push(clothingImagePart);
        providedItems.push(`- Ảnh ${imageCounter++}: Một trang phục.`);
    }

    let accessoryImagePart = null;
    if (accessoryImageDataUrl) {
        const { mimeType: accMime, data: accData } = parseDataUrl(accessoryImageDataUrl);
        accessoryImagePart = { inlineData: { mimeType: accMime, data: accData } };
        partsToCall.push(accessoryImagePart);
        providedItems.push(`- Ảnh ${imageCounter++}: Một phụ kiện hoặc sản phẩm.`);
    }
    
    partsToCall.push(modelImagePart);
    providedItems.push(`- Ảnh ${imageCounter}: Một người mẫu (có thể đã được thêm nền trắng).`);

    const promptParts = [];

    if (options.aspectRatio && options.aspectRatio !== 'Giữ nguyên') {
        promptParts.push(
            `**YÊU CẦU ƯU TIÊN SỐ 1 - TỶ LỆ KHUNG HÌNH:**`,
            `1. Bức ảnh kết quả BẮT BUỘC phải có tỷ lệ khung hình chính xác là **${options.aspectRatio}**.`,
            `2. **Quan trọng:** Ảnh người mẫu có thể đã được thêm nền trắng để đạt đúng tỷ lệ này. Nhiệm vụ của bạn là lấp đầy phần nền trắng đó một cách sáng tạo, mở rộng bối cảnh theo các tùy chọn bên dưới.`,
            ``
        );
    }

    promptParts.push(
        'Tôi cung cấp cho bạn các tấm ảnh sau:',
        ...providedItems,
        'Nhiệm vụ của bạn là tạo ra một bức ảnh MỚI, trong đó người mẫu đang sử dụng (các) vật phẩm được cung cấp.',
        '',
        '**YÊU CẦU CỰC KỲ QUAN TRỌNG:**',
        '1.  **GIỮ NGUYÊN NGƯỜI MẪU:** Phải giữ lại chính xác 100% khuôn mặt, vóc dáng, màu da của người mẫu. Tuyệt đối không được thay đổi người mẫu.'
    );

    if (clothingImageDataUrl) {
        promptParts.push(
            '2.  **CHUYỂN ĐỔI TRANG PHỤC:** Lấy trang phục từ Ảnh trang phục và mặc nó lên người mẫu một cách tự nhiên và chân thực, phù hợp với tư thế của họ. Giữ nguyên màu sắc, họa tiết và kiểu dáng của trang phục.'
        );
    }
    
    if (accessoryImageDataUrl) {
        promptParts.push(
            `${clothingImageDataUrl ? '3.' : '2.'}  **XỬ LÝ PHỤ KIỆN/SẢN PHẨM:**`,
            '    *   Phân tích vật phẩm trong Ảnh Phụ kiện/Sản phẩm.',
            '    *   **Tích hợp một cách thông minh và hợp lý:**',
            '        - Nếu là phụ kiện đeo được (kính, đồng hồ, vòng cổ), hãy để người mẫu đeo nó vào đúng vị trí một cách tự nhiên.',
            '        - Nếu là phụ kiện mang theo (túi xách), hãy để người mẫu mang nó.',
            '        - Nếu là sản phẩm quảng cáo (chai lọ, hộp), hãy để người mẫu cầm nó trên tay một cách chuyên nghiệp như đang chụp ảnh quảng cáo.',
            '    *   Giữ nguyên hình dáng, màu sắc và nhãn hiệu của vật phẩm.'
        );
    }

    promptParts.push(
        '',
        '**TÙY CHỈNH KẾT QUẢ:** Dựa vào các yêu cầu sau để tạo ra bức ảnh cuối cùng:'
    );
    
    let optionsSelected = false;
    if (options.background && options.background !== 'Tự động') {
        promptParts.push(`    *   **Bối cảnh (Background):** ${options.background}.`);
        optionsSelected = true;
    }
    if (options.pose && options.pose !== 'Tự động') {
        promptParts.push(`    *   **Tư thế (Pose):** ${options.pose}.`);
        optionsSelected = true;
    }
    if (options.style && options.style !== 'Tự động') {
        promptParts.push(`    *   **Phong cách ảnh (Photo Style):** ${options.style}.`);
        optionsSelected = true;
    }
    if (options.notes) {
        promptParts.push(`    *   **Ghi chú:** ${options.notes}`);
        optionsSelected = true;
    }
    
    if (!optionsSelected) {
        promptParts.push('    *   **Toàn quyền sáng tạo:** Hãy tự động chọn bối cảnh, tư thế và phong cách ảnh phù hợp nhất để tạo ra một bức ảnh thời trang ấn tượng.');
    }
    
    promptParts.push(
        '',
        'Kết quả cuối cùng phải là một bức ảnh duy nhất, chất lượng cao, trông giống như ảnh chụp thời trang chuyên nghiệp. Chỉ trả về ảnh kết quả, không trả về ảnh gốc hay văn bản giải thích.'
    );

    if (options.removeWatermark) {
        promptParts.push('YÊU CẦU THÊM: Ảnh kết quả không được chứa bất kỳ watermark, logo hay chữ ký nào.');
    }

    const prompt = promptParts.join('\n');
    const textPart = { text: prompt };
    partsToCall.push(textPart);

    try {
        console.log("Attempting to generate dressed model image with dynamic prompt...");
        const response = await callGeminiWithRetry(partsToCall);
        return processGeminiResponse(response);
    } catch (error) {
        const processedError = processApiError(error);
        console.error("Error during dressed model image generation:", processedError);
        throw processedError;
    }
}