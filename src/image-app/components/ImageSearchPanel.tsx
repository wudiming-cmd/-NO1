import React, { useState, useRef } from 'react';
import { Search, X, ImageIcon } from 'lucide-react';

// Pixabay 免费 key（免费注册：https://pixabay.com/api/docs/）
// 不填时自动跳过，只使用 Openverse
const PIXABAY_KEY = '';

// 常用中文词 → 英文映射，提升 Openverse 搜索质量
const ZH_TO_EN: Record<string, string> = {
  '极简美学': 'minimal aesthetic wallpaper',
  'iOS界面': 'iOS interface design',
  '玻璃质感': 'glass texture design',
  '渐变配色': 'gradient color background',
  '暗黑风格': 'dark theme background',
  '赛博朋克': 'cyberpunk neon city',
  '3D图标': '3D icon render',
  '霓虹发光': 'neon glow light',
  '史迪奇': 'stitch disney character',
  '极简': 'minimalist',
  '壁纸': 'wallpaper',
  '星空': 'starry sky',
  '山水': 'landscape nature',
  '城市': 'city skyline',
  '抽象': 'abstract art',
};

function translateQuery(q: string): string {
  const mapped = ZH_TO_EN[q.trim()];
  if (mapped) return mapped;
  // 如果输入是中文，附加英文关键词兜底
  if (/[一-龥]/.test(q)) return q + ' wallpaper';
  return q;
}

interface ImageResult {
  title: string;
  thumbnail: string;
  original?: string;
  source?: string;
}

interface ImageSearchPanelProps {
  onUseImage: (dataUrl: string, name: string) => void;
}

const QUICK_TAGS = ['极简美学', '玻璃质感', '赛博朋克', '暗黑风格', '渐变配色', '霓虹发光', '星空', '抽象'];

// ─── Openverse：完全免费、无需注册、原生 CORS ────────────────────────────────
async function searchViaOpenverse(q: string, signal: AbortSignal): Promise<ImageResult[]> {
  const en = translateQuery(q);
  const url = `https://api.openverse.org/v1/images/?q=${encodeURIComponent(en)}&page_size=24&license_type=all`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Openverse ${res.status}`);
  const json = await res.json();
  return (json.results || []).slice(0, 24).map((img: any) => ({
    title: img.title || q,
    thumbnail: img.thumbnail || img.url,
    original: img.url,
    source: 'Openverse',
  })).filter((i: ImageResult) => Boolean(i.thumbnail));
}

// ─── Pixabay：需要免费 key，CORS 原生支持 ────────────────────────────────────
async function searchViaPixabay(q: string, signal: AbortSignal): Promise<ImageResult[]> {
  if (!PIXABAY_KEY) throw new Error('no key');
  const en = translateQuery(q);
  const url = `https://pixabay.com/api/?key=${PIXABAY_KEY}&q=${encodeURIComponent(en)}&image_type=photo&per_page=24&safesearch=true`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Pixabay ${res.status}`);
  const json = await res.json();
  if (json.error) throw new Error(json.error);
  return (json.hits || []).slice(0, 24).map((img: any) => ({
    title: img.tags || q,
    thumbnail: img.webformatURL || img.previewURL,
    original: img.largeImageURL || img.webformatURL,
    source: 'Pixabay',
  })).filter((i: ImageResult) => Boolean(i.thumbnail));
}

