import { useState, useRef, useEffect, useCallback, type PointerEvent as ReactPointerEvent } from 'react';
import { useNavigate } from 'react-router';
import domtoimage from 'dom-to-image-more';
import { removeBackground } from './utils/removeBg';
import { analyzeImageWithAI } from './utils/aiAnalyze';
import type { ModuleData } from './types';
import { BackgroundTab } from './components/BackgroundTab';
import { ModuleTab } from './components/ModuleTab';
import { ExportDialog } from './components/ExportDialog';
import AIImageGenerator from './components/AIImageGenerator';
import WelcomeModal from './components/WelcomeModal';
import VideoExportModal from './components/VideoExportModal';
import BatchPanel from './components/BatchPanel';
import ModuleQuickNav from './components/ModuleQuickNav';
import {
  Plane,
  Music,
  Flashlight,
  AlarmClock,
  Moon,
  Sun,
  Volume2,
  Calculator,
  Camera,
  RotateCw,
  Bell,
  Battery,
  Settings,
  Wifi,
  Bluetooth,
  Radio,
  Sparkles,
  Download,
} from 'lucide-react';
// TrendingPanel removed
import ImageSearchPanel from './components/ImageSearchPanel';

type ModuleTemplate = Omit<ModuleData, 'id'> & { category: string };

type BackgroundLayer = {
  id: string;
  src: string;
  name: string;
  cutout: boolean;
  opacity: number;
  blendMode: string;
  scale?: number;
  positionX?: number;
  positionY?: number;
  fit?: 'cover' | 'contain';
};

