import { useState } from 'react';
import { Download, X, Image, Zap, Settings2 } from 'lucide-react';

interface ExportDialogProps {
  elementId: string;
  onClose: () => void;
}

type ExportResolution = 1 | 2 | 3 | 4 | 6;
type ExportFormat = 'png' | 'jpeg';
type ExportBackground = 'black' | 'white' | 'original';

const RESOLUTIONS: { value: ExportResolution; label: string; desc: string; badge?: string }[] = [
  { value: 1, label: '1x', desc: '标准' },
  { value: 2, label: '2x', desc: '高清' },
  { value: 3, label: '3x', desc: '超清', badge: '推荐' },
  { value: 4, label: '4x', desc: '印刷级' },
  { value: 6, label: '6x', desc: '极清' },
];

const FORMATS: { value: ExportFormat; label: string; desc: string }[] = [
  { value: 'png', label: 'PNG', desc: '无损 · 支持透明' },
  { value: 'jpeg', label: 'JPEG', desc: '体积小 · 不透明' },
];

const BACKGROUNDS: { value: ExportBackground; label: string; color: string }[] = [
  { value: 'original', label: '原始', color: 'transparent' },
  { value: 'black', label: '黑色', color: '#000' },
  { value: 'white', label: '白色', color: '#fff' },
];

