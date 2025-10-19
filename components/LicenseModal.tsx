/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState } from 'react';
import { useAppControls } from './uiUtils';
import { motion } from 'framer-motion';
import { cn } from '../lib/utils';

interface LicenseModalProps {
    trialEmail: string | null;
}

const LicenseModal: React.FC<LicenseModalProps> = ({ trialEmail }) => {
    const { handleLicenseValidation } = useAppControls();
    const [email, setEmail] = useState(trialEmail || '');
    const [keyCode, setKeyCode] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        // Simulate network delay for better UX
        await new Promise(resolve => setTimeout(resolve, 500));

        const validationResult = handleLicenseValidation(email, keyCode);
        
        setIsLoading(false);
        if (validationResult === 'SUCCESS') {
            // If valid, the AppControlProvider updates state, and App.tsx re-renders, removing this modal.
        } else if (validationResult === 'WRONG_EMAIL') {
            setError(`Email này không khớp với email đã đăng ký dùng thử trên trình duyệt này. Vui lòng sử dụng email: ${trialEmail}`);
        } else { // 'INVALID_KEY'
            setError('Key Code không hợp lệ hoặc không đúng với Email đã nhập. Vui lòng thử lại.');
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="modal-content !max-w-md w-full"
            >
                <div className="text-center">
                    <h1 className="text-3xl/[1.3] [text-shadow:1px_1px_3px_rgba(0,0,0,0.4)] tracking-wider whitespace-nowrap">
                        <span className="title-font-main font-medium text-white">HuyTung </span>
                        <span className="title-font-ai font-bold text-yellow-400">AI</span>
                        <span className="title-font-main font-medium text-white"> Creator</span>
                    </h1>
                    <p className="sub-title-font font-bold text-neutral-300 mt-2 text-lg">Yêu cầu kích hoạt</p>
                </div>

                <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-neutral-300 mb-1">
                            Email
                        </label>
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Nhập email của bạn"
                            required
                            readOnly={!!trialEmail}
                            className={cn("form-input", { 'bg-neutral-700/50 cursor-not-allowed': !!trialEmail })}
                        />
                    </div>
                    <div>
                        <label htmlFor="key" className="block text-sm font-medium text-neutral-300 mb-1">
                            Key Code
                        </label>
                        <input
                            id="key"
                            type="text"
                            value={keyCode}
                            onChange={(e) => setKeyCode(e.target.value)}
                            placeholder="Nhập key code được cấp"
                            required
                            className="form-input"
                        />
                    </div>

                    {error && (
                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-sm text-red-400 text-center"
                        >
                            {error}
                        </motion.p>
                    )}

                    <div className="pt-2">
                        <button
                            type="submit"
                            className="btn btn-primary w-full"
                            disabled={isLoading}
                        >
                            {isLoading ? 'Đang kiểm tra...' : 'Kích hoạt'}
                        </button>
                    </div>
                </form>
                <p className="text-xs text-neutral-500 text-center mt-4">
                    Để nhận Key Code, vui lòng liên hệ HuyTung.vn - SĐT/Zalo: 0922 52 3939
                </p>
            </motion.div>
        </div>
    );
};

export default LicenseModal;