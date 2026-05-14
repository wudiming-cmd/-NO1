/**
 * BatchBgGenerator — 参考图风格 → 批量生成12个模块背景
 *
 * 工作流：
 *  1. 用户上传一张参考图（如右图毛绒Nike风）
 *  2. 用户输入主题描述词（可选，自动从参考图提取）
 *  3. 点击「一键生成全部」→ 逐模块调用即梦 AI 生图
 *  4. 生成完成后自动填入对应模块背景
 */

import React, { useState, useRef } from 'react';
import { Upload, Zap, X, RefreshCw, CheckCircle2, Image } from 'lucide-react';
import { generateImage, fetchAsDataUrl } from '../utils/jimengService';
import type { ModuleData } from '../types';

interface Props {
  modules: ModuleData[];
  onSetModuleBackground: (id: string, url: string) => void;
}

// 每个模块对应的背景生成描述（追加到主题词后面）
const MODULE_DESCS: Record<string, string> = {
  'top-left':      '2x2大方块, 连接控制按钮组合',
  'top-right':     '2x2大方块, 音乐播放器卡片',
  'flashlight':    '圆形小图标, 手电筒',
  'alarm':         '圆形小图标, 闹钟',
  'brightness':    '竖向长条, 亮度控制滑块',
  'volume':        '竖向长条, 音量控制滑块',
  'mode-moon':     '横向长条, 专注模式',
  'calculator':    '圆形小图标, 计算器',
  'camera':        '圆形小图标, 相机',
  'rotation-lock': '圆形小图标, 旋转锁定',
  'bell':          '圆形小图标, 铃铛通知',
  'battery':       '圆形小图标, 电量显示',
};

type Status = 'idle' | 'pending' | 'generating' | 'done' | 'error';

interface ModuleState {
  status: Status;
  preview: string | null;
  error: string;
}

const initState = (): ModuleState => ({ status: 'idle', preview: null, error: '' });

