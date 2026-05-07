import React, { useState, useRef } from 'react';
import { Wand2, Download, RefreshCw, ChevronDown, Clock } from 'lucide-react';
import { generateImage, fetchAsDataUrl, getQueueLength, type AspectRatio, type ImageStyle } from '../utils/jimengService';

interface AIImageGeneratorProps {
  onUseAsBackground: (dataUrl: string) => void;
  onUseAsModuleImage: (dataUrl: string, name: string) => void;
}

const RATIO_OPTIONS: { value: AspectRatio; label: string; desc: string }[] = [
  { value: '9:16', label: '9:16', desc: '竖屏' },
  { value: '1:1',  label: '1:1',  desc: '方形' },
  { value: '16:9', label: '16:9', desc: '横屏' },
  { value: '3:4',  label: '3:4',  desc: '肖像' },
];

const STYLE_OPTIONS: { value: ImageStyle; label: string; emoji: string }[] = [
  { value: 'general', label: '通用写实', emoji: '🖼️' },
  { value: 'anime',   label: '动漫插画', emoji: '🎌' },
  { value: 'art',     label: '艺术风格', emoji: '🎨' },
];

const QUICK_PROMPTS = [
  { label: '星空', full: '深邃宇宙星云，蓝紫色调，超高清细节，写实风格' },
  { label: '霓虹', full: '极简深色背景，霓虹几何线条，赛博朋克风格' },
  { label: '云海', full: '山间云海，金色日出，空旷宁静，8K写实' },
  { label: '深海', full: '深海珊瑚礁，荧光水母，梦幻蓝绿色调' },
  { label: '秋叶', full: '日本街道，枫叶金红，暖橙渐变，唯美摄影' },
  { label: '夜城', full: '现代城市夜景，灯光璀璨，雨后水面倒影' },
];

