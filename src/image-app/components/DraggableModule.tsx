import { useState, useEffect } from 'react';
import { ModuleData } from '../types';

interface DraggableModuleProps {
  module: ModuleData;
  isSelected: boolean;
  onClick: () => void;
  onMove?: (id: string, left: number, top: number) => void;
  gridSize: number;
}

export function DraggableModule({
  module,
  isSelected,
  onClick,
  onMove,
  gridSize,
}: DraggableModuleProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const { icon: Icon, label, position, backgroundColor, borderColor, iconColor, gradient, image, textColor } = module;

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) {
      e.preventDefault();
      setIsDragging(true);
      setDragOffset({
        x: e.clientX - position.left,
        y: e.clientY - position.top,
      });
      onClick();
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging && onMove) {
      let newLeft = e.clientX - dragOffset.x;
      let newTop = e.clientY - dragOffset.y;

      newLeft = Math.round(newLeft / gridSize) * gridSize;
      newTop = Math.round(newTop / gridSize) * gridSize;

      newLeft = Math.max(0, Math.min(newLeft, 1080 - position.width));
      newTop = Math.max(0, Math.min(newTop, 1820 - position.height));

      onMove(module.id, newLeft, newTop);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDragging]);

  const positionStyle = {
    position: 'absolute' as const,
    left: `${position.left}px`,
    top: `${position.top}px`,
    width: `${position.width}px`,
    height: `${position.height}px`,
    borderRadius: `${position.borderRadius}px`,
    cursor: isDragging ? 'grabbing' : 'grab',
  };

  const backgroundStyle = gradient || backgroundColor || 'rgba(255, 255, 255, 0.3)';
  const border = borderColor ? `3px solid ${borderColor}` : 'none';

  return (
    <div
      style={positionStyle}
      onMouseDown={handleMouseDown}
      className={`transition-all duration-100 ${
        isSelected ? 'ring-4 ring-blue-400 scale-[1.02] z-10' : ''
      } ${isDragging ? 'opacity-80 z-20' : ''}`}
    >
      <div
        className="w-full h-full overflow-hidden relative flex flex-col items-center justify-center"
        style={{
          background: backgroundStyle,
          border,
          borderRadius: `${position.borderRadius}px`,
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          boxShadow: isDragging
            ? '0 10px 40px rgba(0, 0, 0, 0.3)'
            : '0 4px 30px rgba(0, 0, 0, 0.1)',
        }}
      >
        {/* 背景图片 - 修复：确保图片正确显示 */}
        {image && (
          <img
            src={image}
            alt=""
            className="absolute inset-0 w-full h-full object-cover pointer-events-none"
            style={{
              opacity: 0.6,
              mixBlendMode: 'normal',
            }}
          />
        )}

        {/* 半透明遮罩层 - 确保图标在图片上方可见 */}
        {image && (
          <div
            className="absolute inset-0 bg-black/20 pointer-events-none"
            style={{ backdropFilter: 'blur(2px)' }}
          />
        )}

        {/* 图标和标签 */}
        <div className="relative z-10 flex flex-col items-center justify-center gap-2 p-4 pointer-events-none">
          {Icon && (
            <Icon
              className="w-10 h-10 drop-shadow-lg"
              style={{ color: iconColor || '#FFFFFF', strokeWidth: 2.5 }}
            />
          )}
          {label && (
            <span
              className="text-xs font-medium text-center drop-shadow-md"
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
