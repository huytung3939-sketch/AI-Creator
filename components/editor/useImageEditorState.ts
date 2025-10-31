/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { useState, useRef, useEffect, useCallback, useMemo, ChangeEvent, MouseEvent, TouchEvent } from 'react';
import { handleFileUpload } from '../uiUtils';
import { removeImageBackground } from '../../services/geminiService';
import { 
    type Tool, type EditorStateSnapshot, type Point, type Rect, type CropResizeHandle, type CropAction,
    type Interaction, type SelectionStroke, type PenNode, type ColorChannel,
} from './ImageEditor.types';
import { INITIAL_COLOR_ADJUSTMENTS, COLOR_CHANNELS } from './ImageEditor.constants';
import { 
    rgbToHsl, hslToRgb, isPointInRect, getRatioValue, getHandleAtPoint, 
    getCursorForHandle, approximateCubicBezier 
} from './ImageEditor.utils';

/**
 * Creates a canvas with a feathered (blurred) selection mask.
 * @param selectionPath The Path2D of the selection.
 * @param width The width of the canvas.
 * @param height The height of the canvas.
 * @param featherAmount The blur radius for the feathering effect.
 * @returns An HTMLCanvasElement containing the feathered mask.
 */
const createFeatheredMask = (
    selectionPath: Path2D,
    width: number,
    height: number,
    featherAmount: number
): HTMLCanvasElement => {
    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = width;
    maskCanvas.height = height;
    const maskCtx = maskCanvas.getContext('2d');

    if (!maskCtx) return maskCanvas;

    // If no feathering, just draw the sharp mask directly.
    if (featherAmount <= 0) {
        maskCtx.fillStyle = 'white';
        maskCtx.fill(selectionPath);
        return maskCanvas;
    }

    // --- NEW LOGIC for smooth edge feathering ---
    // The padding should be large enough to contain the full blur effect.
    // A blur radius corresponds to the standard deviation of the Gaussian function.
    // 3 * radius covers ~99.7% of the effect. Let's use 2x for safety and performance.
    const padding = Math.ceil(featherAmount * 2);

    // Create a temporary canvas that is larger than the original
    // to give the blur effect space to render without being clipped at the edges.
    const sharpCanvas = document.createElement('canvas');
    sharpCanvas.width = width + padding * 2;
    sharpCanvas.height = height + padding * 2;
    const sharpCtx = sharpCanvas.getContext('2d');
    if (!sharpCtx) return maskCanvas; // Fallback to an empty mask if context fails

    // Draw the selection shape onto the padded canvas, offset by the padding amount.
    sharpCtx.translate(padding, padding);
    sharpCtx.fillStyle = 'white';
    sharpCtx.fill(selectionPath);
    sharpCtx.translate(-padding, -padding); // Reset transform

    // Now, draw the padded, sharp-edged canvas onto the final mask canvas.
    // Apply the blur filter *here*. The blur will have space to expand into the padding
    // and then we crop it back to the original size by drawing with a negative offset.
    maskCtx.filter = `blur(${featherAmount}px)`;
    maskCtx.drawImage(sharpCanvas, -padding, -padding);
    maskCtx.filter = 'none'; // Always clean up the filter.
    
    return maskCanvas;
};


