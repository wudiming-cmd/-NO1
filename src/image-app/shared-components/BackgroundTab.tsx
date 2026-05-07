import { useState, useRef } from 'react';
import { Upload, Trash2, ChevronUp, ChevronDown, Eye, EyeOff, Layers } from 'lucide-react';

interface BackgroundLayer {
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
}

interface BackgroundTabProps {
  backgroundLayers: BackgroundLayer[];
  backgroundBlur: number;
  onAddBackground: (src: string, name: string) => void;
  onRemoveLayer: (layerId: string) => void;
  onUpdateLayer: (layerId: string, updates: Partial<BackgroundLayer>) => void;
  onMoveLayer: (layerId: string, direction: 'up' | 'down') => void;
  onClearLayers: () => void;
  onBlurChange: (value: number) => void;
}

const blendModes = [
  'normal', 'multiply', 'screen', 'overlay', 'darken',
  'lighten', 'color-dodge', 'color-burn', 'hard-light',
  'soft-light', 'difference', 'exclusion', 'hue',
  'saturation', 'color', 'luminosity',
];

const SECTION_STYLE: React.CSSProperties = {
  padding: '20px 24px',
  borderBottom: '1px solid rgba(255,255,255,0.05)',
};

const LABEL_STYLE: React.CSSProperties = {
  fontSize: 12,
  color: 'rgba(255,255,255,0.45)',
  fontWeight: 600,
  letterSpacing: 0.5,
  textTransform: 'uppercase' as const,
  marginBottom: 12,
};

const SLIDER_STYLE: React.CSSProperties = {
  width: '100%',
  accentColor: '#667eea',
  cursor: 'pointer',
};

