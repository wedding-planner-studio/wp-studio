'use client';

// All the imports from the original page component
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useParams } from 'next/navigation';
import {
  Stage,
  Layer,
  Rect,
  Text,
  Circle as KonvaCircle,
  Group,
  Transformer,
  Line as KonvaLine,
} from 'react-konva';
import type Konva from 'konva';
import { Util } from 'konva/lib/Util'; // Import Util for haveIntersection
import { api } from '@/trpc/react';
import { LayoutElementType, TableShape, ElementCornerStyle } from '@prisma/client';
import { Button } from '@/components/ui/button'; // Button is used in the JSX return
import { toast } from 'react-hot-toast';
import { Toolbar, type ToolbarItem } from '@/components/admin/seatmap/Toolbar';
import cuid from 'cuid';
import { PropertiesPanel } from '@/components/admin/seatmap/PropertiesPanel';
import { FiArrowLeft } from 'react-icons/fi';
import LayoutBackground from './LayoutBackground';
import dayjs from 'dayjs';
import {
  handleWheel as handleWheelUtils,
  isTableElement,
  handleStageDragStart,
  handleStageDragEnd,
} from '@/lib/utils/konva-utils';
import { EditableLayoutElement, getElementColor } from '@/lib/utils/konva-utils';
import { useClientTranslation } from '@/app/i18n/client/TranslationsProvider';

// Relative date formatting
import relativeTime from 'dayjs/plugin/relativeTime';
import { cn } from '@/lib/utils';
dayjs.extend(relativeTime);

// Type for guide lines
type GuideLine = {
  key: string; // Add unique key for React list rendering
  points: number[]; // [x1, y1, x2, y2]
  stroke: string;
  dash?: number[];
};

// Snapping thresholds and angles
const SNAP_THRESHOLD = 5;
const ROTATION_SNAP_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315];
const ROTATION_SNAP_THRESHOLD = 5; // Degrees of tolerance
const ROTATION_GUIDE_LENGTH = 50; // Length of the guide lines extending from center

