import React, { useState, useMemo } from 'react';
import { Zap, RotateCcw } from 'lucide-react';
import { generateImage, fetchAsDataUrl } from '../utils/jimengService';
import type { ModuleData } from '../types';

interface Props {
  modules: ModuleData[];
  onSetModuleIcon: (id: string, customIcon: string) => void;
}

interface BatchItem {
  label: string;
  color: string;
  placeholder: string;
  span?: 'full' | 'third';
}

const ITEMS: BatchItem[] = [
  { label: '4格连体图标', color: '#4a8cff', placeholder: '待填入' },
  { label: '音乐播放卡片', color: '#e040a0', placeholder: '待填入' },
  { label: '刷新按钮',    color: '#c0a0e0', placeholder: '待填入' },
  { label: '铃铛按钮',    color: '#b0b060', placeholder: '待填入' },
  { label: '手电筒',      color: '#e0a030', placeholder: '待填入' },
  { label: '闹钟',        color: '#d0a020', placeholder: '待填入' },
  { label: '亮度滑块',    color: '#d0d060', placeholder: '待填入' },
  { label: '音量滑块',    color: '#909090', placeholder: '待填入' },
  { label: '专注模式长条', color: '#608060', placeholder: '待填入', span: 'full' },
  { label: '计算器',      color: '#e04040', placeholder: '待填入', span: 'third' },
  { label: '相机',        color: '#4080e0', placeholder: '待填入', span: 'third' },
  { label: '电量',        color: '#40c070', placeholder: '待填入', span: 'third' },
];

type Status = 'idle' | 'generating' | 'done' | 'error';

const statusStyle = (s: Status): React.CSSProperties => ({
  fontSize: 10,
  marginTop: 5,
  color: s === 'done' ? '#3dcc8a' : s === 'error' ? '#e05050' : s === 'generating' ? '#f0a030' : '#5a5a8a',
});

