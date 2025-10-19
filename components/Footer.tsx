/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';

type Theme = 'black-night' | 'clear-sky' | 'skyline' | 'emerald-water' | 'life';

interface FooterProps {
    theme: Theme;
    onThemeChange: (theme: Theme) => void;
}

const Footer: React.FC<FooterProps> = ({ theme, onThemeChange }) => {
    return (
        <footer className="base-font fixed bottom-0 left-0 right-0 footer-themed-bg p-3 z-50 text-neutral-300 text-xs sm:text-sm border-t border-white/10">
            <div className="max-w-screen-xl mx-auto flex flex-col sm:flex-row justify-center items-center gap-2 sm:gap-4 px-4">
                <div className="text-neutral-400">
                    Bản Quyền Thuộc Về HuyTung.vn - SĐT/Zalo: 0922 52 3939
                </div>
                <div className="flex items-center flex-wrap justify-center gap-2 sm:gap-4">
                    <div className="flex items-center gap-2">
                        <label htmlFor="theme-select" className="text-neutral-400 whitespace-nowrap">Giao diện:</label>
                        <select
                            id="theme-select"
                            value={theme}
                            onChange={(e) => onThemeChange(e.target.value as Theme)}
                            className="bg-black/40 border border-white/20 rounded-md px-2 py-1 text-neutral-200 focus:ring-2 focus:ring-yellow-400 focus:outline-none"
                            aria-label="Chọn giao diện nền"
                        >
                            <option value="black-night">Black Night</option>
                            <option value="clear-sky">Clear Sky</option>
                            <option value="skyline">Skyline</option>
                            <option value="emerald-water">Emerald Water</option>
                            <option value="life">Life</option>
                        </select>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;