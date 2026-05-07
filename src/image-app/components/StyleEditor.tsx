import { useState } from 'react';
import { X, Palette, Sparkles } from 'lucide-react';
import { ModuleStyle } from './ControlCenterModule';

interface StyleEditorProps {
  moduleId: string;
  currentStyle: ModuleStyle;
  onStyleChange: (style: ModuleStyle) => void;
  onClose: () => void;
}

export function StyleEditor({ moduleId, currentStyle, onStyleChange, onClose }: StyleEditorProps) {
  const [style, setStyle] = useState<ModuleStyle>(currentStyle);
  const [gradientType, setGradientType] = useState<'linear' | 'radial'>(
    currentStyle.gradient?.type || 'linear'
  );
  const [color1, setColor1] = useState(currentStyle.gradient?.colors[0] || '#000000');
  const [color2, setColor2] = useState(currentStyle.gradient?.colors[1] || '#ffffff');
  const [angle, setAngle] = useState(currentStyle.gradient?.angle || 135);

  const presetColors = [
    '#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff',
    '#ffff00', '#ff00ff', '#00ffff', '#ff8800', '#8800ff',
  ];

  const presetGradients = [
    { colors: ['#667eea', '#764ba2'], angle: 135 },
    { colors: ['#f093fb', '#f5576c'], angle: 135 },
    { colors: ['#4facfe', '#00f2fe'], angle: 135 },
    { colors: ['#43e97b', '#38f9d7'], angle: 135 },
    { colors: ['#fa709a', '#fee140'], angle: 135 },
    { colors: ['#30cfd0', '#330867'], angle: 135 },
    { colors: ['#a8edea', '#fed6e3'], angle: 135 },
    { colors: ['#ff9a56', '#ff6a88'], angle: 135 },
  ];

  const handleSolidColor = (color: string) => {
    const newStyle = {
      ...style,
      backgroundColor: color,
      gradient: undefined,
    };
    setStyle(newStyle);
    onStyleChange(newStyle);
  };

  const handleGradient = () => {
    const newStyle = {
      ...style,
      backgroundColor: undefined,
      gradient: {
        type: gradientType,
        colors: [color1, color2],
        angle: gradientType === 'linear' ? angle : undefined,
      },
    };
    setStyle(newStyle);
    onStyleChange(newStyle);
  };

  const handlePresetGradient = (preset: { colors: string[]; angle: number }) => {
    const newStyle = {
      ...style,
      backgroundColor: undefined,
      gradient: {
        type: 'linear' as const,
        colors: preset.colors,
        angle: preset.angle,
      },
    };
    setStyle(newStyle);
    setColor1(preset.colors[0]);
    setColor2(preset.colors[1]);
    setAngle(preset.angle);
    onStyleChange(newStyle);
  };

  const handleTexture = (texture: string) => {
    const newStyle = {
      ...style,
      texture: style.texture === texture ? undefined : texture,
    };
    setStyle(newStyle);
    onStyleChange(newStyle);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between rounded-t-3xl">
          <h2 className="text-xl">模块样式编辑器</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* 纯色选择 */}
          <div>
            <h3 className="flex items-center gap-2 mb-3">
              <Palette className="w-5 h-5" />
              纯色背景
            </h3>
            <div className="grid grid-cols-5 gap-2">
              {presetColors.map((color) => (
                <button
                  key={color}
                  onClick={() => handleSolidColor(color)}
                  className="w-full aspect-square rounded-lg border-2 border-gray-300 hover:border-blue-500 transition-all hover:scale-110"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
            <div className="mt-3">
              <label className="block text-sm mb-2">自定义颜色</label>
              <input
                type="color"
                onChange={(e) => handleSolidColor(e.target.value)}
                className="w-full h-12 rounded-lg cursor-pointer"
              />
            </div>
          </div>

          {/* 渐变选择 */}
          <div>
            <h3 className="flex items-center gap-2 mb-3">
              <Sparkles className="w-5 h-5" />
              渐变背景
            </h3>
            
            {/* 预设渐变 */}
            <div className="mb-4">
              <label className="block text-sm mb-2">预设渐变</label>
              <div className="grid grid-cols-4 gap-2">
                {presetGradients.map((preset, index) => (
                  <button
                    key={index}
                    onClick={() => handlePresetGradient(preset)}
                    className="w-full aspect-square rounded-lg border-2 border-gray-300 hover:border-blue-500 transition-all hover:scale-110"
                    style={{
                      background: `linear-gradient(${preset.angle}deg, ${preset.colors[0]}, ${preset.colors[1]})`,
                    }}
                  />
                ))}
              </div>
            </div>

            {/* 自定义渐变 */}
            <div className="space-y-3">
              <div>
                <label className="block text-sm mb-2">渐变类型</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setGradientType('linear')}
                    className={`flex-1 py-2 px-4 rounded-lg border-2 transition-colors ${
                      gradientType === 'linear'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-300'
                    }`}
                  >
                    线性渐变
                  </button>
                  <button
                    onClick={() => setGradientType('radial')}
                    className={`flex-1 py-2 px-4 rounded-lg border-2 transition-colors ${
                      gradientType === 'radial'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-300'
                    }`}
                  >
                    径向渐变
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm mb-2">颜色 1</label>
                <input
                  type="color"
                  value={color1}
                  onChange={(e) => setColor1(e.target.value)}
                  className="w-full h-12 rounded-lg cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-sm mb-2">颜色 2</label>
                <input
                  type="color"
                  value={color2}
                  onChange={(e) => setColor2(e.target.value)}
                  className="w-full h-12 rounded-lg cursor-pointer"
                />
              </div>

              {gradientType === 'linear' && (
                <div>
                  <label className="block text-sm mb-2">角度: {angle}°</label>
                  <input
                    type="range"
                    min="0"
                    max="360"
                    value={angle}
                    onChange={(e) => setAngle(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
              )}

              <button
                onClick={handleGradient}
                className="w-full py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                应用渐变
              </button>
            </div>
          </div>

          {/* 纹理选择 */}
          <div>
            <h3 className="mb-3">纹理效果</h3>
            <div className="grid grid-cols-2 gap-3">
              {['dots', 'lines', 'grid', 'noise'].map((texture) => (
                <button
                  key={texture}
                  onClick={() => handleTexture(texture)}
                  className={`py-3 px-4 rounded-lg border-2 transition-all hover:scale-105 ${
                    style.texture === texture
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300'
                  }`}
                >
                  {texture === 'dots' && '圆点'}
                  {texture === 'lines' && '斜线'}
                  {texture === 'grid' && '网格'}
                  {texture === 'noise' && '噪点'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
