import { Trash2, Upload, Image as ImageIcon, Wand2, Layers } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { ModuleData } from '../types';
import { IconSelector } from './IconSelector';
import { removeBackground } from '../utils/removeBg';
import { analyzeImageWithAI } from '../utils/aiAnalyze';
import { generateImage, fetchAsDataUrl } from '../utils/jimengService';

interface ModuleTabProps {
  selectedModule: ModuleData | undefined;
  selectedModules?: ModuleData[];
  allModules?: ModuleData[];
  onModuleUpdate: (moduleId: string, updates: Partial<ModuleData>) => void;
  onBatchModuleUpdate?: (moduleIds: string[], updates: Partial<ModuleData>) => void;
  onSetModuleIcon?: (id: string, customIcon: string) => void;
  onSetModuleBackground?: (id: string, customImage: string) => void;
  onSetModuleOverlay?: (id: string, overlayImage: string) => void;
  onDeselect: () => void;
  onDeleteModule: (moduleId: string) => void;
  onBatchGenerate?: (prompt: string) => void;
  batchPrompt?: string;
  setBatchPrompt?: (prompt: string) => void;
  isBatchGenerating?: boolean;
}

async function extractColorsFromCanvas(dataUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 50; canvas.height = 50;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('canvas unavailable')); return; }
      ctx.drawImage(img, 0, 0, 50, 50);
      const d = ctx.getImageData(0, 0, 50, 50).data;
      let r = 0, g = 0, b = 0, cnt = 0;
      for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; cnt++; }
      r = Math.round(r / cnt); g = Math.round(g / cnt); b = Math.round(b / cnt);
      const bright = (r + g + b) / 3 > 128;
      const tone = r > g && r > b ? '暖红' : g > r && g > b ? '自然绿' : b > r && b > g ? '冷蓝' : '中性灰';
      resolve(`${tone}色调，${bright ? '明亮清新' : '深暗沉稳'}风格，iOS控制中心图标`);
    };
    img.onerror = () => reject(new Error('图片加载失败'));
    img.src = dataUrl;
  });
}