export default function BatchIconGenerator({ modules, onSetModuleIcon }: Props) {
  const [prompts, setPrompts] = useState<string[]>(ITEMS.map(() => ''));
  const [statuses, setStatuses] = useState<Status[]>(ITEMS.map(() => 'idle'));
  const [statusTexts, setStatusTexts] = useState<string[]>(ITEMS.map(() => '待生成'));
  const [previews, setPreviews] = useState<(string | null)[]>(ITEMS.map(() => null));
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(0);

  // Sort modules by grid position top→bottom left→right
  const sortedModules = useMemo(
    () => [...modules].sort((a, b) => a.gridY !== b.gridY ? a.gridY - b.gridY : a.gridX - b.gridX),
    [modules]
  );

  const total = ITEMS.length;

  const setItemStatus = (i: number, s: Status, text: string) => {
    setStatuses(prev => { const n = [...prev]; n[i] = s; return n; });
    setStatusTexts(prev => { const n = [...prev]; n[i] = text; return n; });
  };

  const generateOne = async (i: number) => {
    const prompt = prompts[i].trim();
    const mod = sortedModules[i];
    if (!mod) {
      setItemStatus(i, 'error', '无对应模块');
      return;
    }
    if (!prompt) {
      setItemStatus(i, 'error', '请先填写描述词');
      return;
    }
    setItemStatus(i, 'generating', '提交中…');
    try {
      const result = await generateImage(
        { prompt, ratio: '1:1', style: 'general' },
        (msg) => setItemStatus(i, 'generating', msg)
      );
      const dataUrl = await fetchAsDataUrl(result.imageUrls[0]).catch(() => result.imageUrls[0]);
      onSetModuleIcon(mod.id, dataUrl);
      setPreviews(prev => { const n = [...prev]; n[i] = dataUrl; return n; });
      setItemStatus(i, 'done', '✓ 已填充');
    } catch (err: any) {
      setItemStatus(i, 'error', err.message?.slice(0, 30) || '生成失败');
    }
  };

  const handleGenerateAll = async () => {
    if (running) return;
    setRunning(true);
    setDone(0);
    const resetS = ITEMS.map(() => 'idle' as Status);
    const resetT = ITEMS.map(() => '待生成');
    setStatuses(resetS);
    setStatusTexts(resetT);

    // Count only items with prompts
    const toGenerate = prompts.map((p, i) => ({ i, hasPrompt: p.trim().length > 0 }));
    let completed = 0;
    for (const { i, hasPrompt } of toGenerate) {
      if (!hasPrompt) {
        setItemStatus(i, 'idle', '跳过（未填写）');
        continue;
      }
      await generateOne(i);
      completed++;
      setDone(completed);
    }
    setRunning(false);
  };

  const handleClear = () => {
    if (running) return;
    setPrompts(ITEMS.map(() => ''));
    setStatuses(ITEMS.map(() => 'idle'));
    setStatusTexts(ITEMS.map(() => '待生成'));
    setPreviews(ITEMS.map(() => null));
    setDone(0);
  };

  const handleGenerateSingle = async (i: number) => {
    if (running) return;
    setRunning(true);
    await generateOne(i);
    setRunning(false);
  };

  const pct = Math.round((done / total) * 100);

  // Layout rows matching original HTML
  const rows: number[][] = [[0, 1], [2, 3], [4, 5], [6, 7], [8], [9, 10, 11]];

  return (
    <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
        <div style={{ width: 6, height: 6, borderRadius: 2, background: '#5050e0' }} />
        <div style={{ width: 6, height: 6, borderRadius: 2, background: '#5050e0' }} />
        <span style={{ fontSize: 12, fontWeight: 600, color: '#a0a0c0' }}>批量 AI 图标生成</span>
        <span style={{ fontSize: 10, color: '#5a5a8a', marginLeft: 4 }}>映射前 {total} 个模块</span>
      </div>

      {/* Progress */}
      <div style={{ fontSize: 10, color: '#6060a0', marginBottom: 5 }}>已完成 {done} / {total} 个模块</div>
      <div style={{ height: 3, background: '#2a2a4a', borderRadius: 3, marginBottom: 12, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg,#5050e0,#a855f7)', borderRadius: 3, transition: 'width 0.4s ease' }} />
      </div>

      {/* Items */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {rows.map((rowIdxs, ri) => {
          const cols = rowIdxs.length === 3 ? '1fr 1fr 1fr' : rowIdxs.length === 1 ? '1fr' : '1fr 1fr';
          return (
            <div key={ri} style={{ display: 'grid', gridTemplateColumns: cols, gap: 8 }}>
              {rowIdxs.map((i) => {
                const item = ITEMS[i];
                const mod = sortedModules[i];
                const st = statuses[i];
                return (
                  <div
                    key={i}
                    style={{
                      background: '#12122a', borderRadius: 10, padding: '9px 10px',
                      border: st === 'done' ? '0.5px solid rgba(61,204,138,0.3)' : st === 'error' ? '0.5px solid rgba(224,80,80,0.3)' : '0.5px solid #2a2a4a',
                      transition: 'border-color 0.3s',
                    }}
                  >
                    {/* Label row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5 }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: item.color, display: 'inline-block', flexShrink: 0 }} />
                      <span style={{ fontSize: 10, color: '#7070a0', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</span>
                      {mod ? (
                        <span style={{ fontSize: 9, color: '#3a3a6a', flexShrink: 0 }}>({mod.gridX},{mod.gridY})</span>
                      ) : (
                        <span style={{ fontSize: 9, color: '#5a3a3a', flexShrink: 0 }}>无模块</span>
                      )}
                    </div>

                    {/* Preview thumbnail */}
                    {previews[i] ? (
                      <div style={{ position: 'relative', marginBottom: 5 }}>
                        <img src={previews[i]!} alt={item.label} style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 6, display: 'block' }} />
                        <div style={{ position: 'absolute', inset: 0, borderRadius: 6, background: 'rgba(61,204,138,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ fontSize: 16 }}>✓</span>
                        </div>
                      </div>
                    ) : null}

                    {/* Textarea */}
                    <textarea
                      value={prompts[i]}
                      onChange={(e) => {
                        const next = [...prompts];
                        next[i] = e.target.value;
                        setPrompts(next);
                      }}
                      placeholder={item.placeholder}
                      rows={2}
                      disabled={running}
                      style={{ width: '100%', background: '#1e1e3a', border: '0.5px solid #3a3a5a', borderRadius: 5, color: '#d0d0f0', fontSize: 10, padding: '5px 7px', resize: 'none', fontFamily: 'inherit', lineHeight: 1.5, outline: 'none', boxSizing: 'border-box' }}
                    />

                    {/* Status + single gen button */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                      <span style={statusStyle(st)}>{statusTexts[i]}</span>
                      <button
                        onClick={() => handleGenerateSingle(i)}
                        disabled={running || !mod}
                        style={{ background: 'none', border: 'none', cursor: running || !mod ? 'not-allowed' : 'pointer', color: '#4040a0', fontSize: 11, padding: '0 2px', opacity: running ? 0.4 : 1 }}
                        title="单独生成"
                      >
                        ▶
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Buttons */}
      <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
        <button
          onClick={handleClear}
          disabled={running}
          style={{ background: '#1e1e3a', color: '#7070a0', border: '0.5px solid #2a2a4a', borderRadius: 8, padding: '9px 14px', fontSize: 12, cursor: running ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: running ? 0.5 : 1 }}
        >
          <RotateCcw size={11} style={{ verticalAlign: 'middle', marginRight: 4 }} />
          清空
        </button>
        <button
          onClick={handleGenerateAll}
          disabled={running}
          style={{ flex: 1, background: running ? '#2a2a5a' : 'linear-gradient(135deg,#5050e0,#a855f7)', color: running ? '#5a5a8a' : '#fff', border: 'none', borderRadius: 8, padding: '9px', fontSize: 13, fontWeight: 600, cursor: running ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontFamily: 'inherit' }}
        >
          {running ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 13, height: 13, border: '2px solid rgba(255,255,255,0.2)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />
              生成中…
            </span>
          ) : (
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Zap size={13} />
              一键全部生成
            </span>
          )}
        </button>
      </div>

      {/* Tip */}
      <div style={{ marginTop: 8, fontSize: 10, color: '#3a3a5a', textAlign: 'center' }}>
        逐个串行生成 · 按画布从上到下映射模块 · 留空则使用默认描述
      </div>
    </div>
  );
}
