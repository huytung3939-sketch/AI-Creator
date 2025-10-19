/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useEffect, useCallback, useContext, createContext } from 'react';
import {
    type ImageToEdit, type ViewState, type AnyAppState, type Theme,
    type AppConfig, THEMES, getInitialStateForApp, type AppControlContextType
} from './uiTypes';

// --- Image Editor Hook & Context ---
interface ImageEditorContextType {
    imageToEdit: ImageToEdit | null;
    openImageEditor: (url: string, onSave: (newUrl: string) => void) => void;
    openEmptyImageEditor: (onSave: (newUrl: string) => void) => void;
    closeImageEditor: () => void;
}

const ImageEditorContext = createContext<ImageEditorContextType | undefined>(undefined);

export const ImageEditorProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
    const [imageToEdit, setImageToEdit] = useState<ImageToEdit | null>(null);

    const openImageEditor = useCallback((url: string, onSave: (newUrl: string) => void) => {
        if (window.innerWidth < 768) {
            alert("Chức năng chỉnh sửa ảnh không khả dụng trên thiết bị di động.");
            return;
        }
        if (!url) {
            console.error("openImageEditor called with no URL.");
            return;
        }
        setImageToEdit({ url, onSave });
    }, []);

    const openEmptyImageEditor = useCallback((onSave: (newUrl: string) => void) => {
        if (window.innerWidth < 768) {
            alert("Chức năng chỉnh sửa ảnh không khả dụng trên thiết bị di động.");
            return;
        }
        setImageToEdit({ url: null, onSave });
    }, []);

    const closeImageEditor = useCallback(() => {
        setImageToEdit(null);
    }, []);

    const value = { imageToEdit, openImageEditor, openEmptyImageEditor, closeImageEditor };

    return (
        <ImageEditorContext.Provider value={value}>
            {children}
        </ImageEditorContext.Provider>
    );
};

export const useImageEditor = (): ImageEditorContextType => {
    const context = useContext(ImageEditorContext);
    if (context === undefined) {
        throw new Error('useImageEditor must be used within an ImageEditorProvider');
    }
    return context;
};


// --- App Control Context ---
const AppControlContext = createContext<AppControlContextType | undefined>(undefined);

// --- License Key Definitions ---
const VALID_KEYS_MAP: Record<string, { key: string; type: '30-day' | '360-day' | 'unlimited' }> = {
    'user1@example.com': { key: 'HT30D-A1B2-C3D4-E5F6-G7H8', type: '30-day' },
    'user2@example.com': { key: 'HT360-A1B2-C3D4-E5F6', type: '360-day' },
    'huytung@gmail.com': { key: 'HTUNL-1A2B-3C4D-5E6F-7G8H', type: 'unlimited' },
    'test@huytung.vn': { key: 'HT30D-I9J0-K1L2-M3N4-O5P6', type: '30-day' },
    'admin@aicreator.com': { key: 'HTUNL-9I0J-1K2L-3M4N-5O6P', type: 'unlimited' },
};