export function ExportDialog({ elementId, onClose }: ExportDialogProps) {
  const [resolution, setResolution] = useState<ExportResolution>(3);
  const [format, setFormat] = useState<ExportFormat>('png');
  const [background, setBackground] = useState<ExportBackground>('black');
  const [isExporting, setIsExporting] = useState(false);
  const [status, setStatus] = useState<{ text: string; type: 'idle' | 'loading' | 'success' | 'error' }>({
    text: '',
    type: 'idle',
  });

  const estimateSizeMB = () => {
    // rough estimate based on phone canvas (1080x1920) at given scale
    const px = 1080 * 1920 * resolution * resolution;
    const bytes = format === 'jpeg' ? px * 3 * 0.12 : px * 4 * 0.5;
    return (bytes / 1024 / 1024).toFixed(1);
  };

  const handleExport = async () => {
    const el = document.getElementById(elementId);
    if (!el) {
      setStatus({ text: '找不到画布元素', type: 'error' });
      return;
    }

    setIsExporting(true);
    setStatus({ text: '正在渲染高清图像…', type: 'loading' });

    // Create an offscreen full-scale clone to avoid zoom issues
    const cssW = parseInt(el.style.width) || el.scrollWidth || 1080;
    const cssH = parseInt(el.style.height) || el.scrollHeight || 1920;
    const wrapper = document.createElement('div');
    wrapper.style.cssText = `position:fixed;left:-99999px;top:-99999px;width:${cssW}px;height:${cssH}px;overflow:hidden;pointer-events:none;`;
    const clone = el.cloneNode(true) as HTMLElement;
    clone.style.zoom = '1';
    clone.style.transform = 'none';
    clone.style.width = `${cssW}px`;
    clone.style.height = `${cssH}px`;
    clone.style.borderRadius = '0px';
    clone.style.border = 'none';
    clone.style.boxShadow = 'none';
    clone.style.position = 'relative';
    clone.style.left = '0';
    clone.style.top = '0';
    // Remove backdrop filters in clone
    Array.from(clone.querySelectorAll<HTMLElement>('*')).forEach((node) => {
      try { node.style.backdropFilter = 'none'; } catch (_) {}
      try { (node.style as any).webkitBackdropFilter = 'none'; } catch (_) {}
    });
    wrapper.appendChild(clone);
    document.body.appendChild(wrapper);

    // Normalize oklch() colors → rgba() so html2canvas can parse them
    const colorCache = new Map<string, string>();
    const resolveOklch = (val: string): string => {
      if (!val || !val.includes('oklch')) return val;
      if (colorCache.has(val)) return colorCache.get(val)!;
      try {
        const c = document.createElement('canvas');
        c.width = c.height = 1;
        const ctx2d = c.getContext('2d')!;
        ctx2d.fillStyle = val;
        ctx2d.fillRect(0, 0, 1, 1);
        const [r, g, b, a] = ctx2d.getImageData(0, 0, 1, 1).data;
        const resolved = `rgba(${r},${g},${b},${(a / 255).toFixed(3)})`;
        colorCache.set(val, resolved);
        return resolved;
      } catch {
        return val;
      }
    };
    const COLOR_PROPS = [
      'color', 'background-color', 'border-top-color', 'border-right-color',
      'border-bottom-color', 'border-left-color', 'outline-color',
      'text-decoration-color', 'fill', 'stroke',
    ];
    const origElems = [el, ...Array.from(el.querySelectorAll<HTMLElement>('*'))];
    const cloneElems = [clone, ...Array.from(clone.querySelectorAll<HTMLElement>('*'))];
    origElems.forEach((origEl, idx) => {
      const cloneEl = cloneElems[idx] as HTMLElement | undefined;
      if (!cloneEl) return;
      try {
        const cs = window.getComputedStyle(origEl);
        COLOR_PROPS.forEach((prop) => {
          const v = cs.getPropertyValue(prop);
          if (!v || !v.includes('oklch')) return;
          const jsProp = prop.replace(/-([a-z])/g, (_: string, c: string) => c.toUpperCase());
          try { (cloneEl.style as any)[jsProp] = resolveOklch(v); } catch {}
        });
        const bg = cs.getPropertyValue('background');
        if (bg && bg.includes('oklch')) {
          try { cloneEl.style.background = resolveOklch(bg); } catch {}
        }
      } catch {}
    });

    try {
      const html2canvas = (await import('html2canvas')).default;

      const bgColor: string | null =
        background === 'black' ? '#000000' : background === 'white' ? '#ffffff' : null;

      setStatus({ text: `正在以 ${resolution}x 分辨率截图…`, type: 'loading' });

      const canvas = await html2canvas(clone, {
        scale: resolution,
        useCORS: true,
        allowTaint: false,
        logging: false,
        backgroundColor: bgColor,
        width: cssW,
        height: cssH,
      });

      setStatus({ text: '正在生成文件…', type: 'loading' });

      const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
      const quality = format === 'jpeg' ? 0.95 : 1.0;
      const dataUrl = canvas.toDataURL(mimeType, quality);

      const ts = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
      const ext = format === 'jpeg' ? 'jpg' : 'png';
      const filename = `控制中心_${resolution}x_${ts}.${ext}`;

      const link = document.createElement('a');
      link.download = filename;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      link.remove();

      setStatus({ text: '✅ 导出成功！文件已保存', type: 'success' });
      setTimeout(onClose, 1800);
    } catch (err) {
      console.error('Export failed:', err);
      setStatus({ text: `❌ 导出失败：${err instanceof Error ? err.message : '未知错误'}`, type: 'error' });
      setIsExporting(false);
    } finally {
      try { if (wrapper.parentNode) wrapper.parentNode.removeChild(wrapper); } catch (_) {}
    }
  };

  const btnStyle = (active: boolean): React.CSSProperties => ({
    flex: 1,
    padding: '10px 6px',
    borderRadius: 10,
    border: active ? '2px solid #667eea' : '1px solid rgba(255,255,255,0.08)',
    background: active ? 'rgba(102,126,234,0.15)' : 'rgba(255,255,255,0.03)',
    color: active ? '#a5b4fc' : 'rgba(255,255,255,0.6)',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: active ? 700 : 500,
    transition: 'all 0.18s ease',
    textAlign: 'center' as const,
  });

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.75)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999,
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          background: 'linear-gradient(180deg, #202020 0%, #161616 100%)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 20,
          padding: 32,
          width: 460,
          boxShadow: '0 40px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04)',
          color: '#fff',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg,#667eea,#764ba2)', display: 'grid', placeItems: 'center' }}>
              <Download size={20} color="#fff" />
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800 }}>导出图片</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>选择导出格式与分辨率</div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', display: 'grid', placeItems: 'center' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Resolution */}
        <div style={{ marginBottom: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <Zap size={14} color="#667eea" />
            <span style={{ fontSize: 14, fontWeight: 700 }}>分辨率倍数</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {RESOLUTIONS.map((r) => (
              <button key={r.value} onClick={() => setResolution(r.value)} style={btnStyle(resolution === r.value)}>
                <div style={{ fontSize: 15, fontWeight: 700 }}>{r.label}</div>
                <div style={{ fontSize: 11, marginTop: 2, opacity: 0.7 }}>{r.desc}</div>
                {r.badge && (
                  <div style={{ fontSize: 10, marginTop: 3, background: '#667eea', color: '#fff', borderRadius: 4, padding: '1px 5px', display: 'inline-block' }}>
                    {r.badge}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Format */}
        <div style={{ marginBottom: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <Image size={14} color="#667eea" />
            <span style={{ fontSize: 14, fontWeight: 700 }}>文件格式</span>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            {FORMATS.map((f) => (
              <button key={f.value} onClick={() => setFormat(f.value)} style={{ ...btnStyle(format === f.value), flex: 1, padding: '12px 16px' }}>
                <div style={{ fontSize: 16, fontWeight: 800 }}>{f.label}</div>
                <div style={{ fontSize: 11, marginTop: 3, opacity: 0.65 }}>{f.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Background */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <Settings2 size={14} color="#667eea" />
            <span style={{ fontSize: 14, fontWeight: 700 }}>背景色</span>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            {BACKGROUNDS.map((b) => (
              <button
                key={b.value}
                onClick={() => setBackground(b.value)}
                style={{
                  ...btnStyle(background === b.value),
                  flex: 1,
                  padding: '10px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                <div
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: 4,
                    background: b.color,
                    border: b.value === 'original'
                      ? '1px dashed rgba(255,255,255,0.3)'
                      : '1px solid rgba(255,255,255,0.15)',
                  }}
                />
                <span>{b.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Estimated output info */}
        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: '10px 14px', marginBottom: 20, fontSize: 12, color: 'rgba(255,255,255,0.45)', display: 'flex', justifyContent: 'space-between' }}>
          <span>输出尺寸：约 {1080 * resolution} × {1920 * resolution} px</span>
          <span>预计大小：~{estimateSizeMB()} MB</span>
        </div>

        {/* Status */}
        {status.text ? (
          <div style={{
            marginBottom: 16,
            padding: '10px 14px',
            borderRadius: 10,
            fontSize: 13,
            background: status.type === 'success'
              ? 'rgba(16,185,129,0.12)'
              : status.type === 'error'
                ? 'rgba(239,68,68,0.12)'
                : 'rgba(102,126,234,0.12)',
            color: status.type === 'success' ? '#34d399' : status.type === 'error' ? '#f87171' : '#a5b4fc',
            border: `1px solid ${status.type === 'success' ? 'rgba(16,185,129,0.2)' : status.type === 'error' ? 'rgba(239,68,68,0.2)' : 'rgba(102,126,234,0.2)'}`,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}>
            {status.type === 'loading' ? (
              <div style={{ width: 14, height: 14, border: '2px solid rgba(165,180,252,0.3)', borderTopColor: '#a5b4fc', borderRadius: '50%', animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />
            ) : null}
            {status.text}
          </div>
        ) : null}

        {/* Export button */}
        <button
          onClick={handleExport}
          disabled={isExporting}
          style={{
            width: '100%',
            padding: '15px',
            borderRadius: 14,
            background: isExporting
              ? 'rgba(102,126,234,0.3)'
              : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            border: 'none',
            color: '#fff',
            cursor: isExporting ? 'not-allowed' : 'pointer',
            fontSize: 16,
            fontWeight: 800,
            letterSpacing: '0.3px',
            boxShadow: isExporting ? 'none' : '0 8px 24px rgba(102,126,234,0.4)',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
          }}
        >
          {isExporting ? (
            <>
              <div style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              正在导出…
            </>
          ) : (
            <>
              <Download size={18} />
              导出 {resolution}x {format.toUpperCase()}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
