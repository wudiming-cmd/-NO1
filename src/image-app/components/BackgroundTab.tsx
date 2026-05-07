import { Upload, Trash2, ChevronUp, ChevronDown, Image as ImageIcon } from 'lucide-react';
import { useState } from 'react';
import { removeBackground } from '../utils/removeBg';

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

interface BackgroundTabProps {
  backgroundLayers: BackgroundLayer[];
  backgroundBlur: number;
  onAddBackground: (src: string, name: string) => void;
  onRemoveLayer: (layerId: string) => void;
  onUpdateLayer: (layerId: string, updates: Partial<BackgroundLayer>) => void;
  onMoveLayer: (layerId: string, direction: 'up' | 'down') => void;
  onClearLayers: () => void;
  onBlurChange: (blur: number) => void;
}

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
  const [autoRemoveBg, setAutoRemoveBg] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingLayerId, setProcessingLayerId] = useState<string | null>(null);

  const handleRemoveBackgroundForLayer = async (layer: BackgroundLayer) => {
    setProcessingLayerId(layer.id);
    try {
      // 将 data URL 转换为 Blob
      const response = await fetch(layer.src);
      const blob = await response.blob();

      // 调用 remove.bg API
      const resultBlob = await removeBackground(blob);

      // 将结果转换回 data URL
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          onUpdateLayer(layer.id, { src: event.target.result as string });
        }
        setProcessingLayerId(null);
      };
      reader.readAsDataURL(resultBlob);
    } catch (error) {
      console.error('Failed to remove background:', error);
      alert(`抠图失败: ${error instanceof Error ? error.message : '未知错误'}`);
      setProcessingLayerId(null);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setIsProcessing(true);

      for (const file of Array.from(files)) {
        try {
          if (autoRemoveBg) {
            // 使用 remove.bg API 抠图
            const resultBlob = await removeBackground(file);
            const reader = new FileReader();
            reader.onload = (event) => {
              if (event.target?.result) {
                onAddBackground(event.target.result as string, file.name.replace(/\.[^/.]+$/, '') + '_no_bg.png');
              }
            };
            reader.readAsDataURL(resultBlob);
          } else {
            // 直接上传
            const reader = new FileReader();
            reader.onload = (event) => {
              if (event.target?.result) {
                onAddBackground(event.target.result as string, file.name);
              }
            };
            reader.readAsDataURL(file);
          }
        } catch (error) {
          console.error('Failed to process image:', error);
          alert(`处理图片 ${file.name} 失败: ${error instanceof Error ? error.message : '未知错误'}`);
        }
      }

      setIsProcessing(false);
    }
    // 重置input，允许重复上传同一文件
    e.target.value = '';
  };

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* 上传背景 */}
      <div>
        <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', color: '#fff' }}>
          上传背景图片
        </div>

        {/* 自动抠图选项 */}
        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '8px 12px', background: '#1a1a1a', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <input
              type="checkbox"
              checked={autoRemoveBg}
              onChange={(e) => setAutoRemoveBg(e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            <div>
              <div style={{ fontSize: '13px', color: '#fff', fontWeight: 500 }}>自动抠图 (Remove.bg)</div>
              <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>上传时自动移除背景</div>
            </div>
          </label>
        </div>

        <input
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileUpload}
          style={{ display: 'none' }}
          id="background-upload"
          disabled={isProcessing}
        />
        <label
          htmlFor="background-upload"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '32px',
            border: '2px dashed rgba(255,255,255,0.2)',
            borderRadius: '16px',
            cursor: isProcessing ? 'not-allowed' : 'pointer',
            background: isProcessing ? '#0f0f0f' : '#1a1a1a',
            transition: 'all 0.2s',
            opacity: isProcessing ? 0.6 : 1,
          }}
          onMouseEnter={(e) => {
            if (!isProcessing) {
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.4)';
              e.currentTarget.style.background = '#222';
            }
          }}
          onMouseLeave={(e) => {
            if (!isProcessing) {
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
              e.currentTarget.style.background = '#1a1a1a';
            }
          }}
        >
          <Upload size={32} color="#8f8f8f" />
          <div style={{ marginTop: '12px', fontSize: '14px', color: '#8f8f8f' }}>
            {isProcessing ? '处理中...' : '点击上传图片（支持多选）'}
          </div>
          <div style={{ marginTop: '4px', fontSize: '11px', color: '#666' }}>
            {autoRemoveBg ? '将自动移除背景' : '支持PNG透明背景图片'}
          </div>
        </label>
      </div>

      {/* 模糊度控制 */}
      <div>
        <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', color: '#fff' }}>
          背景模糊: {backgroundBlur}px
        </div>
        <input
          type="range"
          min="0"
          max="50"
          value={backgroundBlur}
          onChange={(e) => onBlurChange(Number(e.target.value))}
          style={{
            width: '100%',
            height: '6px',
            borderRadius: '3px',
            background: '#333',
            outline: 'none',
            cursor: 'pointer',
          }}
        />
      </div>

      {/* 图层列表 */}
      {backgroundLayers.length > 0 && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#fff' }}>
              背景图层 ({backgroundLayers.length})
            </div>
            <button
              onClick={onClearLayers}
              style={{
                padding: '6px 12px',
                background: '#dc3545',
                border: 'none',
                borderRadius: '8px',
                color: '#fff',
                cursor: 'pointer',
                fontSize: '12px',
              }}
            >
              清空全部
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {backgroundLayers.map((layer, index) => (
              <div
                key={layer.id}
                style={{
                  padding: '12px',
                  background: '#1a1a1a',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                }}
              >
                <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                  <img
                    src={layer.src}
                    alt={layer.name}
                    style={{
                      width: '60px',
                      height: '60px',
                      objectFit: 'cover',
                      borderRadius: '8px',
                      border: '1px solid rgba(255,255,255,0.1)',
                    }}
                  />
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 500, color: '#fff', marginBottom: '4px' }}>
                        {layer.name.length > 20 ? layer.name.substring(0, 20) + '...' : layer.name}
                      </div>
                      <div style={{ fontSize: '11px', color: '#666' }}>
                        图层 {index + 1}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        onClick={() => onMoveLayer(layer.id, 'up')}
                        disabled={index === 0}
                        style={{
                          padding: '4px',
                          background: index === 0 ? '#222' : '#333',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: index === 0 ? 'not-allowed' : 'pointer',
                          opacity: index === 0 ? 0.5 : 1,
                        }}
                      >
                        <ChevronUp size={16} color="#fff" />
                      </button>
                      <button
                        onClick={() => onMoveLayer(layer.id, 'down')}
                        disabled={index === backgroundLayers.length - 1}
                        style={{
                          padding: '4px',
                          background: index === backgroundLayers.length - 1 ? '#222' : '#333',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: index === backgroundLayers.length - 1 ? 'not-allowed' : 'pointer',
                          opacity: index === backgroundLayers.length - 1 ? 0.5 : 1,
                        }}
                      >
                        <ChevronDown size={16} color="#fff" />
                      </button>
                      <button
                        onClick={() => onRemoveLayer(layer.id)}
                        style={{
                          padding: '4px',
                          background: '#dc3545',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                        }}
                      >
                        <Trash2 size={16} color="#fff" />
                      </button>
                    </div>
                  </div>
                </div>
                <div style={{ marginBottom: '8px' }}>
                  <div style={{ fontSize: '12px', color: '#8f8f8f', marginBottom: '4px' }}>
                    透明度: {Math.round(layer.opacity * 100)}%
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={layer.opacity * 100}
                    onChange={(e) =>
                      onUpdateLayer(layer.id, { opacity: Number(e.target.value) / 100 })
                    }
                    style={{
                      width: '100%',
                      height: '4px',
                      borderRadius: '2px',
                      background: '#333',
                      outline: 'none',
                      cursor: 'pointer',
                    }}
                  />
                </div>
                <div style={{ marginBottom: '8px' }}>
                  <div style={{ fontSize: '12px', color: '#8f8f8f', marginBottom: '4px' }}>
                    缩放: {Math.round((layer.scale || 1) * 100)}%
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="300"
                    value={(layer.scale || 1) * 100}
                    onChange={(e) =>
                      onUpdateLayer(layer.id, { scale: Number(e.target.value) / 100 })
                    }
                    style={{
                      width: '100%',
                      height: '4px',
                      borderRadius: '2px',
                      background: '#333',
                      outline: 'none',
                      cursor: 'pointer',
                    }}
                  />
                </div>
                <div style={{ marginBottom: '8px' }}>
                  <div style={{ fontSize: '12px', color: '#8f8f8f', marginBottom: '4px' }}>
                    水平位置: {layer.positionX || 0}px
                  </div>
                  <input
                    type="range"
                    min="-2000"
                    max="2000"
                    value={layer.positionX || 0}
                    onChange={(e) =>
                      onUpdateLayer(layer.id, { positionX: Number(e.target.value) })
                    }
                    style={{
                      width: '100%',
                      height: '4px',
                      borderRadius: '2px',
                      background: '#333',
                      outline: 'none',
                      cursor: 'pointer',
                    }}
                  />
                </div>
                <div style={{ marginBottom: '8px' }}>
                  <div style={{ fontSize: '12px', color: '#8f8f8f', marginBottom: '4px' }}>
                    垂直位置: {layer.positionY || 0}px
                  </div>
                  <input
                    type="range"
                    min="-2000"
                    max="2000"
                    value={layer.positionY || 0}
                    onChange={(e) =>
                      onUpdateLayer(layer.id, { positionY: Number(e.target.value) })
                    }
                    style={{
                      width: '100%',
                      height: '4px',
                      borderRadius: '2px',
                      background: '#333',
                      outline: 'none',
                      cursor: 'pointer',
                    }}
                  />
                </div>
                <div style={{ marginBottom: '8px' }}>
                  <div style={{ fontSize: '12px', color: '#8f8f8f', marginBottom: '4px' }}>
                    图片适配
                  </div>
                  <select
                    value={layer.fit || 'contain'}
                    onChange={(e) => onUpdateLayer(layer.id, { fit: e.target.value as 'cover' | 'contain' })}
                    style={{
                      width: '100%',
                      padding: '8px',
                      background: '#222',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '12px',
                      outline: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    <option value="contain">完整显示（不裁剪）</option>
                    <option value="cover">填充满（可能裁剪）</option>
                  </select>
                </div>
                <div style={{ marginBottom: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <div style={{ fontSize: '12px', color: '#8f8f8f' }}>
                      混合模式
                    </div>
                    <button
                      onClick={() => onUpdateLayer(layer.id, { scale: 1, positionX: 0, positionY: 0 })}
                      style={{
                        padding: '4px 8px',
                        background: '#333',
                        border: 'none',
                        borderRadius: '6px',
                        color: '#fff',
                        cursor: 'pointer',
                        fontSize: '10px',
                      }}
                    >
                      重置位置
                    </button>
                  </div>
                  <select
                    value={layer.blendMode}
                    onChange={(e) => onUpdateLayer(layer.id, { blendMode: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px',
                      background: '#222',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '12px',
                      outline: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    <option value="normal">正常</option>
                    <option value="multiply">正片叠底</option>
                    <option value="screen">滤色</option>
                    <option value="overlay">叠加</option>
                    <option value="darken">变暗</option>
                    <option value="lighten">变亮</option>
                    <option value="color-dodge">颜色减淡</option>
                    <option value="color-burn">颜色加深</option>
                    <option value="hard-light">强光</option>
                    <option value="soft-light">柔光</option>
                    <option value="difference">差值</option>
                    <option value="exclusion">排除</option>
                  </select>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={layer.cutout}
                      onChange={(e) => onUpdateLayer(layer.id, { cutout: e.target.checked })}
                      style={{ cursor: 'pointer' }}
                    />
                    <span style={{ fontSize: '12px', color: '#8f8f8f' }}>背景移除滤镜</span>
                  </label>
                  <button
                    onClick={() => handleRemoveBackgroundForLayer(layer)}
                    disabled={processingLayerId === layer.id}
                    style={{
                      padding: '6px 12px',
                      background: processingLayerId === layer.id ? '#555' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      border: 'none',
                      borderRadius: '6px',
                      color: '#fff',
                      cursor: processingLayerId === layer.id ? 'not-allowed' : 'pointer',
                      fontSize: '11px',
                      fontWeight: 600,
                      opacity: processingLayerId === layer.id ? 0.6 : 1,
                    }}
                  >
                    {processingLayerId === layer.id ? '处理中...' : 'AI抠图'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