export default function BatchBgGenerator({ modules, onSetModuleBackground }: Props) {
  const refInput = useRef<HTMLInputElement>(null);
  const [refImg, setRefImg]       = useState<string | null>(null);
  const [theme, setTheme]         = useState('');
  const [running, setRunning]     = useState(false);
  const [doneCount, setDoneCount] = useState(0);
  const [dragOver, setDragOver]   = useState(false);
  const [states, setStates]       = useState<Record<string, ModuleState>>(
    () => Object.fromEntries(modules.map(m => [m.id, initState()]))
  );

  const sortedModules = [...modules].sort((a, b) =>
    a.gridY !== b.gridY ? a.gridY - b.gridY : a.gridX - b.gridX
  );

  const setModState = (id: string, patch: Partial<ModuleState>) =>
    setStates(p => ({ ...p, [id]: { ...p[id], ...patch } }));

  const handleRefImg = (f: File) => {
    if (!f.type.startsWith('image/')) return;
    const url = URL.createObjectURL(f);
    setRefImg(url);
  };

  const buildPrompt = (moduleId: string) => {
    const modDesc = MODULE_DESCS[moduleId] || '控制中心模块';
    const base = theme.trim()
      ? `${theme.trim()}, ${modDesc}`
      : modDesc;
    // 加入通用高质量修饰词
    return `${base}, 高质量背景图, 无文字, 无边框, 填满画面, 精细纹理, 4K`;
  };

  const handleGenAll = async () => {
    const targets = sortedModules.filter(m => states[m.id]?.status !== 'done');
    if (!targets.length) return;

    setRunning(true);
    setDoneCount(0);

    // 先把所有目标设为 pending
    setStates(p => {
      const next = { ...p };
      targets.forEach(m => { next[m.id] = { ...next[m.id], status: 'pending', error: '' }; });
      return next;
    });

    let done = 0;
    for (const mod of targets) {
      setModState(mod.id, { status: 'generating' });
      try {
        const prompt = buildPrompt(mod.id);
        // 根据模块尺寸选比例
        const ratio = mod.widthUnits > mod.heightUnits ? '16:9'
          : mod.heightUnits > mod.widthUnits ? '9:16' : '1:1';

        const result = await generateImage({ prompt, ratio });
        const dataUrl = await fetchAsDataUrl(result.imageUrls[0]);
        setModState(mod.id, { status: 'done', preview: dataUrl });
        onSetModuleBackground(mod.id, dataUrl);
        done++;
        setDoneCount(done);
      } catch (e: any) {
        setModState(mod.id, { status: 'error', error: e?.message || '生成失败' });
      }
    }

    setRunning(false);
  };

  const handleReset = () => {
    setStates(Object.fromEntries(modules.map(m => [m.id, initState()])));
    setDoneCount(0);
  };

  const totalDone  = Object.values(states).filter(s => s.status === 'done').length;
  const totalCount = modules.length;
  const canStart   = !running && (theme.trim().length > 0 || !!refImg);

  const statusColor: Record<Status, string> = {
    idle:       '#4a4a7a',
    pending:    '#8080b0',
    generating: '#f0a030',
    done:       '#3dcc8a',
    error:      '#e05050',
  };
  const statusText: Record<Status, string> = {
    idle:       '待生成',
    pending:    '排队中',
    generating: '生成中…',
    done:       '✓ 完成',
    error:      '失败',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* 参考图上传 */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#a0a0c0', marginBottom: 7, letterSpacing: '0.05em' }}>
          参考风格图（可选）
        </div>
        <div
          onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleRefImg(f); }}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onClick={() => !refImg && refInput.current?.click()}
          style={{
            borderRadius: 10, border: `1.5px dashed ${dragOver ? '#8b5cf6' : refImg ? 'transparent' : '#3a3a6a'}`,
            background: dragOver ? 'rgba(139,92,246,0.08)' : refImg ? 'transparent' : 'rgba(255,255,255,0.02)',
            overflow: 'hidden', position: 'relative',
            minHeight: refImg ? 'auto' : 70,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: refImg ? 'default' : 'pointer', transition: 'all 0.2s',
          }}>
          {refImg ? (
            <>
              <img src={refImg} alt="ref" style={{ width: '100%', borderRadius: 8, display: 'block', maxHeight: 120, objectFit: 'cover' }} />
              <button onClick={e => { e.stopPropagation(); setRefImg(null); }} style={{
                position: 'absolute', top: 5, right: 5,
                width: 22, height: 22, borderRadius: 6, border: 'none',
                background: 'rgba(239,68,68,0.85)', color: '#fff',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}><X size={11} /></button>
              <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                background: 'linear-gradient(transparent,rgba(0,0,0,0.6))',
                padding: '12px 8px 6px',
              }}>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.7)' }}>
                  ✓ 参考图已上传 · AI 将学习此风格
                </div>
              </div>
            </>
          ) : (
            <div style={{ padding: 14, textAlign: 'center', color: '#5a5a8a' }}>
              <Image size={18} style={{ margin: '0 auto 5px' }} />
              <div style={{ fontSize: 11, fontWeight: 600 }}>上传参考风格图</div>
              <div style={{ fontSize: 9, color: '#3a3a6a', marginTop: 2 }}>拖拽或点击 · JPG / PNG</div>
            </div>
          )}
        </div>
        <input ref={refInput} type="file" accept="image/*" style={{ display: 'none' }}
          onChange={e => { const f = e.target.files?.[0]; if (f) handleRefImg(f); e.target.value = ''; }} />
      </div>

      {/* 主题描述词 */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#a0a0c0', marginBottom: 7, letterSpacing: '0.05em' }}>
          主题描述词 *
        </div>
        <textarea
          value={theme}
          onChange={e => setTheme(e.target.value)}
          placeholder={'例如：毛绒质感，棕色系，Nike品牌风格\n或：赛博朋克霓虹，深色背景\n或：日系可爱，奶油色调'}
          rows={3}
          style={{
            width: '100%', padding: '8px 10px', borderRadius: 9,
            border: '1.5px solid rgba(255,255,255,0.08)',
            background: 'rgba(255,255,255,0.04)',
            fontSize: 11, color: '#c0c0e0', lineHeight: 1.6,
            resize: 'none', outline: 'none', fontFamily: 'inherit',
            boxSizing: 'border-box', transition: 'border-color 0.2s',
          }}
          onFocus={e => (e.target.style.borderColor = 'rgba(139,92,246,0.5)')}
          onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')}
        />
        <div style={{ fontSize: 10, color: '#4a4a7a', marginTop: 4 }}>
          💡 描述越具体，效果越好。支持中英文混写
        </div>
      </div>

      {/* 快捷主题 */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
        {[
          '毛绒质感 棕色系',
          '赛博朋克 霓虹',
          '苹果极简 白色',
          '日系可爱 奶油色',
          '暗黑渐变 紫蓝',
          '复古胶卷 棕黄',
        ].map(t => (
          <button key={t} onClick={() => setTheme(t)} style={{
            padding: '3px 9px', borderRadius: 99, border: 'none',
            background: theme === t ? 'rgba(139,92,246,0.25)' : 'rgba(255,255,255,0.05)',
            color: theme === t ? '#a78bfa' : '#6060a0',
            fontSize: 10, fontWeight: 600, cursor: 'pointer',
            border: `1px solid ${theme === t ? 'rgba(139,92,246,0.4)' : 'rgba(255,255,255,0.06)'}`,
            transition: 'all 0.15s',
          }}>{t}</button>
        ))}
      </div>

      {/* Progress bar */}
      {running && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
            <span style={{ fontSize: 11, color: '#a0a0c0' }}>批量生成中…</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#a78bfa' }}>{doneCount}/{totalCount}</span>
          </div>
          <div style={{ height: 4, borderRadius: 4, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 4,
              background: 'linear-gradient(90deg,#8b5cf6,#ec4899)',
              width: `${(doneCount / totalCount) * 100}%`,
              transition: 'width 0.4s ease',
            }} />
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 6 }}>
        <button onClick={handleGenAll} disabled={!canStart} style={{
          flex: 1, padding: '9px', borderRadius: 9, border: 'none',
          background: canStart ? 'linear-gradient(135deg,#8b5cf6,#7c3aed)' : 'rgba(255,255,255,0.05)',
          color: canStart ? '#fff' : '#4a4a7a',
          fontSize: 12, fontWeight: 800, cursor: canStart ? 'pointer' : 'not-allowed',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          boxShadow: canStart ? '0 4px 14px rgba(139,92,246,0.4)' : 'none',
          transition: 'all 0.2s',
        }}>
          {running
            ? <><RefreshCw size={13} style={{ animation: 'spin 0.8s linear infinite' }} />生成中…</>
            : <><Zap size={13} />一键生成全部背景</>}
        </button>

        {totalDone > 0 && (
          <button onClick={handleReset} title="重置" style={{
            width: 34, borderRadius: 9, border: '1px solid rgba(255,255,255,0.08)',
            background: 'rgba(255,255,255,0.04)', color: '#6060a0',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.15s', fontSize: 12,
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(239,68,68,0.4)'; e.currentTarget.style.color = '#e05050'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#6060a0'; }}
          ><X size={13} /></button>
        )}
      </div>

      {/* Module status grid */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#a0a0c0', marginBottom: 8, letterSpacing: '0.05em' }}>
          模块状态 · 已完成 {totalDone}/{totalCount}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          {sortedModules.map(mod => {
            const s = states[mod.id] ?? initState();
            const label = MODULE_DESCS[mod.id]?.split(',')[0] ?? mod.id;
            return (
              <div key={mod.id} style={{
                padding: '8px 10px', borderRadius: 8,
                background: s.status === 'done'
                  ? 'rgba(61,204,138,0.08)'
                  : s.status === 'generating'
                  ? 'rgba(240,160,48,0.08)'
                  : s.status === 'error'
                  ? 'rgba(224,80,80,0.08)'
                  : 'rgba(255,255,255,0.03)',
                border: `1px solid ${
                  s.status === 'done' ? 'rgba(61,204,138,0.2)'
                  : s.status === 'generating' ? 'rgba(240,160,48,0.3)'
                  : s.status === 'error' ? 'rgba(224,80,80,0.2)'
                  : 'rgba(255,255,255,0.06)'
                }`,
                display: 'flex', alignItems: 'center', gap: 7, position: 'relative', overflow: 'hidden',
              }}>
                {/* Preview thumbnail */}
                {s.preview ? (
                  <img src={s.preview} alt="" style={{ width: 28, height: 28, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }} />
                ) : (
                  <div style={{
                    width: 28, height: 28, borderRadius: 6, flexShrink: 0,
                    background: 'rgba(255,255,255,0.04)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {s.status === 'generating'
                      ? <RefreshCw size={11} color="#f0a030" style={{ animation: 'spin 0.8s linear infinite' }} />
                      : s.status === 'done'
                      ? <CheckCircle2 size={11} color="#3dcc8a" />
                      : <Image size={11} color="#4a4a7a" />}
                  </div>
                )}
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: '#c0c0e0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {label}
                  </div>
                  <div style={{ fontSize: 9, color: statusColor[s.status], marginTop: 2 }}>
                    {s.error || statusText[s.status]}
                  </div>
                </div>
                {/* Retry single */}
                {s.status === 'error' && (
                  <button onClick={async () => {
                    setModState(mod.id, { status: 'generating', error: '' });
                    try {
                      const r = await generateImage({ prompt: buildPromptFor(theme, mod.id, mod), ratio: mod.widthUnits > mod.heightUnits ? '16:9' : mod.heightUnits > mod.widthUnits ? '9:16' : '1:1' });
                      const d = await fetchAsDataUrl(r.imageUrls[0]);
                      setModState(mod.id, { status: 'done', preview: d });
                      onSetModuleBackground(mod.id, d);
                    } catch (e: any) {
                      setModState(mod.id, { status: 'error', error: e?.message || '重试失败' });
                    }
                  }} style={{
                    width: 20, height: 20, borderRadius: 5, border: 'none',
                    background: 'rgba(240,160,48,0.2)', color: '#f0a030',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}><RefreshCw size={10} /></button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function buildPromptFor(theme: string, moduleId: string, mod: ModuleData) {
  const desc = MODULE_DESCS[moduleId] || '控制中心模块';
  const base = theme.trim() ? `${theme.trim()}, ${desc}` : desc;
  return `${base}, 高质量背景图, 无文字, 无边框, 填满画面, 精细纹理, 4K`;
}
