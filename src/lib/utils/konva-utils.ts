import { KonvaEventObject } from 'konva/lib/Node';
import type Konva from 'konva';
import { ElementCornerStyle, LayoutElementType, TableShape } from '@prisma/client';

export const AVATAR_SIZE = 18; // Size of avatars on the canvas

export const SEAT_OFFSET = AVATAR_SIZE / 2 + 5; // Offset avatar center from table edge
export const AVATAR_SPACING = AVATAR_SIZE * 1.5; // Increased spacing to prevent overlap

// Define a type for the elements in the local state
export type EditableLayoutElement = {
  clientId: string;
  id?: string;
  type: LayoutElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number | null;
  label: string | null;
  shape: TableShape | null;
  numberOfSeats: number | null;
  color?: string | null; // Add optional color field
  cornerStyle?: ElementCornerStyle | null; // Add optional corner style field
  opacity?: number | null;
};

// Define a more specific type for Table elements for the type guard
export type EditableTableElement = EditableLayoutElement & {
  type: typeof LayoutElementType.TABLE;
  shape: TableShape;
  numberOfSeats: number;
};

// Type guard to check if element is a table
export function isTableElement(el: EditableLayoutElement): el is EditableTableElement {
  return el.type === LayoutElementType.TABLE && el.shape !== null && el.numberOfSeats !== null;
}

export const handleWheel = (
  e: KonvaEventObject<WheelEvent>,
  stageRef: React.RefObject<Konva.Stage>,
  setStageScale: (scale: number) => void,
  setStagePosition: (position: { x: number; y: number }) => void
) => {
  e.evt.preventDefault();
  if (!stageRef.current) return;

  const stage = stageRef.current;
  const oldScale = stage.scaleX();
  const pointer = stage.getPointerPosition();

  if (!pointer) return;

  const mousePointTo = {
    x: (pointer.x - stage.x()) / oldScale,
    y: (pointer.y - stage.y()) / oldScale,
  };

  const direction = e.evt.deltaY > 0 ? -1 : 1;
  const scaleBy = 1.04;
  let newScale = direction > 0 ? oldScale * scaleBy : oldScale / scaleBy;
  newScale = Math.min(Math.max(newScale, 0.5), 10);

  const newPos = {
    x: pointer.x - mousePointTo.x * newScale,
    y: pointer.y - mousePointTo.y * newScale,
  };

  setStageScale(newScale);
  setStagePosition(newPos);
};

// Helper to get element color
export function getElementColor(element: {
  type: LayoutElementType;
  color?: string | null;
}): string {
  // if (isSelected) return 'rgba(241, 190, 249, 0.91)'; // Yellow-400 for selected - Keep selection highlight priority

  // Use custom color if set, otherwise fallback to default based on type
  if (element.color) {
    return element.color;
  }

  switch (element.type) {
    case LayoutElementType.TABLE:
      return '#aed9e0'; // Light blue
    case LayoutElementType.DANCEFLOOR:
      return '#f5f5f5'; // Light grey
    case LayoutElementType.DJ_BOOTH:
      return '#d2b48c'; // Tan
    case LayoutElementType.STAGE:
      return '#b0c4de'; // Light steel blue
    case LayoutElementType.BAR:
      return '#deb887'; // Burlywood
    case LayoutElementType.ENTRANCE:
      return '#90ee90'; // Light green
    case LayoutElementType.WALL:
      return '#696969'; // Dim gray
    default:
      return '#e0e0e0'; // Default grey
  }
}

export const handleStageDragEnd = (
  e: KonvaEventObject<DragEvent>,
  isStageDraggable: boolean,
  setStagePosition: (position: { x: number; y: number }) => void
) => {
  // Only act if the drag ended directly on the stage
  if (e.target !== e.target.getStage()) {
    return;
  }
  // Update stage position state only if it was actually draggable
  if (isStageDraggable) {
    setStagePosition(e.target.position());
  }
  // Turn cursor into normal cursor
  document.body.style.cursor = 'default';
};

export const handleStageDragStart = (
  e: KonvaEventObject<DragEvent>,
  setIsStageDraggable: (isDraggable: boolean) => void
) => {
  // Only act if the drag started directly on the stage
  if (e.target !== e.target.getStage()) {
    return;
  }
  setIsStageDraggable(true);
  // Turn cursor into draggable cursor
  document.body.style.cursor = 'grab';
};