const AIImageGenerator: React.FC<AIImageGeneratorProps> = ({
  onUseAsBackground,
  onUseAsModuleImage,
}) => {
  const [prompt, setPrompt]         = useState('');
  const [negPrompt, setNegPrompt]   = useState('');
  const [ratio, setRatio]           = useState<AspectRatio>('9:16');
  const [style, setStyle]           = useState<ImageStyle>('general');
  const [loading, setLoading]       = useState(false);
  const [queuePos, setQueuePos]     = useState(0);
  const [statusMsg, setStatusMsg]   = useState('');
  const [error, setError]           = useState('');
  const [results, setResults]       = useState<string[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [busy, setBusy]             = useState<number | null>(null);
  const pollRef                     = useRef<ReturnType<typeof setInterval> | null>(null);

  const startQueuePoll = () => {
    pollRef.current = setInterval(() => {
      const n = getQueueLength();
      setQueuePos(n);
      if (n <= 1) {
        clearInterval(pollRef.current!);
        pollRef.current = null;
      }
    }, 800);
  };

  const handleGenerate = async () => {
    if (!prompt.trim() || loading) return;
    setLoading(true);
    setError('');
    setResults([]);
    setStatusMsg('已加入队列，等待生成…');
    startQueuePoll();

    try {
      setStatusMsg('正在提交任务…');
      const result = await generateImage(
        { prompt, negativePrompt: negPrompt, ratio, style },
        (msg) => setStatusMsg(msg)
      );
      setResults(result.imageUrls);
      setStatusMsg('');
    } catch (err: any) {
      const msg: string = err.message ?? '未知错误';
      if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
        setError('网络请求失败。请确认开发服务器已通过 vite 启动（需要代理支持），生产环境需配置后端转发。');
      } else {
        setError(msg);
      }
      setStatusMsg('');
    } finally {
      setLoading(false);
      setQueuePos(0);
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    }
  };

  const handleUseBackground = async (url: string, idx: number) => {
    setBusy(idx);
    try {
      const dataUrl = await fetchAsDataUrl(url).catch(() => url);
      onUseAsBackground(dataUrl);
    } finally { setBusy(null); }
  };

  const handleAddToLibrary = async (url: string, idx: number) => {
    setBusy(idx * 10);
    try {
      const dataUrl = await fetchAsDataUrl(url).catch(() => url);
      onUseAsModuleImage(dataUrl, `即梦_${Date.now()}`);
    } finally { setBusy(null); }
  };

  const handleDownload = (url: string, idx: number) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = `jimeng_${Date.now()}_${idx + 1}.jpg`;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  // Aspect ratio for preview
  const previewAR = ratio === '9:16' ? '9/16' : ratio === '16:9' ? '16/9' : ratio === '3:4' ? '3/4' : ratio === '4:3' ? '4/3' : '1/1';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

      {/* Header */}
      <div style={{ padding: '12px 16px 10px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'linear-gradient(135deg,rgba(102,126,234,0.12),rgba(168,85,247,0.08))' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 26, height: 26, borderRadius: 7, background: 'linear-gradient(135deg,#667eea,#a855f7)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
            <Wand2 size={13} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#fff', lineHeight: 1 }}>即梦 AI 文生图</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>Dreamina · Volcengine · 串行队列</div>
          </div>
        </div>
      </div>

      <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>

        {/* Prompt textarea */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.45)', marginBottom: 5 }}>描述词 Prompt</div>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => { if (e.ctrlKey && e.key === 'Enter') handleGenerate(); }}
            placeholder="描述你想生成的图片内容、风格、色调…&#10;按 Ctrl+Enter 快速生成"
            rows={3}
            style={{
              width: '100%', boxSizing: 'border-box',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 10, color: '#fff', fontSize: 12,
              padding: '9px 11px', resize: 'none', outline: 'none',
              lineHeight: 1.55, fontFamily: 'inherit',
            }}
          />
          {/* Quick prompt chips */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 5 }}>
            {QUICK_PROMPTS.map((p) => (
              <button
                key={p.label}
                onClick={() => setPrompt(p.full)}
                style={{ padding: '3px 9px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.5)', fontSize: 10, cursor: 'pointer', fontWeight: 500 }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Ratio */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.45)', marginBottom: 5 }}>图片比例</div>
          <div style={{ display: 'flex', gap: 5 }}>
            {RATIO_OPTIONS.map((r) => (
              <button
                key={r.value}
                onClick={() => setRatio(r.value)}
                style={{
                  flex: 1, padding: '6px 2px', borderRadius: 8,
                  border: ratio === r.value ? '1px solid rgba(102,126,234,0.6)' : '1px solid rgba(255,255,255,0.07)',
                  background: ratio === r.value ? 'rgba(102,126,234,0.15)' : 'rgba(255,255,255,0.03)',
                  color: ratio === r.value ? '#a5b4fc' : 'rgba(255,255,255,0.4)',
                  cursor: 'pointer', fontSize: 10, fontWeight: 700, textAlign: 'center',
                }}
              >
                <div>{r.label}</div>
                <div style={{ fontSize: 9, opacity: 0.7, marginTop: 1 }}>{r.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Style */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.45)', marginBottom: 5 }}>生成风格</div>
          <div style={{ display: 'flex', gap: 5 }}>
            {STYLE_OPTIONS.map((s) => (
              <button
                key={s.value}
                onClick={() => setStyle(s.value)}
                style={{
                  flex: 1, padding: '7px 4px', borderRadius: 8,
                  border: style === s.value ? '1px solid rgba(168,85,247,0.5)' : '1px solid rgba(255,255,255,0.07)',
                  background: style === s.value ? 'rgba(168,85,247,0.12)' : 'rgba(255,255,255,0.03)',
                  color: style === s.value ? '#c4b5fd' : 'rgba(255,255,255,0.4)',
                  cursor: 'pointer', fontSize: 10, fontWeight: 600, textAlign: 'center',
                }}
              >
                <div style={{ fontSize: 14 }}>{s.emoji}</div>
                <div style={{ marginTop: 2 }}>{s.label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Advanced */}
        <button
          onClick={() => setShowAdvanced(s => !s)}
          style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: 11, padding: 0 }}
        >
          <ChevronDown size={11} style={{ transform: showAdvanced ? 'rotate(180deg)' : 'none', transition: 'transform 0.18s' }} />
          高级选项（负向描述词）
        </button>
        {showAdvanced && (
          <input
            value={negPrompt}
            onChange={(e) => setNegPrompt(e.target.value)}
            placeholder="不希望出现的内容：模糊、低质量、文字…"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: '#fff', fontSize: 12, padding: '8px 11px', outline: 'none', width: '100%', boxSizing: 'border-box' }}
          />
        )}

        {/* Generate button */}
        <button
          onClick={handleGenerate}
          disabled={loading || !prompt.trim()}
          style={{
            width: '100%', padding: '12px', borderRadius: 12,
            background: loading || !prompt.trim() ? 'rgba(102,126,234,0.2)' : 'linear-gradient(135deg,#667eea,#a855f7)',
            border: 'none', color: '#fff',
            cursor: loading || !prompt.trim() ? 'not-allowed' : 'pointer',
            fontWeight: 800, fontSize: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            boxShadow: loading || !prompt.trim() ? 'none' : '0 6px 20px rgba(102,126,234,0.3)',
            transition: 'all 0.2s',
          }}
        >
          {loading ? (
            <>
              <div style={{ width: 15, height: 15, border: '2px solid rgba(255,255,255,0.25)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              生成中…
            </>
          ) : (
            <>
              <Wand2 size={14} />
              立即生成（Ctrl+Enter）
            </>
          )}
        </button>

        {/* Queue / status */}
        {loading && statusMsg && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 12px', borderRadius: 8, background: 'rgba(102,126,234,0.08)', border: '1px solid rgba(102,126,234,0.15)', fontSize: 12, color: '#a5b4fc' }}>
            <Clock size={12} style={{ flexShrink: 0 }} />
            <span>{statusMsg}</span>
            {queuePos > 1 && <span style={{ marginLeft: 'auto', fontSize: 10, opacity: 0.6 }}>队列 {queuePos - 1} 个等待</span>}
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div style={{ padding: '10px 12px', borderRadius: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', fontSize: 11, color: '#fca5a5', lineHeight: 1.55 }}>
            <div style={{ fontWeight: 700, marginBottom: 3 }}>❌ 生成失败</div>
            {error}
          </div>
        )}

        {/* Results */}
        {results.length > 0 && (
          <div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 6 }}>生成完成 — 悬停选择操作</div>
            <div style={{ display: 'grid', gridTemplateColumns: results.length === 1 ? '1fr' : '1fr 1fr', gap: 8 }}>
              {results.map((url, idx) => (
                <div
                  key={idx}
                  style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <img
                    src={url}
                    alt={`生成 ${idx + 1}`}
                    crossOrigin="anonymous"
                    style={{ width: '100%', display: 'block', aspectRatio: previewAR, objectFit: 'cover' }}
                  />
                  {/* Action overlay */}
                  <div
                    style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0)', transition: 'background 0.18s', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: 7, gap: 4 }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.7)'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0)'; }}
                  >
                    {busy === idx || busy === idx * 10 ? (
                      <div style={{ display: 'grid', placeItems: 'center', flex: 1 }}>
                        <div style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,0.2)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={() => handleUseBackground(url, idx)}
                          style={{ padding: '5px 0', borderRadius: 6, background: 'linear-gradient(90deg,rgba(102,126,234,0.9),rgba(118,75,162,0.9))', border: 'none', color: '#fff', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}
                        >
                          🖼️ 设为背景
                        </button>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button
                            onClick={() => handleAddToLibrary(url, idx)}
                            style={{ flex: 1, padding: '5px 0', borderRadius: 6, background: 'rgba(255,255,255,0.12)', border: 'none', color: '#fff', fontSize: 10, fontWeight: 600, cursor: 'pointer' }}
                          >
                            📁 加入图库
                          </button>
                          <button
                            onClick={() => handleDownload(url, idx)}
                            style={{ width: 28, borderRadius: 6, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', cursor: 'pointer', display: 'grid', placeItems: 'center' }}
                          >
                            <Download size={11} />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={handleGenerate}
              disabled={loading}
              style={{ marginTop: 8, width: '100%', padding: '8px', borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.55)', cursor: 'pointer', fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}
            >
              <RefreshCw size={11} />
              重新生成
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIImageGenerator;