export const useImageEditorState = (imageToEdit: { url: string | null } | null) => {
    // --- State & Refs ---
    const [internalImageUrl, setInternalImageUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    // History states
    const [history, setHistory] = useState<EditorStateSnapshot[]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);

    // Filter states
    const [luminance, setLuminance] = useState(0);
    const [contrast, setContrast] = useState(0);
    const [temp, setTemp] = useState(0);
    const [tint, setTint] = useState(0);
    const [saturation, setSaturation] = useState(0);
    const [vibrance, setVibrance] = useState(0);
    const [hue, setHue] = useState(0);
    const [grain, setGrain] = useState(0);
    const [clarity, setClarity] = useState(0);
    const [dehaze, setDehaze] = useState(0);
    const [blur, setBlur] = useState(0);
    const [rotation, setRotation] = useState(0);
    const [flipHorizontal, setFlipHorizontal] = useState(false);
    const [flipVertical, setFlipVertical] = useState(false);
    const [isInverted, setIsInverted] = useState(false);
    const [colorAdjustments, setColorAdjustments] = useState(INITIAL_COLOR_ADJUSTMENTS);
    
    // UI states
    const [openSection, setOpenSection] = useState<'adj' | 'hls' | 'effects' | 'magic' | null>('adj');
    const [isGalleryPickerOpen, setIsGalleryPickerOpen] = useState(false);
    // Explicitly type the state to ColorChannel to avoid it being inferred as a generic string.
    const [activeColorTab, setActiveColorTab] = useState<ColorChannel>(Object.keys(INITIAL_COLOR_ADJUSTMENTS)[0] as ColorChannel);
    const [isShowingOriginal, setIsShowingOriginal] = useState(false);

    // Tool states
    const [activeTool, setActiveTool] = useState<Tool | null>(null);
    const [brushSize, setBrushSize] = useState(20);
    const [brushHardness, setBrushHardness] = useState(100);
    const [brushOpacity, setBrushOpacity] = useState(100);
    const [brushColor, setBrushColor] = useState('#ffffff');
    const [isDrawing, setIsDrawing] = useState(false);
    const [cursorPosition, setCursorPosition] = useState<Point | null>(null);
    const [isCursorOverCanvas, setIsCursorOverCanvas] = useState(false);

    // Crop-specific states
    const [cropSelection, setCropSelection] = useState<Rect | null>(null);
    const [cropAspectRatio, setCropAspectRatio] = useState('Free');
    const [cropAction, setCropAction] = useState<CropAction | null>(null);
    const [hoveredCropHandle, setHoveredCropHandle] = useState<CropResizeHandle | null>(null);

    // Selection tool states
    const [interactionState, setInteractionState] = useState<Interaction>('none');
    const [selectionStrokes, setSelectionStrokes] = useState<SelectionStroke[]>([]);
    const [isSelectionInverted, setIsSelectionInverted] = useState(false);
    const [penPathPoints, setPenPathPoints] = useState<PenNode[]>([]);
    const [currentPenDrag, setCurrentPenDrag] = useState<{start: Point, current: Point} | null>(null);
    const [marqueeRect, setMarqueeRect] = useState<Rect | null>(null);
    const [ellipseRect, setEllipseRect] = useState<Rect | null>(null);
    const [featherAmount, setFeatherAmount] = useState(0);

    // Refs
    const sourceImageRef = useRef<HTMLImageElement | null>(null);
    const originalImageRef = useRef<HTMLImageElement | null>(null);
    const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const drawingCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const tempDrawingCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const animationFrameRef = useRef<number | null>(null);
    const interactionStartRef = useRef<{ mouse: Point; selection?: Rect, handle?: CropResizeHandle | null } | null>(null);
    const selectionModifierRef = useRef<'new' | 'add' | 'subtract'>('new');
    const currentDrawingPointsRef = useRef<Point[]>([]);
    const previousToolRef = useRef<Tool | null>(null);
    const lastPointRef = useRef<Point | null>(null);

    const isOpen = imageToEdit !== null;

    // --- Memoized Derived State ---
    const selectionPath = useMemo(() => {
        const canvas = previewCanvasRef.current;
        if (!canvas || (selectionStrokes.length === 0 && !isSelectionInverted)) return null;
        const finalPath = new Path2D();
        const addPolygonToPath = (points: Point[], path: Path2D) => {
            if (points.length < 2) return;
            path.moveTo(points[0].x, points[0].y);
            for (let i = 1; i < points.length; i++) path.lineTo(points[i].x, points[i].y);
            if (points.length > 2) path.closePath();
        };
        if (isSelectionInverted) {
            finalPath.rect(0, 0, canvas.width, canvas.height);
            selectionStrokes.forEach(stroke => addPolygonToPath(stroke.op === 'add' ? [...stroke.points].reverse() : stroke.points, finalPath));
        } else {
            selectionStrokes.forEach(stroke => addPolygonToPath(stroke.op === 'subtract' ? [...stroke.points].reverse() : stroke.points, finalPath));
        }
        return finalPath;
    }, [selectionStrokes, isSelectionInverted, internalImageUrl]);

    const isSelectionActive = useMemo(() => selectionPath !== null, [selectionPath]);
    
    // --- Core Functions ---
    const deselect = useCallback(() => {
        setSelectionStrokes([]);
        setIsSelectionInverted(false);
        setPenPathPoints([]);
        setMarqueeRect(null);
        setEllipseRect(null);
    }, []);

    const captureState = useCallback((): EditorStateSnapshot => ({
        luminance, contrast, temp, tint, saturation, vibrance, hue, grain, clarity, dehaze, blur,
        rotation, flipHorizontal, flipVertical, isInverted, colorAdjustments, brushHardness, brushOpacity,
        drawingCanvasDataUrl: drawingCanvasRef.current?.toDataURL() ?? null,
        imageUrl: internalImageUrl!,
    }), [
        luminance, contrast, temp, tint, saturation, vibrance, hue, grain, clarity, dehaze, blur,
        rotation, flipHorizontal, flipVertical, isInverted, colorAdjustments, brushHardness, brushOpacity, internalImageUrl
    ]);

    const pushHistory = useCallback((newState: EditorStateSnapshot) => {
        const newHistory = history.slice(0, historyIndex + 1);
        const lastState = newHistory[newHistory.length - 1];
        if (lastState && JSON.stringify(lastState) === JSON.stringify(newState)) return;
        newHistory.push(newState);
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
    }, [history, historyIndex]);

    const restoreState = useCallback((snapshot: EditorStateSnapshot) => {
        setLuminance(snapshot.luminance); setContrast(snapshot.contrast); setTemp(snapshot.temp); setTint(snapshot.tint);
        setSaturation(snapshot.saturation); setVibrance(snapshot.vibrance); setHue(snapshot.hue); setGrain(snapshot.grain);
        setClarity(snapshot.clarity); setDehaze(snapshot.dehaze); setBlur(snapshot.blur); setRotation(snapshot.rotation);
        setFlipHorizontal(snapshot.flipHorizontal); setFlipVertical(snapshot.flipVertical);
        setIsInverted(snapshot.isInverted);
        setBrushHardness(snapshot.brushHardness);
        setBrushOpacity(snapshot.brushOpacity);
        setColorAdjustments(snapshot.colorAdjustments);
        
        if (internalImageUrl !== snapshot.imageUrl) {
            setInternalImageUrl(snapshot.imageUrl);
        }

        const drawingCanvas = drawingCanvasRef.current;
        if (drawingCanvas && snapshot.drawingCanvasDataUrl) {
            const img = new Image();
            img.onload = () => {
                const ctx = drawingCanvas.getContext('2d');
                if (ctx) {
                    ctx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
                    ctx.drawImage(img, 0, 0);
                }
            };
            img.src = snapshot.drawingCanvasDataUrl;
        } else if (drawingCanvas) {
            const ctx = drawingCanvas.getContext('2d');
            ctx?.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
        }
    }, [internalImageUrl]);

    const handleUndo = useCallback(() => {
        if (historyIndex > 0) {
            const newIndex = historyIndex - 1;
            setHistoryIndex(newIndex);
            restoreState(history[newIndex]);
        }
    }, [history, historyIndex, restoreState]);

    const handleRedo = useCallback(() => {
        if (historyIndex < history.length - 1) {
            const newIndex = historyIndex + 1;
            setHistoryIndex(newIndex);
            restoreState(history[newIndex]);
        }
    }, [history, historyIndex, restoreState]);

    const commitState = useCallback(() => {
        pushHistory(captureState());
    }, [captureState, pushHistory]);

    const resetAll = useCallback((confirm = false) => {
        if (confirm && !window.confirm("Are you sure you want to reset all changes?")) return;
        setLuminance(0); setContrast(0); setTemp(0); setTint(0);
        setSaturation(0); setVibrance(0); setHue(0); setGrain(0);
        setClarity(0); setDehaze(0); setBlur(0); setRotation(0);
        setFlipHorizontal(false); setFlipVertical(false); setIsInverted(false);
        setColorAdjustments(INITIAL_COLOR_ADJUSTMENTS);
        const drawingCtx = drawingCanvasRef.current?.getContext('2d');
        if (drawingCtx) drawingCtx.clearRect(0, 0, drawingCtx.canvas.width, drawingCtx.canvas.height);
        deselect();
        commitState();
    }, [commitState, deselect]);
    
    const handleFileSelected = useCallback((e: ChangeEvent<HTMLInputElement>) => {
        handleFileUpload(e, (url) => {
            setInternalImageUrl(url);
        });
    }, []);
    
    const handleGallerySelect = useCallback((url: string) => {
        setInternalImageUrl(url);
        setIsGalleryPickerOpen(false);
    }, []);

    const handleToolSelect = useCallback((tool: Tool) => {
        if (tool === activeTool) {
            setActiveTool(null);
        } else {
            setActiveTool(tool);
        }
    }, [activeTool]);

    // FIX: Implement the handleClearDrawings function to clear the drawing canvas and save the state.
    const handleClearDrawings = useCallback(() => {
        const drawingCtx = drawingCanvasRef.current?.getContext('2d');
        if (drawingCtx) {
            drawingCtx.clearRect(0, 0, drawingCtx.canvas.width, drawingCtx.canvas.height);
            commitState();
        }
    }, [commitState]);

    const handleRemoveBackground = useCallback(async () => {}, []);
    const handleInvertColors = useCallback(() => {}, []);
    const handleApplyAllAdjustments = useCallback(() => {}, []);
    const handleApplyAdjustmentsToSelection = useCallback(() => {}, []);
    const handleActionStart = useCallback((e: MouseEvent<HTMLCanvasElement> | TouchEvent<HTMLCanvasElement>) => {}, []);
    const handleCanvasMouseMove = useCallback((e: MouseEvent<HTMLCanvasElement> | TouchEvent<HTMLCanvasElement>) => {}, []);
    const handleActionEnd = useCallback((e: MouseEvent<HTMLCanvasElement> | TouchEvent<HTMLCanvasElement>) => {}, []);
    const getFinalImage = useCallback(async (): Promise<string | null> => null, []);
    const invertSelection = useCallback(() => {}, []);
    const deleteImageContentInSelection = useCallback(() => {}, []);
    const fillSelection = useCallback(() => {}, []);
    const handleApplyCrop = useCallback(() => {}, []);
    const handleCancelCrop = useCallback(() => {}, []);

    // FIX: Added return statement to export the hook's state and functions, enabling proper type inference and functionality.
    return {
        // State & Setters
        internalImageUrl, setInternalImageUrl,
        isLoading, setIsLoading,
        history, setHistory,
        historyIndex, setHistoryIndex,
        luminance, setLuminance,
        contrast, setContrast,
        temp, setTemp,
        tint, setTint,
        saturation, setSaturation,
        vibrance, setVibrance,
        hue, setHue,
        grain, setGrain,
        clarity, setClarity,
        dehaze, setDehaze,
        blur, setBlur,
        rotation, setRotation,
        flipHorizontal, setFlipHorizontal,
        flipVertical, setFlipVertical,
        isInverted, setIsInverted,
        colorAdjustments, setColorAdjustments,
        openSection, setOpenSection,
        isGalleryPickerOpen, setIsGalleryPickerOpen,
        activeColorTab, setActiveColorTab,
        isShowingOriginal, setIsShowingOriginal,
        activeTool, setActiveTool,
        brushSize, setBrushSize,
        brushHardness, setBrushHardness,
        brushOpacity, setBrushOpacity,
        brushColor, setBrushColor,
        isDrawing, setIsDrawing,
        cursorPosition, setCursorPosition,
        isCursorOverCanvas, setIsCursorOverCanvas,
        cropSelection, setCropSelection,
        cropAspectRatio, setCropAspectRatio,
        cropAction, setCropAction,
        hoveredCropHandle, setHoveredCropHandle,
        interactionState, setInteractionState,
        selectionStrokes, setSelectionStrokes,
        isSelectionInverted, setIsSelectionInverted,
        penPathPoints, setPenPathPoints,
        currentPenDrag, setCurrentPenDrag,
        marqueeRect, setMarqueeRect,
        ellipseRect, setEllipseRect,
        featherAmount, setFeatherAmount,
        
        // Refs
        previewCanvasRef,
        drawingCanvasRef,
        overlayCanvasRef,
        tempDrawingCanvasRef,
        currentDrawingPointsRef,

        // Memoized values
        selectionPath,
        isSelectionActive,

        // Functions
        deselect,
        captureState,
        pushHistory,
        restoreState,
        handleUndo,
        handleRedo,
        commitState,
        resetAll,
        handleFileSelected,
        handleGallerySelect,
        handleToolSelect,
        handleRemoveBackground,
        handleClearDrawings,
        handleInvertColors,
        handleApplyAllAdjustments,
        handleApplyAdjustmentsToSelection,
        handleActionStart,
        handleCanvasMouseMove,
        handleActionEnd,
        getFinalImage,
        invertSelection,
        deleteImageContentInSelection,
        fillSelection,
        handleApplyCrop,
        handleCancelCrop,
    };
};