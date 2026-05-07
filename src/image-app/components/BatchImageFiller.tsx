import React, { useRef, useState } from 'react';
import { Upload, RotateCcw } from 'lucide-react';
import type { ModuleData } from '../types';

interface Props {
  modules: ModuleData[];
  onSetModuleOverlay: (id: string, overlayImage: string) => void;
}

interface SlotState {
  file: File | null;
  preview: string | null;
  status: 'idle' | 'filled' | 'error';
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function BatchImageFiller({ modules, onSetModuleOverlay }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [slots, setSlots] = useState<SlotState[]>([]);
  const [applying, setApplying] = useState(false);
  const [done, setDone] = useState(false);

  // Modules sorted top→bottom left→right
  const sorted = [...modules].sort((a, b) =>
    a.gridY !== b.gridY ? a.gridY - b.gridY : a.gridX - b.gridX
  );

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setDone(false);
    const list = Array.from(files).slice(0, sorted.length);
    const next: SlotState[] = await Promise.all(
      list.map(async (file) => {
        try {
          const preview = await readAsDataUrl(file);
          return { file, preview, status: 'idle' as const };
        } catch {
          return { file, preview: null, status: 'error' as const };
        }
      })
    );
    setSlots(next);
  };

  const handleApply = async () => {
    if (applying || slots.length === 0) return;
    setApplying(true);
    const next = [...slots];
    for (let i = 0; i < next.length; i++) {
      const slot = next[i];
      const mod = sorted[i];
      if (!slot.preview || !mod) {
        next[i] = { ...slot, status: 'error' };
        continue;
      }
      try {
        onSetModuleOverlay(mod.id, slot.preview);
        next[i] = { ...slot, status: 'filled' };
        setSlots([...next]);
      } catch {
        next[i] = { ...slot, status: 'error' };
        setSlots([...next]);
      }
    }
    setApplying(false);
    setDone(true);
  };

  const handleClear = () => {
    setSlots([]);
    setDone(false);
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  };

  return (
    <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{ width: 6, height: 6, borderRadius: 2, background: '#667eea' }} />
        <div style={{ width: 6, height: 6, borderRadius: 2, background: '#a855f7' }} />
        <span style={{ fontSize: 12, fontWeight: 700, color: '#a0a0c0' }}>批量上传图片 → 填充图上图叠加层</span>
        <span style={{ fontSize: 10, color: '#5a5a8a', marginLeft: 2 }}>共 {sorted.length} 个模块</span>
      </div>

      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => inputRef.current?.click()}
        style={{
          border: `1.5px dashed ${slots.length > 0 ? 'rgba(102,126,234,0.4)' : 'rgba(102,126,234,0.25)'}`,
          borderRadius: 10,
          padding: '18px 12px',
          textAlign: 'center',
          cursor: 'pointer',
          background: 'rgba(102,126,234,0.05)',
          transition: 'border-color 0.2s',
        }}
      >
        <Upload size={20} color="#667eea" style={{ margin: '0 auto 6px' }} />
        <div style={{ fontSize: 12, color: '#a0a0c0', fontWeight: 600 }}>
          {slots.length > 0 ? `已选 ${slots.length} 张，点击重新选择` : '点击 或 拖拽 选择多张图片'}
        </div>
        <div style={{ fontSize: 10, color: '#4a4a7a', marginTop: 3 }}>
          按模块位置顺序（从上到下、从左到右）依次填充
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          style={{ display: 'none' }}
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {/* Preview grid */}
      {slots.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
          {slots.map((slot, i) => {
            const mod = sorted[i];
            return (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <div style={{
                  aspectRatio: '1',
                  borderRadius: 7,
                  overflow: 'hidden',
                  border: slot.status === 'filled'
                    ? '1.5px solid rgba(52,211,153,0.5)'
                    : slot.status === 'error'
                      ? '1.5px solid rgba(248,113,113,0.5)'
                      : '1.5px solid rgba(255,255,255,0.08)',
                  background: '#12122a',
                  position: 'relative',
                }}>
                  {slot.preview ? (
                    <img src={slot.preview} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', color: '#f87171', fontSize: 16 }}>✕</div>
                  )}
                  {slot.status === 'filled' && (
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(52,211,153,0.25)', display: 'grid', placeItems: 'center', fontSize: 14 }}>✓</div>
                  )}
                </div>
                <div style={{ fontSize: 9, color: '#4a4a7a', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {mod?.label || mod?.iconName || `#${i + 1}`}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {done && (
        <div style={{ fontSize: 11, color: '#34d399', textAlign: 'center', padding: '4px 0' }}>
          ✅ 已将 {slots.filter(s => s.status === 'filled').length} 张图片填充到模块背景
        </div>
      )}

      {/* Buttons */}
      {slots.length > 0 && (
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={handleClear}
            disabled={applying}
            style={{ background: '#1e1e3a', color: '#7070a0', border: '0.5px solid #2a2a4a', borderRadius: 8, padding: '9px 14px', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', opacity: applying ? 0.5 : 1 }}
          >
            <RotateCcw size={11} style={{ verticalAlign: 'middle', marginRight: 4 }} />
            清空
          </button>
          <button
            onClick={handleApply}
            disabled={applying || done}
            style={{
              flex: 1,
              background: done ? 'rgba(52,211,153,0.15)' : applying ? '#2a2a5a' : 'linear-gradient(135deg,#667eea,#a855f7)',
              color: done ? '#34d399' : applying ? '#5a5a8a' : '#fff',
              border: done ? '1px solid rgba(52,211,153,0.3)' : 'none',
              borderRadius: 8, padding: '9px', fontSize: 13, fontWeight: 700,
              cursor: applying || done ? 'default' : 'pointer',
              fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >
            {applying ? (
              <>
                <span style={{ width: 13, height: 13, border: '2px solid rgba(255,255,255,0.2)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />
                填充中…
              </>
            ) : done ? '✅ 已全部填充' : (
              <>
                <Upload size={13} />
                一键填充 {slots.length} 个模块
              </>
            )}
          </button>
        </div>
      )}

      <div style={{ fontSize: 10, color: '#3a3a5a', textAlign: 'center' }}>
        图片填入「图上图」层 · 可再调位置/缩放/抠图 · 数量可少于模块数
      </div>
    </div>
  );
}
