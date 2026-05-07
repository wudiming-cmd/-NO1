import React, { useState, useRef } from 'react';
import { Layers, Wand2, Upload } from 'lucide-react';
import type { ModuleData } from '../types';
import { generateImage, fetchAsDataUrl } from '../utils/jimengService';
import { analyzeImageWithAI } from '../utils/aiAnalyze';
import { AIAssistant } from './AIAssistant';
import BatchImageFiller from './BatchImageFiller';
import BatchIconGenerator from './BatchIconGenerator';

interface Props {
  modules: ModuleData[];
  selectedModuleIds: string[];
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onBatchModuleUpdate: (ids: string[], updates: Partial<ModuleData>) => void;
  onSetModuleIcon: (id: string, icon: string) => void;
  onSetModuleOverlay: (id: string, overlay: string) => void;
  onSetModuleBackground: (id: string, bg: string) => void;
  onApplyTheme: (updates: Array<{ id: string } & Partial<ModuleData>>) => void;
}

const COLOR_PRESETS = [
  { label: '纯黑', color: '#1c1c1e' },
  { label: '深蓝', color: '#1e3a5f' },
  { label: '紫', color: '#3b1f5e' },
  { label: '红', color: '#5e1f1f' },
  { label: '深绿', color: '#1a3a2a' },
  { label: '白', color: 'rgba(255,255,255,0.85)' },
];

const ANIM_PRESETS: Array<[ModuleData['animationType'], string]> = [
  ['none', '无'],
  ['glow', '✨ 光晕'],
  ['float', '🎈 漂浮'],
  ['kenburns', '🎬 KB'],
];

const ICON_ANIM_PRESETS: Array<[ModuleData['iconAnimationType'], string]> = [
  ['none', '无'],
  ['spin', '🔄'],
  ['pulse', '💗'],
  ['shake', '📳'],
  ['bounce', '🏀'],
  ['swing', '🔔'],
];

type Section = 'color' | 'style' | 'ai-fill' | 'upload' | 'ai-icon' | 'ai-theme';

