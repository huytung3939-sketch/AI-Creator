/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { COUNTRIES } from '../lib/countries';
import { STYLE_OPTIONS_LIST } from '../lib/styles';

// Base types
export interface ImageForZip {
    url: string;
    filename: string;
    folder?: string;
    extension?: string;
}

export interface VideoTask {
    status: 'pending' | 'done' | 'error';
    resultUrl?: string;
    error?: string;
    operation?: any;
}

export interface AppConfig {
    id: string;
    title: string;
    description: string;
    icon: string;
}

export type Theme = 'black-night' | 'clear-sky' | 'skyline' | 'emerald-water' | 'life';
export const THEMES: Theme[] = ['black-night', 'clear-sky', 'skyline', 'emerald-water', 'life'];

export interface ImageToEdit {
    url: string | null;
    onSave: (newUrl: string) => void;
}


// --- Centralized State Definitions ---

export type HomeState = { stage: 'home' };

export interface DressTheModelState {
    stage: 'idle' | 'generating' | 'results';
    modelImage: string | null;
    clothingImage: string | null;
    accessoryImage: string | null;
    generatedImage: string | null;
    historicalImages: string[];
    options: {
        background: string;
        pose: string;
        style: string;
        aspectRatio: string;
        notes: string;
        removeWatermark: boolean;
    };
    error: string | null;
}

export interface PhotoRestorationState {
    stage: 'idle' | 'configuring' | 'generating' | 'results';
    uploadedImage: string | null;
    generatedImage: string | null;
    historicalImages: string[];
    options: {
        type: string;
        gender: string;
        age: string;
        nationality: string;
        notes: string;
        removeWatermark: boolean;
        removeStains: boolean;
    };
    error: string | null;
}

export interface FreeGenerationState {
    stage: 'configuring' | 'generating' | 'results';
    image1: string | null;
    image2: string | null;
    generatedImages: string[];
    historicalImages: string[];
    options: {
        prompt: string;
        removeWatermark: boolean;
        numberOfImages: number;
        aspectRatio: string;
    };
    error: string | null;
}

export interface ImageInterpolationState {
    stage: 'idle' | 'prompting' | 'configuring' | 'generating' | 'results';
    inputImage: string | null;
    outputImage: string | null;
    referenceImage: string | null;
    generatedPrompt: string;
    promptSuggestions: string;
    additionalNotes: string;
    finalPrompt: string | null;
    generatedImage: string | null;
    historicalImages: { url: string; prompt: string; }[];
    options: {
        removeWatermark: boolean;
        aspectRatio: string;
    };
    error: string | null;
}

export interface OutfitSplitterState {
    stage: 'idle' | 'generating' | 'results';
    uploadedImage: string | null;
    generatedItems: string[];
    historicalImages: string[];
    error: string | null;
}

export interface ArchitectureIdeatorState {
    stage: 'idle' | 'configuring' | 'generating' | 'results';
    uploadedImage: string | null;
    generatedImage: string | null;
    historicalImages: string[];
    options: {
        context: string;
        style: string;
        color: string;
        lighting: string;
        notes: string;
        removeWatermark: boolean;
    };
    error: string | null;
}

export interface GeneratedAvatarImage {
    status: 'pending' | 'done' | 'error';
    url?: string;
    error?: string;
}
export interface AvatarCreatorState {
    stage: 'idle' | 'configuring' | 'generating' | 'results';
    uploadedImage: string | null;
    generatedImages: Record<string, GeneratedAvatarImage>;
    selectedIdeas: string[];
    historicalImages: { idea: string; url: string; }[];
    options: {
        additionalPrompt: string;
        removeWatermark: boolean;
        aspectRatio: string;
    };
    error: string | null;
}

export interface ImageToRealState {
    stage: 'idle' | 'configuring' | 'generating' | 'results';
    uploadedImage: string | null;
    generatedImage: string | null;
    historicalImages: string[];
    options: {
        faithfulness: string;
        notes: string;
        removeWatermark: boolean;
    };
    error: string | null;
}