export default function App() {
  const navigate = useNavigate();
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  const [selectedModuleIds, setSelectedModuleIds] = useState<string[]>([]);
  const [draggingModuleId, setDraggingModuleId] = useState<string | null>(null);
  const previewRef = useRef<HTMLDivElement | null>(null);
  // 记录最后一次指针位置（用于粘贴时判断目标模块）
  const lastPointerRef = useRef<{ x: number; y: number } | null>(null);
  const [backgroundLayers, setBackgroundLayers] = useState<BackgroundLayer[]>([]);
  const [backgroundBlur, setBackgroundBlur] = useState<number>(0);
  const [selectedTab, setSelectedTab] = useState<'canvas' | 'batch' | 'module'>('module');
  const [showWelcome] = useState(false);
  const [showVideoExport, setShowVideoExport] = useState(false);
  const [leftTab, setLeftTab] = useState<'images' | 'templates'>('images');

  // 叠加层拖拽状态
  const overlayDragRef = useRef<{ moduleId: string; startX: number; startY: number; startOx: number; startOy: number; moduleW: number; moduleH: number } | null>(null);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [history, setHistory] = useState<Array<{modules: ModuleData[]; backgroundLayers: BackgroundLayer[]; backgroundBlur: number}>>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const gridCellWidth = 177;
  const gridCellHeight = 177;
  const gridGap = 33;
  const gridOriginLeft = 137;
  const gridOriginTop = 240;
  const gridColumns = 4;
  const gridRows = 6;
  const zoom = 0.45;
  const gridWidth = gridColumns * gridCellWidth + (gridColumns - 1) * gridGap;
  const gridHeight = gridRows * gridCellHeight + (gridRows - 1) * gridGap;

  const getModulePositionFromGrid = (module: ModuleData) => {
    const gridX = Math.min(Math.max(module.gridX, 1), gridColumns);
    const gridY = Math.min(Math.max(module.gridY, 1), gridRows);
    const widthUnits = Math.min(Math.max(module.widthUnits, 1), gridColumns);
    const heightUnits = Math.min(Math.max(module.heightUnits, 1), gridRows);
    const width = widthUnits * gridCellWidth + (widthUnits - 1) * gridGap;
    const height = heightUnits * gridCellHeight + (heightUnits - 1) * gridGap;
    const left = gridOriginLeft + (gridX - 1) * (gridCellWidth + gridGap);
    const top = gridOriginTop + (gridY - 1) * (gridCellHeight + gridGap);
    return { left, top, width, height };
  };

  const doModulesOverlap = (aX: number, aY: number, aW: number, aH: number, bX: number, bY: number, bW: number, bH: number) => {
    const aRight = aX + aW - 1;
    const aBottom = aY + aH - 1;
    const bRight = bX + bW - 1;
    const bBottom = bY + bH - 1;
    return !(aRight < bX || aX > bRight || aBottom < bY || aY > bBottom);
  };

  const isGridPositionAvailable = (
    currentId: string,
    gridX: number,
    gridY: number,
    widthUnits: number,
    heightUnits: number
  ) => {
    return modules.every((module) =>
      module.id === currentId
        ? true
        : !doModulesOverlap(
            gridX,
            gridY,
            widthUnits,
            heightUnits,
            module.gridX,
            module.gridY,
            module.widthUnits,
            module.heightUnits
          )
    );
  };

  const findAvailableGridPosition = (widthUnits: number, heightUnits: number): { gridX: number; gridY: number } | null => {
    for (let y = 1; y <= gridRows - heightUnits + 1; y += 1) {
      for (let x = 1; x <= gridColumns - widthUnits + 1; x += 1) {
        const occupied = modules.some((module) =>
          doModulesOverlap(
            x,
            y,
            widthUnits,
            heightUnits,
            module.gridX,
            module.gridY,
            module.widthUnits,
            module.heightUnits
          )
        );
        if (!occupied) {
          return { gridX: x, gridY: y };
        }
      }
    }
    return null;
  };

  const moduleTemplates: ModuleTemplate[] = [
    {
      icon: null,
      iconName: 'Small',
      position: { left: 0, top: 0, width: gridCellWidth, height: gridCellHeight, borderRadius: 142 },
      gridX: 1,
      gridY: 1,
      widthUnits: 1,
      heightUnits: 1,
      backgroundColor: 'rgba(102, 126, 234, 0.85)',
      iconColor: '#FFFFFF',
      category: '小图标',
    },
    {
      icon: null,
      iconName: 'Horizontal',
      position: { left: 0, top: 0, width: gridCellWidth * 2 + gridGap, height: gridCellHeight, borderRadius: 62 },
      gridX: 1,
      gridY: 1,
      widthUnits: 2,
      heightUnits: 1,
      backgroundColor: 'rgba(142, 68, 173, 0.85)',
      iconColor: '#FFFFFF',
      category: '横着',
    },
    {
      icon: null,
      iconName: 'Vertical',
      position: { left: 0, top: 0, width: gridCellWidth, height: gridCellHeight * 2 + gridGap, borderRadius: 62 },
      gridX: 1,
      gridY: 1,
      widthUnits: 1,
      heightUnits: 2,
      backgroundColor: 'rgba(255, 107, 107, 0.85)',
      iconColor: '#FFFFFF',
      category: '竖着',
    },
    {
      icon: null,
      iconName: 'Large',
      position: { left: 0, top: 0, width: gridCellWidth * 2 + gridGap, height: gridCellHeight * 2 + gridGap, borderRadius: 91 },
      gridX: 1,
      gridY: 1,
      widthUnits: 2,
      heightUnits: 2,
      backgroundColor: 'rgba(255, 69, 180, 0.85)',
      iconColor: '#FFFFFF',
      label: '大方块',
      category: '大图标',
    },
  ];

  const handleModuleDragStart = (event: ReactPointerEvent<HTMLDivElement>, moduleId: string) => {
    event.preventDefault();
    event.stopPropagation();
    setSelectedModuleId(moduleId);
    setDraggingModuleId(moduleId);
  };

  const handlePointerMove = (event: PointerEvent | ReactPointerEvent<HTMLDivElement>) => {
    // always update last pointer position for paste targeting
    try {
      const px = (event as any).clientX as number | undefined;
      const py = (event as any).clientY as number | undefined;
      if (typeof px === 'number' && typeof py === 'number') {
        lastPointerRef.current = { x: px, y: py };
      }
    } catch (e) {}

    if (!draggingModuleId || !previewRef.current) {
      return;
    }

    const rect = previewRef.current.getBoundingClientRect();
    const clientX = (event as any).clientX as number;
    const clientY = (event as any).clientY as number;
    const pointerX = (clientX - rect.left) / zoom;
    const pointerY = (clientY - rect.top) / zoom;
    const rawGridX = Math.round((pointerX - gridOriginLeft) / (gridCellWidth + gridGap)) + 1;
    const rawGridY = Math.round((pointerY - gridOriginTop) / (gridCellHeight + gridGap)) + 1;

    const draggedModule = modules.find((module) => module.id === draggingModuleId);
    if (!draggedModule) {
      return;
    }

    const newGridX = Math.min(
      Math.max(rawGridX, 1),
      gridColumns - draggedModule.widthUnits + 1
    );
    const newGridY = Math.min(
      Math.max(rawGridY, 1),
      gridRows - draggedModule.heightUnits + 1
    );

    if (
      isGridPositionAvailable(
        draggingModuleId,
        newGridX,
        newGridY,
        draggedModule.widthUnits,
        draggedModule.heightUnits
      )
    ) {
      handleModuleUpdate(draggingModuleId, { gridX: newGridX, gridY: newGridY });
    }
  };

  const handlePreviewPointerUp = () => {
    setDraggingModuleId(null);
  };

  const pushHistory = (snapshot: { modules: ModuleData[]; backgroundLayers: BackgroundLayer[]; backgroundBlur: number }) => {
    setHistory((prev) => {
      const next = prev.slice(0, historyIndex + 1);
      return [...next, snapshot];
    });
    setHistoryIndex((prev) => prev + 1);
  };

  const commitCanvasState = (
    nextModules: ModuleData[],
    nextBackgroundLayers: BackgroundLayer[] = backgroundLayers,
    nextBackgroundBlur: number = backgroundBlur
  ) => {
    setModules(nextModules);
    setBackgroundLayers(nextBackgroundLayers);
    setBackgroundBlur(nextBackgroundBlur);
    pushHistory({
      modules: nextModules,
      backgroundLayers: nextBackgroundLayers,
      backgroundBlur: nextBackgroundBlur,
    });
  };

  const handleUndo = () => {
    if (historyIndex <= 0) {
      return;
    }
    const previous = history[historyIndex - 1];
    if (!previous) {
      return;
    }
    setModules(previous.modules);
    setBackgroundLayers(previous.backgroundLayers);
    setBackgroundBlur(previous.backgroundBlur);
    setHistoryIndex(historyIndex - 1);
  };

  useEffect(() => {
    if (!draggingModuleId) {
      return;
    }

    const handleWindowUp = () => {
      setDraggingModuleId(null);
    };

    window.addEventListener('pointerup', handleWindowUp);
    window.addEventListener('pointercancel', handleWindowUp);
    window.addEventListener('pointermove', handlePointerMove);
    return () => {
      window.removeEventListener('pointerup', handleWindowUp);
      window.removeEventListener('pointercancel', handleWindowUp);
      window.removeEventListener('pointermove', handlePointerMove);
    };
  }, [draggingModuleId, handlePointerMove]);

  

  // --- Helpers for drag & drop from outside (files) and from sidebar (templates) ---
  const getModuleIdAtPointer = (clientX: number, clientY: number) => {
    if (!previewRef.current) return null;
    const rect = previewRef.current.getBoundingClientRect();
    const pointerX = (clientX - rect.left) / zoom;
    const pointerY = (clientY - rect.top) / zoom;
    for (const m of modules) {
      const pos = getModulePositionFromGrid(m);
      if (pointerX >= pos.left && pointerX <= pos.left + pos.width && pointerY >= pos.top && pointerY <= pos.top + pos.height) {
        return m.id;
      }
    }
    return null;
  };

  const getGridFromPointer = (clientX: number, clientY: number) => {
    if (!previewRef.current) return null;
    const rect = previewRef.current.getBoundingClientRect();
    const clientXR = clientX;
    const clientYR = clientY;
    const pointerX = (clientXR - rect.left) / zoom;
    const pointerY = (clientYR - rect.top) / zoom;
    const rawGridX = Math.round((pointerX - gridOriginLeft) / (gridCellWidth + gridGap)) + 1;
    const rawGridY = Math.round((pointerY - gridOriginTop) / (gridCellHeight + gridGap)) + 1;
    return { rawGridX, rawGridY };
  };

  const blobToDataURL = (blob: Blob) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

  const handleAddUploadedFile = async (file: File) => {
    // Add uploaded image into the left uploads area (no automatic module creation)
    setIsAnalyzing(true);
    try {
      const dataURL = await blobToDataURL(file);
      const id = `upload-${Date.now()}`;
      setUploadedImages((prev) => [{ id, dataURL, name: file.name }, ...prev]);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handlePreviewDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    setIsCanvasDragActive(true);
  };

  const handlePreviewDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    // update hovered module
    const clientX = e.clientX;
    const clientY = e.clientY;
    const overModuleId = getModuleIdAtPointer(clientX, clientY);
    setHoveredModuleIdDuringDrag(overModuleId);
  };

  const handlePreviewDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    // if leaving the preview area
    setIsCanvasDragActive(false);
    setHoveredModuleIdDuringDrag(null);
  };

  const handlePreviewDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsCanvasDragActive(false);
    const file = e.dataTransfer?.files?.[0];
    const templateData = e.dataTransfer?.getData('application/json');
    const dataURIdrag = e.dataTransfer?.getData('text/uri-list') || e.dataTransfer?.getData('text/plain');
    const clientX = e.clientX;
    const clientY = e.clientY;

    // If dropped a dataURL (from uploads area) onto a module -> fill directly
    const targetModuleId = getModuleIdAtPointer(clientX, clientY);
    if (dataURIdrag && targetModuleId) {
      // apply dataURL directly
      const dataURL = dataURIdrag;
      setIsAnalyzing(true);
      try {
        let aiResult = null;
        try {
          aiResult = await analyzeImageWithAI(dataURL);
        } catch (err) {
          console.warn('AI analyze failed', err);
        }
        const nextModules = modules.map((m) => {
          if (m.id !== targetModuleId) return m;
          return {
            ...m,
            customIcon: dataURL,
            backgroundColor: aiResult?.backgroundColor || m.backgroundColor,
            iconColor: aiResult?.iconColor || m.iconColor,
            label: aiResult?.label || m.label,
          };
        });
        commitCanvasState(nextModules);
        setFlashingModuleId(targetModuleId);
        setTimeout(() => setFlashingModuleId(null), 1200);
      } finally {
        setIsAnalyzing(false);
      }
      return;
    }

    // If dropped a file onto a module -> do asset filling
    if (file && targetModuleId) {
      // process the file for the target module
      setIsAnalyzing(true);
      try {
        const cutoutBlob = await removeBackground(file).catch((err) => {
          console.warn('removeBackground failed', err);
          return file;
        });
        const dataURL = await blobToDataURL(cutoutBlob instanceof Blob ? cutoutBlob : file);
        let aiResult = null;
        try {
          aiResult = await analyzeImageWithAI(dataURL);
        } catch (err) {
          console.warn('AI analyze failed', err);
        }

        const nextModules = modules.map((m) => {
          if (m.id !== targetModuleId) return m;
          return {
            ...m,
            customIcon: dataURL,
            backgroundColor: aiResult?.backgroundColor || m.backgroundColor,
            iconColor: aiResult?.iconColor || m.iconColor,
            label: aiResult?.label || m.label,
          };
        });
        commitCanvasState(nextModules);
        setFlashingModuleId(targetModuleId);
        setTimeout(() => setFlashingModuleId(null), 1200);
      } finally {
        setIsAnalyzing(false);
      }
      return;
    }

    // If dropped a template json (drag from sidebar), add new module at drop grid
    if (templateData) {
      try {
        const template = JSON.parse(templateData);
        const grid = getGridFromPointer(clientX, clientY);
        const widthUnits = template.widthUnits || 1;
        const heightUnits = template.heightUnits || 1;
        const targetGridX = Math.min(Math.max(grid?.rawGridX || 1, 1), gridColumns - widthUnits + 1);
        const targetGridY = Math.min(Math.max(grid?.rawGridY || 1, 1), gridRows - heightUnits + 1);
        if (!isGridPositionAvailable('', targetGridX, targetGridY, widthUnits, heightUnits)) {
          // find another available
          const pos = findAvailableGridPosition(widthUnits, heightUnits);
          if (!pos) {
            alert('画布已满，无法添加更多模块');
            return;
          }
          template.gridX = pos.gridX;
          template.gridY = pos.gridY;
        } else {
          template.gridX = targetGridX;
          template.gridY = targetGridY;
        }
        addModuleFromTemplate(template);
      } catch (err) {
        console.warn('Failed to parse template drop', err);
      }
    }
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // 检查当前焦点是否在输入框、文本框或可编辑元素上
      const activeElement = document.activeElement;
      const isInputFocused =
        activeElement instanceof HTMLInputElement ||
        activeElement instanceof HTMLTextAreaElement ||
        activeElement instanceof HTMLSelectElement ||
        activeElement?.getAttribute('contenteditable') === 'true';

      // 如果正在输入框中编辑，不触发删除模块操作
      if (isInputFocused) {
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        handleUndo();
        return;
      }

      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault();
        if (selectedModuleIds.length > 0) {
          // 批量删除
          selectedModuleIds.forEach((id) => handleDeleteModule(id));
        } else if (selectedModuleId) {
          // 单个删除
          handleDeleteModule(selectedModuleId);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedModuleId, selectedModuleIds]);

  const [modules, setModules] = useState<ModuleData[]>([
    {
      // 2×2 连接按钮组
      id: 'top-left',
      icon: Plane,
      iconName: 'Plane',
      position: { left: 137, top: 240, width: 387, height: 387, borderRadius: 91 },
      gridX: 1, gridY: 1, widthUnits: 2, heightUnits: 2,
      backgroundColor: '#1c1c1e',
      iconColor: '#FFFFFF',
      iconBackgroundColor: '#3a3a3c',
    },
    {
      // 2×2 音乐/正在播放
      id: 'top-right',
      icon: Music,
      iconName: 'Music',
      position: { left: 557, top: 240, width: 387, height: 387, borderRadius: 91 },
      gridX: 3, gridY: 1, widthUnits: 2, heightUnits: 2,
      backgroundColor: '#1c1c1e',
      iconColor: '#FFFFFF',
    },
    {
      // 手电筒
      id: 'flashlight',
      icon: Flashlight,
      iconName: 'Flashlight',
      position: { left: 137, top: 660, width: 177, height: 177, borderRadius: 142 },
      gridX: 1, gridY: 3, widthUnits: 1, heightUnits: 1,
      backgroundColor: '#1c1c1e',
      iconColor: '#FFFFFF',
    },
    {
      // 闹钟
      id: 'alarm',
      icon: AlarmClock,
      iconName: 'AlarmClock',
      position: { left: 347, top: 660, width: 177, height: 177, borderRadius: 142 },
      gridX: 2, gridY: 3, widthUnits: 1, heightUnits: 1,
      backgroundColor: '#1c1c1e',
      iconColor: '#FFFFFF',
    },
    {
      // 亮度滑块 1×2
      id: 'brightness',
      icon: Sun,
      iconName: 'Sun',
      position: { left: 557, top: 660, width: 177, height: 386, borderRadius: 62 },
      gridX: 3, gridY: 3, widthUnits: 1, heightUnits: 2,
      gradient: 'linear-gradient(to bottom, #FFD93D 0%, #F5F5DC 100%)',
      iconColor: '#4A5FBE',
      percentage: 70,
      percentageColor: 'rgba(255,255,255,0.4)',
    },
    {
      // 音量滑块 1×2
      id: 'volume',
      icon: Volume2,
      iconName: 'Volume2',
      position: { left: 767, top: 660, width: 177, height: 386, borderRadius: 62 },
      gridX: 4, gridY: 3, widthUnits: 1, heightUnits: 2,
      backgroundColor: '#1c1c1e',
      iconColor: '#FFFFFF',
      percentage: 50,
      percentageColor: 'rgba(255,255,255,0.35)',
    },
    {
      // 专注模式 2×1 长条
      id: 'mode-moon',
      icon: Moon,
      iconName: 'Moon',
      position: { left: 137, top: 870, width: 387, height: 177, borderRadius: 62 },
      gridX: 1, gridY: 4, widthUnits: 2, heightUnits: 1,
      backgroundColor: 'rgba(255,255,255,0.92)',
      borderColor: 'rgba(0,0,0,0.1)',
      iconColor: '#1c1c1e',
    },
    {
      // 计算器
      id: 'calculator',
      icon: Calculator,
      iconName: 'Calculator',
      position: { left: 137, top: 1080, width: 177, height: 177, borderRadius: 142 },
      gridX: 1, gridY: 5, widthUnits: 1, heightUnits: 1,
      backgroundColor: '#1c1c1e',
      iconColor: '#FFFFFF',
    },
    {
      // 相机
      id: 'camera',
      icon: Camera,
      iconName: 'Camera',
      position: { left: 347, top: 1080, width: 177, height: 177, borderRadius: 142 },
      gridX: 2, gridY: 5, widthUnits: 1, heightUnits: 1,
      backgroundColor: '#1c1c1e',
      iconColor: '#FFFFFF',
    },
    {
      // 旋转锁定
      id: 'rotation-lock',
      icon: RotateCw,
      iconName: 'RotateCw',
      position: { left: 557, top: 1080, width: 177, height: 177, borderRadius: 142 },
      gridX: 3, gridY: 5, widthUnits: 1, heightUnits: 1,
      backgroundColor: '#1c1c1e',
      iconColor: '#FFFFFF',
    },
    {
      // 铃铛
      id: 'bell',
      icon: Bell,
      iconName: 'Bell',
      position: { left: 767, top: 1080, width: 177, height: 177, borderRadius: 142 },
      gridX: 4, gridY: 5, widthUnits: 1, heightUnits: 1,
      backgroundColor: '#1c1c1e',
      iconColor: '#FFFFFF',
    },
    {
      // 电量
      id: 'battery',
      icon: Battery,
      iconName: 'Battery',
      position: { left: 137, top: 1290, width: 177, height: 177, borderRadius: 142 },
      gridX: 1, gridY: 6, widthUnits: 1, heightUnits: 1,
      backgroundColor: '#1c1c1e',
      iconColor: '#FFFFFF',
    },
  ]);

 

  useEffect(() => {
    if (historyIndex === -1) {
      pushHistory({ modules, backgroundLayers, backgroundBlur });
    }
  }, []);

  const handleModuleUpdate = (moduleId: string, updates: Partial<ModuleData>) => {
    const nextModules = modules.map((module) => {
      if (module.id !== moduleId) {
        return module;
      }

      const updatedGridX = updates.gridX ?? module.gridX;
      const updatedGridY = updates.gridY ?? module.gridY;
      const updatedWidthUnits = updates.widthUnits ?? module.widthUnits;
      const updatedHeightUnits = updates.heightUnits ?? module.heightUnits;

      if (
        !isGridPositionAvailable(
          moduleId,
          updatedGridX,
          updatedGridY,
          updatedWidthUnits,
          updatedHeightUnits
        )
      ) {
        return module;
      }

      return { ...module, ...updates };
    });
    commitCanvasState(nextModules);
  };

  const handleBatchModuleUpdate = (moduleIds: string[], updates: Partial<ModuleData>) => {
    const nextModules = modules.map((module) => {
      if (!moduleIds.includes(module.id)) {
        return module;
      }
      return { ...module, ...updates };
    });
    commitCanvasState(nextModules);
  };

  // Functional updates — safe for concurrent / sequential calls (no stale closure)
  const setModuleIcon = useCallback((moduleId: string, customIcon: string) => {
    setModules(prev => prev.map(m => m.id === moduleId ? { ...m, customIcon } : m));
  }, []);

  const setModuleBackground = useCallback((moduleId: string, customImage: string) => {
    setModules(prev => prev.map(m => m.id === moduleId ? { ...m, customImage } : m));
  }, []);

  const setModuleOverlay = useCallback((moduleId: string, overlayImage: string) => {
    setModules(prev => prev.map(m => m.id === moduleId ? { ...m, overlayImage } : m));
  }, []);

  const handleApplyTheme = (perModuleUpdates: Array<{ id: string } & Partial<ModuleData>>) => {
    const nextModules = modules.map((m) => {
      const upd = perModuleUpdates.find((u) => u.id === m.id);
      if (!upd) return m;
      const { id: _id, ...rest } = upd;
      return { ...m, ...rest };
    });
    commitCanvasState(nextModules);
  };

  const handleAddModule = () => {
    const id = `module-${Date.now()}`;
    const position = findAvailableGridPosition(1, 1);
    if (!position) {
      return;
    }

    const newModule: ModuleData = {
      id,
      icon: null,
      iconName: '',
      position: { left: gridOriginLeft, top: gridOriginTop, width: gridCellWidth, height: gridCellHeight, borderRadius: 142 },
      gridX: position.gridX,
      gridY: position.gridY,
      widthUnits: 1,
      heightUnits: 1,
      backgroundColor: 'rgba(102, 126, 234, 0.85)',
      iconColor: '#FFFFFF',
    };
    const nextModules = [...modules, newModule];
    commitCanvasState(nextModules);
    setSelectedModuleId(id);
    setSelectedModuleIds([]);
  };

  const addModuleFromTemplate = (template: ModuleTemplate) => {
    const id = `module-${Date.now()}`;
    const position = findAvailableGridPosition(template.widthUnits, template.heightUnits);
    if (!position) {
      alert('画布已满，无法添加更多模块');
      return;
    }

    const newModule: ModuleData = {
      ...template,
      id,
      gridX: position.gridX,
      gridY: position.gridY,
      position: {
        left: gridOriginLeft,
        top: gridOriginTop,
        width: template.widthUnits * gridCellWidth + (template.widthUnits - 1) * gridGap,
        height: template.heightUnits * gridCellHeight + (template.heightUnits - 1) * gridGap,
        borderRadius: template.position.borderRadius,
      },
      iconBackgroundColor: template.iconBackgroundColor,
    };
    const nextModules = [...modules, newModule];
    commitCanvasState(nextModules);
    setSelectedModuleId(id);
    setSelectedModuleIds([]);
  };

  const handleDeleteModule = (moduleId: string) => {
    const nextModules = modules.filter((module) => module.id !== moduleId);
    commitCanvasState(nextModules);
    if (selectedModuleId === moduleId) {
      setSelectedModuleId(null);
    }
    setSelectedModuleIds((prev) => prev.filter((id) => id !== moduleId));
  };

  const addBackgroundLayer = (src: string, name: string) => {
    const id = `bg-${Date.now()}`;
    const nextBackgroundLayers = [...backgroundLayers, { id, src, name, cutout: false, opacity: 1, blendMode: 'normal', scale: 1, positionX: 0, positionY: 0, fit: 'contain' as const }];
    commitCanvasState(modules, nextBackgroundLayers);
  };

  const updateBackgroundLayer = (layerId: string, updates: Partial<BackgroundLayer>) => {
    const nextBackgroundLayers = backgroundLayers.map((layer) =>
      layer.id === layerId ? { ...layer, ...updates } : layer
    );
    commitCanvasState(modules, nextBackgroundLayers);
  };

  const removeBackgroundLayer = (layerId: string) => {
    const nextBackgroundLayers = backgroundLayers.filter((layer) => layer.id !== layerId);
    commitCanvasState(modules, nextBackgroundLayers);
  };

  const moveBackgroundLayer = (layerId: string, direction: 'up' | 'down') => {
    const index = backgroundLayers.findIndex((layer) => layer.id === layerId);
    if (index === -1) return;
    const nextIndex = direction === 'up' ? index - 1 : index + 1;
    if (nextIndex < 0 || nextIndex >= backgroundLayers.length) return;
    const copy = [...backgroundLayers];
    const temp = copy[index];
    copy[index] = copy[nextIndex];
    copy[nextIndex] = temp;
    commitCanvasState(modules, copy);
  };

  const clearBackgroundLayers = () => {
    commitCanvasState(modules, [], 0);
  };

  const selectedModule = modules.find((m) => m.id === selectedModuleId);
  const selectedModules = modules.filter((m) => selectedModuleIds.includes(m.id));
  const [uploadedImages, setUploadedImages] = useState<Array<{id: string; dataURL: string; name?: string}>>([]);
  // 控制是否显示网格辅助线（默认隐藏）
  const [showGrid, setShowGrid] = useState<boolean>(false);
  // UI states for drag & drop
  const [isCanvasDragActive, setIsCanvasDragActive] = useState<boolean>(false);
  const [hoveredModuleIdDuringDrag, setHoveredModuleIdDuringDrag] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [flashingModuleId, setFlashingModuleId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [previewHistory, setPreviewHistory] = useState<Array<{id: string; dataURL: string; createdAt: number}>>([]);
  const [historyOpen, setHistoryOpen] = useState<boolean>(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('previewHistory');
      if (raw) setPreviewHistory(JSON.parse(raw));
    } catch {}
  }, []);

  // 支持粘贴图片到模块：如果有选中模块则填充该模块，否则会尝试根据最后指针位置定位模块，找不到则加入上传图片区
  useEffect(() => {
    const onPaste = async (e: ClipboardEvent) => {
      try {
        const items = e.clipboardData?.items;
        if (!items) return;
        for (const it of Array.from(items)) {
          if (!it) continue;
          if (it.type && it.type.indexOf('image') !== -1) {
            const blob = it.getAsFile ? it.getAsFile() : null;
            if (!blob) continue;
            const dataURL = await blobToDataURL(blob);
            setIsAnalyzing(true);
            try {
              let aiResult = null;
              try {
                aiResult = await analyzeImageWithAI(dataURL);
              } catch (err) {
                console.warn('AI analyze failed', err);
              }

              // 选择目标模块：优先选中模块，其次尝试使用最后一次指针位置
              let targetId = selectedModuleId;
              if (!targetId && lastPointerRef.current && previewRef.current) {
                const id = getModuleIdAtPointer(lastPointerRef.current.x, lastPointerRef.current.y);
                if (id) targetId = id;
              }

              if (targetId) {
                const nextModules = modules.map((m) => {
                  if (m.id !== targetId) return m;
                  return {
                    ...m,
                    customIcon: dataURL,
                    backgroundColor: aiResult?.backgroundColor || m.backgroundColor,
                    iconColor: aiResult?.iconColor || m.iconColor,
                    label: aiResult?.label || m.label,
                  };
                });
                commitCanvasState(nextModules);
                setFlashingModuleId(targetId);
                setTimeout(() => setFlashingModuleId(null), 1200);
              } else {
                // 未定位到模块：加入上传区以供拖拽使用
                const id = `upload-${Date.now()}`;
                setUploadedImages((prev) => [{ id, dataURL, name: 'pasted-image' }, ...prev]);
              }
            } finally {
              setIsAnalyzing(false);
            }

            e.preventDefault();
            return;
          }
        }
      } catch (err) {
        console.warn('paste handler error', err);
      }
    };

    window.addEventListener('paste', onPaste as any);
    return () => window.removeEventListener('paste', onPaste as any);
  }, [modules, selectedModuleId, previewRef, uploadedImages]);

  const saveHistoryToStorage = (next: typeof previewHistory) => {
    try {
      localStorage.setItem('previewHistory', JSON.stringify(next));
    } catch {}
  };

  const capturePreview = async () => {
    if (!previewRef.current) return null;
    const node = previewRef.current as HTMLElement;
    try {
      const scale = 3;
      const targetWidth = Math.round(node.offsetWidth * scale);
      const targetHeight = Math.round(node.offsetHeight * scale);

      // create offscreen wrapper sized to target pixels
      const wrapper = document.createElement('div');
      wrapper.style.position = 'fixed';
      wrapper.style.left = '-99999px';
      wrapper.style.top = '-99999px';
      wrapper.style.width = `${targetWidth}px`;
      wrapper.style.height = `${targetHeight}px`;
      wrapper.style.overflow = 'hidden';
      wrapper.style.display = 'block';
      // force black fallback background to avoid checkerboard
      wrapper.style.background = window.getComputedStyle(node).backgroundColor || '#000';
      wrapper.style.borderRadius = '0px';

      const clone = node.cloneNode(true) as HTMLElement;
      try { clone.style.zoom = '1'; } catch (e) {}
      try { clone.style.transform = 'none'; } catch (e) {}
      clone.style.transform = `scale(${scale})`;
      clone.style.transformOrigin = 'top left';
      clone.style.width = `${node.offsetWidth}px`;
      clone.style.height = `${node.offsetHeight}px`;
      clone.style.borderRadius = '0px';
      clone.style.overflow = 'hidden';
      clone.style.display = 'block';
      clone.style.position = 'absolute';
      clone.style.left = '0';
      clone.style.top = '0';
      clone.style.margin = '0';

      wrapper.appendChild(clone);
      const wrapperId = `export-capture-${Date.now()}`;
      wrapper.id = wrapperId;
      document.body.appendChild(wrapper);

      // inject capture-clean styles
      try {
        const styleEl = document.createElement('style');
        styleEl.setAttribute('data-export-clean', '1');
        styleEl.innerHTML = `
          /* hide pseudo-elements and normalize filters */
          #${wrapperId} *::before, #${wrapperId} *::after { display: none !important; content: none !important; }
          #${wrapperId} * { mix-blend-mode: normal !important; -webkit-backdrop-filter: none !important; backdrop-filter: none !important; filter: none !important; animation-play-state: paused !important; }
          #${wrapperId} img { image-rendering: auto !important; }
          /* hide background grid/lines for clean export */
          #${wrapperId} [class*="grid"], #${wrapperId} [class*="line"], #${wrapperId} [class*="border"],
          #${wrapperId} [data-grid], #${wrapperId} [data-line], #${wrapperId} .grid, #${wrapperId} .line, #${wrapperId} .border { display: none !important; }
          /* hide any texture overlays that use pointer-events-none */
          #${wrapperId} .pointer-events-none { display: none !important; }
        `;
        wrapper.insertBefore(styleEl, wrapper.firstChild);
      } catch (err) {}

      // surgical on-clone adjustments: copy computed pixel border-radius and sizes from originals
      try {
        const modulesInClone = Array.from(wrapper.querySelectorAll<HTMLElement>('[data-module-id]')) as HTMLElement[];
        modulesInClone.forEach((clonedNode) => {
          try {
            const id = clonedNode.getAttribute('data-module-id');
            if (!id) return;
            const orig = document.querySelector<HTMLElement>(`[data-module-id="${id}"]`);
            if (!orig) return;
            const comp = window.getComputedStyle(orig as Element);
            const rad = comp.borderRadius || '0px';
            // write pixel-absolute radius to cloned node
            try { clonedNode.style.borderRadius = rad; } catch (e) {}
            // lock width/height in px to avoid percent/scale differences
            try { clonedNode.style.width = `${orig.offsetWidth}px`; } catch (e) {}
            try { clonedNode.style.height = `${orig.offsetHeight}px`; } catch (e) {}

            // remove backdrop-filter and webkit variant
            try { clonedNode.style.backdropFilter = 'none'; } catch (e) {}
            try { (clonedNode.style as any).webkitBackdropFilter = 'none'; } catch (e) {}

            // ensure background-size covers to match original rendering
            try { clonedNode.style.backgroundSize = 'cover'; } catch (e) {}
          } catch (err) {}
        });

        // set crossOrigin for images in clone and mark remote backgrounds
        const imgs = Array.from(wrapper.querySelectorAll<HTMLImageElement>('img'));
        imgs.forEach((img) => {
          try {
            img.crossOrigin = 'anonymous';
            const src = img.getAttribute('src') || '';
            if (src && !src.startsWith('data:')) {
              // reassign to trigger CORS-aware load if allowed by server
              img.src = src;
            }
          } catch (e) {}
        });
        // aggressively detect and hide grid artifacts while preserving modules
        try {
          const allEl = Array.from(wrapper.querySelectorAll<HTMLElement>('*')) as HTMLElement[];
          const isModuleOrAncestor = (el: HTMLElement) => {
            if (el.hasAttribute('data-module-id')) return true;
            let p: HTMLElement | null = el.parentElement;
            while (p) {
              if (p.hasAttribute('data-module-id')) return true;
              p = p.parentElement;
            }
            return false;
          };

          // also ensure pseudo-elements inside wrapper are cleared via inline stylesheet
          try {
            const pseudoClear = document.createElement('style');
            pseudoClear.setAttribute('data-export-pseudo-clear', '1');
            pseudoClear.innerHTML = `#${wrapperId} *::before, #${wrapperId} *::after { background-image: none !important; background: none !important; content: none !important; }`;
            wrapper.insertBefore(pseudoClear, wrapper.firstChild);
          } catch (e) {}

          allEl.forEach((el) => {
            try {
              // never touch actual modules or their ancestors
              if (isModuleOrAncestor(el)) return;

              const cs = window.getComputedStyle(el);
              const w = el.offsetWidth || parseFloat(cs.width || '0') || 0;
              const h = el.offsetHeight || parseFloat(cs.height || '0') || 0;
              const bg = cs.backgroundImage || '';

              // clear gradient/SVG/data-uri backgrounds used as grid textures
              if (bg && /repeating-linear-gradient|repeating-radial-gradient|linear-gradient|data:image\/svg\+xml|svg/i.test(bg)) {
                try { el.style.backgroundImage = 'none'; } catch (e) {}
              }

              // thin lines -> hide
              if ((w > 0 && w <= 2) || (h > 0 && h <= 2)) {
                if (el.parentNode) el.parentNode.removeChild(el);
                return;
              }

              // hide canvas overlays
              if (el.tagName.toLowerCase() === 'canvas') {
                try { el.style.display = 'none'; } catch (e) {}
                return;
              }

              // clear small repeating textures by background-size heuristic
              const bgSize = cs.backgroundSize || '';
              if (bg && bgSize && /px/.test(bgSize)) {
                const parts = bgSize.split(' ');
                const sx = parseFloat(parts[0]) || 0;
                const sy = parseFloat(parts[1]) || sx || 0;
                if ((sx > 0 && sx <= 8) || (sy > 0 && sy <= 8)) {
                  try { el.style.backgroundImage = 'none'; } catch (e) {}
                  try { el.style.background = window.getComputedStyle(node).backgroundColor || 'transparent'; } catch (e) {}
                  return;
                }
              }
            } catch (e) {}
          });
        } catch (e) {}

        // ensure top-level phone-canvas (if present) is square/rect without rounding
        try {
          const clonedRoot = wrapper.querySelector<HTMLElement>('[data-phone-canvas]') || wrapper.firstElementChild as HTMLElement | null;
          if (clonedRoot) {
            try { clonedRoot.style.borderRadius = '0px'; } catch (e) {}
            try { clonedRoot.style.overflow = 'hidden'; } catch (e) {}
            try { clonedRoot.style.background = window.getComputedStyle(node).backgroundColor || '#000'; } catch (e) {}
          }
        } catch (e) {}
      } catch (err) {}

      const param = {
        width: targetWidth,
        height: targetHeight,
        style: {
          width: `${targetWidth}px`,
          height: `${targetHeight}px`,
          transform: 'none',
          transformOrigin: 'top left',
          borderRadius: '0px',
          display: 'block',
          overflow: 'hidden'
        },
        quality: 1,
        copyDefaultStyles: true,
        cacheBust: true,
        useCORS: true,
      } as any;

      try {
        const dataUrl = await domtoimage.toPng(wrapper, param);
        const id = `preview-${Date.now()}`;
        const next = [{ id, dataURL: dataUrl, createdAt: Date.now() }, ...previewHistory].slice(0, 50);
        setPreviewHistory(next);
        saveHistoryToStorage(next);
        return dataUrl;
      } catch (err) {
        console.error('capture failed (domtoimage):', err);
        return null;
      } finally {
        try { if (wrapper.parentNode) wrapper.parentNode.removeChild(wrapper); } catch (e) {}
      }
    } catch (err) {
      console.error('capturePreview error', err);
      return null;
    }
  };



  const handleSavePreview = async () => {
    const dataURL = await capturePreview();
    if (!dataURL) return;
    // trigger download
    const a = document.createElement('a');
    a.href = dataURL;
    a.download = `preview-${new Date().toISOString()}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  // New image save handler per request: scale=4, onclone adjustments
  const handleSaveImage = async () => {
    if (!previewRef.current) return;
    try {
      const html2canvas = (await import('html2canvas')).default;
      const el = previewRef.current as HTMLElement;

      // onclone handler: adjust cloned DOM to replace backdrop-filter with solid background and inset shadow
      const onclone = (clonedDoc: Document) => {
        try {
          const clonedRoot = clonedDoc.querySelector('[data-phone-canvas]') as HTMLElement | null;
          if (clonedRoot) {
            clonedRoot.style.overflow = 'hidden';
            clonedRoot.style.display = 'block';
            try { clonedRoot.style.clipPath = 'none'; } catch (e) {}
          }

          const modulesInClone = Array.from(clonedDoc.querySelectorAll('[data-module-id]')) as HTMLElement[];
          modulesInClone.forEach((node) => {
            try {
              // check for backdrop-filter (inline or computed)
              const inlineBF = node.style.backdropFilter || (node.style as any).webkitBackdropFilter || (node.style as any)['-webkit-backdrop-filter'];
              const comp = clonedDoc.defaultView ? clonedDoc.defaultView.getComputedStyle(node) : null;
              const compBF = comp ? comp.backdropFilter || (comp as any)['-webkit-backdrop-filter'] : '';
              const hasBF = (v: string) => Boolean(v) && v !== 'none';
              if (hasBF(inlineBF) || hasBF(compBF)) {
                // remove backdrop filters
                try { node.style.backdropFilter = 'none'; } catch (e) {}
                try { (node.style as any).webkitBackdropFilter = 'none'; } catch (e) {}
                // only add fallback bg when there is no customImage background
                const hasBgImg = node.style.backgroundImage && node.style.backgroundImage !== 'none';
                if (!hasBgImg) {
                  try { node.style.backgroundColor = 'rgba(255, 255, 255, 0.85)'; } catch (e) {}
                  try { node.style.boxShadow = 'inset 0 0 10px rgba(255,255,255,0.5)'; } catch (e) {}
                }
              }
            } catch (err) {}
          });
          // additional cleaning: hide gradient/SVG/canvas grid artifacts outside modules
          try {
            // clear pseudo-element backgrounds inside clonedDoc
            try {
              const ps = clonedDoc.createElement('style');
              ps.setAttribute('data-export-pseudo-clear', '1');
              ps.innerHTML = `*::before, *::after { background-image: none !important; background: none !important; content: none !important; }`;
              clonedDoc.head && clonedDoc.head.appendChild(ps);
            } catch (e) {}

            const allEl = Array.from(clonedDoc.querySelectorAll<HTMLElement>('*')) as HTMLElement[];
            const isModuleOrAncestor = (el: HTMLElement) => {
              if (el.hasAttribute('data-module-id')) return true;
              let p: HTMLElement | null = el.parentElement;
              while (p) {
                if (p.hasAttribute('data-module-id')) return true;
                p = p.parentElement;
              }
              return false;
            };
            allEl.forEach((el) => {
              try {
                if (isModuleOrAncestor(el)) return;
                const cs = clonedDoc.defaultView ? clonedDoc.defaultView.getComputedStyle(el) : (el.style as CSSStyleDeclaration);
                const bg = cs ? (cs.backgroundImage || '') : '';
                const w = el.offsetWidth || 0;
                const h = el.offsetHeight || 0;
                // if background image looks like grid/pattern, clear it inline
                if (bg && /repeating-linear-gradient|repeating-radial-gradient|linear-gradient|data:image\/svg\+xml|svg/i.test(bg)) {
                  try { el.style.backgroundImage = 'none'; } catch (e) {}
                  try { el.style.background = clonedDoc.defaultView ? clonedDoc.defaultView.getComputedStyle(clonedDoc.body).backgroundColor || 'transparent' : 'transparent'; } catch (e) {}
                  return;
                }
                if ((w > 0 && w <= 2) || (h > 0 && h <= 2)) {
                  try { el.style.display = 'none'; } catch (e) {}
                  return;
                }
                if (el.tagName.toLowerCase() === 'canvas') {
                  try { el.style.display = 'none'; } catch (e) {}
                  return;
                }
              } catch (e) {}
            });
          } catch (e) {}
        } catch (err) {
          // ignore clone errors
        }
      };

      // perform capture with scale 4
      const canvas = await html2canvas(el as HTMLElement, {
        useCORS: true,
        allowTaint: false,
        logging: false,
        scale: 4,
        onclone,
        backgroundColor: window.getComputedStyle(el).backgroundColor || '#000'
      });

      // convert and save like existing logic (preserve history)
      let finalDataURL = canvas.toDataURL('image/png');
      const id = `preview-${Date.now()}`;
      const next = [{ id, dataURL: finalDataURL, createdAt: Date.now() }, ...previewHistory].slice(0, 50);
      setPreviewHistory(next);
      saveHistoryToStorage(next);

      // trigger download with same filename pattern
      const a = document.createElement('a');
      a.href = finalDataURL;
      a.download = `preview-${new Date().toISOString()}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      console.error('handleSaveImage failed', err);
    }
  };

  // 用户提供的 html2canvas 导出实现（已移至模块顶层导出）

  const exportFullPreview = async (elementId: string) => {
    const node = document.getElementById(elementId) as HTMLElement | null;
    if (!node) return;

    const scale = 3; // 高清倍数

    // 目标像素尺寸
    const targetWidth = Math.round(node.offsetWidth * scale);
    const targetHeight = Math.round(node.offsetHeight * scale);

    // 创建一个离屏容器，尺寸等于目标像素尺寸，确保导出填满整张图且无圆角
    const wrapper = document.createElement('div');
    wrapper.style.position = 'fixed';
    wrapper.style.left = '-99999px';
    wrapper.style.top = '-99999px';
    wrapper.style.width = `${targetWidth}px`;
    wrapper.style.height = `${targetHeight}px`;
    wrapper.style.overflow = 'hidden';
    wrapper.style.background = window.getComputedStyle(node).backgroundColor || 'transparent';
    wrapper.style.display = 'block';
    wrapper.style.borderRadius = '0px';

    // 克隆节点并应用 scale，放在左上角 (0,0)
    const clone = node.cloneNode(true) as HTMLElement;
    // remove any zoom from the original (preview uses zoom) so clone renders at logical size
    try { clone.style.zoom = '1'; } catch (err) {}
    // ensure no pre-existing transform interferes
    try { clone.style.transform = 'none'; } catch (err) {}
    // then apply scale to reach target pixel size
    clone.style.transform = `scale(${scale})`;
    clone.style.transformOrigin = 'top left';
    clone.style.width = `${node.offsetWidth}px`;
    clone.style.height = `${node.offsetHeight}px`;
    clone.style.borderRadius = '0px';
    clone.style.overflow = 'hidden';
    clone.style.display = 'block';
    clone.style.position = 'absolute';
    clone.style.left = '0';
    clone.style.top = '0';
    clone.style.margin = '0';

    wrapper.appendChild(clone);
    // 给 wrapper 一个可定位的 id，方便 CSS 选择器作用域化
    const wrapperId = `export-wrapper`;
    wrapper.id = wrapperId;
    document.body.appendChild(wrapper);

    // 注入导出专用的清理样式：隐藏伪元素、去掉背景纹理/图片、移除阴影和边框
    try {
      const styleEl = document.createElement('style');
      styleEl.setAttribute('data-export-clean', '1');
      styleEl.innerHTML = `
        #${wrapperId} * { background-image: none !important; background: transparent !important; background-color: transparent !important; box-shadow: none !important; border: none !important; outline: none !important; }
        #${wrapperId} *::before, #${wrapperId} *::after { display: none !important; background: none !important; box-shadow: none !important; border: none !important; content: none !important; }
        #${wrapperId} svg, #${wrapperId} svg * { stroke: none !important; filter: none !important; }
        #${wrapperId} [class*="grid"], #${wrapperId} [class*="line"], #${wrapperId} [class*="border"], #${wrapperId} [data-grid], #${wrapperId} [data-line] { display: none !important; }
        #${wrapperId} * { mix-blend-mode: normal !important; -webkit-backdrop-filter: none !important; backdrop-filter: none !important; animation-play-state: paused !important; }
        #${wrapperId} *::before, #${wrapperId} *::after { background-image: none !important; background: none !important; }
      `;
      wrapper.insertBefore(styleEl, wrapper.firstChild);
    } catch (err) {
      // 忽略样式注入失败
    }

    // 进一步用 JS 清理：移除非常细的线条元素、渐变/图片网格、SVG pattern 和 canvas 覆盖层
    try {
      const elems = Array.from(wrapper.querySelectorAll<HTMLElement>('*'));
      const isModuleOrAncestor = (el: HTMLElement) => {
        if (el.hasAttribute('data-module-id')) return true;
        let p: HTMLElement | null = el.parentElement;
        while (p) {
          if (p.hasAttribute('data-module-id')) return true;
          p = p.parentElement;
        }
        return false;
      };
      elems.forEach((el) => {
        try {
          if (isModuleOrAncestor(el)) return;
          const cs = window.getComputedStyle(el);
          const w = el.offsetWidth || parseFloat(cs.width || '0');
          const h = el.offsetHeight || parseFloat(cs.height || '0');
          const bg = cs.backgroundImage || '';

          // remove repeating/linear gradients and SVG/data-uri backgrounds used as grid textures
          if (bg && /repeating-linear-gradient|repeating-radial-gradient|linear-gradient|data:image\/svg\+xml|svg/i.test(bg)) {
            el.style.display = 'none';
            return;
          }

          // thin lines
          if ((w > 0 && w <= 2) || (h > 0 && h <= 2)) {
            el.style.display = 'none';
            return;
          }

          // hide canvas overlays
          if (el.tagName.toLowerCase() === 'canvas') {
            el.style.display = 'none';
            return;
          }

          // clear explicit grid-like class names
          const cls = (el.className || '').toString().toLowerCase();
          if (cls.includes('grid') || cls.includes('line') || cls.includes('border')) {
            el.style.display = 'none';
          }
        } catch (err) {}
      });
    } catch (err) {}

    const param = {
      width: targetWidth,
      height: targetHeight,
      style: {
        width: `${targetWidth}px`,
        height: `${targetHeight}px`,
        transform: 'none',
        transformOrigin: 'top left',
        borderRadius: '0px',
        display: 'block',
        overflow: 'hidden'
      },
      quality: 1,
      copyDefaultStyles: true,
      cacheBust: true,
    } as any;

    try {
      // ensure cloned root has no clipping or rounding
      try {
        const clonedRoot = wrapper.querySelector<HTMLElement>('[data-phone-canvas]') || wrapper.firstElementChild as HTMLElement | null;
        if (clonedRoot) {
          try { clonedRoot.style.borderRadius = '0px'; } catch (e) {}
          try { clonedRoot.style.clipPath = 'none'; } catch (e) {}
        }
      } catch (e) {}

      const dataUrl = await domtoimage.toPng(wrapper, param);
      const link = document.createElement('a');
      link.download = `ControlCenter_HD_${Date.now()}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('导出失败:', error);
      alert('导出高清图片失败，请检查网络或控制台错误');
    } finally {
      // 清理临时节点
      try { if (wrapper.parentNode) wrapper.parentNode.removeChild(wrapper); } catch (err) {}
    }
  };

  const openLatestPreview = () => {
    if (!previewHistory || previewHistory.length === 0) return;
    const url = previewHistory[0].dataURL;
    if (!url) return;
    window.open(url, '_blank');
  };

  const [debugSample, setDebugSample] = useState<string | null>(null);
  const checkLatestPreviewColor = async () => {
    try {
      const raw = localStorage.getItem('previewHistory');
      if (!raw) return setDebugSample('no-history');
      const arr = JSON.parse(raw);
      if (!arr || arr.length === 0) return setDebugSample('empty');
      const dataURL = arr[0].dataURL;
      if (!dataURL) return setDebugSample('no-data');
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = dataURL;
      await new Promise<void>((res, rej) => {
        img.onload = () => res();
        img.onerror = () => rej();
      });
      const c = document.createElement('canvas');
      c.width = img.width;
      c.height = img.height;
      const ctx = c.getContext('2d');
      if (!ctx) return setDebugSample('no-canvas');
      ctx.drawImage(img, 0, 0);
      const sx = Math.floor(img.width * 0.15);
      const sy = Math.floor(img.height * 0.15);
      const d = ctx.getImageData(sx, sy, 1, 1).data;
      setDebugSample(`rgba(${d[0]}, ${d[1]}, ${d[2]}, ${d[3]})`);
    } catch (err) {
      setDebugSample('err');
    }
  };

  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', background: 'linear-gradient(160deg, #07080F 0%, #0B0C18 40%, #0E0B1A 100%)', color: '#fff', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif" }}>
      {/* 左侧：模块库 */}
      <div style={{ width: '220px', background: 'rgba(8,9,18,0.97)', borderRight: '1px solid rgba(139,92,246,0.15)', display: 'flex', flexDirection: 'column', boxShadow: '2px 0 20px rgba(0,0,0,0.3)' }}>
        {/* Header */}
        <div style={{ padding: '10px 12px 8px', background: 'linear-gradient(135deg, rgba(79,110,247,0.25) 0%, rgba(139,92,246,0.2) 100%)', borderBottom: '1px solid rgba(139,92,246,0.2)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Sparkles size={16} color="#fff" />
              <span style={{ fontSize: 15, fontWeight: 800 }}>素材库</span>
            </div>
            <button onClick={() => navigate('/')}
              style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.7)', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, padding: '3px 8px', cursor: 'pointer' }}>
              ← 首页
            </button>
          </div>
        </div>

        {/* Tab bar */}
        <div style={{ display: 'flex', borderBottom: '1px solid rgba(139,92,246,0.12)', background: 'rgba(5,6,14,0.6)', flexShrink: 0 }}>
          {([['images', '🖼 图片'], ['templates', '📦 模板']] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setLeftTab(key)}
              style={{
                flex: 1,
                padding: '9px 0',
                border: 'none',
                background: leftTab === key ? 'rgba(139,92,246,0.15)' : 'transparent',
                color: leftTab === key ? '#C4B5FD' : 'rgba(255,255,255,0.4)',
                fontSize: 12,
                fontWeight: leftTab === key ? 700 : 500,
                cursor: 'pointer',
                borderBottom: leftTab === key ? '2px solid #8B5CF6' : '2px solid transparent',
                transition: 'all 0.15s ease',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Panel content */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          {leftTab === 'images' && (
            <ImageSearchPanel
              onUseImage={(dataUrl, name) => {
                const id = `img_${Date.now()}`;
                setUploadedImages((prev: any[]) => [...prev, { id, dataURL: dataUrl, name }]);
              }}
            />
          )}

          {leftTab === 'templates' && (
            <div style={{ flex: 1, overflow: 'auto', padding: '10px' }}>
              <div style={{ display: 'grid', gap: 8 }}>
                {moduleTemplates.map((template, index) => (
                  <button
                    draggable
                    key={`${template.iconName}-${index}`}
                    title={template.label || template.iconName}
                    onClick={() => addModuleFromTemplate(template)}
                    onDragStart={(e) => {
                      try {
                        e.dataTransfer?.setData('application/json', JSON.stringify(template));
                        e.dataTransfer!.effectAllowed = 'copy';
                      } catch {}
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      width: '100%',
                      border: '1px solid rgba(255,255,255,0.04)',
                      borderRadius: 10,
                      padding: '10px 12px',
                      background: 'rgba(255,255,255,0.02)',
                      color: '#fff',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      justifyContent: 'flex-start',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                    }}
                  >
                    <div
                      style={{
                        width: template.widthUnits === 2 ? 44 : 32,
                        height: template.heightUnits === 2 ? 44 : 32,
                        borderRadius: template.position.borderRadius / 4,
                        background: template.gradient || template.backgroundColor || '#4A90E2',
                        flexShrink: 0,
                      }}
                    />
                    <div style={{ textAlign: 'left', flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{template.label || template.iconName}</div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 1 }}>
                        {template.widthUnits}×{template.heightUnits} 格
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 底部独立上传模块（固定定位，不占用模块库空间） */}
      <div style={{ position: 'fixed', left: 20, bottom: 20, width: 220, background: 'linear-gradient(180deg, #141414, #0f0f0f)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 12, padding: 12, boxShadow: '0 10px 30px rgba(0,0,0,0.6)', zIndex: 9999 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            title={'上传图片（点击或拖拽到这里）'}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={async (e) => {
              e.preventDefault();
              const file = e.dataTransfer?.files?.[0];
              if (file) {
                await handleAddUploadedFile(file);
              }
            }}
            style={{
              width: 44,
              height: 44,
              borderRadius: 10,
              display: 'grid',
              placeItems: 'center',
              background: isAnalyzing ? 'linear-gradient(90deg,#8b5cf6,#7c3aed)' : 'linear-gradient(90deg,#7c3aed,#6d28d9)',
              boxShadow: '0 6px 18px rgba(124,58,237,0.3)',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            {isAnalyzing ? (
              <div style={{ width: 20, height: 20, border: '3px solid rgba(255,255,255,0.2)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            ) : (
              <Sparkles color="#fff" />
            )}
          </button>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 700 }}>上传图片</div>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>上传后可拖拽到模块图标上</div>
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={async (e) => {
            const f = e.target.files?.[0];
            if (f) await handleAddUploadedFile(f);
          }} />
        </div>

        {uploadedImages.length > 0 && (
          <div style={{ marginTop: 10 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {uploadedImages.map((img) => (
                <div
                  key={img.id}
                  draggable
                  onDragStart={(e) => {
                    try {
                      e.dataTransfer?.setData('text/uri-list', img.dataURL);
                      e.dataTransfer!.effectAllowed = 'copy';
                    } catch {}
                  }}
                  style={{ width: 64, height: 64, borderRadius: 8, overflow: 'hidden', cursor: 'grab', border: '1px solid rgba(255,255,255,0.06)' }}
                  title={img.name || '已上传图片'}
                >
                  <img src={img.dataURL} alt={img.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 中间：手机预览画板 */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'radial-gradient(ellipse at 50% 40%, #0D0E22 0%, #07080F 100%)' }}>

        {/* ── 顶部工具栏（精简）── */}
        <div style={{
          height: 48, borderBottom: '1px solid rgba(139,92,246,0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 16px', flexShrink: 0,
          background: 'rgba(5,6,14,0.9)', backdropFilter: 'blur(16px)',
          position: 'relative',
        }}>
          {/* 左：编辑工具 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {/* 撤销 */}
            <button onClick={handleUndo} disabled={historyIndex <= 0} title="撤销 Ctrl+Z"
              style={{
                width: 30, height: 30, borderRadius: 8,
                border: '1px solid rgba(255,255,255,0.07)',
                background: 'rgba(255,255,255,0.04)',
                color: historyIndex <= 0 ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.65)',
                cursor: historyIndex <= 0 ? 'not-allowed' : 'pointer',
                fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>↩</button>

            <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.07)', flexShrink: 0 }} />

            {/* 网格 toggle */}
            <button onClick={() => setShowGrid(s => !s)}
              style={{
                height: 30, padding: '0 10px', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer', flexShrink: 0,
                border: `1px solid ${showGrid ? 'rgba(139,92,246,0.5)' : 'rgba(255,255,255,0.07)'}`,
                background: showGrid ? 'rgba(139,92,246,0.14)' : 'rgba(255,255,255,0.03)',
                color: showGrid ? '#C4B5FD' : 'rgba(255,255,255,0.5)',
              }}>网格</button>

            {/* + 新增模块 */}
            <button onClick={handleAddModule}
              style={{
                height: 30, padding: '0 12px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', flexShrink: 0,
                border: '1px solid rgba(139,92,246,0.4)',
                background: 'rgba(139,92,246,0.12)', color: '#C4B5FD',
              }}>+ 新增</button>

            {/* 全选批量 */}
            <button
              onClick={() => { setSelectedModuleIds(modules.map(m => m.id)); setSelectedModuleId(null); setSelectedTab('batch'); }}
              style={{
                height: 30, padding: '0 10px', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer', flexShrink: 0,
                border: `1px solid ${selectedModuleIds.length > 0 ? 'rgba(168,85,247,0.5)' : 'rgba(168,85,247,0.2)'}`,
                background: selectedModuleIds.length > 0 ? 'rgba(168,85,247,0.18)' : 'rgba(168,85,247,0.05)',
                color: '#D8B4FE',
              }}>全选</button>
          </div>

          {/* 中：标题（绝对居中） */}
          <div style={{
            position: 'absolute', left: '50%', top: '50%',
            transform: 'translate(-50%,-50%)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', pointerEvents: 'none',
          }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.02em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              画布预览
            </span>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', marginTop: 1 }}>
              {modules.length} 模块 · {Math.round(zoom * 100)}%
            </span>
          </div>

          {/* 右：历史 */}
          <button onClick={() => setHistoryOpen(s => !s)}
            style={{
              height: 30, padding: '0 12px', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer',
              border: `1px solid ${historyOpen ? 'rgba(139,92,246,0.4)' : 'rgba(255,255,255,0.07)'}`,
              background: historyOpen ? 'rgba(139,92,246,0.1)' : 'rgba(255,255,255,0.03)',
              color: historyOpen ? '#C4B5FD' : 'rgba(255,255,255,0.45)',
            }}>历史</button>
        </div>

        {/* 画布区域 */}
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', position: 'relative' }}>

          {/* 背景网点装饰 */}
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            backgroundImage: 'radial-gradient(rgba(139,92,246,0.08) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
            maskImage: 'radial-gradient(ellipse 70% 70% at 50% 50%, black 30%, transparent 100%)',
          }} />
        <div
          id="phone-canvas"
          ref={previewRef}
          data-phone-canvas={"true"}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePreviewPointerUp}
          onDragEnter={handlePreviewDragEnter}
          onDragOver={handlePreviewDragOver}
          onDragLeave={handlePreviewDragLeave}
          onDrop={handlePreviewDrop}
          style={{
            width: '1080px',
            height: '1920px',
            position: 'relative',
            zoom,
            borderRadius: '120px',
            border: isCanvasDragActive ? '12px solid rgba(139,92,246,0.6)' : '12px solid rgba(20,21,40,1)',
            overflow: 'hidden',
            background: '#0a0a0a',
            boxShadow: isCanvasDragActive ? '0 0 0 3px rgba(139,92,246,0.5), 0 40px 80px rgba(139,92,246,0.2)' : '0 40px 100px rgba(0,0,0,0.8), 0 0 0 1px rgba(139,92,246,0.12), 0 0 60px rgba(79,110,247,0.08)',
          }}
        >
          <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
            {backgroundLayers.map((layer) => {
              const scale = (layer.scale || 1) * 1.04;
              const posX = layer.positionX || 0;
              const posY = layer.positionY || 0;
              const fit = layer.fit || 'contain';
              return (
                <div
                  key={layer.id}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    backgroundImage: `url(${layer.src})`,
                    backgroundSize: fit,
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat',
                    opacity: layer.opacity,
                    filter: `${layer.cutout ? 'contrast(150%) saturate(0%) brightness(200%)' : ''} blur(${backgroundBlur}px)`,
                    mixBlendMode: layer.blendMode as any,
                    transform: `scale(${scale}) translate(${posX}px, ${posY}px)`,
                  }}
                />
              );
            })}
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.25) 100%)', pointerEvents: 'none' }} />
          </div>

          {/* 网格线 */}
          {/* 网格线：可通过 showGrid 控制显示 */}
          {showGrid && (
            <div
              style={{
                position: 'absolute',
                left: gridOriginLeft,
                top: gridOriginTop,
                width: gridWidth,
                height: gridHeight,
                pointerEvents: 'none',
              }}
            >
              {/* 保存预览 & 历史按钮 已移至控制中心底部（避免 pointerEvents:none 覆盖） */}
              {Array.from({ length: gridColumns + 1 }).map((_, index) => (
                <div
                  key={`v-${index}`}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: index * (gridCellWidth + gridGap),
                    width: 1,
                    height: gridHeight,
                    background: 'rgba(102, 126, 234, 0.1)',
                  }}
                />
              ))}
              {Array.from({ length: gridRows + 1 }).map((_, index) => (
                <div
                  key={`h-${index}`}
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: index * (gridCellHeight + gridGap),
                    width: gridWidth,
                    height: 1,
                    background: 'rgba(102, 126, 234, 0.1)',
                  }}
                />
              ))}
            </div>
          )}

          {/* 网格显示切换按钮（画布右上角） */}
          <button
            onClick={() => setShowGrid((s) => !s)}
            title="切换网格显示"
            style={{
              position: 'absolute',
              right: 20,
              top: 20,
              zIndex: 2000,
              pointerEvents: 'auto',
              background: 'rgba(0,0,0,0.6)',
              color: '#fff',
              border: '1px solid rgba(255,255,255,0.06)',
              padding: '6px 10px',
              borderRadius: 8,
              fontSize: 12,
              cursor: 'pointer',
              backdropFilter: 'blur(6px)'
            }}
          >
            {showGrid ? '隐藏网格' : '显示网格'}
          </button>

          {/* 模块 */}
          {modules.map((m) => {
            const IconTag = m.icon;
            const modulePosition = getModulePositionFromGrid(m);
            const isSelected = selectedModuleId === m.id || selectedModuleIds.includes(m.id);
            const isDragging = draggingModuleId === m.id;
            const isHoveringForFile = hoveredModuleIdDuringDrag === m.id;
            const isFlashing = flashingModuleId === m.id;
            return (
              <div
                data-module-id={m.id}
                key={m.id}
                onPointerDown={(event) => handleModuleDragStart(event, m.id)}
                onClick={(event) => {
                  if (event.ctrlKey || event.metaKey) {
                    // 多选模式
                    if (selectedModuleIds.includes(m.id)) {
                      setSelectedModuleIds(selectedModuleIds.filter(id => id !== m.id));
                    } else {
                      setSelectedModuleIds([...selectedModuleIds, m.id]);
                    }
                    setSelectedModuleId(null);
                  } else {
                    // 单选模式
                    setSelectedModuleId(m.id);
                    setSelectedModuleIds([]);
                  }
                }}
                style={{
                  position: 'absolute',
                  left: modulePosition.left,
                  top: modulePosition.top,
                  width: modulePosition.width,
                  height: modulePosition.height,
                  borderRadius: m.position.borderRadius,
                  backgroundColor: m.gradient ? undefined : (m.backgroundColor || '#1c1c1e'),
                  backgroundImage: m.customImage ? undefined : (m.gradient || undefined),
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat',
                  border: isSelected ? '5px solid rgba(255, 105, 180, 0.8)' : m.borderColor ? `2px solid ${m.borderColor}` : 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  cursor: isDragging ? 'grabbing' : 'grab',
                  boxSizing: 'border-box',
                  overflow: 'hidden',
                  userSelect: 'none',
                  backdropFilter: m.customImage ? 'none' : 'blur(30px) saturate(180%)',
                  WebkitBackdropFilter: m.customImage ? 'none' : 'blur(30px) saturate(180%)',
                  transition: isDragging ? 'none' : 'all 0.18s ease',
                  transform: isDragging ? 'scale(1.05)' : isHoveringForFile ? 'scale(1.06)' : isSelected ? 'scale(1.02)' : 'scale(1)',
                  animation: (!isDragging && m.animationType === 'glow') ? 'glowPulse 2.5s ease-in-out infinite' : undefined,
                  boxShadow: isFlashing
                    ? '0 0 0 6px rgba(255,255,255,0.06), 0 24px 48px rgba(0,0,0,0.35)'
                    : isHoveringForFile
                      ? '0 18px 36px rgba(100, 200, 255, 0.12), 0 0 0 2px rgba(100,200,255,0.06)'
                      : isSelected
                        ? '0 20px 40px rgba(255, 105, 180, 0.3), 0 0 0 1px rgba(255, 105, 180, 0.2)'
                        : '0 8px 32px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.1)',
                  zIndex: isSelected ? 1000 : isDragging ? 999 : 1,
                }}
              >
                {/* 模块背景图（img 标签，避免 html2canvas CORS 限制）*/}
                {m.customImage ? (() => {
                  const ix = m.customImageX ?? 50;
                  const iy = m.customImageY ?? 50;
                  const sc = m.customImageScale ?? 1;
                  return (
                    <img
                      src={m.customImage}
                      alt=""
                      style={{
                        position: 'absolute', inset: 0,
                        width: '100%', height: '100%',
                        objectFit: 'cover',
                        objectPosition: `${ix}% ${iy}%`,
                        transform: sc !== 1 ? `scale(${sc})` : undefined,
                        transformOrigin: `${ix}% ${iy}%`,
                        animation: m.animationType === 'kenburns' ? 'kenBurns 8s ease-in-out infinite' : undefined,
                        zIndex: 0,
                        pointerEvents: 'none',
                        display: 'block',
                      }}
                    />
                  );
                })() : null}

                {/* 自定义图标图片背景 */}
                {m.customIcon ? (
                  <>
                    <img
                      src={m.customIcon}
                      alt={m.iconName}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        zIndex: 1,
                      }}
                    />
                    <div style={{
                      position: 'absolute',
                      inset: 0,
                      zIndex: 2,
                      pointerEvents: 'none',
                      background: 'radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.35) 100%)',
                      borderRadius: 'inherit',
                    }} />
                  </>
                ) : null}

                {/* 图上图 · 人物/IP 叠加层 */}
                {m.overlayImage ? (() => {
                  const ox = m.overlayX ?? 0;
                  const oy = m.overlayY ?? 0;
                  const sc = m.overlayScale ?? 1;
                  return (
                    <>
                      <img
                        src={m.overlayImage}
                        alt="overlay"
                        style={{
                          position: 'absolute',
                          bottom: 0,
                          left: '50%',
                          height: `${sc * 100}%`,
                          width: 'auto',
                          maxWidth: 'none',
                          objectFit: 'contain',
                          transformOrigin: 'bottom center',
                          transform: `translateX(calc(-50% + ${ox}%)) translateY(${oy}%)`,
                          animation: m.animationType === 'float' ? 'overlayFloat 3s ease-in-out infinite' : undefined,
                          zIndex: 4,
                          filter: 'drop-shadow(0 6px 18px rgba(0,0,0,0.75))',
                          pointerEvents: 'auto',
                          cursor: 'move',
                        }}
                        onPointerDown={(e) => {
                          e.stopPropagation();
                          e.currentTarget.setPointerCapture(e.pointerId);
                          const modEl = e.currentTarget.closest('[data-module-id]') as HTMLElement | null;
                          const mw = modEl?.offsetWidth ?? 100;
                          const mh = modEl?.offsetHeight ?? 100;
                          overlayDragRef.current = {
                            moduleId: m.id, startX: e.clientX, startY: e.clientY,
                            startOx: m.overlayX ?? 0, startOy: m.overlayY ?? 0,
                            moduleW: mw, moduleH: mh,
                          };
                        }}
                        onPointerMove={(e) => {
                          const d = overlayDragRef.current;
                          if (!d || d.moduleId !== m.id) return;
                          const dx = ((e.clientX - d.startX) / d.moduleW) * 100;
                          const dy = ((e.clientY - d.startY) / d.moduleH) * 100;
                          setModules(prev => prev.map(mod => mod.id === m.id
                            ? { ...mod, overlayX: Math.round(d.startOx + dx), overlayY: Math.round(d.startOy + dy) }
                            : mod
                          ));
                        }}
                        onPointerUp={() => { overlayDragRef.current = null; }}
                      />
                      <div style={{
                        position: 'absolute',
                        bottom: 0, left: 0, right: 0,
                        height: '30%',
                        background: 'linear-gradient(to top, rgba(0,0,0,0.4) 0%, transparent 100%)',
                        zIndex: 5,
                        pointerEvents: 'none',
                        borderRadius: 'inherit',
                      }} />
                    </>
                  );
                })() : null}

                {/* 百分比填充条 */}
                {m.percentage !== undefined && (
                  <div style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: `${m.percentage}%`,
                    background: m.percentageColor || 'rgba(255, 255, 255, 0.3)',
                    transition: 'height 0.2s ease',
                    zIndex: 2
                  }} />
                )}

                {/* 光泽效果（仅无背景图时显示）*/}
                {!m.customImage && (
                  <>
                    {/* 顶部高光 */}
                    <div style={{
                      position: 'absolute', top: 0, left: 0, right: 0,
                      height: '40%',
                      background: 'linear-gradient(180deg, rgba(255,255,255,0.12) 0%, transparent 100%)',
                      pointerEvents: 'none',
                      borderRadius: `${m.position.borderRadius}px ${m.position.borderRadius}px 0 0`,
                      zIndex: 5,
                    }} />
                    {/* 内边框 */}
                    <div style={{
                      position: 'absolute', inset: 0,
                      borderRadius: 'inherit',
                      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18), inset 0 -1px 0 rgba(0,0,0,0.15)',
                      pointerEvents: 'none',
                      zIndex: 6,
                    }} />
                  </>
                )}

                {/* 左上角大方块模块内四个图标 */}
                {m.id === 'top-left' && (
                  <div style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', zIndex: 8, pointerEvents: 'none' }}>
                    {[
                      { left: 49, top: 51, Icon: Plane },
                      { left: 205, top: 51, Icon: Wifi },
                      { left: 49, top: 203, Icon: Bluetooth },
                      { left: 205, top: 203, Icon: Radio },
                    ].map((item, index) => (
                      <div
                        key={index}
                        style={{
                          position: 'absolute',
                          left: `${item.left}px`,
                          top: `${item.top}px`,
                          width: '134px',
                          height: '134px',
                          borderRadius: '148px',
                          opacity: 1,
                          background: m.iconBackgroundColor || 'transparent',
                          boxSizing: 'border-box',
                          border: m.iconBackgroundColor ? `5px solid ${m.iconBackgroundColor}` : undefined,
                          display: 'grid',
                          placeItems: 'center',
                        }}
                      >
                        <item.Icon size={56} color={m.iconColor || '#ffffff'} />
                      </div>
                    ))}
                  </div>
                )}

                {/* 图标 */}
                
                {IconTag && m.id !== 'top-left' && (() => {
                  const iconAnim: Record<string, string> = {
                    spin:   'iconSpin 2s linear infinite',
                    pulse:  'iconPulse 1.4s ease-in-out infinite',
                    shake:  'iconShake 0.7s ease-in-out infinite',
                    bounce: 'iconBounce 1.2s ease-in-out infinite',
                    swing:  'iconSwing 1s ease-in-out infinite',
                  };
                  const anim = m.iconAnimationType && m.iconAnimationType !== 'none'
                    ? iconAnim[m.iconAnimationType] : undefined;
                  return (
                    <div
                      style={{
                        position: 'relative',
                        zIndex: 10,
                        width: m.iconBackgroundColor ? '104px' : 'auto',
                        height: m.iconBackgroundColor ? '104px' : 'auto',
                        borderRadius: m.iconBackgroundColor ? '52px' : undefined,
                        backgroundColor: m.iconBackgroundColor || 'transparent',
                        display: 'grid',
                        placeItems: 'center',
                        padding: m.iconBackgroundColor ? '10px' : undefined,
                        animation: anim,
                      }}
                    >
                      <IconTag
                        size={80}
                        color={m.iconColor}
                        strokeWidth={2.5}
                        style={{
                          filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))',
                          position: 'relative',
                        }}
                      />
                    </div>
                  );
                })()}

                {/* 标签 */}
                {m.label ? (
                  <span style={{
                    fontSize: '26px',
                    color: m.iconColor,
                    marginTop: '12px',
                    fontWeight: 600,
                    textShadow: '0 2px 8px rgba(0,0,0,0.3)',
                    letterSpacing: '-0.5px',
                    position: 'relative',
                    zIndex: 10
                  }}>
                    {m.label}
                  </span>
                ) : null}
              </div>
            );
          })}

          {/* 历史面板（右下弹窗） */}
          {historyOpen && (
            <div style={{ position: 'absolute', right: 14, top: 14, width: 340, maxHeight: 420, overflow: 'auto', background: 'rgba(15,15,15,0.98)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: 12, zIndex: 10000 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div style={{ fontWeight: 700 }}>预览历史</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>{previewHistory.length} 项</div>
              </div>
              <div style={{ display: 'grid', gap: 8 }}>
                {previewHistory.map((h) => (
                  <div key={h.id} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <img src={h.dataURL} style={{ width: 88, height: 160, objectFit: 'cover', borderRadius: 6, border: '1px solid rgba(255,255,255,0.04)' }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>保存于 {new Date(h.createdAt).toLocaleString()}</div>
                      <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                        <button onClick={() => {
                          const w = window.open(h.dataURL, '_blank');
                          if (w) w.focus();
                        }} style={{ padding: '6px 8px', borderRadius: 6, background: 'rgba(255,255,255,0.04)', color: '#fff', border: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer' }}>查看</button>
                        <button onClick={() => {
                          // download
                          const a = document.createElement('a');
                          a.href = h.dataURL;
                          a.download = `${h.id}.png`;
                          document.body.appendChild(a);
                          a.click();
                          a.remove();
                        }} style={{ padding: '6px 8px', borderRadius: 6, background: 'linear-gradient(90deg,#7c3aed,#06b6d4)', color: '#fff', border: 'none', cursor: 'pointer' }}>下载</button>
                        <button onClick={() => {
                          const next = previewHistory.filter(p => p.id !== h.id);
                          setPreviewHistory(next);
                          saveHistoryToStorage(next);
                        }} style={{ padding: '6px 8px', borderRadius: 6, background: 'rgba(255,255,255,0.02)', color: '#fff', border: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer' }}>删除</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        </div>
      </div>

      {/* 右侧：编辑面板 */}
      <div style={{ width: '340px', background: 'rgba(8,9,18,0.97)', color: '#fff', display: 'flex', flexDirection: 'column', boxShadow: '-1px 0 0 rgba(139,92,246,0.15)' }}>
        <div style={{ padding: '16px 20px 14px', borderBottom: '1px solid rgba(139,92,246,0.15)', background: 'linear-gradient(135deg, rgba(79,110,247,0.2) 0%, rgba(139,92,246,0.15) 100%)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 6, height: 6, borderRadius: '50%',
              background: selectedTab === 'module' ? '#8B5CF6' : selectedTab === 'batch' ? '#EC4899' : '#4F6EF7',
              boxShadow: `0 0 8px ${selectedTab === 'module' ? '#8B5CF6' : selectedTab === 'batch' ? '#EC4899' : '#4F6EF7'}`,
            }} />
            <span style={{ fontSize: '14px', fontWeight: 800, letterSpacing: '-0.2px', color: '#fff', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {selectedTab === 'module' ? '模块编辑' : selectedTab === 'batch' ? '批量操作' : '画布设置'}
            </span>
          </div>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.38)', marginTop: 4 }}>
            {selectedTab === 'module' ? '点击画布中的模块开始编辑' : selectedTab === 'batch' ? '批量配色 · AI填充 · 动画' : '全局背景 · AI文生图'}
          </div>
        </div>

        {/* 选项卡 */}
        <div style={{ display: 'flex', borderBottom: '1px solid rgba(139,92,246,0.12)', background: 'rgba(5,6,14,0.6)' }}>
          {([
            ['module',  '模块'],
            ['batch',   '批量'],
            ['canvas',  '画布'],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setSelectedTab(key)}
              style={{
                flex: 1,
                padding: '11px 0',
                background: selectedTab === key ? 'rgba(139,92,246,0.15)' : 'transparent',
                color: selectedTab === key ? '#C4B5FD' : 'rgba(255,255,255,0.4)',
                border: 'none',
                cursor: 'pointer',
                fontWeight: selectedTab === key ? 700 : 500,
                fontSize: '12px',
                borderBottom: selectedTab === key ? '2px solid #8B5CF6' : '2px solid transparent',
                transition: 'all 0.15s ease',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* 选项卡内容 */}
        <div style={{ flex: 1, overflow: 'auto' }}>

          {/* 🔲 模块 — 单模块精细编辑 */}
          {selectedTab === 'module' && (
            <ModuleTab key="module"
              selectedModule={selectedModule}
              selectedModules={selectedModules}
              allModules={modules}
              onModuleUpdate={handleModuleUpdate}
              onBatchModuleUpdate={handleBatchModuleUpdate}
              onSetModuleIcon={setModuleIcon}
              onSetModuleBackground={setModuleBackground}
              onSetModuleOverlay={setModuleOverlay}
              onDeselect={() => { setSelectedModuleId(null); setSelectedModuleIds([]); }}
              onDeleteModule={handleDeleteModule}
            />
          )}

          {/* ⚡ 批量 — 批量配色/动画/AI填充/上传 */}
          {selectedTab === 'batch' && (
            <BatchPanel
              modules={modules}
              selectedModuleIds={selectedModuleIds}
              onSelectAll={() => { setSelectedModuleIds(modules.map(m => m.id)); setSelectedModuleId(null); }}
              onDeselectAll={() => { setSelectedModuleIds([]); setSelectedModuleId(null); }}
              onBatchModuleUpdate={handleBatchModuleUpdate}
              onSetModuleIcon={setModuleIcon}
              onSetModuleOverlay={setModuleOverlay}
              onSetModuleBackground={setModuleBackground}
              onApplyTheme={handleApplyTheme}
            />
          )}

          {/* 🎨 画布 — 全局背景 + AI文生图 */}
          {selectedTab === 'canvas' && (
            <div>
              <BackgroundTab key="bg"
                backgroundLayers={backgroundLayers}
                backgroundBlur={backgroundBlur}
                onAddBackground={addBackgroundLayer}
                onRemoveLayer={removeBackgroundLayer}
                onUpdateLayer={updateBackgroundLayer}
                onMoveLayer={moveBackgroundLayer}
                onClearLayers={clearBackgroundLayers}
                onBlurChange={(value) => commitCanvasState(modules, backgroundLayers, value)}
              />
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 4 }}>
                <div style={{ padding: '10px 16px 6px', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)' }}>✨ AI 文生图（用作背景）</div>
                <AIImageGenerator
                  onUseAsBackground={(dataUrl) => { addBackgroundLayer(dataUrl, 'AI生成背景'); }}
                  onUseAsModuleImage={(dataUrl, name) => {
                    const id = `img_${Date.now()}`;
                    setUploadedImages((prev: any[]) => [...prev, { id, dataURL: dataUrl, name }]);
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* 底部操作按钮 */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(139,92,246,0.15)', marginTop: 'auto', display: 'flex', gap: 8, alignItems: 'center', background: 'rgba(5,6,14,0.6)' }}>
          {/* 主导出按钮 */}
          <button
            onClick={() => setShowExportDialog(true)}
            style={{
              flex: 1,
              padding: '11px 14px',
              borderRadius: 12,
              background: 'linear-gradient(135deg, #4F6EF7 0%, #8B5CF6 100%)',
              color: '#fff',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: 13,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 7,
              boxShadow: '0 4px 16px rgba(79,110,247,0.45)',
              fontFamily: "'Inter', sans-serif",
            }}
          >
            <Download size={14} />
            高清导出
          </button>

          {/* 视频导出 */}
          <button
            onClick={() => setShowVideoExport(true)}
            title="导出动态视频"
            style={{ padding: '11px 12px', borderRadius: 12, background: 'linear-gradient(135deg, rgba(236,72,153,0.8), rgba(139,92,246,0.8))', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13, flexShrink: 0, boxShadow: '0 4px 12px rgba(139,92,246,0.3)' }}
          >
            🎬
          </button>

          {/* 快速保存 */}
          <button
            onClick={() => exportViaCanvas('phone-canvas')}
            style={{ padding: '11px 14px', borderRadius: 12, background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)', color: '#34D399', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}
          >
            快速保存
          </button>

          {/* 视频导出 */}
          <button
            onClick={() => setShowVideoExport(true)}
            title="导出动态视频"
            style={{ height: 42, padding: '0 14px', borderRadius: 12, background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer', fontWeight: 600, fontSize: 12 }}
          >🎬 视频</button>
          {debugSample && <div style={{ color: '#fff', fontSize: 11 }}>{debugSample}</div>}
        </div>
      </div>

      {/* 导出对话框 */}
      {showExportDialog && (
        <ExportDialog
          elementId="phone-canvas"
          onClose={() => setShowExportDialog(false)}
        />
      )}

      {/* 欢迎引导弹窗 */}
      {showWelcome && (
        <WelcomeModal
          onClose={() => {
            setShowWelcome(false);
            try { localStorage.setItem('cc_welcomed', '1'); } catch {}
          }}
        />
      )}

      {/* 视频导出弹窗 */}
      {showVideoExport && (
        <VideoExportModal
          elementId="phone-canvas"
          onClose={() => setShowVideoExport(false)}
        />
      )}
    </div>
  );
}

// 导出：将组件内的导出函数移到文件顶层，供外部调用
export const exportViaCanvas = async (elementId: string) => {
  const node = document.getElementById(elementId) as HTMLElement | null;
  if (!node) return;

  const scale = 4; // 暴力提升 4 倍清晰度

  // 动态引入 html2canvas
  const html2canvas = (await import('html2canvas')).default;

  try {
    const canvas = await html2canvas(node, {
      scale: scale,
      useCORS: true,
      backgroundColor: null, // 保持透明度
      logging: false,
      onclone: (clonedDoc: Document) => {
        try {
          const clonedNode = clonedDoc.getElementById(elementId) as HTMLElement | null;
          if (clonedNode) {
            // 移除所有 Grid 布局干扰，强制设为 block
            clonedNode.style.display = 'block';
            // 强制去掉圆角和外框，确保导出没有圆角或边框
            try { clonedNode.style.borderRadius = '0px'; } catch (e) {}
            try { clonedNode.style.border = 'none'; } catch (e) {}

            // 给所有 img 强制背景透明并去掉滤镜
            const images = Array.from(clonedNode.querySelectorAll('img')) as HTMLImageElement[];
            images.forEach((img) => {
              try {
                img.style.background = 'transparent';
                img.style.setProperty('filter', 'none', 'important');
              } catch (e) {}
            });

            // 确保 control 模块的圆角正确继承且不被溢出切割
            const modules = Array.from(clonedNode.querySelectorAll('.control-module')) as HTMLElement[];
            modules.forEach((m) => {
              try {
                const el = m as HTMLElement;
                el.style.overflow = 'hidden';
                const comp = clonedDoc.defaultView ? clonedDoc.defaultView.getComputedStyle(m) : null;
                if (comp) el.style.borderRadius = comp.borderRadius || '';
              } catch (e) {}
            });
          }
        } catch (err) {}
      }
    });

    const dataUrl = canvas.toDataURL('image/png', 1.0);
    const link = document.createElement('a');
    link.download = `Perfect-CC-${Date.now()}.png`;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    link.remove();
  } catch (err) {
    console.error('导出彻底失败:', err);
  }
};
