import { ModuleData } from '../types';

interface ModuleCardProps {
  module: ModuleData;
  isSelected: boolean;
  onClick: () => void;
}

export function ModuleCard({ module, isSelected, onClick }: ModuleCardProps) {
  const { icon: Icon, label, position, backgroundColor, borderColor, iconColor, gradient, image, textColor } = module;

  const positionStyle = {
    position: 'absolute' as const,
    left: `${position.left}px`,
    top: `${position.top}px`,
    width: `${position.width}px`,
    height: `${position.height}px`,
    borderRadius: `${position.borderRadius}px`,
  };

  // iOS 风格的毛玻璃效果
  const backgroundStyle = gradient || backgroundColor || 'rgba(255, 255, 255, 0.3)';
  const border = borderColor ? `3px solid ${borderColor}` : 'none';

  return (
    <div
      style={positionStyle}
      onClick={onClick}
      className={`cursor-pointer transition-all duration-200 ${
        isSelected ? 'ring-4 ring-blue-400 scale-[1.02] z-10' : ''
      }`}
    >
      <div
        className="w-full h-full overflow-hidden relative flex flex-col items-center justify-center"
        style={{
          background: backgroundStyle,
          border,
          borderRadius: `${position.borderRadius}px`,
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          boxShadow: '0 4px 30px rgba(0, 0, 0, 0.1)',
        }}
      >
        {/* 背景图片 */}
        {image && (
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `url(${image})`,
              opacity: 0.5,
              filter: 'blur(2px)',
            }}
          />
        )}

        {/* 图标和标签 */}
        <div className="relative z-10 flex flex-col items-center justify-center gap-3 p-4">
          {Icon && (
            <Icon
              className="w-12 h-12"
              style={{ color: iconColor || '#FFFFFF', strokeWidth: 2.5 }}
            />
          )}
          {label && (
            <span
              className="text-sm font-medium text-center"
              style={{ color: textColor || iconColor || '#FFFFFF' }}
            >
              {label}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