export interface SwapStyleState {
    stage: 'idle' | 'configuring' | 'generating' | 'results';
    uploadedImage: string | null;
    generatedImage: string | null;
    historicalImages: string[];
    options: {
        style: string;
        styleStrength: string;
        notes: string;
        removeWatermark: boolean;
    };
    error: string | null;
}

export interface MixStyleState {
    stage: 'idle' | 'configuring' | 'generating' | 'results';
    contentImage: string | null;
    styleImage: string | null;
    generatedImage: string | null;
    historicalImages: string[];
    options: {
        styleStrength: string;
        notes: string;
        removeWatermark: boolean;
    };
    error: string | null;
}

export interface ToyModelCreatorState {
    stage: 'idle' | 'configuring' | 'generating' | 'results';
    uploadedImage: string | null;
    generatedImage: string | null;
    historicalImages: string[];
    concept: string;
    options: {
        computerType: string;
        softwareType: string;
        boxType: string;
        background: string;
        keychainMaterial: string;
        keychainStyle: string;
        accompanyingItems: string;
        deskSurface: string;
        capsuleColor: string;
        modelFinish: string;
        capsuleContents: string;
        displayLocation: string;
        miniatureMaterial: string;
        baseMaterial: string;
        baseShape: string;
        lightingStyle: string;
        pokeballType: string;
        evolutionDisplay: string;
        modelStyle: string;
        aspectRatio: string;
        notes: string;
        removeWatermark: boolean;
    };
    error: string | null;
}


// Union type for all possible app states
export type AnyAppState =
  | HomeState
  | DressTheModelState
  | PhotoRestorationState
  | FreeGenerationState
  | ImageInterpolationState
  | OutfitSplitterState
  | ArchitectureIdeatorState
  | AvatarCreatorState
  | ImageToRealState
  | SwapStyleState
  | MixStyleState
  | ToyModelCreatorState;

// --- App Navigation & State Types (Moved from App.tsx) ---
export type HomeView = { viewId: 'home'; state: HomeState };
export type DressTheModelView = { viewId: 'dress-the-model'; state: DressTheModelState };
export type PhotoRestorationView = { viewId: 'photo-restoration'; state: PhotoRestorationState };
export type FreeGenerationView = { viewId: 'free-generation'; state: FreeGenerationState };
export type ImageInterpolationView = { viewId: 'image-interpolation'; state: ImageInterpolationState };
export type OutfitSplitterView = { viewId: 'outfit-splitter'; state: OutfitSplitterState };
export type ArchitectureIdeatorView = { viewId: 'architecture-ideator'; state: ArchitectureIdeatorState };
export type AvatarCreatorView = { viewId: 'avatar-creator'; state: AvatarCreatorState };
export type ImageToRealView = { viewId: 'image-to-real'; state: ImageToRealState };
export type MixStyleView = { viewId: 'mix-style'; state: MixStyleState };
export type SwapStyleView = { viewId: 'swap-style'; state: SwapStyleState };
export type ToyModelCreatorView = { viewId: 'toy-model-creator'; state: ToyModelCreatorState };


export type ViewState =
  | HomeView
  | DressTheModelView
  | PhotoRestorationView
  | FreeGenerationView
  | ImageInterpolationView
  | OutfitSplitterView
  | ArchitectureIdeatorView
  | AvatarCreatorView
  | ImageToRealView
  | MixStyleView
  | SwapStyleView
  | ToyModelCreatorView;