export function BackgroundTab({
  backgroundLayers,
  backgroundBlur,
  onAddBackground,
  onRemoveLayer,
  onUpdateLayer,
  onMoveLayer,
  onClearLayers,
  onBlurChange,
}: BackgroundTabProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [expandedLayerId, setExpandedLayerId] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const src = reader.result as string;
      onAddBackground(src, file.name);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer?.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const src = reader.result as string;
      onAddBackground(src, file.name);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {/* 上传区域 */}
      <div style={SECTION_STYLE}>
        <div style={LABEL_STYLE}>添加背景图层</div>
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: '2px dashed rgba(102,126,234,0.3)',
            borderRadius: 16,
            padding: '28px 20px',
            textAlign: 'center',
            cursor: 'pointer',
            background: 'rgba(102,126,234,0.04)',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'rgba(102,126,234,0.6)';
            e.currentTarget.style.background = 'rgba(102,126,234,0.08)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'rgba(102,126,234,0.3)';
            e.currentTarget.style.background = 'rgba(102,126,234,0.04)';
          }}
        >
          <Upload size={24} color="rgba(102,126,234,0.8)" style={{ marginBottom: 8 }} />
          <div style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.8)', marginBottom: 4 }}>
            点击或拖拽上传背景图
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>
            支持 PNG、JPG、WebP
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
      </div>

      {/* 全局模糊 */}
      <div style={SECTION_STYLE}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={LABEL_STYLE}>背景模糊</div>
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>
            {backgroundBlur}px
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={40}
          value={backgroundBlur}
          onChange={(e) => onBlurChange(Number(e.target.value))}
          style={SLIDER_STYLE}
        />
      </div>

      {/* 图层列表 */}
      {backgroundLayers.length > 0 && (
        <div style={SECTION_STYLE}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ ...LABEL_STYLE, marginBottom: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Layers size={13} />
              图层管理
            </div>
            <button
              onClick={onClearLayers}
              style={{
                background: 'rgba(255,59,48,0.1)',
                color: 'rgba(255,59,48,0.8)',
                border: '1px solid rgba(255,59,48,0.2)',
                borderRadius: 8,
                padding: '4px 10px',
                fontSize: 12,
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              清空
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {backgroundLayers.map((layer, index) => {
              const isExpanded = expandedLayerId === layer.id;
              return (
                <div
                  key={layer.id}
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    borderRadius: 14,
                    border: '1px solid rgba(255,255,255,0.06)',
                    overflow: 'hidden',
                  }}
                >
                  {/* 图层头部 */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '12px 14px',
                      cursor: 'pointer',
                    }}
                    onClick={() => setExpandedLayerId(isExpanded ? null : layer.id)}
                  >
                    {/* 缩略图 */}
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 8,
                        overflow: 'hidden',
                        flexShrink: 0,
                        border: '1px solid rgba(255,255,255,0.08)',
                      }}
                    >
                      <img
                        src={layer.src}
                        alt={layer.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    </div>

                    {/* 名称 */}
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: 'rgba(255,255,255,0.85)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {layer.name}
                      </div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>
                        不透明度 {Math.round(layer.opacity * 100)}% · {layer.blendMode}
                      </div>
                    </div>

                    {/* 操作按钮 */}
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button
                        onClick={(e) => { e.stopPropagation(); onMoveLayer(layer.id, 'up'); }}
                        disabled={index === 0}
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 7,
                          border: 'none',
                          background: index === 0 ? 'transparent' : 'rgba(255,255,255,0.06)',
                          color: index === 0 ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.7)',
                          cursor: index === 0 ? 'default' : 'pointer',
                          display: 'grid',
                          placeItems: 'center',
                        }}
                      >
                        <ChevronUp size={14} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); onMoveLayer(layer.id, 'down'); }}
                        disabled={index === backgroundLayers.length - 1}
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 7,
                          border: 'none',
                          background: index === backgroundLayers.length - 1 ? 'transparent' : 'rgba(255,255,255,0.06)',
                          color: index === backgroundLayers.length - 1 ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.7)',
                          cursor: index === backgroundLayers.length - 1 ? 'default' : 'pointer',
                          display: 'grid',
                          placeItems: 'center',
                        }}
                      >
                        <ChevronDown size={14} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); onRemoveLayer(layer.id); }}
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 7,
                          border: 'none',
                          background: 'rgba(255,59,48,0.1)',
                          color: 'rgba(255,59,48,0.8)',
                          cursor: 'pointer',
                          display: 'grid',
                          placeItems: 'center',
                        }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {/* 展开的详细设置 */}
                  {isExpanded && (
                    <div
                      style={{
                        padding: '0 14px 14px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 14,
                        borderTop: '1px solid rgba(255,255,255,0.05)',
                        paddingTop: 14,
                      }}
                    >
                      {/* 不透明度 */}
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>不透明度</span>
                          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>
                            {Math.round(layer.opacity * 100)}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={1}
                          step={0.01}
                          value={layer.opacity}
                          onChange={(e) => onUpdateLayer(layer.id, { opacity: Number(e.target.value) })}
                          style={SLIDER_STYLE}
                        />
                      </div>

                      {/* 缩放 */}
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>缩放</span>
                          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>
                            {((layer.scale || 1) * 100).toFixed(0)}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0.5}
                          max={3}
                          step={0.01}
                          value={layer.scale || 1}
                          onChange={(e) => onUpdateLayer(layer.id, { scale: Number(e.target.value) })}
                          style={SLIDER_STYLE}
                        />
                      </div>

                      {/* X 偏移 */}
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>水平偏移</span>
                          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>
                            {layer.positionX || 0}px
                          </span>
                        </div>
                        <input
                          type="range"
                          min={-200}
                          max={200}
                          step={1}
                          value={layer.positionX || 0}
                          onChange={(e) => onUpdateLayer(layer.id, { positionX: Number(e.target.value) })}
                          style={SLIDER_STYLE}
                        />
                      </div>

                      {/* Y 偏移 */}
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>垂直偏移</span>
                          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>
                            {layer.positionY || 0}px
                          </span>
                        </div>
                        <input
                          type="range"
                          min={-200}
                          max={200}
                          step={1}
                          value={layer.positionY || 0}
                          onChange={(e) => onUpdateLayer(layer.id, { positionY: Number(e.target.value) })}
                          style={SLIDER_STYLE}
                        />
                      </div>

                      {/* 填充方式 */}
                      <div>
                        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>填充方式</div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          {(['cover', 'contain'] as const).map((fit) => (
                            <button
                              key={fit}
                              onClick={() => onUpdateLayer(layer.id, { fit })}
                              style={{
                                flex: 1,
                                padding: '8px 0',
                                borderRadius: 10,
                                border: 'none',
                                background: (layer.fit || 'contain') === fit
                                  ? 'linear-gradient(135deg, #667eea, #764ba2)'
                                  : 'rgba(255,255,255,0.04)',
                                color: '#fff',
                                cursor: 'pointer',
                                fontSize: 12,
                                fontWeight: 600,
                              }}
                            >
                              {fit === 'cover' ? '填充' : '适应'}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* 混合模式 */}
                      <div>
                        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>混合模式</div>
                        <select
                          value={layer.blendMode}
                          onChange={(e) => onUpdateLayer(layer.id, { blendMode: e.target.value })}
                          style={{
                            width: '100%',
                            padding: '10px 12px',
                            borderRadius: 10,
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            color: '#fff',
                            fontSize: 13,
                            cursor: 'pointer',
                            outline: 'none',
                          }}
                        >
                          {blendModes.map((mode) => (
                            <option key={mode} value={mode} style={{ background: '#1a1a1a' }}>
                              {mode}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* 抠图开关 */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>抠图模式</span>
                        <button
                          onClick={() => onUpdateLayer(layer.id, { cutout: !layer.cutout })}
                          style={{
                            width: 44,
                            height: 24,
                            borderRadius: 12,
                            border: 'none',
                            background: layer.cutout
                              ? 'linear-gradient(90deg, #667eea, #764ba2)'
                              : 'rgba(255,255,255,0.1)',
                            cursor: 'pointer',
                            position: 'relative',
                            transition: 'background 0.3s ease',
                          }}
                        >
                          <div
                            style={{
                              position: 'absolute',
                              width: 18,
                              height: 18,
                              borderRadius: '50%',
                              background: '#fff',
                              top: 3,
                              left: layer.cutout ? 23 : 3,
                              transition: 'left 0.3s ease',
                              boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
                            }}
                          />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {backgroundLayers.length === 0 && (
        <div style={{ padding: '32px 24px', textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: 13 }}>
          暂无背景图层，上传图片开始定制
        </div>
      )}
    </div>
  );
}