// Rename the component function
export default function SeatmapEditorClient() {
  const { t } = useClientTranslation();
  const params = useParams<{ id: string }>();
  const eventId = params.id;
  const router = useRouter();
  const [elements, setElements] = useState<EditableLayoutElement[]>([]);
  const [selectedElementIds, setSelectedElementIds] = useState<string[]>([]); // Use array for multi-select
  const [isLoadingInitialData, setIsLoadingInitialData] = useState(true);
  const [copiedElementData, setCopiedElementData] = useState<Omit<
    EditableLayoutElement,
    'clientId' | 'id'
  > | null>(null);
  const [guideLines, setGuideLines] = useState<GuideLine[]>([]);
  const [rotationGuideLines, setRotationGuideLines] = useState<GuideLine[]>([]); // State for rotation guides

  const stageRef = useRef<Konva.Stage>(null);
  const mainAreaRef = useRef<HTMLDivElement>(null); // Ref for the main area wrapper
  const trRef = useRef<Konva.Transformer>(null);
  const editorContainerRef = useRef<HTMLDivElement>(null); // Ref for the main editor container
  const selectionRectangleRef = useRef<Konva.Rect>(null); // Ref for the visual selection rect

  const [stageSize] = useState({ width: 780, height: 750 }); // Fixed stage size
  const [stageScale, setStageScale] = useState(1);
  const [stagePosition, setStagePosition] = useState({ x: 0, y: 0 });
  const [stageBackgroundImage, setStageBackgroundImage] = useState<string>('');

  // State for selection rectangle
  const [selectionRectCoords, setSelectionRectCoords] = useState({
    x1: 0,
    y1: 0,
    x2: 0,
    y2: 0,
    visible: false,
  });
  const [isSelecting, setIsSelecting] = useState(false);

  // Store drag start positions for multi-drag calculation
  const dragStartPositionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());
  // Ref to store selection state at the start of a drag selection
  const initialSelectionOnDragRef = useRef<string[]>([]);
  // Ref to track if shift was pressed at the start of the drag selection
  const shiftPressedOnDragStartRef = useRef<boolean>(false);
  // State to control stage draggability
  const [isStageDraggable, setIsStageDraggable] = useState(true);
  // State to track if an element is being dragged
  const [isElementDragging, setIsElementDragging] = useState(false);

  // Fetch Media Files
  const {
    data: mediaFiles,
    isLoading: isLoadingMediaFiles,
    refetch: refetchMediaFiles,
  } = api.mediaFiles.getOrganizationMediaFiles.useQuery(
    {
      eventId,
    },
    {
      enabled: !!eventId,
    }
  );

  // -- Helper Function to handle media selection --
  const handleSelectMedia = (mediaUrl: string) => {
    setStageBackgroundImage(mediaUrl);
  };

  // --- Helper Function for Position Alignment (remains the same as before) ---
  const getAlignmentLines = (
    activeNode: Konva.Node,
    stage: Konva.Stage,
    elements: EditableLayoutElement[],
    threshold: number = SNAP_THRESHOLD
  ): { lines: GuideLine[]; snappedPosition: { x: number; y: number } | null } => {
    const box = activeNode.getClientRect({ relativeTo: stage });
    const scale = stage.scaleX(); // Assume uniform scale
    const adjustedThreshold = threshold / scale; // Adjust threshold based on zoom

    let lines: GuideLine[] = [];
    let snappedPosition: { x: number; y: number } | null = null;
    let closestSnapX: number | null = null;
    let closestSnapY: number | null = null;
    let minSnapDistX = adjustedThreshold;
    let minSnapDistY = adjustedThreshold;

    // Define points to check for the active node
    const verticalPoints = [
      { type: 'left', value: box.x },
      { type: 'center', value: box.x + box.width / 2 },
      { type: 'right', value: box.x + box.width },
    ];
    const horizontalPoints = [
      { type: 'top', value: box.y },
      { type: 'center', value: box.y + box.height / 2 },
      { type: 'bottom', value: box.y + box.height },
    ];

    // Iterate through other elements to find alignment candidates
    elements.forEach(el => {
      const node = stage.findOne('#' + el.clientId);
      if (!node || node === activeNode || !node.visible()) return; // Skip self and hidden nodes

      const otherBox = node.getClientRect({ relativeTo: stage });

      // Vertical alignment check
      const otherVerticalPoints = [
        otherBox.x,
        otherBox.x + otherBox.width / 2,
        otherBox.x + otherBox.width,
      ];
      verticalPoints.forEach(activeP => {
        otherVerticalPoints.forEach(otherP => {
          const diff = Math.abs(activeP.value - otherP);
          if (diff < minSnapDistX) {
            minSnapDistX = diff;
            closestSnapX = otherP; // Target X to snap to
            const snapOffset = otherP - activeP.value; // How much the active node needs to move
            snappedPosition = {
              ...(snappedPosition ?? activeNode.position()),
              x: activeNode.x() + snapOffset,
            };

            // Create vertical guide line
            const lineY1 = Math.min(box.y, otherBox.y);
            const lineY2 = Math.max(box.y + box.height, otherBox.y + otherBox.height);
            const linePoints = [otherP, lineY1, otherP, lineY2];
            lines.push({
              key: `v-${el.clientId}-${otherP}`,
              points: linePoints,
              stroke: 'rgb(0, 161, 255)',
              dash: [4, 6],
            });
          }
        });
      });

      // Horizontal alignment check
      const otherHorizontalPoints = [
        otherBox.y,
        otherBox.y + otherBox.height / 2,
        otherBox.y + otherBox.height,
      ];
      horizontalPoints.forEach(activeP => {
        otherHorizontalPoints.forEach(otherP => {
          const diff = Math.abs(activeP.value - otherP);
          if (diff < minSnapDistY) {
            minSnapDistY = diff;
            closestSnapY = otherP; // Target Y to snap to
            const snapOffset = otherP - activeP.value; // How much the active node needs to move
            snappedPosition = {
              ...(snappedPosition ?? activeNode.position()),
              y: activeNode.y() + snapOffset,
            };

            // Create horizontal guide line
            const lineX1 = Math.min(box.x, otherBox.x);
            const lineX2 = Math.max(box.x + box.width, otherBox.x + otherBox.width);
            const linePoints = [lineX1, otherP, lineX2, otherP];
            lines.push({
              key: `h-${el.clientId}-${otherP}`,
              points: linePoints,
              stroke: 'rgb(0, 161, 255)',
              dash: [4, 6],
            });
          }
        });
      });
    });

    // Filter lines based on the closest snap (if any)
    const finalLines: GuideLine[] = [];
    if (snappedPosition) {
      if (closestSnapX !== null && minSnapDistX < adjustedThreshold) {
        // Find the specific line that caused the snap
        const snapLine = lines.find(
          l => l.points[0] === closestSnapX && l.points[2] === closestSnapX
        );
        if (snapLine) finalLines.push(snapLine);
      }
      if (closestSnapY !== null && minSnapDistY < adjustedThreshold) {
        // Find the specific line that caused the snap
        const snapLine = lines.find(
          l => l.points[1] === closestSnapY && l.points[3] === closestSnapY
        );
        if (snapLine) finalLines.push(snapLine);
      }
    }

    return { lines: finalLines, snappedPosition };
  };

  // Adjust stage size based on the main area wrapper
  useEffect(() => {
    // No dynamic sizing - we're using fixed size now
    // Just handle window resize events for other potential side effects
    const handleResize = () => {
      // If needed, adjust scale or position here to fit view better
      // But keep the actual stage dimensions fixed
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []); // Run once on mount

  // Attach transformer logic for multiple nodes
  useEffect(() => {
    if (!trRef.current || !stageRef.current) return;

    const selectedNodes = selectedElementIds
      .map(id => stageRef.current?.findOne('#' + id))
      .filter((node): node is Konva.Node => !!node); // Type guard to filter out null/undefined

    trRef.current.nodes(selectedNodes);
    trRef.current.getLayer()?.batchDraw();
  }, [selectedElementIds]);

  const utils = api.useUtils();

  // Fetch existing layout data
  const {
    data: layoutData,
    isLoading: isLayoutLoading,
    isError: isLayoutError,
    error: layoutError,
    refetch,
  } = api.layout.getLayoutByEventId.useQuery(
    { eventId },
    { enabled: !!eventId } // Only fetch if eventId is available
  );

  // Handle fetching state changes
  useEffect(() => {
    if (!isLayoutLoading) {
      setIsLoadingInitialData(false);
      if (isLayoutError) {
        toast.error(t('seatmapEditor.loadLayoutError', { message: layoutError?.message ?? 'Unknown error' }));
      } else if (layoutData?.elements) {
        // Cast fetched data to EditableLayoutElement
        setElements(
          layoutData.elements.map(el => ({ ...el, clientId: el.id })) as EditableLayoutElement[]
        );
      } else {
        // No layout found or fetch resulted in null/undefined data
        setElements([]);
      }
      setStageBackgroundImage(layoutData?.backgroundUrl ?? '');
    }
  }, [isLayoutLoading, isLayoutError, layoutData, layoutError, t]);

  // Upsert mutation
  const upsertLayoutMutation = api.layout.upsertLayout.useMutation({
    onSuccess: data => {
      toast.success(t('seatmapEditor.saveLayoutSuccess'));
      // Update state with new data, ensuring types match
      setElements(data.elements.map(el => ({ ...el, clientId: el.id })) as EditableLayoutElement[]);
      setSelectedElementIds([]); // Clear selection after save
      setStageBackgroundImage(data.backgroundUrl ?? '');
      utils.layout.getLayoutByEventId.invalidate({ eventId });
    },
    onError: error => {
      toast.error(`Failed to save layout: ${error.message}`);
    },
  });

  const handleAddElement = (item: ToolbarItem) => {
    const newElement: EditableLayoutElement = {
      clientId: cuid(),
      type: item.type,
      x: -stagePosition.x / stageScale + 50 / stageScale,
      y: -stagePosition.y / stageScale + 50 / stageScale,
      width: item.defaultProps.width,
      height: item.defaultProps.height,
      rotation: 0,
      label: item.label,
      shape: item.defaultProps.shape ?? null,
      numberOfSeats: item.defaultProps.numberOfSeats ?? null,
      opacity: stageBackgroundImage ? 0.95 : (item.defaultProps.opacity ?? 1),
      color: item.defaultProps.color ?? null,
      cornerStyle: item.defaultProps.cornerStyle ?? ElementCornerStyle.STRAIGHT,
    };
    setElements(prev => [...prev, newElement]);
    setSelectedElementIds([newElement.clientId]); // Select the new element
  };

  const handleDiscardChanges = () => {
    setSelectedElementIds([]);
    refetch();
  };

  const handleSaveLayout = () => {
    // Prepare data for mutation - ensure correct types for Prisma
    const elementsToSave = elements.map(({ clientId, id, ...rest }) => ({
      ...rest,
      id: id,
      rotation: rest.rotation ?? 0,
      label: rest.label ?? null,
      shape: rest.shape ?? null,
      numberOfSeats: rest.numberOfSeats ?? null,
      color: rest.color ?? null,
      opacity: rest.opacity ?? 1,
      cornerStyle: rest.cornerStyle ?? ElementCornerStyle.STRAIGHT,
    }));

    upsertLayoutMutation.mutate({
      eventId,
      elements: elementsToSave as any,
      backgroundUrl: stageBackgroundImage || null,
    });
  };

  // Modified handleSelect for multi-selection
  const handleSelect = (
    clientId: string,
    event?: Konva.KonvaEventObject<MouseEvent | TouchEvent>
  ) => {
    const isShiftPressed = event?.evt.shiftKey;

    // If a drag selection is active, ignore single clicks
    if (isSelecting) return;

    setSelectedElementIds(prevSelectedIds => {
      // Check if the element is already selected
      const isSelected = prevSelectedIds.includes(clientId);

      if (isShiftPressed) {
        // Toggle selection with shift key
        if (isSelected) {
          return prevSelectedIds.filter(id => id !== clientId);
        } else {
          return [...prevSelectedIds, clientId];
        }
      } else {
        // Default behavior: select only the clicked element unless it was already the only selected one
        if (isSelected && prevSelectedIds.length === 1) {
          return prevSelectedIds; // Keep it selected if clicking the only selected item
        } else {
          return [clientId]; // Otherwise, select only this one
        }
      }
    });
  };

  // Record start positions for all selected elements when dragging starts
  const handleDragStart = (draggedClientId: string, e: Konva.KonvaEventObject<DragEvent>) => {
    e.evt.stopPropagation(); // Prevent stage drag
    setIsElementDragging(true); // Mark element drag as active
    setIsStageDraggable(false); // Explicitly disable stage drag during element drag
    setGuideLines([]); // Clear guides at the start of a drag

    // Find the element being dragged directly using the ID
    const draggedElement = elements.find(el => el.clientId === draggedClientId);
    if (!draggedElement) {
      console.error(`[handleDragStart] Element not found: ${draggedClientId}`);
      return; // Cannot proceed
    }

    // Ensure the dragged element is selected
    if (!selectedElementIds.includes(draggedClientId)) {
      // This state update might be slightly delayed, so we use a direct variable
      const newSelection = [...selectedElementIds, draggedClientId];
      setSelectedElementIds(newSelection);
      initialSelectionOnDragRef.current = newSelection;
    } else {
      initialSelectionOnDragRef.current = [...selectedElementIds];
    }

    // Store start positions of all selected elements
    dragStartPositionsRef.current.clear();
    initialSelectionOnDragRef.current.forEach(id => {
      const node = stageRef.current?.findOne('#' + id);
      if (node) {
        dragStartPositionsRef.current.set(id, { x: node.x(), y: node.y() });
      } else {
        // Fallback to state if node not found immediately (less likely)
        const element = elements.find(el => el.clientId === id);
        if (element) {
          dragStartPositionsRef.current.set(id, { x: element.x, y: element.y });
        }
      }
    });
  };

  // --- New Drag Move Handler ---
  const handleDragMove = (e: Konva.KonvaEventObject<DragEvent>) => {
    if (!isElementDragging) return;
    const stage = stageRef.current;

    const activeNode = e?.target as Konva.Node; // The node directly being dragged

    if (!stage || !activeNode) return;

    const draggedClientId = activeNode.id();
    const startPos = dragStartPositionsRef.current.get(draggedClientId);

    if (!startPos) return; // Should not happen if dragStart worked

    // Calculate alignment and snapping based on the *active* node
    const { lines } = getAlignmentLines(activeNode, stage, elements);

    setGuideLines(lines);
    activeNode.getLayer()?.batchDraw(); // Redraw the layer to show guides and moved elements
  };

  // Update positions of all selected elements based on the dragged element's delta
  const handleDragEnd = (draggedClientId: string, e: Konva.KonvaEventObject<DragEvent>) => {
    // Ensure the stage ref is available
    const stage = stageRef.current;
    const activeNode = e.target as Konva.Node; // Node that triggered the event

    if (!stage || !activeNode) {
      console.error('[handleDragEnd] Stage or ActiveNode ref is not available.');
      // Reset state defensively
      setIsElementDragging(false);
      setIsStageDraggable(true);
      dragStartPositionsRef.current.clear();
      setGuideLines([]);
      return;
    }

    // Get final position of the *active* node after snapping (if any)
    const finalActivePos = activeNode.position();
    const activeStartPos = dragStartPositionsRef.current.get(draggedClientId);

    if (!activeStartPos) {
      console.error('[handleDragEnd] Start position for active node not found.');
      // Reset defensively
      setIsElementDragging(false);
      setIsStageDraggable(true);
      dragStartPositionsRef.current.clear();
      setGuideLines([]);
      return;
    }

    // Calculate the total delta applied during the drag (including snapping)

    setElements(prevElements => {
      // Create a map to store the final positions calculated relative to the drag delta
      const finalPositions = new Map<string, { x: number; y: number }>();

      // Calculate final positions for all elements that were selected at drag start
      selectedElementIds.forEach(id => {
        const node = stageRef.current?.findOne('#' + id);
        if (node) {
          finalPositions.set(id, {
            x: node.x(),
            y: node.y(),
          });
        }
      });

      // Update the state based on the recorded final positions
      return prevElements.map(el => {
        const finalPos = finalPositions.get(el.clientId);
        if (finalPos) {
          // If a final position was recorded, update the element
          return {
            ...el,
            x: finalPos.x,
            y: finalPos.y,
          };
        }
        // If not part of the dragged selection, return unchanged
        return el;
      });
    });

    if (selectedElementIds.length === 1) {
      setSelectedElementIds([]);
    }

    // Clear guides and reset state after update
    setGuideLines([]);
    dragStartPositionsRef.current.clear();
    initialSelectionOnDragRef.current = []; // Clear this too
    setIsElementDragging(false);
    setIsStageDraggable(true); // Make stage draggable again
  };

  // --- Simplified Transform Handler for Standard Angle Guides ---
  const handleTransform = (e: Konva.KonvaEventObject<Event>) => {
    const node = e.target as Konva.Node;
    if (!node) return;

    const currentRotation = node.rotation();
    const normalizedRotation = ((currentRotation % 360) + 360) % 360;
    const newRotationGuides: GuideLine[] = [];

    const center = { x: node.x(), y: node.y() };
    const scaledGuideLength = ROTATION_GUIDE_LENGTH / stageScale;

    const getGuidePoints = (angle: number): number[] => {
      const rad = angle * (Math.PI / 180);
      const dx = Math.cos(rad) * scaledGuideLength;
      const dy = Math.sin(rad) * scaledGuideLength;
      return [center.x - dx, center.y - dy, center.x + dx, center.y + dy];
    };

    // Check against standard snap angles ONLY
    ROTATION_SNAP_ANGLES.forEach(snapAngle => {
      const diff = Math.abs(normalizedRotation - snapAngle);
      const wrappedDiff = Math.min(diff, 360 - diff);

      if (wrappedDiff <= ROTATION_SNAP_THRESHOLD) {
        // Determine color: Green if exact match (within a tiny tolerance), Magenta otherwise
        // Use a small tolerance (e.g., 0.1 degrees) for "exact" match due to potential float issues
        const isExactMatch = wrappedDiff < 0.1;
        const strokeColor = isExactMatch ? 'rgb(0, 255, 0)' : 'rgb(255, 0, 255)'; // Green for exact, Magenta for close

        newRotationGuides.push({
          key: `rot-snap-${snapAngle}`,
          points: getGuidePoints(snapAngle),
          stroke: strokeColor, // Use dynamic color
          dash: [4, 4],
        });
      }
    });

    setRotationGuideLines(newRotationGuides);
    node.getLayer()?.batchDraw();
  };

  // Apply transformation to all selected elements (simplified final snap)
  const handleTransformEnd = (e: Konva.KonvaEventObject<Event>) => {
    // Clear visual rotation guides first
    setRotationGuideLines([]);

    if (!trRef.current) return;

    // Grab nodes BEFORE detaching the transformer
    const nodes = trRef.current.nodes();

    // Detach transformer immediately
    trRef.current.nodes([]);
    trRef.current.getLayer()?.batchDraw(); // Visually remove transformer and guides

    if (nodes.length !== 1) {
      console.error(
        `[handleTransformEnd] Expected exactly one node in transformer, found: ${nodes.length}. Aborting transform update.`
      );
      return;
    }

    const node = nodes[0];
    if (!node) {
      console.error('[handleTransformEnd] Node is undefined even though nodes.length was 1.');
      return;
    }
    const clientId = node.id();

    // Get scale *before* resetting
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();
    let finalRotation = node.rotation(); // Get initial final rotation

    // --- Simplified Rotation Snapping Logic (Standard Angles Only) ---
    let snappedRotation = finalRotation;
    let minAngleDiff = ROTATION_SNAP_THRESHOLD + 1;
    const normalizedRotation = ((finalRotation % 360) + 360) % 360;

    ROTATION_SNAP_ANGLES.forEach(snapAngle => {
      const diff = Math.abs(normalizedRotation - snapAngle);
      const wrappedDiff = Math.min(diff, 360 - diff);
      // Use '<=' here to ensure snapping occurs even at the exact threshold
      if (wrappedDiff < minAngleDiff && wrappedDiff <= ROTATION_SNAP_THRESHOLD) {
        minAngleDiff = wrappedDiff;
        snappedRotation = snapAngle;
      }
    });
    // --- End Simplified Rotation Snapping Logic ---

    // Apply the snapped rotation back to the Konva node *before* state update
    if (snappedRotation !== finalRotation) {
      node.rotation(snappedRotation);
      finalRotation = snappedRotation;
    }

    // Reset scale and clear cache on the actual Konva node *before* state update
    node.scaleX(1);
    node.scaleY(1);
    node.clearCache();

    // Update the React state using findIndex and replace
    setElements(prevElements => {
      const elementIndex = prevElements.findIndex(el => el.clientId === clientId);
      if (elementIndex === -1) {
        console.error(
          `[handleTransformEnd] Could not find element with clientId ${clientId} in state.`
        );
        return prevElements; // Return unchanged state
      }

      const originalElement = prevElements[elementIndex];
      if (!originalElement) {
        console.error(
          `[handleTransformEnd] Element at index ${elementIndex} (clientId ${clientId}) is unexpectedly undefined.`
        );
        return prevElements;
      }

      const newWidth = Math.max(5, originalElement.width * scaleX);
      const newHeight = Math.max(5, originalElement.height * scaleY);

      const updatedElement = {
        ...originalElement,
        x: node.x(),
        y: node.y(),
        width: newWidth,
        height: newHeight,
        rotation: finalRotation, // Use the final (potentially snapped) rotation
      };

      const newElements = [...prevElements];
      newElements[elementIndex] = updatedElement;
      return newElements;
    });
  };

  const handleUpdateElement = (clientId: string, updates: Partial<EditableLayoutElement>) => {
    setElements(prev => prev.map(el => (el.clientId === clientId ? { ...el, ...updates } : el)));
  };

  // Modified handleDeleteElement to delete all selected
  const handleDeleteElement = () => {
    setElements(prev => prev.filter(el => !selectedElementIds.includes(el.clientId)));
    setSelectedElementIds([]);
  };

  // Modified checkDeselect combined with selection rect logic
  const handleStageMouseDown = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    // Check if clicked on an empty area (the stage itself)
    if (e.target !== e.target.getStage()) {
      // Clicked on an element or transformer, handle selection there (onClick/onTap)
      // Clear selection rect state just in case
      setIsSelecting(false);
      setSelectionRectCoords(prev => ({ ...prev, visible: false }));
      return;
    }

    // Prevent default browser actions like text selection
    e.evt.preventDefault();

    if (!stageRef.current) return;
    const stage = stageRef.current;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    // Transform pointer coords to stage coords
    const x1 = (pointer.x - stage.x()) / stage.scaleX();
    const y1 = (pointer.y - stage.y()) / stage.scaleY();

    // Store initial state for drag selection logic
    initialSelectionOnDragRef.current = [...selectedElementIds];
    shiftPressedOnDragStartRef.current = e.evt.shiftKey;

    setIsSelecting(true);
    setSelectionRectCoords({ x1, y1, x2: x1, y2: y1, visible: true });

    // Clear selection immediately only if Shift is NOT pressed
    if (!shiftPressedOnDragStartRef.current) {
      setSelectedElementIds([]);
    }

    // Set stage draggability based on Shift key
    setIsStageDraggable(!shiftPressedOnDragStartRef.current);

    // Change cursor
    if (editorContainerRef.current) {
      if (shiftPressedOnDragStartRef.current) {
        editorContainerRef.current.style.cursor = 'crosshair';
      } else {
        editorContainerRef.current.style.cursor = 'grab';
      }
    }
  };

  const handleStageMouseMove = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (!isSelecting || !stageRef.current) return;

    // Prevent default browser actions
    e.evt.preventDefault();

    const stage = stageRef.current;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    // Transform pointer coords to stage coords
    const x2 = (pointer.x - stage.x()) / stage.scaleX();
    const y2 = (pointer.y - stage.y()) / stage.scaleY();

    setSelectionRectCoords(prev => ({ ...prev, x2, y2 }));

    // --- Live Selection Update Logic ---
    const layer = stage.getLayers()[0]; // Assuming elements are on the first layer
    if (!layer) return;

    const { x1, y1 } = selectionRectCoords;
    const currentSelectionRect = {
      x: Math.min(x1, x2),
      y: Math.min(y1, y2),
      width: Math.abs(x1 - x2),
      height: Math.abs(y1 - y2),
    };

    // Find elements intersecting the current rectangle
    const allShapes = layer.find('Group');
    const idsInCurrentRect = allShapes
      .filter(shape => {
        const elementRect = shape.getClientRect({ relativeTo: stage });
        return Util.haveIntersection(currentSelectionRect, elementRect);
      })
      .map(shape => shape.id());

    // Determine the new selection based on initial state and shift key
    const initialSelection = initialSelectionOnDragRef.current;
    const shiftPressed = shiftPressedOnDragStartRef.current;

    let newSelectedIds: string[];
    if (shiftPressed) {
      // Union of initial selection and elements currently in the rect
      newSelectedIds = [...new Set([...initialSelection, ...idsInCurrentRect])];
    } else {
      // Only elements currently in the rect
      newSelectedIds = idsInCurrentRect;
    }

    // Update state to trigger re-render/highlighting
    // Avoid unnecessary state updates if selection hasn't changed
    setSelectedElementIds(prev => {
      const sortedPrev = [...prev].sort();
      const sortedNew = [...newSelectedIds].sort();
      if (JSON.stringify(sortedPrev) !== JSON.stringify(sortedNew)) {
        return newSelectedIds;
      }
      return prev; // No change
    });
    // --- End Live Selection Update Logic ---

    if (!isSelecting) {
      setIsSelecting(true);
    }
  };

  const handleStageMouseUp = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    // Check if we were actually drag-selecting
    const wasDragSelecting = isSelecting;

    setSelectionRectCoords(prev => ({ ...prev, visible: false }));

    // Reset cursor
    if (editorContainerRef.current) {
      editorContainerRef.current.style.cursor = 'default';
    }

    // Reset stage draggability for the next interaction
    setIsStageDraggable(true);

    // Clear selection state tracking refs only after mouse up
    initialSelectionOnDragRef.current = [];
    shiftPressedOnDragStartRef.current = false;

    // Must set isSelecting to false AFTER all updates are done
    if (wasDragSelecting) {
      setIsSelecting(false);
    }
  };

  // --- Copy/Paste Handlers ---
  const handleCopy = useCallback(() => {
    if (selectedElementIds.length === 0) return;
    const lastSelectedId = selectedElementIds[selectedElementIds.length - 1];
    const elementToCopy = elements.find(el => el.clientId === lastSelectedId);
    if (elementToCopy) {
      const { clientId, id, ...dataToCopy } = elementToCopy;
      setCopiedElementData(dataToCopy);
      toast.success(t('seatmapEditor.elementCopied', { label: dataToCopy.label ?? 'Element' }));
    }
  }, [selectedElementIds, elements, t]);

  const handlePaste = useCallback(() => {
    if (!copiedElementData || !stageRef.current) return;

    const stage = stageRef.current;
    const pointer = stage.getPointerPosition() ?? { x: stage.width() / 2, y: stage.height() / 2 };

    const pasteX = (pointer.x - stage.x()) / stage.scaleX() + 10 / stage.scaleX();
    const pasteY = (pointer.y - stage.y()) / stage.scaleY() + 10 / stage.scaleY();

    const newElement: EditableLayoutElement = {
      ...copiedElementData,
      clientId: cuid(),
      id: undefined,
      x: pasteX,
      y: pasteY,
    };
    setElements(prev => [...prev, newElement]);
    setSelectedElementIds([newElement.clientId]);
    toast.success(t('seatmapEditor.elementPasted', { label: newElement.label ?? 'Element' }));
  }, [copiedElementData, stageScale, stagePosition, t]);

  // Find the *single* selected element for PropertiesPanel
  const singleSelectedElement =
    selectedElementIds.length === 1
      ? (elements.find(el => el.clientId === selectedElementIds[0]) ?? null)
      : null;

  // Get all existing table labels, excluding the currently selected element
  const existingLabels = elements
    .filter(
      el => el.type === LayoutElementType.TABLE && el.clientId !== singleSelectedElement?.clientId
    )
    .map(el => el.label)
    .filter((label): label is string => label !== null);

  // --- Zoom Handler ---
  const handleWheel = useCallback(
    (e: Konva.KonvaEventObject<WheelEvent>) =>
      handleWheelUtils(e, stageRef, setStageScale, setStagePosition),
    [setStageScale, setStagePosition]
  );

  // --- Keyboard Event Listener for Copy/Paste/Delete ---
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modKey = isMac ? event.metaKey : event.ctrlKey;

      if (modKey && event.key === 'c') {
        event.preventDefault();
        handleCopy();
      } else if (modKey && event.key === 'v') {
        event.preventDefault();
        handlePaste();
      } else if (event.key === 'Backspace' || event.key === 'Delete') {
        if (selectedElementIds.length > 0) {
          event.preventDefault();
          handleDeleteElement(); // Use the modified delete handler
        }
      }
    };

    const container = editorContainerRef.current;
    if (container) {
      container.setAttribute('tabindex', '-1');
      container.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      if (container) {
        container.removeEventListener('keydown', handleKeyDown);
      }
    };
    // Add handleDeleteElement to dependencies
  }, [handleCopy, handlePaste, handleDeleteElement, selectedElementIds]);

  // --- Calculate Stats ---
  const totalTables = elements.filter(el => el.type === LayoutElementType.TABLE).length;
  const totalSeats = elements.reduce((sum, el) => {
    if (el.type === LayoutElementType.TABLE && typeof el.numberOfSeats === 'number') {
      return sum + el.numberOfSeats;
    }
    return sum;
  }, 0);

  // --- The JSX remains the same, just inside this component ---
  return (
    // Add ref and focus style to the main container
    <div
      ref={editorContainerRef}
      className="flex flex-col h-full py-8 px-6 focus:outline-none"
      tabIndex={-1}
    >
      {/* Navigation */}
      <div className="mb-2 shrink-0">
        <Button
          variant="ghost"
          onClick={() => router.push(`/admin/events/${eventId}`)}
          className="text-gray-600 hover:text-gray-900 h-8 px-2 -ml-2"
        >
          <FiArrowLeft className="mr-1.5 h-4 w-4" />
          <span className="text-xs">{t('seatmapEditor.backToEvent')}</span>
        </Button>
      </div>

      {/* Header Section */}
      <div className="flex justify-between items-start mb-4 shrink-0">
        <div className="flex items-center gap-2 w-full justify-between">
          <h1 className="text-2xl font-medium text-gray-900 mb-1">{t('seatmapEditor.title')}</h1>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleDiscardChanges}
              disabled={upsertLayoutMutation.isPending || isLoadingInitialData}
            >
              {t('seatmapEditor.discardChanges')}
            </Button>
            <Button
              onClick={handleSaveLayout}
              disabled={upsertLayoutMutation.isPending || isLoadingInitialData}
            >
              {upsertLayoutMutation.isPending ? t('seatmapEditor.saving') : t('seatmapEditor.saveLayout')}
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="mb-4 flex justify-start items-center space-x-6 shrink-0 p-1 text-sm text-gray-600">
        <p>
          <span className="font-medium text-gray-800">{totalTables}</span> {t('seatmapEditor.tables')}
        </p>
        <p>
          <span className="font-medium text-gray-800">{totalSeats}</span> {t('seatmapEditor.totalSeats')}
        </p>
      </div>

      <div className="flex flex-grow overflow-hidden min-h-0">
        {/* Wrapper for Stage and Properties Panel */}
        <div
          ref={mainAreaRef}
          className="flex-grow relative border border-gray-300 rounded-lg bg-gray-100"
        >
          {/* Canvas Container - Now absolutely positioned */}
          {isLoadingInitialData ? (
            <div className="absolute inset-0 flex items-center justify-center ">
              {t('seatmapEditor.loadingLayout')}
            </div>
          ) : (
            <Stage
              ref={stageRef}
              width={stageSize.width} // Use state derived from mainAreaRef
              height={stageSize.height}
              onMouseDown={handleStageMouseDown}
              onTouchStart={handleStageMouseDown}
              onMouseMove={handleStageMouseMove}
              onTouchMove={handleStageMouseMove}
              onMouseUp={handleStageMouseUp}
              onTouchEnd={handleStageMouseUp}
              onWheel={handleWheel}
              onDragStart={e => handleStageDragStart(e, setIsStageDraggable)}
              onDragEnd={e => handleStageDragEnd(e, isStageDraggable, setStagePosition)}
              draggable={isStageDraggable && !isElementDragging}
              scaleX={stageScale}
              scaleY={stageScale}
              x={stagePosition.x}
              y={stagePosition.y}
            >
              <Layer>
                <LayoutBackground src={stageBackgroundImage} stageSize={stageSize} />
                {/* Selection Rectangle */}
                <Rect
                  ref={selectionRectangleRef}
                  x={Math.min(selectionRectCoords.x1, selectionRectCoords.x2)}
                  y={Math.min(selectionRectCoords.y1, selectionRectCoords.y2)}
                  width={Math.abs(selectionRectCoords.x1 - selectionRectCoords.x2)}
                  height={Math.abs(selectionRectCoords.y1 - selectionRectCoords.y2)}
                  fill="rgba(0, 160, 255, 0.3)"
                  stroke="rgba(0, 160, 255, 0.8)"
                  strokeWidth={1 / stageScale} // Keep stroke width consistent during zoom
                  visible={selectionRectCoords.visible}
                  listening={false} // Prevent interfering with other events
                />
                {elements.map(el => {
                  // Check if the current element is selected
                  const elementColor = getElementColor(el);
                  const groupProps = {
                    id: el.clientId,
                    x: el.x,
                    y: el.y,
                    rotation: el.rotation ?? 0,
                    draggable: true,
                    // Use specific handlers for multi-drag
                    onDragStart: (e: Konva.KonvaEventObject<DragEvent>) =>
                      handleDragStart(el.clientId, e),
                    onDragMove: handleDragMove,
                    onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) =>
                      handleDragEnd(el.clientId, e),
                    onClick: (e: Konva.KonvaEventObject<MouseEvent>) =>
                      handleSelect(el.clientId, e),
                    onTap: (e: Konva.KonvaEventObject<TouchEvent>) => handleSelect(el.clientId, e),
                  };
                  const shapeProps = {
                    fill: elementColor,
                    stroke: '#333',
                    strokeWidth: 1,
                    opacity: el.opacity ?? 1,
                  };
                  const textProps = {
                    fontSize: 12,
                    fill: '#333',
                    width: el.width,
                    height: el.height,
                    align: 'center' as const,
                    verticalAlign: 'middle' as const,
                    listening: false,
                    opacity: shapeProps.opacity, // Match text opacity
                  };
                  return (
                    <Group key={el.clientId} {...groupProps}>
                      {isTableElement(el) && el.shape === TableShape.CIRCLE ? (
                        <KonvaCircle
                          radius={el.width / 2}
                          {...shapeProps}
                          // Position the circle center at (radius, radius) within the Group
                          x={el.width / 2}
                          y={el.width / 2} // Assuming height === width for circle
                        />
                      ) : (
                        <Rect
                          width={el.width}
                          height={el.height}
                          {...shapeProps}
                          // Add cornerRadius conditionally
                          cornerRadius={el.cornerStyle === ElementCornerStyle.ROUNDED ? 10 : 0}
                        />
                      )}
                      <Text text={el.label ?? ''} {...textProps} />
                      {/* Display seat count with background for tables */}
                      {isTableElement(el) && (
                        <>
                          {/* Dark background for label - minimal padding */}
                          <Rect
                            width={60} // Adjusted fixed width for shorter text
                            height={14} // Same height
                            fill="rgba(0, 0, 0, 0.6)"
                            cornerRadius={2} // Slightly smaller corner radius
                            x={(el.width - 60) / 2} // Center based on new width
                            y={
                              el.shape === TableShape.CIRCLE
                                ? el.width / 2 + 6 // Adjusted Y position for circle
                                : el.height + 6 // Adjusted Y position for rectangle
                            }
                          />
                          <Text
                            text={`Seats: ${el.numberOfSeats}`}
                            fontSize={8} // Keep font size
                            fill="#ffffff"
                            width={60} // Match Rect width
                            height={14} // Match Rect height
                            align="center"
                            verticalAlign="middle"
                            x={(el.width - 60) / 2} // Center based on new width
                            y={
                              el.shape === TableShape.CIRCLE
                                ? el.width / 2 + 6 // Adjusted Y position for circle
                                : el.height + 6 // Adjusted Y position for rectangle
                            }
                            listening={false}
                            opacity={shapeProps.opacity} // Match opacity of the shape
                          />
                        </>
                      )}
                    </Group>
                  );
                })}
                <Transformer
                  ref={trRef}
                  borderEnabled={true}
                  borderStroke="#d97706"
                  anchorStroke="#d97706"
                  anchorFill="#fff"
                  anchorSize={8}
                  rotateEnabled={true}
                  keepRatio={false}
                  // Add onTransform handler for live guides
                  onTransform={handleTransform}
                  // Keep onTransformEnd for final snapping/state update
                  onTransformEnd={handleTransformEnd}
                />
                {/* Render Position Guide Lines */}
                {guideLines.map(line => (
                  <KonvaLine
                    key={line.key}
                    points={line.points}
                    stroke={line.stroke}
                    strokeWidth={1 / stageScale}
                    dash={line.dash?.map(d => d / stageScale)}
                    listening={false}
                  />
                ))}
                {/* Render Rotation Guide Lines (now only standard angles) */}
                {rotationGuideLines.map(line => (
                  <KonvaLine
                    key={line.key}
                    points={line.points}
                    stroke={line.stroke} // Color is now dynamic (green or magenta)
                    strokeWidth={1 / stageScale}
                    dash={line.dash?.map(d => d / stageScale)} // Should be [4, 4]
                    listening={false}
                  />
                ))}
                {!isLayoutLoading && elements.length === 0 && (
                  <Text text={t('seatmapEditor.emptyLayout')} x={10} y={10} />
                )}
              </Layer>
            </Stage>
          )}
          {/* Last Updated By */}
          {layoutData?.lastUpdatedBy && (
            <div className="absolute top-2 right-4 text-muted-foreground text-xs px-2 py-1 opacity-80 hover:opacity-100 transition-opacity duration-200">
              <span>
                {t('seatmapEditor.lastUpdatedBy', {
                  name: layoutData?.lastUpdatedBy?.firstName && layoutData?.lastUpdatedBy?.lastName
                    ? `${layoutData?.lastUpdatedBy?.firstName} ${layoutData?.lastUpdatedBy?.lastName}`
                    : layoutData?.lastUpdatedBy?.email
                })}
              </span>
              <span> {dayjs(layoutData?.updatedAt).fromNow()} </span>
            </div>
          )}
          {/* Zoom Indicator Chip */}
          <div className="absolute bottom-4 right-4 bg-gray-800 bg-opacity-70 text-white text-xs px-2 py-1 rounded shadow">
            <span>{t('seatmapEditor.zoom', { percent: (stageScale * 100).toFixed(0) })}</span>
          </div>
        </div>
        <div className="w-80 bg-background pt-0.5 p-4 flex flex-col space-y-4 overflow-y-auto shrink-0 relative">
          {/* Properties Panel (Conditionally Rendered) */}
          <div
            className={cn(
              'absolute inset-x-4 transition-transform duration-300 ease-in-out',
              singleSelectedElement ? 'translate-x-0' : 'translate-x-full opacity-0'
            )}
          >
            {singleSelectedElement && (
              <PropertiesPanel
                selectedElement={singleSelectedElement}
                onUpdateElement={handleUpdateElement}
                onDeleteElement={handleDeleteElement}
                existingLabels={existingLabels}
              />
            )}
          </div>
          <div
            className={cn(
              'absolute inset-x-4 transition-transform duration-300 ease-in-out',
              singleSelectedElement ? '-translate-x-full opacity-0' : 'translate-x-0'
            )}
          >
            <Toolbar
              eventId={eventId}
              onAddElement={handleAddElement}
              onSelectMedia={handleSelectMedia}
              mediaFiles={mediaFiles}
              isLoadingMediaFiles={isLoadingMediaFiles}
              selectedBackgroundUrl={stageBackgroundImage}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