// Helper function to get initial state for an app
export const getInitialStateForApp = (viewId: string): AnyAppState => {
    switch (viewId) {
        case 'home':
            return { stage: 'home' };
        case 'dress-the-model':
            return { stage: 'idle', modelImage: null, clothingImage: null, accessoryImage: null, generatedImage: null, historicalImages: [], options: { background: '', pose: '', style: '', aspectRatio: 'Giữ nguyên', notes: '', removeWatermark: false }, error: null };
        case 'photo-restoration':
            return { stage: 'idle', uploadedImage: null, generatedImage: null, historicalImages: [], options: { type: 'Chân dung', gender: 'Tự động', age: '', nationality: COUNTRIES[0], notes: '', removeWatermark: false, removeStains: true }, error: null };
        case 'free-generation':
            return { stage: 'configuring', image1: null, image2: null, generatedImages: [], historicalImages: [], options: { prompt: '', removeWatermark: false, numberOfImages: 1, aspectRatio: 'Giữ nguyên' }, error: null };
        case 'image-interpolation':
             return { stage: 'idle', inputImage: null, outputImage: null, referenceImage: null, generatedPrompt: '', promptSuggestions: '', additionalNotes: '', finalPrompt: null, generatedImage: null, historicalImages: [], options: { removeWatermark: false, aspectRatio: 'Giữ nguyên' }, error: null };
        case 'outfit-splitter':
            return { stage: 'idle', uploadedImage: null, generatedItems: [], historicalImages: [], error: null };
        case 'architecture-ideator':
            return { stage: 'idle', uploadedImage: null, generatedImage: null, historicalImages: [], options: { context: '', style: '', color: '', lighting: '', notes: '', removeWatermark: false }, error: null };
        case 'avatar-creator':
            // FIX: Explicitly type the initial state object to ensure TypeScript correctly infers the type for `generatedImages` as Record<string, GeneratedAvatarImage>, preventing downstream type errors.
            const avatarCreatorInitialState: AvatarCreatorState = { stage: 'idle', uploadedImage: null, generatedImages: {}, selectedIdeas: [], historicalImages: [], options: { additionalPrompt: '', removeWatermark: false, aspectRatio: 'Giữ nguyên' }, error: null };
            return avatarCreatorInitialState;
        case 'image-to-real':
            return { stage: 'idle', uploadedImage: null, generatedImage: null, historicalImages: [], options: { faithfulness: 'Trung bình', notes: '', removeWatermark: false }, error: null };
        case 'swap-style':
            return { stage: 'idle', uploadedImage: null, generatedImage: null, historicalImages: [], options: { style: STYLE_OPTIONS_LIST[0], styleStrength: 'Trung bình', notes: '', removeWatermark: false }, error: null };
        case 'mix-style':
            return { stage: 'idle', contentImage: null, styleImage: null, generatedImage: null, historicalImages: [], options: { styleStrength: 'Trung bình', notes: '', removeWatermark: false }, error: null };
        case 'toy-model-creator':
            return { stage: 'idle', uploadedImage: null, generatedImage: null, historicalImages: [], concept: 'desktop_model', options: { computerType: '', softwareType: '', boxType: '', background: '', keychainMaterial: '', keychainStyle: '', accompanyingItems: '', deskSurface: '', capsuleColor: '', modelFinish: '', capsuleContents: '', displayLocation: '', miniatureMaterial: '', baseMaterial: '', baseShape: '', lightingStyle: '', pokeballType: '', evolutionDisplay: '', modelStyle: '', aspectRatio: 'Giữ nguyên', notes: '', removeWatermark: false }, error: null };
        default:
            return { stage: 'home' };
    }
};

// --- App Control Context Type ---
export interface AppControlContextType {
    currentView: ViewState;
    settings: any;
    theme: Theme;
    sessionGalleryImages: string[];
    historyIndex: number;
    viewHistory: ViewState[];
    isSearchOpen: boolean;
    isGalleryOpen: boolean;
    isInfoOpen: boolean;
    isLicensed: boolean;
    trialEmail: string | null;
    addImagesToGallery: (newImages: string[]) => void;
    removeImageFromGallery: (imageIndex: number) => void;
    handleThemeChange: (newTheme: Theme) => void;
    navigateTo: (viewId: string) => void;
    handleStateChange: (newAppState: AnyAppState) => void;
    handleSelectApp: (appId: string) => void;
    handleGoHome: () => void;
    handleGoBack: () => void;
    handleGoForward: () => void;
    handleResetApp: () => void;
    handleOpenSearch: () => void;
    handleCloseSearch: () => void;
    handleOpenGallery: () => void;
    handleCloseGallery: () => void;
    handleOpenInfo: () => void;
    handleCloseInfo: () => void;
    handleLicenseValidation: (email: string, key: string) => 'SUCCESS' | 'INVALID_KEY' | 'WRONG_EMAIL';
}