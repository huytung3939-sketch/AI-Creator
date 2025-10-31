/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { 
    processApiError,
    parseDataUrl, 
    callGeminiWithRetry, 
    processMultiImageGeminiResponse
} from './baseService';


/**
 * Sends an image to the Gemini API to split the outfit into individual item images.
 * @param imageDataUrl A data URL string of the source image with a person.
 * @returns A promise that resolves to an array of base64-encoded image data URLs of the separated items.
 */
export async function splitOutfitFromImage(imageDataUrl: string): Promise<string[]> {
    const { mimeType, data: base64Data } = parseDataUrl(imageDataUrl);

    const imagePart = {
        inlineData: { mimeType, data: base64Data },
    };

    const prompt = "Phân tích hình ảnh và xác định từng món đồ quần áo và phụ kiện riêng biệt. Đối với mỗi món đồ được xác định, hãy tạo một hình ảnh sản phẩm sạch sẽ, chuyên nghiệp của riêng món đồ đó trên nền trong suốt (kênh alpha). Chỉ trả về các hình ảnh đã được tạo của các món đồ đã được tách ra.";
    const textPart = { text: prompt };

    try {
        console.log("Attempting to split outfit from image...");
        const response = await callGeminiWithRetry([imagePart, textPart]);
        return processMultiImageGeminiResponse(response);
    } catch (error) {
        const processedError = processApiError(error);
        console.error("Error during outfit splitting:", processedError);
        throw processedError;
    }
}
