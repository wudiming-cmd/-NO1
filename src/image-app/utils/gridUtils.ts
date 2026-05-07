import { ModuleData, ModulePosition } from '../types';

// 画布配置
const CANVAS_WIDTH = 1080;
const CANVAS_HEIGHT = 1820;
const GRID_COLS = 4;
const GRID_ROWS = 6;
const GAP = 12; // 模块之间的间距
const PADDING = 50; // 画布边距

// 计算单个网格单元的尺寸
const CELL_WIDTH = (CANVAS_WIDTH - 2 * PADDING - (GRID_COLS - 1) * GAP) / GRID_COLS;
const CELL_HEIGHT = (CANVAS_HEIGHT / 2 - 2 * PADDING - (GRID_ROWS - 1) * GAP) / GRID_ROWS;

// 检查两个矩形是否重叠
function isOverlapping(pos1: ModulePosition, pos2: ModulePosition): boolean {
  return !(
    pos1.left + pos1.width <= pos2.left ||
    pos2.left + pos2.width <= pos1.left ||
    pos1.top + pos1.height <= pos2.top ||
    pos2.top + pos2.height <= pos1.top
  );
}

// 检查位置是否与现有模块重叠
function hasOverlap(
  position: ModulePosition,
  existingModules: ModuleData[],
  excludeId?: string
): boolean {
  return existingModules.some((module) => {
    if (excludeId && module.id === excludeId) return false;
    return isOverlapping(position, module.position);
  });
}

// 根据网格位置和大小计算像素位置
export function gridToPixels(
  gridCol: number,
  gridRow: number,
  colSpan: number,
  rowSpan: number
): { left: number; top: number; width: number; height: number } {
  return {
    left: PADDING + gridCol * (CELL_WIDTH + GAP),
    top: PADDING + gridRow * (CELL_HEIGHT + GAP),
    width: colSpan * CELL_WIDTH + (colSpan - 1) * GAP,
    height: rowSpan * CELL_HEIGHT + (rowSpan - 1) * GAP,
  };
}

// 根据尺寸类型获取默认配置
export function getDefaultSizeConfig(
  size: 'single' | 'horizontal' | 'vertical' | 'large'
): { colSpan: number; rowSpan: number; borderRadius: number } {
  switch (size) {
    case 'single':
      return { colSpan: 1, rowSpan: 1, borderRadius: 120 }; // 圆形
    case 'horizontal':
      return { colSpan: 2, rowSpan: 1, borderRadius: 50 }; // 横长方形
    case 'vertical':
      return { colSpan: 1, rowSpan: 2, borderRadius: 50 }; // 竖长方形
    case 'large':
      return { colSpan: 2, rowSpan: 2, borderRadius: 70 }; // 大方块
  }
}

// 寻找可用的空位置（基于网格）
export function findAvailableGridPosition(
  colSpan: number,
  rowSpan: number,
  existingModules: ModuleData[]
): { gridCol: number; gridRow: number } | null {
  // 从左上角开始扫描每个可能的网格位置
  for (let row = 0; row <= GRID_ROWS - rowSpan; row++) {
    for (let col = 0; col <= GRID_COLS - colSpan; col++) {
      const testPos = gridToPixels(col, row, colSpan, rowSpan);
      const testPosition: ModulePosition = {
        ...testPos,
        borderRadius: 0,
      };

      if (!hasOverlap(testPosition, existingModules)) {
        return { gridCol: col, gridRow: row };
      }
    }
  }

  return null;
}

// 对齐到网格
export function snapToGrid(value: number, cellSize: number): number {
  return Math.round(value / (cellSize + GAP)) * (cellSize + GAP);
}

export { CANVAS_WIDTH, CANVAS_HEIGHT, CELL_WIDTH, CELL_HEIGHT, GAP, PADDING, GRID_COLS, GRID_ROWS };
