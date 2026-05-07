interface ColorPickerProps {
  backgroundColor: string;
  iconColor: string;
  borderColor?: string;
  borderRadius: number;
  gradient?: string;
  onBackgroundChange: (color: string) => void;
  onIconColorChange: (color: string) => void;
  onBorderColorChange: (color: string) => void;
  onBorderRadiusChange: (radius: number) => void;
  onGradientAngleChange?: (angle: number) => void;
}

const presetColors = [
  '#000000', '#FFFFFF', '#FFD93D', '#F5F5DC', '#4A5FBE',
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
  '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B500', '#D3D3D3',
  '#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe',
];

// 解析渐变角度
function parseGradientAngle(gradient?: string): number {
  if (!gradient) return 135;
  const match = gradient.match(/(\d+)deg/);
  return match ? parseInt(match[1]) : 135;
}

export function ColorPicker({
  backgroundColor,
  iconColor,
  borderColor,
  borderRadius,
  gradient,
  onBackgroundChange,
  onIconColorChange,
  onBorderColorChange,
  onBorderRadiusChange,
  onGradientAngleChange,
}: ColorPickerProps) {
  const gradientAngle = parseGradientAngle(gradient);

  return (
    <div className="space-y-5">
      {/* 背景色 */}
      <div>
        <label className="block text-sm font-medium mb-2 text-gray-700">背景颜色</label>
        <div className="flex gap-2">
          <input
            type="color"
            value={backgroundColor}
            onChange={(e) => onBackgroundChange(e.target.value)}
            className="w-16 h-10 rounded cursor-pointer border border-gray-300"
          />
          <input
            type="text"
            value={backgroundColor}
            onChange={(e) => onBackgroundChange(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            placeholder="#FFD93D"
          />
        </div>
        <div className="grid grid-cols-5 gap-2 mt-3">
          {presetColors.map((color) => (
            <button
              key={color}
              onClick={() => onBackgroundChange(color)}
              className={`w-full aspect-square rounded-lg border-2 transition-all hover:scale-110 ${
                backgroundColor === color ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-300'
              }`}
              style={{ backgroundColor: color }}
              title={color}
            />
          ))}
        </div>
      </div>

      {/* 渐变角度控制 */}
      {gradient && onGradientAngleChange && (
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-4 border border-purple-200">
          <label className="block text-sm font-medium mb-2 text-purple-700">
            渐变方向: {gradientAngle}°
          </label>
          <input
            type="range"
            min="0"
            max="360"
            value={gradientAngle}
            onChange={(e) => onGradientAngleChange(Number(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-500"
          />
          <div className="flex justify-between text-xs text-gray-600 mt-2">
            <span>0° →</span>
            <span>90° ↑</span>
            <span>180° ←</span>
            <span>270° ↓</span>
          </div>
          {/* 快捷角度按钮 */}
          <div className="grid grid-cols-4 gap-2 mt-3">
            {[0, 90, 180, 270].map((angle) => (
              <button
                key={angle}
                onClick={() => onGradientAngleChange(angle)}
                className={`py-2 px-3 text-xs rounded-lg border-2 transition-all ${
                  gradientAngle === angle
                    ? 'border-purple-500 bg-purple-100 text-purple-700'
                    : 'border-gray-300 hover:border-purple-300'
                }`}
              >
                {angle}°
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 图标颜色 */}
      <div>
        <label className="block text-sm font-medium mb-2 text-gray-700">图标颜色</label>
        <div className="flex gap-2">
          <input
            type="color"
            value={iconColor}
            onChange={(e) => onIconColorChange(e.target.value)}
            className="w-16 h-10 rounded cursor-pointer border border-gray-300"
          />
          <input
            type="text"
            value={iconColor}
            onChange={(e) => onIconColorChange(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            placeholder="#FFFFFF"
          />
        </div>
      </div>

      {/* 边框颜色 */}
      <div>
        <label className="block text-sm font-medium mb-2 text-gray-700">边框颜色（可选）</label>
        <div className="flex gap-2">
          <input
            type="color"
            value={borderColor || '#000000'}
            onChange={(e) => onBorderColorChange(e.target.value)}
            className="w-16 h-10 rounded cursor-pointer border border-gray-300"
          />
          <input
            type="text"
            value={borderColor || ''}
            onChange={(e) => onBorderColorChange(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            placeholder="留空为无边框"
          />
        </div>
        {borderColor && (
          <button
            onClick={() => onBorderColorChange('')}
            className="mt-2 text-sm text-red-500 hover:text-red-600"
          >
            移除边框
          </button>
        )}
      </div>

      {/* 圆角滑块 */}
      <div>
        <label className="block text-sm font-medium mb-2 text-gray-700">
          圆角大小: {borderRadius}px
        </label>
        <input
          type="range"
          min="0"
          max="200"
          value={borderRadius}
          onChange={(e) => onBorderRadiusChange(Number(e.target.value))}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>直角 (0)</span>
          <span>圆形 (200)</span>
        </div>
        {/* 预设圆角 */}
        <div className="grid grid-cols-4 gap-2 mt-3">
          {[0, 20, 62, 142].map((radius) => (
            <button
              key={radius}
              onClick={() => onBorderRadiusChange(radius)}
              className={`py-2 px-3 text-xs rounded-lg border-2 transition-all ${
                borderRadius === radius
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-300 hover:border-blue-300'
              }`}
            >
              {radius === 0 && '直角'}
              {radius === 20 && '小圆角'}
              {radius === 62 && '中圆角'}
              {radius === 142 && '圆形'}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
