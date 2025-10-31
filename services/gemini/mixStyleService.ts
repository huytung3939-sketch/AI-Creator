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

interface MixStyleOptions {
    styleStrength: string;
    notes?: string;
    removeWatermark?: boolean;
}

export async function mixImageStyle(contentImageDataUrl: string, styleImageDataUrl: string, options: MixStyleOptions): Promise<string> {
    const { mimeType: contentMime, data: contentData } = parseDataUrl(contentImageDataUrl);
    const { mimeType: styleMime, data: styleData } = parseDataUrl(styleImageDataUrl);

    const contentImagePart = { inlineData: { mimeType: contentMime, data: contentData } };
    const styleImagePart = { inlineData: { mimeType: styleMime, data: styleData } };

    const promptParts = [
        'Bạn là một nghệ sĩ AI chuyên về chuyển giao phong cách. Tôi cung cấp cho bạn 2 tấm ảnh:',
        '- Ảnh 1: Ảnh "Nội dung" - chứa bố cục, chủ thể và các yếu tố chính.',
        '- Ảnh 2: Ảnh "Phong cách" - chứa phong cách nghệ thuật, bảng màu, kết cấu và không khí cần áp dụng.',
        '**Nhiệm vụ của bạn là tạo ra một bức ảnh MỚI, vẽ lại Ảnh 1 theo phong cách của Ảnh 2.**',
        '**YÊU CẦU CỰC KỲ QUAN TRỌNG:**'
    ];

     const strengthMapping: { [key: string]: string } = {
        'Rất yếu': '1. **Mức độ ảnh hưởng phong cách (Rất Yếu):** Giữ lại tất cả các chi tiết và hình dạng của Ảnh 1 (Nội dung). Chỉ áp dụng bảng màu và không khí chung (mood) từ Ảnh 2 (Phong cách).',
        'Yếu': '1. **Mức độ ảnh hưởng phong cách (Yếu):** Giữ lại các chi tiết chính của Ảnh 1. Áp dụng bảng màu và các kết cấu (texture) cơ bản từ Ảnh 2.',
        'Trung bình': '1. **Mức độ ảnh hưởng phong cách (Trung bình):** Kết hợp hài hòa. Giữ lại chủ thể và hình dạng cốt lõi của Ảnh 1, nhưng vẽ lại chúng một cách rõ rệt bằng màu sắc, ánh sáng và kết cấu từ Ảnh 2.',
        'Mạnh': '1. **Mức độ ảnh hưởng phong cách (Mạnh):** Ưu tiên mạnh mẽ cho Ảnh 2. Bố cục của Ảnh 1 vẫn nhận ra được, nhưng các chi tiết, kết cấu và đối tượng được biến đổi sâu sắc theo phong cách của Ảnh 2.',
        'Rất mạnh': '1. **Mức độ ảnh hưởng phong cách (Rất Mạnh):** Áp dụng tối đa phong cách từ Ảnh 2. Sử dụng bố cục của Ảnh 1 như một gợi ý, vẽ lại toàn bộ cảnh theo phong cách đặc trưng của Ảnh 2. Kết quả phải trông như một tác phẩm của nghệ sĩ đã vẽ Ảnh 2.',
    };

    // The default is now 'Rất yếu', so a value will always be present in the mapping.
    promptParts.push(strengthMapping[options.styleStrength]);


    promptParts.push(
        '2. **Bảo toàn nội dung:** Phải giữ lại TOÀN BỘ bố cục, chủ thể, và các đối tượng chính từ Ảnh 1. Không được thêm, bớt, hay thay đổi các yếu tố cốt lõi này.',
        '3. **Chuyển giao phong cách:** Áp dụng một cách tinh tế và toàn diện các đặc điểm nghệ thuật của Ảnh 2 (ví dụ: nét cọ, nhiễu hạt, màu sắc, ánh sáng, kết cấu) lên Ảnh 1.'
    );

    if (options.notes) {
        promptParts.push(`- **Ghi chú bổ sung từ người dùng:** "${options.notes}".`);
    }
    
    if (options.removeWatermark) {
        promptParts.push('- **Yêu cầu đặc biệt:** Không được có bất kỳ watermark, logo, hay chữ ký nào trên ảnh kết quả.');
    }
    
    promptParts.push('Chỉ trả về hình ảnh kết quả cuối cùng, không kèm theo văn bản giải thích.');
    
    const prompt = promptParts.join('\n');
    const textPart = { text: prompt };

    try {
        console.log("Attempting to mix image styles...");
        const response = await callGeminiWithRetry([contentImagePart, styleImagePart, textPart]);
        return processGeminiResponse(response);
    } catch (error) {
        const processedError = processApiError(error);
        console.error("Error during style mix:", processedError);
        throw processedError;
    }
}
