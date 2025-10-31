/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { 
    processApiError,
    parseDataUrl, 
    callGeminiWithRetry, 
    processGeminiResponse 
} from './baseService';

interface SwapStyleOptions {
    style: string;
    styleStrength: string;
    notes?: string;
    removeWatermark?: boolean;
}

export async function swapImageStyle(imageDataUrl: string, options: SwapStyleOptions): Promise<string> {
    const { mimeType, data: base64Data } = parseDataUrl(imageDataUrl);
    const imagePart = { inlineData: { mimeType, data: base64Data } };

    const promptParts = [
        'Nhiệm vụ của bạn là một nghệ sĩ bậc thầy, biến đổi hình ảnh được cung cấp theo một phong cách nghệ thuật cụ thể.',
        '**YÊU CẦU BẮT BUỘC:**'
    ];
    
    promptParts.push(`1. **Áp dụng phong cách:** Chuyển đổi hoàn toàn hình ảnh gốc sang phong cách nghệ thuật **"${options.style}"**.`);

    const strengthMapping: { [key: string]: string } = {
        'Rất yếu': '2. **Mức độ ảnh hưởng Style (Rất Yếu):** Áp dụng "lớp da" phong cách mới một cách tinh tế. Giữ lại gần như TOÀN BỘ các chi tiết, hình dạng, và bố cục từ ảnh gốc.',
        'Yếu': '2. **Mức độ ảnh hưởng Style (Yếu):** Bám sát chặt chẽ với bố cục và các chi tiết trong ảnh gốc. Chỉ thay đổi phong cách nghệ thuật, giữ nguyên vẹn nội dung.',
        'Trung bình': '2. **Mức độ ảnh hưởng Style (Trung bình):** Giữ lại bố cục và các yếu tố chính của ảnh gốc, nhưng có thể diễn giải lại các chi tiết nhỏ và kết cấu vật liệu theo phong cách mới.',
        'Mạnh': '2. **Mức độ ảnh hưởng Style (Mạnh):** Có thể thay đổi một vài chi tiết phụ và kết cấu, nhưng phải giữ lại chủ thể và bố cục chính của ảnh gốc để phù hợp hơn với style mới.',
        'Rất mạnh': '2. **Mức độ ảnh hưởng Style (Rất Mạnh):** Tự do sáng tạo cao nhất. Chỉ cần giữ lại chủ đề chính, bạn có thể thay đổi đáng kể bố cục, góc nhìn và các chi tiết để phù hợp nhất với phong cách đã chọn.',
    };
    
    promptParts.push(strengthMapping[options.styleStrength]);

    promptParts.push(
        '3. **Kết quả chất lượng cao:** Bức ảnh cuối cùng phải là một tác phẩm nghệ thuật hoàn chỉnh, chất lượng cao, thể hiện rõ nét đặc trưng của phong cách đã chọn.'
    );
    
    if (options.notes) {
        promptParts.push(`- **Ghi chú từ người dùng:** "${options.notes}".`);
    }
    
    if (options.removeWatermark) {
        promptParts.push('- **Yêu cầu đặc biệt:** Không được có bất kỳ watermark, logo, hay chữ ký nào trên ảnh kết quả.');
    }
    
    promptParts.push('Chỉ trả về hình ảnh đã được chuyển đổi, không kèm theo văn bản giải thích.');

    const prompt = promptParts.join('\n');
    const textPart = { text: prompt };

    try {
        console.log("Attempting to swap image style...");
        const response = await callGeminiWithRetry([imagePart, textPart]);
        return processGeminiResponse(response);
    } catch (error) {
        const processedError = processApiError(error);
        console.error("Error during style swap:", processedError);
        throw processedError;
    }
}
