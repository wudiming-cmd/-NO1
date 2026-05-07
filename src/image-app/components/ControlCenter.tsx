import { ModuleData } from '../types';
import { DraggableModule } from './DraggableModule';

interface ControlCenterProps {
  modules: ModuleData[];
  backgroundImage?: string;
  selectedModuleId: string | null;
  onModuleClick: (id: string) => void;
  onModuleMove?: (id: string, left: number, top: number) => void;
  showGrid?: boolean;
}

export function ControlCenter({
  modules,
  backgroundImage,
  selectedModuleId,
  onModuleClick,
  onModuleMove,
  showGrid = true,
}: ControlCenterProps) {
  const scale = 0.45;
  const phoneWidth = 1080;
  const phoneHeight = 1920;
  const gridSize = 20; // 网格大小 20px

  // 生成网格线
  const renderGrid = () => {
    const lines = [];
    const contentHeight = phoneHeight - 100;

    // 垂直线
    for (let x = 0; x <= phoneWidth; x += gridSize) {
      lines.push(
        <line
          key={`v-${x}`}
          x1={x}
          y1={0}
          x2={x}
          y2={contentHeight}
          stroke="rgba(100, 100, 255, 0.15)"
          strokeWidth="1"
        />
      );
    }

    // 水平线
    for (let y = 0; y <= contentHeight; y += gridSize) {
      lines.push(
        <line
          key={`h-${y}`}
          x1={0}
          y1={y}
          x2={phoneWidth}
          y2={y}
          stroke="rgba(100, 100, 255, 0.15)"
          strokeWidth="1"
        />
      );
    }

    return lines;
  };

  return (
    <div
      className="relative mx-auto"
      style={{
        transform: `scale(${scale})`,
        transformOrigin: 'top center',
      }}
    >
      {/* 手机外壳 */}
      <div
        className="relative bg-black rounded-[3rem] p-4 shadow-2xl"
        style={{ width: `${phoneWidth}px` }}
      >
        {/* 状态栏 */}
        <div className="flex justify-between items-center px-8 py-4 text-white text-base">
          <div className="flex items-center gap-2">
            <div className="flex flex-col gap-[2px]">
              <div className="w-[4px] h-[8px] bg-white rounded"></div>
              <div className="w-[4px] h-[10px] bg-white rounded"></div>
              <div className="w-[4px] h-[12px] bg-white rounded"></div>
              <div className="w-[4px] h-[14px] bg-white rounded"></div>
            </div>
            <svg className="w-5 h-5 ml-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12.55a11 11 0 0 1 14.08 0" />
              <path d="M1.42 9a16 16 0 0 1 21.16 0" />
              <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
              <circle cx="12" cy="20" r="1" />
            </svg>
          </div>
          <div className="font-semibold text-lg">12:30</div>
          <div className="flex items-center gap-2">
            <span>100%</span>
            <div className="w-7 h-4 border-2 border-white rounded-sm relative">
              <div className="absolute inset-[2px] bg-white rounded-[1px]"></div>
              <div className="absolute -right-[3px] top-1/2 -translate-y-1/2 w-[2px] h-2 bg-white rounded-r-sm"></div>
            </div>
          </div>
        </div>

        {/* 控制中心内容 */}
        <div
          className="relative rounded-[2.5rem] overflow-hidden"
          style={{
            width: `${phoneWidth}px`,
            height: `${phoneHeight - 100}px`,
            backgroundImage: backgroundImage
              ? `url(${backgroundImage})`
              : 'linear-gradient(135deg, #E8E8E8 0%, #F5F5F5 100%)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          {/* 网格可视化 */}
          {showGrid && (
            <svg
              className="absolute inset-0 pointer-events-none z-0"
              width={phoneWidth}
              height={phoneHeight - 100}
            >
              {renderGrid()}
            </svg>
          )}

          {/* 模块容器 */}
          <div className="relative w-full h-full">
            {modules.map((module) => (
              <DraggableModule
                key={module.id}
                module={module}
                isSelected={selectedModuleId === module.id}
                onClick={() => onModuleClick(module.id)}
                onMove={onModuleMove}
                gridSize={gridSize}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