const extractColorsFromGradient = (gradient: string | undefined): { start: string; end: string } => {
  if (!gradient) return { start: '#667eea', end: '#764ba2' };
  const colorMatches = gradient.match(/#[0-9a-fA-F]{6}/g);
  if (colorMatches && colorMatches.length >= 2) {
    return { start: colorMatches[0], end: colorMatches[1] };
  }
  return { start: '#667eea', end: '#764ba2' };
};

export function ModuleTab({
  selectedModule,
  selectedModules = [],
  allModules = [],
  onModuleUpdate,
  onBatchModuleUpdate,
  onSetModuleIcon,
  onSetModuleBackground,
  onSetModuleOverlay,
  onDeselect,
  onDeleteModule,
  onBatchGenerate,
  batchPrompt,
  setBatchPrompt,
  isBatchGenerating,
}: ModuleTabProps) {
  const [gradientColors, setGradientColors] = useState<{ start: string; end: string }>({
    start: '#667eea',
    end: '#764ba2'
  });

  useEffect(() => {
    if (selectedModule?.gradient) {
      setGradientColors(extractColorsFromGradient(selectedModule.gradient));
    }
  }, [selectedModule?.id]);

  // 多选模式
  const isBatchMode = selectedModules.length > 0;

  const [isRemovingBg, setIsRemovingBg] = useState(false);

  // 图上图 · 人物/IP 叠加层
  const [isRemovingOverlayBg, setIsRemovingOverlayBg] = useState(false);
  const overlayFileRef = useRef<HTMLInputElement | null>(null);

  // 文生图相关状态
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [textPrompt, setTextPrompt] = useState('');
  const [textGenStatus, setTextGenStatus] = useState('');

  // AI智能填充 - 即梦快速生成（单模块）
  const [jimengPrompt, setJimengPrompt] = useState('');
  const [isJimengGenerating, setIsJimengGenerating] = useState(false);
  const [jimengStatus, setJimengStatus] = useState('');

  // 即梦风格批量填充（全画布）
  const [styleRefImage, setStyleRefImage] = useState<string | null>(null);
  const [detectedStyle, setDetectedStyle] = useState('');
  const [isAnalyzingStyle, setIsAnalyzingStyle] = useState(false);
  const [isBatchFilling, setIsBatchFilling] = useState(false);
  const [batchFillProgress, setBatchFillProgress] = useState({ done: 0, total: 0, status: '' });
  const styleFileRef = useRef<HTMLInputElement | null>(null);

  // 文生图 — 即梦 AI
  const handleTextToImage = async () => {
    if (!selectedModule || !textPrompt.trim()) return;
    setIsGeneratingImage(true);
    setTextGenStatus('');
    try {
      const result = await generateImage(
        { prompt: textPrompt.trim(), ratio: '1:1', style: 'general' },
        (msg) => setTextGenStatus(msg)
      );
      const dataUrl = await fetchAsDataUrl(result.imageUrls[0]).catch(() => result.imageUrls[0]);
      onModuleUpdate(selectedModule.id, { customIcon: dataUrl });
      setTextPrompt('');
      setTextGenStatus('✅ 已填充到模块');
      setTimeout(() => setTextGenStatus(''), 2500);
    } catch (err: any) {
      setTextGenStatus(`❌ ${err.message || '生成失败'}`);
    } finally {
      setIsGeneratingImage(false);
    }
  };

  // 即梦·风格批量填充 ─────────────────────────────────
  const handleStyleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target?.result as string;
      setStyleRefImage(dataUrl);
      setDetectedStyle('');
      setIsAnalyzingStyle(true);
      try {
        const analysis = await analyzeImageWithAI(dataUrl);
        setDetectedStyle(analysis.description);
      } catch {
        try {
          const style = await extractColorsFromCanvas(dataUrl);
          setDetectedStyle(style);
        } catch (fallbackErr: any) {
          setDetectedStyle('');
          alert(`风格分析失败：${fallbackErr.message}`);
        }
      } finally {
        setIsAnalyzingStyle(false);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleBatchStyleFill = async (fillAll = false) => {
    if (!detectedStyle || isBatchFilling || !onSetModuleBackground) return;
    const targets = fillAll
      ? [...allModules].sort((a, b) => a.gridY !== b.gridY ? a.gridY - b.gridY : a.gridX - b.gridX)
      : selectedModule ? [selectedModule] : [];
    if (targets.length === 0) return;
    setIsBatchFilling(true);
    setBatchFillProgress({ done: 0, total: targets.length, status: '准备中…' });
    for (let i = 0; i < targets.length; i++) {
      const mod = targets[i];
      setBatchFillProgress({ done: i, total: targets.length, status: `(${i + 1}/${targets.length}) 生成中…` });
      try {
        const prompt = `${detectedStyle}，纯抽象背景，无图标无文字`;
        const result = await generateImage({ prompt, ratio: '1:1', style: 'general' }, (msg) =>
          setBatchFillProgress(p => ({ ...p, status: `(${i + 1}/${targets.length}) ${msg}` }))
        );
        const dataUrl = await fetchAsDataUrl(result.imageUrls[0]).catch(() => result.imageUrls[0]);
        onSetModuleBackground(mod.id, dataUrl);
      } catch { /* 单个失败不中断 */ }
    }
    setBatchFillProgress({ done: targets.length, total: targets.length, status: '✅ 完成' });
    setIsBatchFilling(false);
  };

  // AI智能填充 — 即梦快速生成（单模块）
  const handleJimengFill = async () => {
    if (!selectedModule || !jimengPrompt.trim() || !onSetModuleBackground) return;
    setIsJimengGenerating(true);
    setJimengStatus('');
    try {
      const prompt = `${jimengPrompt.trim()}，纯抽象背景，无图标无文字`;
      const result = await generateImage(
        { prompt, ratio: '1:1', style: 'general' },
        (msg) => setJimengStatus(msg)
      );
      const dataUrl = await fetchAsDataUrl(result.imageUrls[0]).catch(() => result.imageUrls[0]);
      onSetModuleBackground(selectedModule.id, dataUrl);
      setJimengPrompt('');
      setJimengStatus('✅ 已填充到模块');
      setTimeout(() => setJimengStatus(''), 2500);
    } catch (err: any) {
      setJimengStatus(`❌ ${err.message || '生成失败'}`);
    } finally {
      setIsJimengGenerating(false);
    }
  };

  const handleOverlayUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedModule || !onSetModuleOverlay) return;
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (ev.target?.result) onSetModuleOverlay(selectedModule.id, ev.target.result as string);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleOverlayRemoveBg = async () => {
    if (!selectedModule?.overlayImage || !onSetModuleOverlay) return;
    setIsRemovingOverlayBg(true);
    try {
      const res = await fetch(selectedModule.overlayImage);
      const blob = await res.blob();
      const resultBlob = await removeBackground(blob);
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) onSetModuleOverlay(selectedModule.id, ev.target.result as string);
        setIsRemovingOverlayBg(false);
      };
      reader.readAsDataURL(resultBlob);
    } catch (err) {
      alert(`抠图失败: ${err instanceof Error ? err.message : '未知错误'}`);
      setIsRemovingOverlayBg(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedModule) return;
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          onModuleUpdate(selectedModule.id, { customImage: event.target.result as string });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleIconUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedModule) return;
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          onModuleUpdate(selectedModule.id, { customIcon: event.target.result as string });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveBackgroundFromImage = async () => {
    if (!selectedModule?.customImage) return;
    setIsRemovingBg(true);
    try {
      const response = await fetch(selectedModule.customImage);
      const blob = await response.blob();
      const resultBlob = await removeBackground(blob);
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          onModuleUpdate(selectedModule.id, { customImage: event.target.result as string });
        }
        setIsRemovingBg(false);
      };
      reader.readAsDataURL(resultBlob);
    } catch (error) {
      console.error('Failed to remove background:', error);
      alert(`抠图失败: ${error instanceof Error ? error.message : '未知错误'}`);
      setIsRemovingBg(false);
    }
  };

  // 批量编辑模式
  if (isBatchMode && onBatchModuleUpdate) {
    const moduleIds = selectedModules.map(m => m.id);
    return (
      <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* 批量编辑头部 */}
        <div
          style={{
            padding: '16px',
            background: '#1a1a1a',
            borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '16px', fontWeight: 600, color: '#fff', marginBottom: '4px' }}>
                批量编辑 ({selectedModules.length} 个模块)
              </div>
              <div style={{ fontSize: '12px', color: '#8f8f8f' }}>
                按住 Ctrl/Cmd 点击模块进行多选
              </div>
            </div>
            <button
              onClick={onDeselect}
              style={{
                padding: '8px 16px',
                background: '#4a90e2',
                border: 'none',
                borderRadius: '8px',
                color: '#fff',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 600,
              }}
            >
              完成
            </button>
          </div>
        </div>

        {/* 批量修改背景颜色 */}
        <div>
          <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#fff' }}>
            批量修改背景颜色
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <input
              type="color"
              onChange={(e) =>
                onBatchModuleUpdate(moduleIds, {
                  backgroundColor: e.target.value,
                  gradient: undefined,
                })
              }
              style={{
                width: '50px',
                height: '50px',
                border: '2px solid rgba(255,255,255,0.1)',
                borderRadius: '10px',
                cursor: 'pointer',
              }}
            />
            <input
              type="text"
              onChange={(e) =>
                onBatchModuleUpdate(moduleIds, {
                  backgroundColor: e.target.value,
                  gradient: undefined,
                })
              }
              placeholder="#FFD93D"
              style={{
                flex: 1,
                padding: '10px 14px',
                background: '#1a1a1a',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '10px',
                color: '#fff',
                fontSize: '14px',
                outline: 'none',
              }}
            />
          </div>
        </div>

        {/* 批量修改图标颜色 */}
        <div>
          <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#fff' }}>
            批量修改图标颜色
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <input
              type="color"
              onChange={(e) => onBatchModuleUpdate(moduleIds, { iconColor: e.target.value })}
              style={{
                width: '50px',
                height: '50px',
                border: '2px solid rgba(255,255,255,0.1)',
                borderRadius: '10px',
                cursor: 'pointer',
              }}
            />
            <input
              type="text"
              onChange={(e) => onBatchModuleUpdate(moduleIds, { iconColor: e.target.value })}
              placeholder="#FFFFFF"
              style={{
                flex: 1,
                padding: '10px 14px',
                background: '#1a1a1a',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '10px',
                color: '#fff',
                fontSize: '14px',
                outline: 'none',
              }}
            />
          </div>
        </div>

        {/* 批量应用渐变预设 */}
        <div>
          <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#fff' }}>
            批量应用渐变
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {[
              { name: '紫蓝', value: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
              { name: '黄米', value: 'linear-gradient(to bottom, #FFD93D 0%, #F5F5DC 100%)' },
              { name: '粉红', value: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' },
              { name: '蓝青', value: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' },
            ].map((preset) => (
              <button
                key={preset.name}
                onClick={() =>
                  onBatchModuleUpdate(moduleIds, {
                    gradient: preset.value,
                    backgroundColor: undefined,
                  })
                }
                style={{
                  height: '50px',
                  borderRadius: '10px',
                  border: '2px solid rgba(255,255,255,0.1)',
                  background: preset.value,
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#fff',
                  textShadow: '0 1px 3px rgba(0,0,0,0.5)',
                }}
              >
                {preset.name}
              </button>
            ))}
          </div>
        </div>

        {/* 批量生成图标 */}
        <div>
          <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Wand2 size={16} color="#667eea" />
            文生图 - 智能生成图标
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <input
              type="text"
              value={batchPrompt || ''}
              onChange={(e) => setBatchPrompt?.(e.target.value)}
              placeholder="输入图标描述"
              style={{
                width: '100%',
                padding: '10px 14px',
                background: '#1a1a1a',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '10px',
                color: '#fff',
                fontSize: '14px',
                outline: 'none',
              }}
            />
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => onBatchGenerate?.(batchPrompt || '')}
                disabled={isBatchGenerating}
                style={{
                  padding: '8px 16px',
                  background: isBatchGenerating ? '#555' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#fff',
                  cursor: isBatchGenerating ? 'not-allowed' : 'pointer',
                  fontSize: '13px',
                  fontWeight: 600,
                  opacity: isBatchGenerating ? 0.6 : 1,
                }}
              >
                {isBatchGenerating ? '生成中...' : '生成图标'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!selectedModule) {
    return (
      <div
        style={{
          padding: '60px 24px',
          textAlign: 'center',
          color: '#8f8f8f',
        }}
      >
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎨</div>
        <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px', color: '#fff' }}>
          未选择模块
        </div>
        <div style={{ fontSize: '13px' }}>点击画布中的任意模块开始编辑</div>
        <div style={{ fontSize: '13px', marginTop: '8px', color: '#667eea' }}>
          按住 Ctrl/Cmd 点击可多选模块
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* 即梦·风格批量填充 */}
      <div style={{ padding: '12px', background: 'rgba(102,126,234,0.06)', borderRadius: 10, border: '1px solid rgba(102,126,234,0.12)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <Layers size={13} color="#a855f7" />
            <span style={{ fontSize: 12, fontWeight: 700, color: '#c4b5fd' }}>即梦·风格识别 → 填充当前模块背景</span>
          </div>

          {/* 上传参考图 */}
          <input ref={styleFileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleStyleImageUpload} />
          <button
            onClick={() => styleFileRef.current?.click()}
            disabled={isAnalyzingStyle || isBatchFilling}
            style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1.5px dashed rgba(168,85,247,0.35)', background: 'rgba(168,85,247,0.06)', color: '#c4b5fd', cursor: 'pointer', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
          >
            {styleRefImage ? (
              <img src={styleRefImage} alt="参考图" style={{ width: 28, height: 28, objectFit: 'cover', borderRadius: 5, flexShrink: 0 }} />
            ) : <Upload size={13} />}
            {isAnalyzingStyle ? 'AI 分析风格中…' : styleRefImage ? '重新选择参考图' : '上传参考图（AI 识别风格）'}
          </button>

          {/* 检测到的风格 */}
          {detectedStyle ? (
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginBottom: 4 }}>识别到的风格描述（可修改）</div>
              <textarea
                value={detectedStyle}
                onChange={e => setDetectedStyle(e.target.value)}
                rows={2}
                disabled={isBatchFilling}
                style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(168,85,247,0.25)', borderRadius: 7, color: '#e9d5ff', fontSize: 11, padding: '7px 9px', resize: 'none', outline: 'none', fontFamily: 'inherit', lineHeight: 1.55, boxSizing: 'border-box' }}
              />
            </div>
          ) : null}

          {/* 进度条 */}
          {isBatchFilling ? (
            <div style={{ marginTop: 8 }}>
              <div style={{ height: 3, background: 'rgba(168,85,247,0.15)', borderRadius: 3, overflow: 'hidden', marginBottom: 5 }}>
                <div style={{ height: '100%', width: `${batchFillProgress.total ? Math.round(batchFillProgress.done / batchFillProgress.total * 100) : 0}%`, background: 'linear-gradient(90deg,#667eea,#a855f7)', borderRadius: 3, transition: 'width 0.4s' }} />
              </div>
              <div style={{ fontSize: 10, color: '#a78bfa' }}>{batchFillProgress.status}</div>
            </div>
          ) : null}

          {/* 开始按钮组 */}
          {detectedStyle && !isBatchFilling ? (
            <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
              <button
                onClick={() => handleBatchStyleFill(false)}
                disabled={!onSetModuleBackground || !selectedModule}
                style={{ flex: 1, padding: '10px', borderRadius: 8, background: 'linear-gradient(135deg,#667eea,#a855f7)', border: 'none', color: '#fff', cursor: !selectedModule ? 'not-allowed' : 'pointer', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, opacity: !selectedModule ? 0.5 : 1 }}
              >
                <Layers size={12} />
                填充选中模块
              </button>
              <button
                onClick={() => handleBatchStyleFill(true)}
                disabled={!onSetModuleBackground || allModules.length === 0}
                style={{ flex: 1, padding: '10px', borderRadius: 8, background: 'linear-gradient(135deg,#e85d04,#a855f7)', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}
              >
                <Layers size={12} />
                填充全部 {allModules.length} 个
              </button>
            </div>
          ) : null}

          {batchFillProgress.status === '✅ 完成' && !isBatchFilling ? (
            <div style={{ marginTop: 6, fontSize: 11, color: '#34d399', textAlign: 'center' }}>✅ 背景已填充完成</div>
          ) : null}
        </div>

      {/* 即梦快速生成（单模块） */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', whiteSpace: 'nowrap' }}>单独生成当前模块背景</span>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <input
            value={jimengPrompt}
            onChange={(e) => setJimengPrompt(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleJimengFill(); }}
            placeholder="描述内容，即梦AI生成背景…"
            disabled={isJimengGenerating}
            style={{ flex: 1, padding: '8px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: '#fff', fontSize: 12, outline: 'none' }}
          />
          <button
            onClick={handleJimengFill}
            disabled={isJimengGenerating || !jimengPrompt.trim() || !onSetModuleBackground}
            style={{ padding: '8px 12px', borderRadius: 8, background: isJimengGenerating ? 'rgba(168,85,247,0.2)' : 'linear-gradient(135deg,#667eea,#a855f7)', border: 'none', color: '#fff', cursor: isJimengGenerating || !jimengPrompt.trim() ? 'not-allowed' : 'pointer', fontSize: 12, fontWeight: 700, flexShrink: 0 }}
          >
            {isJimengGenerating ? '…' : '生成'}
          </button>
        </div>
        {jimengStatus ? (
          <div style={{ marginTop: 6, fontSize: 11, color: jimengStatus.startsWith('✅') ? '#34d399' : jimengStatus.startsWith('❌') ? '#f87171' : '#a5b4fc', padding: '5px 8px', borderRadius: 6, background: 'rgba(255,255,255,0.04)' }}>
            {jimengStatus}
          </div>
        ) : null}
      </div>

      {/* 文生图 — 即梦 AI */}
      <div>
        <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '10px', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Wand2 size={16} color="#a855f7" />
          文生图 · 即梦 AI 生成图标
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <input
            type="text"
            value={textPrompt}
            onChange={(e) => setTextPrompt(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleTextToImage(); }}
            placeholder="描述图标内容，如：金色月亮图标"
            disabled={isGeneratingImage}
            style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#fff', fontSize: '13px', outline: 'none' }}
          />
          <button
            onClick={handleTextToImage}
            disabled={isGeneratingImage || !textPrompt.trim()}
            style={{ padding: '10px', background: isGeneratingImage || !textPrompt.trim() ? 'rgba(168,85,247,0.2)' : 'linear-gradient(135deg,#667eea,#a855f7)', border: 'none', borderRadius: '10px', color: '#fff', cursor: isGeneratingImage || !textPrompt.trim() ? 'not-allowed' : 'pointer', fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
          >
            {isGeneratingImage ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 13, height: 13, border: '2px solid rgba(255,255,255,0.25)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />
                {textGenStatus || '生成中…'}
              </span>
            ) : (
              <span>✨ 生成图标</span>
            )}
          </button>
          {textGenStatus && !isGeneratingImage ? (
            <div style={{ fontSize: 11, color: textGenStatus.startsWith('✅') ? '#34d399' : '#f87171', padding: '4px 8px', borderRadius: 6, background: 'rgba(255,255,255,0.04)' }}>
              {textGenStatus}
            </div>
          ) : null}
        </div>
      </div>

      {/* 模块信息头部 */}
      <div
        style={{
          padding: '16px',
          background: '#1a1a1a',
          borderRadius: '12px',
          border: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 600, color: '#fff', marginBottom: '4px' }}>
              {selectedModule.label || selectedModule.iconName}
            </div>
            <div style={{ fontSize: '12px', color: '#8f8f8f' }}>
              位置: ({selectedModule.gridX}, {selectedModule.gridY}) · 大小: {selectedModule.widthUnits}x
              {selectedModule.heightUnits}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => {
                if (confirm('确定删除此模块吗？')) {
                  onDeleteModule(selectedModule.id);
                }
              }}
              style={{
                padding: '8px',
                background: '#dc3545',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
              }}
            >
              <Trash2 size={18} color="#fff" />
            </button>
            <button
              onClick={onDeselect}
              style={{
                padding: '8px 16px',
                background: '#4a90e2',
                border: 'none',
                borderRadius: '8px',
                color: '#fff',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 600,
              }}
            >
              完成
            </button>
          </div>
        </div>
      </div>

      {/* 标签文字 */}
      <div>
        <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#fff' }}>
          标签文字
        </div>
        <input
          type="text"
          value={selectedModule.label || ''}
          onChange={(e) => onModuleUpdate(selectedModule.id, { label: e.target.value })}
          placeholder="输入标签文字（可选）"
          style={{
            width: '100%',
            padding: '10px 14px',
            background: '#1a1a1a',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '10px',
            color: '#fff',
            fontSize: '14px',
            outline: 'none',
          }}
        />
      </div>

      {/* 动画效果 */}
      <div style={{ padding: '12px', background: 'rgba(102,126,234,0.05)', borderRadius: 10, border: '1px solid rgba(102,126,234,0.12)' }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#a5b4fc', marginBottom: 10 }}>✨ 动态效果</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          {([
            ['none',     '⬜ 无动画'],
            ['glow',     '🌟 呼吸光晕'],
            ['float',    '🎈 人物漂浮'],
            ['kenburns', '🎬 Ken Burns'],
          ] as const).map(([val, label]) => (
            <button
              key={val}
              onClick={() => onModuleUpdate(selectedModule.id, { animationType: val })}
              style={{
                padding: '8px 6px', borderRadius: 8, fontSize: 11, fontWeight: 600,
                border: (selectedModule.animationType ?? 'none') === val
                  ? '1.5px solid rgba(102,126,234,0.7)'
                  : '1px solid rgba(255,255,255,0.08)',
                background: (selectedModule.animationType ?? 'none') === val
                  ? 'rgba(102,126,234,0.18)' : 'rgba(255,255,255,0.03)',
                color: (selectedModule.animationType ?? 'none') === val ? '#a5b4fc' : 'rgba(255,255,255,0.45)',
                cursor: 'pointer',
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', marginTop: 8 }}>
          呼吸光晕→边框发光 · 人物漂浮→叠加层上下飘 · Ken Burns→背景缓慢放大
        </div>
      </div>

      {/* 图标动画 */}
      <div style={{ padding: '12px', background: 'rgba(245,158,11,0.05)', borderRadius: 10, border: '1px solid rgba(245,158,11,0.12)' }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#fcd34d', marginBottom: 10 }}>🎯 图标动画</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
          {([
            ['none',   '⬜ 无'],
            ['spin',   '🔄 旋转'],
            ['pulse',  '💗 脉冲'],
            ['shake',  '📳 抖动'],
            ['bounce', '🏀 弹跳'],
            ['swing',  '🔔 摆动'],
          ] as const).map(([val, label]) => (
            <button
              key={val}
              onClick={() => onModuleUpdate(selectedModule.id, { iconAnimationType: val })}
              style={{
                padding: '7px 4px', borderRadius: 8, fontSize: 11, fontWeight: 600,
                border: (selectedModule.iconAnimationType ?? 'none') === val
                  ? '1.5px solid rgba(245,158,11,0.7)'
                  : '1px solid rgba(255,255,255,0.08)',
                background: (selectedModule.iconAnimationType ?? 'none') === val
                  ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.03)',
                color: (selectedModule.iconAnimationType ?? 'none') === val ? '#fcd34d' : 'rgba(255,255,255,0.45)',
                cursor: 'pointer',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* 图上图 · 人物/IP 叠加层 */}
      <div style={{ padding: '12px', background: 'rgba(168,85,247,0.06)', borderRadius: 10, border: '1px solid rgba(168,85,247,0.15)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
          <span style={{ fontSize: 16 }}>🎭</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#e9d5ff' }}>图上图 · 人物 / IP 叠加</span>
        </div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 10, lineHeight: 1.5 }}>
          上传人物/IP图片叠加在背景之上；建议先点「AI抠图」去除白底，效果更自然
        </div>

        {/* 上传按钮 */}
        <input ref={overlayFileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleOverlayUpload} />
        <button
          onClick={() => overlayFileRef.current?.click()}
          disabled={!onSetModuleOverlay}
          style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1.5px dashed rgba(168,85,247,0.4)', background: 'rgba(168,85,247,0.08)', color: '#c4b5fd', cursor: 'pointer', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
        >
          <Upload size={13} />
          {selectedModule.overlayImage ? '重新上传人物图片' : '上传人物 / IP 图片'}
        </button>

        {/* 预览 + 操作 */}
        {selectedModule.overlayImage ? (
          <div style={{ marginTop: 10 }}>
            <img
              src={selectedModule.overlayImage}
              alt="overlay preview"
              style={{ width: '100%', maxHeight: 120, objectFit: 'contain', borderRadius: 8, background: 'rgba(255,255,255,0.04)', display: 'block' }}
            />

            {/* 操作按钮 */}
            <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
              <button
                onClick={handleOverlayRemoveBg}
                disabled={isRemovingOverlayBg}
                style={{ flex: 1, padding: '8px', background: isRemovingOverlayBg ? '#333' : 'linear-gradient(135deg,#667eea,#a855f7)', border: 'none', borderRadius: 8, color: '#fff', cursor: isRemovingOverlayBg ? 'not-allowed' : 'pointer', fontSize: 12, fontWeight: 600, opacity: isRemovingOverlayBg ? 0.6 : 1 }}
              >
                {isRemovingOverlayBg ? '抠图中…' : '✂️ AI 抠图去背景'}
              </button>
              <button
                onClick={() => onModuleUpdate(selectedModule.id, { overlayImage: undefined, overlayX: 0, overlayY: 0, overlayScale: 1 })}
                style={{ padding: '8px 12px', background: '#dc3545', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer', fontSize: 12 }}
              >
                移除
              </button>
            </div>

            {/* 位置 & 大小调整 */}
            <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {/* 水平位置 */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>← 水平位置 →</span>
                  <span style={{ fontSize: 11, color: '#c4b5fd' }}>{selectedModule.overlayX ?? 0}%</span>
                </div>
                <input
                  type="range" min={-80} max={80} step={1}
                  value={selectedModule.overlayX ?? 0}
                  onChange={(e) => onModuleUpdate(selectedModule.id, { overlayX: Number(e.target.value) })}
                  style={{ width: '100%', accentColor: '#a855f7' }}
                />
              </div>

              {/* 垂直位置 */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>↕ 垂直位置</span>
                  <span style={{ fontSize: 11, color: '#c4b5fd' }}>{selectedModule.overlayY ?? 0}%</span>
                </div>
                <input
                  type="range" min={-80} max={80} step={1}
                  value={selectedModule.overlayY ?? 0}
                  onChange={(e) => onModuleUpdate(selectedModule.id, { overlayY: Number(e.target.value) })}
                  style={{ width: '100%', accentColor: '#a855f7' }}
                />
              </div>

              {/* 大小 */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>⊞ 大小</span>
                  <span style={{ fontSize: 11, color: '#c4b5fd' }}>{((selectedModule.overlayScale ?? 1) * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range" min={30} max={200} step={1}
                  value={(selectedModule.overlayScale ?? 1) * 100}
                  onChange={(e) => onModuleUpdate(selectedModule.id, { overlayScale: Number(e.target.value) / 100 })}
                  style={{ width: '100%', accentColor: '#a855f7' }}
                />
              </div>

              {/* 重置 */}
              <button
                onClick={() => onModuleUpdate(selectedModule.id, { overlayX: 0, overlayY: 0, overlayScale: 1 })}
                style={{ padding: '6px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 7, color: 'rgba(255,255,255,0.45)', fontSize: 11, cursor: 'pointer' }}
              >
                重置位置与大小
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {/* 图标选择 */}
      <div>
        <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#fff' }}>
          选择图标
        </div>
        <IconSelector
          currentIcon={selectedModule.iconName}
          onSelect={(iconName, IconComponent, customIconUrl) => {
            onModuleUpdate(selectedModule.id, {
              iconName,
              icon: IconComponent,
              customIcon: customIconUrl,
            });
          }}
        />
      </div>

      {/* 上传自定义图标 */}
      <div>
        <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#fff' }}>
          自定义图标
        </div>
        <input
          type="file"
          accept="image/*"
          onChange={handleIconUpload}
          style={{ display: 'none' }}
          id="icon-upload"
        />
        <label
          htmlFor="icon-upload"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '12px',
            border: '1px dashed rgba(255,255,255,0.2)',
            borderRadius: '10px',
            cursor: 'pointer',
            background: '#1a1a1a',
            gap: '8px',
          }}
        >
          <ImageIcon size={18} color="#8f8f8f" />
          <span style={{ fontSize: '13px', color: '#8f8f8f' }}>上传图标图片</span>
        </label>
        {selectedModule.customIcon && (
          <div style={{ marginTop: '8px', textAlign: 'center' }}>
            <img
              src={selectedModule.customIcon}
              alt="Custom icon"
              style={{ width: '60px', height: '60px', objectFit: 'contain', borderRadius: '8px' }}
            />
            <button
              onClick={() => onModuleUpdate(selectedModule.id, { customIcon: undefined })}
              style={{
                marginTop: '6px',
                padding: '4px 12px',
                background: '#dc3545',
                border: 'none',
                borderRadius: '6px',
                color: '#fff',
                cursor: 'pointer',
                fontSize: '11px',
              }}
            >
              移除
            </button>
          </div>
        )}
      </div>

      {/* 背景颜色 */}
      <div>
        <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#fff' }}>
          背景颜色
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <input
            type="color"
            value={selectedModule.backgroundColor || '#000000'}
            onChange={(e) =>
              onModuleUpdate(selectedModule.id, {
                backgroundColor: e.target.value,
                gradient: undefined,
              })
            }
            style={{
              width: '50px',
              height: '50px',
              border: '2px solid rgba(255,255,255,0.1)',
              borderRadius: '10px',
              cursor: 'pointer',
            }}
          />
          <input
            type="text"
            value={selectedModule.backgroundColor || ''}
            onChange={(e) =>
              onModuleUpdate(selectedModule.id, {
                backgroundColor: e.target.value,
                gradient: undefined,
              })
            }
            placeholder="#FFD93D"
            style={{
              flex: 1,
              padding: '10px 14px',
              background: '#1a1a1a',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '10px',
              color: '#fff',
              fontSize: '14px',
              outline: 'none',
            }}
          />
        </div>
      </div>

      {/* 图标颜色 */}
      <div>
        <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#fff' }}>
          图标颜色
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <input
            type="color"
            value={selectedModule.iconColor || '#FFFFFF'}
            onChange={(e) => onModuleUpdate(selectedModule.id, { iconColor: e.target.value })}
            style={{
              width: '50px',
              height: '50px',
              border: '2px solid rgba(255,255,255,0.1)',
              borderRadius: '10px',
              cursor: 'pointer',
            }}
          />
          <input
            type="text"
            value={selectedModule.iconColor || ''}
            onChange={(e) => onModuleUpdate(selectedModule.id, { iconColor: e.target.value })}
            placeholder="#FFFFFF"
            style={{
              flex: 1,
              padding: '10px 14px',
              background: '#1a1a1a',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '10px',
              color: '#fff',
              fontSize: '14px',
              outline: 'none',
            }}
          />
        </div>
      </div>

      <div>
        <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#fff' }}>
          图标背景颜色
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <input
            type="color"
            value={selectedModule.iconBackgroundColor || '#000000'}
            onChange={(e) => onModuleUpdate(selectedModule.id, { iconBackgroundColor: e.target.value })}
            style={{
              width: '50px',
              height: '50px',
              border: '2px solid rgba(255,255,255,0.1)',
              borderRadius: '10px',
              cursor: 'pointer',
            }}
          />
          <input
            type="text"
            value={selectedModule.iconBackgroundColor || ''}
            onChange={(e) => onModuleUpdate(selectedModule.id, { iconBackgroundColor: e.target.value })}
            placeholder="#000000"
            style={{
              flex: 1,
              padding: '10px 14px',
              background: '#1a1a1a',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '10px',
              color: '#fff',
              fontSize: '14px',
              outline: 'none',
            }}
          />
        </div>
      </div>

      {/* 渐变效果 */}
      <div>
        <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#fff' }}>
          自定义渐变
        </div>
        <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '12px', color: '#8f8f8f', marginBottom: '6px' }}>起始颜色</div>
            <input
              type="color"
              value={gradientColors.start}
              onChange={(e) => {
                const newStart = e.target.value;
                setGradientColors({ ...gradientColors, start: newStart });
                onModuleUpdate(selectedModule.id, {
                  gradient: `linear-gradient(135deg, ${newStart} 0%, ${gradientColors.end} 100%)`,
                  backgroundColor: undefined,
                });
              }}
              style={{
                width: '100%',
                height: '50px',
                border: '2px solid rgba(255,255,255,0.1)',
                borderRadius: '10px',
                cursor: 'pointer',
              }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '12px', color: '#8f8f8f', marginBottom: '6px' }}>结束颜色</div>
            <input
              type="color"
              value={gradientColors.end}
              onChange={(e) => {
                const newEnd = e.target.value;
                setGradientColors({ ...gradientColors, end: newEnd });
                onModuleUpdate(selectedModule.id, {
                  gradient: `linear-gradient(135deg, ${gradientColors.start} 0%, ${newEnd} 100%)`,
                  backgroundColor: undefined,
                });
              }}
              style={{
                width: '100%',
                height: '50px',
                border: '2px solid rgba(255,255,255,0.1)',
                borderRadius: '10px',
                cursor: 'pointer',
              }}
            />
          </div>
        </div>
        <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#fff' }}>
          渐变预设
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          {[
            { name: '紫蓝', value: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
            { name: '黄米', value: 'linear-gradient(to bottom, #FFD93D 0%, #F5F5DC 100%)' },
            { name: '粉红', value: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' },
            { name: '蓝青', value: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' },
          ].map((preset) => (
            <button
              key={preset.name}
              onClick={() => {
                const colors = extractColorsFromGradient(preset.value);
                setGradientColors(colors);
                onModuleUpdate(selectedModule.id, {
                  gradient: preset.value,
                  backgroundColor: undefined,
                });
              }}
              style={{
                height: '50px',
                borderRadius: '10px',
                border: '2px solid rgba(255,255,255,0.1)',
                background: preset.value,
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 600,
                color: '#fff',
                textShadow: '0 1px 3px rgba(0,0,0,0.5)',
              }}
            >
              {preset.name}
            </button>
          ))}
        </div>
        {selectedModule.gradient && (
          <button
            onClick={() =>
              onModuleUpdate(selectedModule.id, {
                gradient: undefined,
              })
            }
            style={{
              marginTop: '8px',
              width: '100%',
              padding: '8px',
              background: '#dc3545',
              border: 'none',
              borderRadius: '8px',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '12px',
            }}
          >
            清除渐变
          </button>
        )}
      </div>

      {/* 上传背景图片 */}
      <div>
        <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#fff' }}>
          模块背景图
        </div>
        <input
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          style={{ display: 'none' }}
          id="module-image-upload"
        />
        <label
          htmlFor="module-image-upload"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            border: '1px dashed rgba(255,255,255,0.2)',
            borderRadius: '10px',
            cursor: 'pointer',
            background: '#1a1a1a',
          }}
        >
          <Upload size={24} color="#8f8f8f" />
          <div style={{ marginTop: '8px', fontSize: '12px', color: '#8f8f8f' }}>
            上传背景图片
          </div>
        </label>
        {selectedModule.customImage && (
          <div style={{ marginTop: '12px' }}>
            {/* 预览 */}
            <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', height: 110, background: '#111' }}>
              <img
                src={selectedModule.customImage}
                alt="Module background"
                style={{
                  width: '100%', height: '100%',
                  objectFit: 'cover',
                  objectPosition: `${selectedModule.customImageX ?? 50}% ${selectedModule.customImageY ?? 50}%`,
                  transform: (selectedModule.customImageScale ?? 1) !== 1 ? `scale(${selectedModule.customImageScale})` : undefined,
                  transformOrigin: `${selectedModule.customImageX ?? 50}% ${selectedModule.customImageY ?? 50}%`,
                  display: 'block',
                }}
              />
            </div>

            {/* 位置 & 缩放滑块 */}
            <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {/* X */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>← 水平位置 →</span>
                  <span style={{ fontSize: 11, color: '#a5b4fc' }}>{selectedModule.customImageX ?? 50}%</span>
                </div>
                <input type="range" min={0} max={100} step={1}
                  value={selectedModule.customImageX ?? 50}
                  onChange={(e) => onModuleUpdate(selectedModule.id, { customImageX: Number(e.target.value) })}
                  style={{ width: '100%', accentColor: '#667eea' }}
                />
              </div>
              {/* Y */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>↕ 垂直位置</span>
                  <span style={{ fontSize: 11, color: '#a5b4fc' }}>{selectedModule.customImageY ?? 50}%</span>
                </div>
                <input type="range" min={0} max={100} step={1}
                  value={selectedModule.customImageY ?? 50}
                  onChange={(e) => onModuleUpdate(selectedModule.id, { customImageY: Number(e.target.value) })}
                  style={{ width: '100%', accentColor: '#667eea' }}
                />
              </div>
              {/* Scale */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>⊞ 缩放</span>
                  <span style={{ fontSize: 11, color: '#a5b4fc' }}>{((selectedModule.customImageScale ?? 1) * 100).toFixed(0)}%</span>
                </div>
                <input type="range" min={100} max={300} step={1}
                  value={(selectedModule.customImageScale ?? 1) * 100}
                  onChange={(e) => onModuleUpdate(selectedModule.id, { customImageScale: Number(e.target.value) / 100 })}
                  style={{ width: '100%', accentColor: '#667eea' }}
                />
              </div>
              {/* Reset */}
              <button
                onClick={() => onModuleUpdate(selectedModule.id, { customImageX: 50, customImageY: 50, customImageScale: 1 })}
                style={{ padding: '5px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 7, color: 'rgba(255,255,255,0.4)', fontSize: 11, cursor: 'pointer' }}
              >
                重置位置与缩放
              </button>
            </div>

            {/* AI 抠图 + 移除 */}
            <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
              <button
                onClick={handleRemoveBackgroundFromImage}
                disabled={isRemovingBg}
                style={{ flex: 1, padding: '8px', background: isRemovingBg ? '#555' : 'linear-gradient(135deg,#667eea,#764ba2)', border: 'none', borderRadius: '8px', color: '#fff', cursor: isRemovingBg ? 'not-allowed' : 'pointer', fontSize: '12px', fontWeight: 600, opacity: isRemovingBg ? 0.6 : 1 }}
              >
                {isRemovingBg ? '处理中...' : '✂️ AI 抠图'}
              </button>
              <button
                onClick={() => onModuleUpdate(selectedModule.id, { customImage: undefined, customImageX: undefined, customImageY: undefined, customImageScale: undefined })}
                style={{ flex: 1, padding: '8px', background: '#dc3545', border: 'none', borderRadius: '8px', color: '#fff', cursor: 'pointer', fontSize: '12px' }}
              >
                移除背景图
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 圆角大小 */}
      <div>
        <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#fff' }}>
          圆角大小: {selectedModule.position.borderRadius}px
        </div>
        <input
          type="range"
          min="0"
          max="200"
          value={selectedModule.position.borderRadius}
          onChange={(e) =>
            onModuleUpdate(selectedModule.id, {
              position: {
                ...selectedModule.position,
                borderRadius: Number(e.target.value),
              },
            })
          }
          style={{
            width: '100%',
            height: '6px',
            borderRadius: '3px',
            background: '#333',
            outline: 'none',
            cursor: 'pointer',
          }}
        />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginTop: '8px' }}>
          {[
            { name: '直角', value: 0 },
            { name: '小圆角', value: 62 },
            { name: '圆形', value: 142 },
          ].map((preset) => (
            <button
              key={preset.name}
              onClick={() =>
                onModuleUpdate(selectedModule.id, {
                  position: {
                    ...selectedModule.position,
                    borderRadius: preset.value,
                  },
                })
              }
              style={{
                padding: '8px',
                background: selectedModule.position.borderRadius === preset.value ? '#4a90e2' : '#1a1a1a',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                color: '#fff',
                cursor: 'pointer',
                fontSize: '11px',
              }}
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>

      {/* 百分比填充条 */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <div style={{ fontSize: '14px', fontWeight: 600, color: '#fff' }}>
            百分比填充条
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={selectedModule.percentage !== undefined}
              onChange={(e) => {
                if (e.target.checked) {
                  onModuleUpdate(selectedModule.id, {
                    percentage: 50,
                    percentageColor: 'rgba(255, 255, 255, 0.3)'
                  });
                } else {
                  onModuleUpdate(selectedModule.id, {
                    percentage: undefined,
                    percentageColor: undefined
                  });
                }
              }}
              style={{ cursor: 'pointer' }}
            />
            <span style={{ fontSize: '13px', color: '#8f8f8f' }}>启用</span>
          </label>
        </div>
        {selectedModule.percentage !== undefined && (
          <>
            <div style={{ fontSize: '12px', color: '#8f8f8f', marginBottom: '6px' }}>
              填充百分比: {selectedModule.percentage}%
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={selectedModule.percentage}
              onChange={(e) =>
                onModuleUpdate(selectedModule.id, {
                  percentage: Number(e.target.value),
                })
              }
              style={{
                width: '100%',
                height: '6px',
                borderRadius: '3px',
                background: '#333',
                outline: 'none',
                cursor: 'pointer',
              }}
            />
            <div style={{ marginTop: '12px' }}>
              <div style={{ fontSize: '12px', color: '#8f8f8f', marginBottom: '6px' }}>填充颜色</div>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <input
                  type="color"
                  value={selectedModule.percentageColor || '#ffffff'}
                  onChange={(e) =>
                    onModuleUpdate(selectedModule.id, {
                      percentageColor: e.target.value,
                    })
                  }
                  style={{
                    width: '50px',
                    height: '50px',
                    border: '2px solid rgba(255,255,255,0.1)',
                    borderRadius: '10px',
                    cursor: 'pointer',
                  }}
                />
                <input
                  type="text"
                  value={selectedModule.percentageColor || ''}
                  onChange={(e) =>
                    onModuleUpdate(selectedModule.id, {
                      percentageColor: e.target.value,
                    })
                  }
                  placeholder="rgba(255, 255, 255, 0.3)"
                  style={{
                    flex: 1,
                    padding: '10px 14px',
                    background: '#1a1a1a',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '10px',
                    color: '#fff',
                    fontSize: '14px',
                    outline: 'none',
                  }}
                />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}