export default function BatchPanel({
  modules, selectedModuleIds, onSelectAll, onDeselectAll,
  onBatchModuleUpdate, onSetModuleIcon, onSetModuleOverlay,
  onSetModuleBackground, onApplyTheme,
}: Props) {
  const [openSection, setOpenSection] = useState<Section | null>('color');

  // AI style fill state
  const [styleRefImage, setStyleRefImage] = useState<string | null>(null);
  const [detectedStyle, setDetectedStyle] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isFilling, setIsFilling] = useState(false);
  const [fillProgress, setFillProgress] = useState({ done: 0, total: 0, status: '' });
  const styleRef = useRef<HTMLInputElement>(null);

  const allSelected = selectedModuleIds.length === modules.length && modules.length > 0;
  const targetIds = selectedModuleIds.length > 0 ? selectedModuleIds : modules.map(m => m.id);
  const targetCount = targetIds.length;

  const handleStyleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target?.result as string;
      setStyleRefImage(dataUrl);
      setDetectedStyle('');
      setIsAnalyzing(true);
      try {
        const a = await analyzeImageWithAI(dataUrl);
        setDetectedStyle(a.description);
      } catch {
        try {
          const c = document.createElement('canvas'); c.width = 50; c.height = 50;
          const ctx = c.getContext('2d')!;
          const img = new Image(); img.src = dataUrl;
          await new Promise(r => { img.onload = r; img.onerror = r; });
          ctx.drawImage(img, 0, 0, 50, 50);
          const d = ctx.getImageData(0, 0, 50, 50).data;
          let r = 0, g = 0, b = 0, cnt = 0;
          for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i+1]; b += d[i+2]; cnt++; }
          setDetectedStyle(`${Math.round(r/cnt) > 128 ? '明亮' : '深暗'}风格，纯抽象背景`);
        } catch { setDetectedStyle('抽象背景'); }
      }
      setIsAnalyzing(false);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleBatchFill = async (fillAll: boolean) => {
    if (!detectedStyle || isFilling) return;
    const targets = (fillAll ? modules : modules.filter(m => selectedModuleIds.includes(m.id)))
      .sort((a, b) => a.gridY !== b.gridY ? a.gridY - b.gridY : a.gridX - b.gridX);
    if (!targets.length) return;
    setIsFilling(true);
    setFillProgress({ done: 0, total: targets.length, status: '准备中…' });
    for (let i = 0; i < targets.length; i++) {
      setFillProgress({ done: i, total: targets.length, status: `(${i+1}/${targets.length}) 生成中…` });
      try {
        const result = await generateImage(
          { prompt: `${detectedStyle}，纯抽象背景，无图标无文字`, ratio: '1:1', style: 'general' },
          msg => setFillProgress(p => ({ ...p, status: `(${i+1}/${targets.length}) ${msg}` }))
        );
        const dataUrl = await fetchAsDataUrl(result.imageUrls[0]).catch(() => result.imageUrls[0]);
        onSetModuleBackground(targets[i].id, dataUrl);
      } catch {}
    }
    setFillProgress({ done: targets.length, total: targets.length, status: '✅ 完成' });
    setIsFilling(false);
  };

  const toggle = (s: Section) => setOpenSection(o => o === s ? null : s);

  const SectionHeader = ({ id, emoji, title, count }: { id: Section; emoji: string; title: string; count?: string }) => (
    <button
      onClick={() => toggle(id)}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 14px', background: openSection === id ? 'rgba(102,126,234,0.1)' : 'rgba(255,255,255,0.02)',
        border: 'none', borderBottom: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer',
        color: openSection === id ? '#a5b4fc' : 'rgba(255,255,255,0.6)',
      }}
    >
      <span style={{ fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
        {emoji} {title}
      </span>
      <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>{count} {openSection === id ? '▲' : '▼'}</span>
    </button>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto' }}>
      {/* 选择控制 */}
      <div style={{ padding: '10px 14px', background: 'rgba(0,0,0,0.2)', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 7 }}>
          已选 <b style={{ color: '#a5b4fc' }}>{selectedModuleIds.length}</b> / {modules.length} 个模块
          {selectedModuleIds.length === 0 && <span style={{ color: 'rgba(255,200,100,0.7)' }}> · 未选则操作全部</span>}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={onSelectAll} style={{ flex: 1, padding: '7px', borderRadius: 7, border: `1px solid ${allSelected ? 'rgba(168,85,247,0.5)' : 'rgba(255,255,255,0.1)'}`, background: allSelected ? 'rgba(168,85,247,0.12)' : 'rgba(255,255,255,0.03)', color: allSelected ? '#c4b5fd' : 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
            ☑ 全选
          </button>
          <button onClick={onDeselectAll} disabled={selectedModuleIds.length === 0} style={{ flex: 1, padding: '7px', borderRadius: 7, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.4)', fontSize: 11, cursor: 'pointer', opacity: selectedModuleIds.length === 0 ? 0.4 : 1 }}>
            ☐ 取消
          </button>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', alignSelf: 'center', lineHeight: 1.4, flex: 1.5 }}>
            Ctrl+单击模块可多选
          </div>
        </div>
      </div>

      {/* ① 批量配色 */}
      <SectionHeader id="color" emoji="🎨" title="批量配色" count={`${targetCount}个`} />
      {openSection === 'color' && (
        <div style={{ padding: '12px 14px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginBottom: 8 }}>快速预设背景色</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 10 }}>
            {COLOR_PRESETS.map(p => (
              <button key={p.label} onClick={() => onBatchModuleUpdate(targetIds, { backgroundColor: p.color, gradient: undefined })}
                style={{ padding: '8px 4px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: p.color, color: p.color === 'rgba(255,255,255,0.85)' ? '#000' : '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                {p.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => onBatchModuleUpdate(targetIds, { customImage: undefined, overlayImage: undefined })}
            style={{ width: '100%', marginBottom: 10, padding: '6px', borderRadius: 7, border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.05)', color: '#f87171', fontSize: 10, cursor: 'pointer', fontWeight: 600 }}
          >
            🗑 清除选中模块的背景图和叠加图（颜色保留）
          </button>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginBottom: 6 }}>自定义颜色</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input type="color" defaultValue="#1c1c1e"
              onChange={e => onBatchModuleUpdate(targetIds, { backgroundColor: e.target.value, gradient: undefined })}
              style={{ width: 44, height: 36, borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer' }} />
            <div style={{ display: 'flex', gap: 6, flex: 1, flexWrap: 'wrap' }}>
              {[
                'linear-gradient(135deg,#667eea,#764ba2)',
                'linear-gradient(135deg,#f093fb,#f5576c)',
                'linear-gradient(135deg,#4facfe,#00f2fe)',
                'linear-gradient(135deg,#ffd93d,#ff6b35)',
              ].map((g, i) => (
                <button key={i} onClick={() => onBatchModuleUpdate(targetIds, { gradient: g, backgroundColor: undefined })}
                  style={{ width: 28, height: 28, borderRadius: 7, border: '1px solid rgba(255,255,255,0.1)', background: g, cursor: 'pointer' }} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ② 批量动画 */}
      <SectionHeader id="style" emoji="✨" title="批量动画" count={`${targetCount}个`} />
      {openSection === 'style' && (
        <div style={{ padding: '12px 14px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginBottom: 7 }}>模块动画</div>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 10 }}>
            {ANIM_PRESETS.map(([val, label]) => (
              <button key={val} onClick={() => onBatchModuleUpdate(targetIds, { animationType: val })}
                style={{ padding: '5px 10px', borderRadius: 7, border: '1px solid rgba(102,126,234,0.25)', background: 'rgba(102,126,234,0.08)', color: '#a5b4fc', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>
                {label}
              </button>
            ))}
          </div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginBottom: 7 }}>图标动画</div>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {ICON_ANIM_PRESETS.map(([val, label]) => (
              <button key={val} onClick={() => onBatchModuleUpdate(targetIds, { iconAnimationType: val })}
                style={{ padding: '5px 10px', borderRadius: 7, border: '1px solid rgba(245,158,11,0.25)', background: 'rgba(245,158,11,0.06)', color: '#fcd34d', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>
                {label}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
            <button onClick={() => onBatchModuleUpdate(targetIds, { animationType: undefined, iconAnimationType: undefined })}
              style={{ flex: 1, padding: '7px', borderRadius: 7, border: '1px solid rgba(239,68,68,0.25)', background: 'rgba(239,68,68,0.06)', color: '#f87171', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>
              🗑 清除所有动画
            </button>
          </div>
        </div>
      )}

      {/* ③ AI风格批量填充 */}
      <SectionHeader id="ai-fill" emoji="🎭" title="AI 风格识别填充" count="" />
      {openSection === 'ai-fill' && (
        <div style={{ padding: '12px 14px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginBottom: 8, lineHeight: 1.6 }}>
            上传参考图 → AI识别风格 → 批量生成背景填入模块
          </div>
          <input ref={styleRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleStyleUpload} />
          <button onClick={() => styleRef.current?.click()} disabled={isAnalyzing || isFilling}
            style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1.5px dashed rgba(168,85,247,0.4)', background: 'rgba(168,85,247,0.06)', color: '#c4b5fd', cursor: 'pointer', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            {styleRefImage ? <img src={styleRefImage} style={{ width: 24, height: 24, objectFit: 'cover', borderRadius: 4 }} /> : <Upload size={13} />}
            {isAnalyzing ? 'AI分析中…' : styleRefImage ? '重新上传' : '上传参考图'}
          </button>
          {detectedStyle && (
            <textarea value={detectedStyle} onChange={e => setDetectedStyle(e.target.value)} rows={2} disabled={isFilling}
              style={{ width: '100%', marginTop: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(168,85,247,0.2)', borderRadius: 7, color: '#e9d5ff', fontSize: 11, padding: '6px 8px', resize: 'none', outline: 'none', fontFamily: 'inherit', lineHeight: 1.5, boxSizing: 'border-box' }} />
          )}
          {isFilling && (
            <div style={{ marginTop: 8 }}>
              <div style={{ height: 3, background: 'rgba(168,85,247,0.15)', borderRadius: 3, overflow: 'hidden', marginBottom: 4 }}>
                <div style={{ height: '100%', width: `${fillProgress.total ? Math.round(fillProgress.done / fillProgress.total * 100) : 0}%`, background: 'linear-gradient(90deg,#667eea,#a855f7)', borderRadius: 3, transition: 'width 0.4s' }} />
              </div>
              <div style={{ fontSize: 10, color: '#a78bfa' }}>{fillProgress.status}</div>
            </div>
          )}
          {detectedStyle && !isFilling && (
            <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
              <button onClick={() => handleBatchFill(false)} disabled={selectedModuleIds.length === 0}
                style={{ flex: 1, padding: '9px', borderRadius: 8, background: selectedModuleIds.length === 0 ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg,#667eea,#a855f7)', border: 'none', color: selectedModuleIds.length === 0 ? 'rgba(255,255,255,0.3)' : '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                <Layers size={11} />填充已选 {selectedModuleIds.length}
              </button>
              <button onClick={() => handleBatchFill(true)}
                style={{ flex: 1, padding: '9px', borderRadius: 8, background: 'linear-gradient(135deg,#e85d04,#a855f7)', border: 'none', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                <Layers size={11} />填充全部 {modules.length}
              </button>
            </div>
          )}
          {fillProgress.status === '✅ 完成' && !isFilling && (
            <div style={{ marginTop: 6, fontSize: 11, color: '#34d399', textAlign: 'center' }}>✅ 背景已填充完成</div>
          )}
        </div>
      )}

      {/* ④ 批量上传图片 */}
      <SectionHeader id="upload" emoji="📂" title="批量上传图片" count="" />
      {openSection === 'upload' && (
        <div style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <BatchImageFiller modules={modules} onSetModuleOverlay={onSetModuleOverlay} />
        </div>
      )}

      {/* ⑤ 批量AI图标 */}
      <SectionHeader id="ai-icon" emoji="⚡" title="批量 AI 图标生成" count="" />
      {openSection === 'ai-icon' && (
        <div style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <BatchIconGenerator modules={modules} onSetModuleIcon={onSetModuleIcon} />
        </div>
      )}

      {/* ⑥ AI主题生成 */}
      <SectionHeader id="ai-theme" emoji="🤖" title="AI 一键主题" count="" />
      {openSection === 'ai-theme' && (
        <div style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <AIAssistant modules={modules} onApplyTheme={onApplyTheme} onBatchModuleUpdate={onBatchModuleUpdate} />
        </div>
      )}

      <div style={{ padding: '10px 14px', fontSize: 10, color: 'rgba(255,255,255,0.2)', textAlign: 'center' }}>
        未选中模块时，操作将应用到全部 {modules.length} 个模块
      </div>
    </div>
  );
}