export const AppControlProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [viewHistory, setViewHistory] = useState<ViewState[]>([{ viewId: 'home', state: { stage: 'home' } }]);
    const [historyIndex, setHistoryIndex] = useState(0);
    const [theme, setTheme] = useState<Theme>(() => {
        const savedTheme = localStorage.getItem('app-theme') as Theme;
        if (savedTheme && THEMES.includes(savedTheme)) {
            return savedTheme;
        }
        return THEMES[Math.floor(Math.random() * THEMES.length)];
    });
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [isGalleryOpen, setIsGalleryOpen] = useState(false);
    const [isInfoOpen, setIsInfoOpen] = useState(false);
    const [sessionGalleryImages, setSessionGalleryImages] = useState<string[]>([]);
    const [settings, setSettings] = useState(null);
    const [isLicensed, setIsLicensed] = useState(false);
    const [isLoadingLicense, setIsLoadingLicense] = useState(true);
    const [trialEmail, setTrialEmail] = useState<string | null>(null);

    const currentView = viewHistory[historyIndex];

    useEffect(() => {
        try {
            const activationRaw = localStorage.getItem('licenseActivation');
            if (activationRaw) {
                const activation = JSON.parse(activationRaw);
                const { type, activationDate, email } = activation;
    
                if (!type || !activationDate || !email) {
                    localStorage.removeItem('licenseActivation');
                    // Fall through to trial check
                } else {
                    const activationTime = new Date(activationDate).getTime();
                    const now = new Date().getTime();
                    let isExpired = false;
    
                    switch (type) {
                        case '3-day': isExpired = (now - activationTime) > (3 * 24 * 60 * 60 * 1000); break;
                        case '30-day': isExpired = (now - activationTime) > (30 * 24 * 60 * 60 * 1000); break;
                        case '360-day': isExpired = (now - activationTime) > (360 * 24 * 60 * 60 * 1000); break;
                        case 'unlimited': isExpired = false; break;
                        default: isExpired = true; break;
                    }
    
                    if (isExpired) {
                        localStorage.removeItem('licenseActivation');
                        setIsLicensed(false);
                    } else {
                        setIsLicensed(true);
                        setTrialEmail(email); // The activated email is the one for this browser now
                    }
                    setIsLoadingLicense(false);
                    return; // License check complete
                }
            }
    
            // If no valid activation, check trial period
            const trialInfoRaw = localStorage.getItem('trialInfo');
            if (trialInfoRaw) {
                const trialInfo = JSON.parse(trialInfoRaw);
                const trialStartTime = new Date(trialInfo.startDate).getTime();
                const trialDuration = 3 * 24 * 60 * 60 * 1000;
                if ((new Date().getTime() - trialStartTime) > trialDuration) {
                    setIsLicensed(false); // Trial expired
                } else {
                    setIsLicensed(true); // Still in trial
                }
                setTrialEmail(trialInfo.email); // Set the locked-in email, if it exists
            } else {
                // First time user, start trial
                const newTrialInfo = { startDate: new Date().toISOString(), email: null };
                localStorage.setItem('trialInfo', JSON.stringify(newTrialInfo));
                setIsLicensed(true);
                setTrialEmail(null);
            }
        } catch (e) {
            console.error("Error checking license:", e);
            localStorage.removeItem('licenseActivation');
            localStorage.removeItem('trialInfo');
            setIsLicensed(false);
        } finally {
            setIsLoadingLicense(false);
        }
    }, []);

    const handleLicenseValidation = useCallback((email: string, key: string): 'SUCCESS' | 'INVALID_KEY' | 'WRONG_EMAIL' => {
        const submittedKey = key.trim().toUpperCase();
        const submittedEmail = email.trim().toLowerCase();
        
        // Check if trial email is locked and if submitted email matches
        const trialInfoRaw = localStorage.getItem('trialInfo');
        if (trialInfoRaw) {
            const trialInfo = JSON.parse(trialInfoRaw);
            if (trialInfo.email && trialInfo.email !== submittedEmail) {
                return 'WRONG_EMAIL';
            }
        }

        const validKeyInfo = VALID_KEYS_MAP[submittedEmail];
        if (!validKeyInfo || validKeyInfo.key !== submittedKey) {
            return 'INVALID_KEY';
        }
        
        // Success. Create activation record.
        const activation = {
            email: submittedEmail,
            key: submittedKey,
            type: validKeyInfo.type,
            activationDate: new Date().toISOString(),
        };
        localStorage.setItem('licenseActivation', JSON.stringify(activation));

        // Also lock the email to the trial info if it wasn't already
        if (trialInfoRaw) {
            const trialInfo = JSON.parse(trialInfoRaw);
            if (!trialInfo.email) {
                trialInfo.email = submittedEmail;
                localStorage.setItem('trialInfo', JSON.stringify(trialInfo));
            }
        } else {
            // This case shouldn't happen if the app logic is correct, but as a fallback:
            const newTrialInfo = { startDate: new Date().toISOString(), email: submittedEmail };
            localStorage.setItem('trialInfo', JSON.stringify(newTrialInfo));
        }
        
        setIsLicensed(true);
        setTrialEmail(submittedEmail);
        return 'SUCCESS';
    }, []);

    const addImagesToGallery = useCallback((newImages: string[]) => {
        setSessionGalleryImages(prev => {
            const uniqueNewImages = newImages.filter(img => !prev.includes(img));
            return [...prev, ...uniqueNewImages];
        });
    }, []);

    const removeImageFromGallery = useCallback((indexToRemove: number) => {
        setSessionGalleryImages(prev => prev.filter((_, index) => index !== indexToRemove));
    }, []);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const response = await fetch('/setting.json');
                 if (!response.ok) {
                    console.warn('Could not load setting.json, using built-in settings.');
                    return;
                }
                const data = await response.json();
                setSettings(data);
            } catch (error) {
                console.error("Failed to fetch or parse setting.json:", error);
            }
        };
        fetchSettings();
    }, []);

    useEffect(() => {
        document.body.classList.remove('theme-sdvn', 'theme-vietnam', 'theme-dark', 'theme-ocean-blue', 'theme-blue-sky', 'theme-black-night', 'theme-clear-sky', 'theme-skyline', 'theme-blulagoo', 'theme-life', 'theme-emerald-water');
        document.body.classList.add(`theme-${theme}`);
        localStorage.setItem('app-theme', theme);
    }, [theme]);

    const handleThemeChange = (newTheme: Theme) => {
        setTheme(newTheme);
    };

    const navigateTo = useCallback((viewId: string) => {
        const current = viewHistory[historyIndex];
        const initialState = getInitialStateForApp(viewId);
    
        if (current.viewId === viewId && JSON.stringify(current.state) === JSON.stringify(initialState)) {
            return;
        }
    
        const newHistory = viewHistory.slice(0, historyIndex + 1);
        newHistory.push({ viewId, state: initialState } as ViewState);
        
        setViewHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
    }, [viewHistory, historyIndex]);
    
    const handleStateChange = useCallback((newAppState: AnyAppState) => {
        const current = viewHistory[historyIndex];
        if (JSON.stringify(current.state) === JSON.stringify(newAppState)) {
            return; // No change
        }
    
        const newHistory = viewHistory.slice(0, historyIndex + 1);
        newHistory.push({ viewId: current.viewId, state: newAppState } as ViewState);
    
        setViewHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
    }, [viewHistory, historyIndex]);

    const handleSelectApp = useCallback((appId: string) => {
        if (settings) {
            const validAppIds = settings.apps.map((app: AppConfig) => app.id);
            if (validAppIds.includes(appId)) {
                navigateTo(appId);
            } else {
                navigateTo('home');
            }
        }
    }, [settings, navigateTo]);

    const handleGoHome = useCallback(() => {
        navigateTo('home');
    }, [navigateTo]);

    const handleGoBack = useCallback(() => {
        if (historyIndex > 0) {
            setHistoryIndex(prev => prev - 1);
        }
    }, [historyIndex]);
    
    const handleGoForward = useCallback(() => {
        if (historyIndex < viewHistory.length - 1) {
            setHistoryIndex(prev => prev + 1);
        }
    }, [historyIndex, viewHistory.length]);

    const handleResetApp = useCallback(() => {
        const currentViewId = viewHistory[historyIndex].viewId;
        if (currentViewId !== 'home') {
            navigateTo(currentViewId);
        }
    }, [viewHistory, historyIndex, navigateTo]);
    
    const handleOpenSearch = useCallback(() => setIsSearchOpen(true), []);
    const handleCloseSearch = useCallback(() => setIsSearchOpen(false), []);
    const handleOpenGallery = useCallback(() => setIsGalleryOpen(true), []);
    const handleCloseGallery = useCallback(() => setIsGalleryOpen(false), []);
    const handleOpenInfo = useCallback(() => setIsInfoOpen(true), []);
    const handleCloseInfo = useCallback(() => setIsInfoOpen(false), []);
    
    const value: AppControlContextType = {
        currentView,
        settings,
        theme,
        sessionGalleryImages,
        historyIndex,
        viewHistory,
        isSearchOpen,
        isGalleryOpen,
        isInfoOpen,
        isLicensed: isLoadingLicense ? false : isLicensed,
        trialEmail,
        addImagesToGallery,
        removeImageFromGallery,
        handleThemeChange,
        navigateTo,
        handleStateChange,
        handleSelectApp,
        handleGoHome,
        handleGoBack,
        handleGoForward,
        handleResetApp,
        handleOpenSearch,
        handleCloseSearch,
        handleOpenGallery,
        handleCloseGallery,
        handleOpenInfo,
        handleCloseInfo,
        handleLicenseValidation,
    };

    return (
        <AppControlContext.Provider value={value}>
            {isLoadingLicense ? null : children}
        </AppControlContext.Provider>
    );
};

export const useAppControls = (): AppControlContextType => {
    const context = useContext(AppControlContext);
    if (context === undefined) {
        throw new Error('useAppControls must be used within an AppControlProvider');
    }
    return context;
};