const ImageSearchPanel: React.FC<ImageSearchPanelProps> = ({ onUseImage }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ImageResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [converting, setConverting] = useState<string | null>(null);
  const [source, setSource] = useState('');
  const abortRef = useRef<AbortController | null>(null);

  const search = async (q: string) => {
    if (!q.trim()) return;
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setLoading(true);
    setError('');
    setSource('');
    setResults([]);
    try {
      let items: ImageResult[] = [];

      // 先试 Pixabay（如果配置了 key）
      if (PIXABAY_KEY) {
        try {
          items = await searchViaPixabay(q, abortRef.current.signal);
          if (items.length > 0) setSource('Pixabay');
        } catch (e: any) {
          if (e.name === 'AbortError') throw e;
        }
      }

      // 没有结果再试 Openverse
      if (items.length === 0) {
        items = await searchViaOpenverse(q, abortRef.current.signal);
        if (items.length > 0) setSource('Openverse');
      }

      setResults(items);
      if (items.length === 0) setError('未找到结果，换个关键词试试（推荐用英文）');
    } catch (err: any) {
      if (err.name !== 'AbortError') setError(err.message || '搜索失败，请检查网络');
    } finally {
      setLoading(false);
    }
  };

  const handleUse = async (img: ImageResult) => {
    setConverting(img.thumbnail);
    try {
      const src = img.original || img.thumbnail;
      // 尝试 CORS fetch → canvas drawImage → 直接用 URL
      try {
        const response = await fetch(src, { mode: 'cors' });
        const blob = await response.blob();
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
        onUseImage(dataUrl, img.title);
        return;
      } catch { /* fall through */ }
      try {
        const c = document.createElement('canvas');
        c.width = 600; c.height = 600;
        const ctx = c.getContext('2d')!;
        const imgEl = new Image();
        imgEl.crossOrigin = 'anonymous';
        imgEl.src = src;
        await new Promise<void>((res) => { imgEl.onload = () => res(); imgEl.onerror = () => res(); });
        ctx.drawImage(imgEl, 0, 0, 600, 600);
        onUseImage(c.toDataURL('image/jpeg', 0.92), img.title);
        return;
      } catch { /* fall through */ }
      onUseImage(src, img.title);
    } finally {
      setConverting(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Search bar */}
      <div style={{ padding: '8px 12px', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.05)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' }}>
            <Search size={13} color="rgba(255,255,255,0.3)" style={{ marginLeft: 8, flexShrink: 0 }} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') search(query); }}
              placeholder="搜索图片（支持中英文）..."
              style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: '#fff', fontSize: 12, padding: '7px 8px' }}
            />
            {query ? (
              <button onClick={() => setQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px', color: 'rgba(255,255,255,0.3)', display: 'grid', placeItems: 'center' }}>
                <X size={11} />
              </button>
            ) : null}
          </div>
          <button
            onClick={() => search(query)}
            disabled={loading || !query.trim()}
            style={{ padding: '7px 12px', borderRadius: 8, background: 'linear-gradient(135deg,#667eea,#764ba2)', border: 'none', color: '#fff', fontSize: 11, fontWeight: 700, cursor: loading || !query.trim() ? 'not-allowed' : 'pointer', opacity: loading || !query.trim() ? 0.6 : 1, flexShrink: 0 }}
          >
            搜索
          </button>
        </div>

        {/* Quick tags */}
        <div style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
          {QUICK_TAGS.map((tag) => (
            <button
              key={tag}
              onClick={() => { setQuery(tag); search(tag); }}
              style={{ padding: '3px 8px', borderRadius: 12, border: '1px solid rgba(102,126,234,0.25)', background: 'rgba(102,126,234,0.08)', color: 'rgba(255,255,255,0.6)', fontSize: 10, cursor: 'pointer' }}
            >
              {tag}
            </button>
          ))}
        </div>

        {/* Source badge */}
        {source && results.length > 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 5 }}>
            <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 10, background: 'rgba(102,126,234,0.15)', color: '#a5b4fc', fontWeight: 700 }}>
              {source === 'Pixabay' ? '🖼 Pixabay' : '🌐 Openverse CC'}
            </span>
            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)' }}>{results.length} 张</span>
          </div>
        ) : null}
      </div>

      {/* Results */}
      <div style={{ flex: 1, overflow: 'auto', padding: '4px 12px 12px' }}>
        {loading && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, paddingTop: 4 }}>
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} style={{ aspectRatio: '1', borderRadius: 8, background: 'rgba(255,255,255,0.04)', animation: 'pulse 1.5s ease-in-out infinite' }} />
            ))}
          </div>
        )}

        {!loading && error && (
          <div style={{ padding: '20px 0', textAlign: 'center' }}>
            <div style={{ fontSize: 12, color: 'rgba(239,68,68,0.7)', marginBottom: 6 }}>{error}</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', lineHeight: 1.6 }}>
              提示：英文关键词效果更好<br />
              如：minimal dark、neon glow、cyberpunk
            </div>
          </div>
        )}

        {!loading && results.length === 0 && !error && (
          <div style={{ padding: '24px 0', textAlign: 'center' }}>
            <ImageIcon size={32} color="rgba(255,255,255,0.1)" style={{ marginBottom: 8 }} />
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginBottom: 4 }}>点击上方标签或输入关键词搜索</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.15)' }}>来源：Openverse（免费 CC 授权图片）</div>
          </div>
        )}

        {!loading && results.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
            {results.map((img, i) => (
              <div
                key={i}
                title={img.title}
                onClick={() => handleUse(img)}
                style={{ position: 'relative', aspectRatio: '1', borderRadius: 8, overflow: 'hidden', cursor: 'pointer', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <img
                  src={img.thumbnail}
                  alt={img.title}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  loading="lazy"
                />
                {converting === img.thumbnail && (
                  <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'grid', placeItems: 'center' }}>
                    <div style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  </div>
                )}
                <div
                  style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0)', transition: 'background 0.15s' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.3)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0)'; }}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageSearchPanel;
