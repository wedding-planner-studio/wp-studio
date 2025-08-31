'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import AdminLayout from '@/components/layouts/AdminLayout';
import { api } from '@/trpc/react';
import { Stage, Layer, Rect, Text, Circle as KonvaCircle, Group } from 'react-konva';
import Konva from 'konva';
import { toast } from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  LayoutElementType,
  TableShape,
  GuestStatus,
  type LayoutElement,
  ElementCornerStyle,
} from '@prisma/client';
import { FiArrowLeft } from 'react-icons/fi';
import { LucideCircleCheck, LucideCircleX } from 'lucide-react';
import LayoutBackground from '@/components/admin/seatmap/LayoutBackground';
import { cn, getNotionizedCharacter } from '@/lib/utils';
import {
  handleWheel as handleWheelUtils,
  SEAT_OFFSET,
  AVATAR_SPACING,
  AVATAR_SIZE,
} from '@/lib/utils/konva-utils';
import {
  DndContext,
  DragOverlay,
  type DragStartEvent,
  type DragMoveEvent,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { getElementColor } from '@/lib/utils/konva-utils';
import { GuestWithAssignment, SeatAvatar } from './_components/seat-avatar';
import { AvatarTooltip } from './_components/avatar-tooltip';
import { SelectableGuestItem } from './_components/selectable-guest-item';
import { DraggableGuestItem } from './_components/draggable-guest-item';
import { useClientTranslation } from '@/app/i18n/client/TranslationsProvider';

// Type guard to check if element is a table (Copied from Editor)
function isTableElement(
  el: Pick<LayoutElement, 'type' | 'shape' | 'numberOfSeats'> | undefined | null
): el is LayoutElement & {
  type: typeof LayoutElementType.TABLE;
  shape: TableShape;
  numberOfSeats: number;
} {
  if (!el) return false;
  return el.type === LayoutElementType.TABLE && el.shape !== null && el.numberOfSeats !== null;
}

function calculateSeatPositions(element: LayoutElement): { x: number; y: number }[] {
  if (!isTableElement(element) || element.numberOfSeats <= 0) {
    return [];
  }

  const positions: { x: number; y: number }[] = [];
  const { width, height, shape, numberOfSeats } = element;

  if (shape === TableShape.CIRCLE) {
    const tableRadius = width / 2;
    const angleIncrement = (2 * Math.PI) / numberOfSeats;
    const positioningRadius = tableRadius + SEAT_OFFSET;
    const centerX = tableRadius; // Center X within the Group
    const centerY = tableRadius; // Center Y within the Group

    for (let i = 0; i < numberOfSeats; i++) {
      const angle = i * angleIncrement - Math.PI / 2; // Start from top
      positions.push({
        x: centerX + positioningRadius * Math.cos(angle),
        y: centerY + positioningRadius * Math.sin(angle),
      });
    }
    return positions;
  } else {
    // RECTANGLE - Distribute based on aspect ratio

    // Determine stacking direction - prefer horizontal unless height is considerably (1.5x) larger than width
    const useHorizontalStacking = width >= height * 1.5; // Make vertical trigger more easily

    if (useHorizontalStacking) {
      // Distribute seats evenly between TOP and BOTTOM edges
      const seatsTop = Math.ceil(numberOfSeats / 2);
      const seatsBottom = Math.floor(numberOfSeats / 2);

      const totalWidthTop = seatsTop * AVATAR_SPACING;
      const startXTop = width / 2 - totalWidthTop / 2 + AVATAR_SPACING / 2;
      const totalWidthBottom = seatsBottom * AVATAR_SPACING;
      const startXBottom = width / 2 - totalWidthBottom / 2 + AVATAR_SPACING / 2;

      // Top row positions
      for (let i = 0; i < seatsTop; i++) {
        positions.push({
          x: startXTop + i * AVATAR_SPACING,
          y: -AVATAR_SIZE / 2, // Position avatar center slightly above the top edge
        });
      }
      // Bottom row positions
      for (let i = 0; i < seatsBottom; i++) {
        positions.push({
          x: startXBottom + i * AVATAR_SPACING,
          y: height + AVATAR_SIZE / 2, // Position avatar center slightly below the bottom edge
        });
      }
    } else {
      // Distribute seats evenly between LEFT and RIGHT edges
      const seatsLeft = Math.ceil(numberOfSeats / 2);
      const seatsRight = Math.floor(numberOfSeats / 2);

      const totalHeightLeft = seatsLeft * AVATAR_SPACING;
      const startYLeft = height / 2 - totalHeightLeft / 2 + AVATAR_SPACING / 2;
      const totalHeightRight = seatsRight * AVATAR_SPACING;
      const startYRight = height / 2 - totalHeightRight / 2 + AVATAR_SPACING / 2;

      // Left column positions
      for (let i = 0; i < seatsLeft; i++) {
        positions.push({
          x: -AVATAR_SIZE / 2, // Position avatar center slightly left of the left edge
          y: startYLeft + i * AVATAR_SPACING,
        });
      }
      // Right column positions
      for (let i = 0; i < seatsRight; i++) {
        positions.push({
          x: width + AVATAR_SIZE / 2, // Position avatar center slightly right of the right edge
          y: startYRight + i * AVATAR_SPACING,
        });
      }
    }

    return positions; // Return calculated positions
  }
}
// --- End Seat Position Calculation Helper ---

// Type for local assignment state
type LocalAssignment = {
  layoutElementId: string;
  // Include label for display if possible, though not strictly needed for saving
  layoutElementLabel?: string | null;
} | null; // null means unassigned

// Helper for RSVP status display
function getRsvpBadgeProps(
  status: GuestStatus | undefined | null
): { text: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' } | null {
  switch (status) {
    case GuestStatus.CONFIRMED:
      return { text: 'Confirmed', variant: 'default' };
    case GuestStatus.DECLINED:
      return { text: 'Declined', variant: 'destructive' };
    case GuestStatus.PENDING:
      return { text: 'Pending', variant: 'secondary' };
    case GuestStatus.INACTIVE:
      return { text: 'Inactive', variant: 'outline' };
    default:
      return null;
  }
}

export default function SeatmapAssignmentPage() {
  const { t } = useClientTranslation('common');
  const params = useParams<{ id: string }>();
  const eventId = params.id;
  const router = useRouter();

  // State for stage rendering
  const stageRef = useRef<Konva.Stage>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [stageSize] = useState({ width: 780, height: 750 });
  const [stageScale, setStageScale] = useState(1);
  const [stagePosition, setStagePosition] = useState({ x: 0, y: 0 });

  // Tooltip state
  const [tooltipContent, setTooltipContent] = useState('');
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  // Handle tooltip show/hide
  const handleTooltipShow = (content: string, position: { x: number; y: number }) => {
    setTooltipContent(content);
    setTooltipPosition(position);
  };

  const [hasChanges, setHasChanges] = useState(false);

  // --- DND State ---
  const [activeId, setActiveId] = useState<string | null>(null); // ID of the guest being dragged
  const [activeGuestData, setActiveGuestData] = useState<{
    name: string;
    // hasPlusOne: boolean;
    // plusOneName?: string | null; // Add plusOneName
    category?: string | null;
    status?: GuestStatus | null;
  } | null>(null);
  const [hoveredTableId, setHoveredTableId] = useState<string | null>(null);
  // --- End DND State ---

  // Selection State
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);

  // --- Filter and Search State ---
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = useState<GuestStatus | 'all'>('all');
  // --- End Filter and Search State ---

  // --- New State for Assigned Guest Filter ---
  const [includeAssignedGuests, setIncludeAssignedGuests] = useState(false);
  // --- End New State ---

  // Local state for assignments made in this session
  const [currentAssignments, setCurrentAssignments] = useState<Map<string, LocalAssignment>>(
    new Map()
  );

  // Combined state for guests with their assignments
  const [guestsWithAssignments, setGuestsWithAssignments] = useState<GuestWithAssignment[]>([]);

  // --- Assignment Mode State ---
  type AssignmentMode = 'drag' | 'select';
  const [assignmentMode, setAssignmentMode] = useState<AssignmentMode>('drag');
  // --- End Assignment Mode State ---

  // --- Re-introduce Checkbox Multi-Select State ---
  const [guestSelection, setGuestSelection] = useState<Set<string>>(new Set());
  // --- End Re-introduce Checkbox State ---

  const utils = api.useUtils();

  // Data Fetching
  const {
    data: layoutData,
    isLoading: isLayoutLoading,
    isError: isLayoutError,
    error: layoutError,
  } = api.layout.getLayoutByEventId.useQuery({ eventId }, { enabled: !!eventId });

  const {
    data: guestsData,
    isLoading: isGuestsLoading,
    isError: isGuestsError,
    error: guestsError,
  } = api.guests.getAll.useQuery(
    { eventId, includeAdditionalGuests: true },
    { enabled: !!eventId }
  );

  const {
    data: assignmentsData,
    isLoading: isAssignmentsLoading,
    isError: isAssignmentsError,
    error: assignmentsError,
    refetch: refetchAssignments,
  } = api.layout.getAssignmentsByEventId.useQuery({ eventId }, { enabled: !!eventId });

  // Initialize local assignments state when fetched data arrives
  useEffect(() => {
    if (assignmentsData) {
      const initialMap = new Map<string, LocalAssignment>();
      assignmentsData.forEach(a => {
        initialMap.set(a.guestId, {
          layoutElementId: a.layoutElementId,
          layoutElementLabel: a.layoutElement?.label, // Store label if available
        });
      });
      setCurrentAssignments(initialMap);
    }
  }, [assignmentsData]);

  // Process guests and reflect CURRENT assignments for UI
  useEffect(() => {
    const actualGuests = guestsData?.guests;
    if (actualGuests) {
      // Use currentAssignments map for immediate UI feedback
      const combined = actualGuests.map(guest => {
        const assignmentInfo = currentAssignments.get(guest.id);
        return {
          ...guest,
          // Populate simplified fields
          assignedElementId: assignmentInfo?.layoutElementId,
          assignedElementLabel: assignmentInfo?.layoutElementLabel,
        };
      });
      setGuestsWithAssignments(combined);
    } else {
      setGuestsWithAssignments([]);
    }
  }, [guestsData, currentAssignments]);

  // --- Group assigned guests by table for rendering ---
  const assignedGuestsByTableId = useMemo(() => {
    const map = new Map<string, GuestWithAssignment[]>();
    guestsWithAssignments.forEach(guest => {
      if (guest.assignedElementId) {
        if (!map.has(guest.assignedElementId)) {
          map.set(guest.assignedElementId, []);
        }
        map.get(guest.assignedElementId)?.push(guest);
      }
    });
    return map;
  }, [guestsWithAssignments]);

  // --- Derived State: Table Occupancy (Re-adding) ---
  const tableOccupancy = useMemo(() => {
    const occupancy = new Map<string, number>();
    // Initialize counts for all tables from layout
    layoutData?.elements.forEach(el => {
      if (el.type === LayoutElementType.TABLE) {
        occupancy.set(el.id, 0);
      }
    });

    // Count assignments from current state - CORRECTED LOGIC
    currentAssignments.forEach((assignment, guestId) => {
      // Check if the guest is actually assigned to a table
      if (assignment && assignment.layoutElementId) {
        // Find the specific guest corresponding to this assignment's key (guestId)

        // Increment occupancy for the assigned table
        occupancy.set(
          assignment.layoutElementId,
          (occupancy.get(assignment.layoutElementId) ?? 0) + 1
        );
      }
    });
    return occupancy;
  }, [currentAssignments, layoutData?.elements, guestsWithAssignments]);

  // Get capacity of the currently selected table (Re-adding)
  const selectedTableCapacity = useMemo(() => {
    if (!selectedTableId || !layoutData?.elements) return null;
    const table = layoutData.elements.find(el => el.id === selectedTableId);
    return table?.numberOfSeats ?? null;
  }, [selectedTableId, layoutData?.elements]);

  // Check if the selected table is full (Re-adding)
  const isSelectedTableFull = useMemo(() => {
    if (selectedTableId === null || selectedTableCapacity === null) return false;
    const currentCount = tableOccupancy.get(selectedTableId) ?? 0;
    return currentCount >= selectedTableCapacity;
  }, [selectedTableId, selectedTableCapacity, tableOccupancy]);

  // Loading states
  const isLoading = isLayoutLoading || isGuestsLoading || isAssignmentsLoading;
  const isError = isLayoutError || isGuestsError || isAssignmentsError;

  useEffect(() => {
    if (isLayoutError) toast.error(t('seatAssignment.toast.layoutError', { message: layoutError?.message ?? 'Unknown' }));
    if (isGuestsError) toast.error(t('seatAssignment.toast.guestsError', { message: guestsError?.message ?? 'Unknown' }));
    if (isAssignmentsError)
      toast.error(t('seatAssignment.toast.assignmentsError', { message: assignmentsError?.message ?? 'Unknown' }));
  }, [
    isLayoutError,
    isGuestsError,
    isAssignmentsError,
    layoutError,
    guestsError,
    assignmentsError,
  ]);

  // --- Calculate unique filter options ---
  const uniqueCategories = useMemo(() => {
    if (!guestsData?.guests) return [];
    const categories = new Set(guestsData.guests.map(g => g.category).filter(Boolean) as string[]);
    return Array.from(categories).sort();
  }, [guestsData]);

  const uniqueStatuses = useMemo(() => {
    if (!guestsData?.guests) return [];
    const statuses = new Set(guestsData.guests.map(g => g.status).filter(Boolean) as GuestStatus[]);
    // Sort statuses if desired (e.g., CONFIRMED first)
    return Array.from(statuses).sort((a, b) => {
      const order: Record<GuestStatus, number> = {
        [GuestStatus.CONFIRMED]: 1,
        [GuestStatus.PENDING]: 2,
        [GuestStatus.DECLINED]: 3,
        [GuestStatus.INACTIVE]: 4,
      };
      return (order[a] ?? 99) - (order[b] ?? 99);
    });
  }, [guestsData]);
  // --- End Calculate unique filter options ---

  // --- Apply filtering and search to guests list ---
  const filteredGuests = useMemo(() => {
    return guestsWithAssignments.filter(guest => {
      // Search term filter (case-insensitive)
      const nameMatch = guest.name.toLowerCase().includes(searchTerm.toLowerCase());

      // Category filter
      const categoryMatch = selectedCategory === 'all' || guest.category === selectedCategory;

      // Status filter
      const statusMatch = selectedStatus === 'all' || guest.status === selectedStatus;

      // Assigned filter
      const assignedMatch = includeAssignedGuests || !guest.assignedElementId;

      return nameMatch && categoryMatch && statusMatch && assignedMatch;
    });
  }, [guestsWithAssignments, searchTerm, selectedCategory, selectedStatus, includeAssignedGuests]);
  // --- End Apply filtering and search ---

  // --- Guests assigned to the currently selected table ---
  const assignedGuestsToSelectedTable = useMemo(() => {
    if (!selectedTableId) return [];
    return guestsWithAssignments.filter(guest => {
      const assignment = currentAssignments.get(guest.id);
      return assignment?.layoutElementId === selectedTableId;
    });
  }, [selectedTableId, guestsWithAssignments, currentAssignments]);

  const selectedTableLabel = useMemo(() => {
    if (!selectedTableId || !layoutData?.elements) return null;
    return (
      layoutData.elements.find(el => el.id === selectedTableId)?.label ??
      `Table ${selectedTableId.substring(0, 6)}`
    );
  }, [selectedTableId, layoutData?.elements]);
  // --- End Guests assigned to selected table ---

  // --- Selection Handlers ---
  const handleSelectTable = (elementId: string, elementType: LayoutElementType) => {
    if (elementType === LayoutElementType.TABLE) {
      setSelectedTableId(elementId);
    } else {
      setSelectedTableId(null); // Deselect if non-table clicked
    }
  };

  // --- Save Handler using Mutation ---
  const upsertAssignmentsMutation = api.layout.upsertAssignments.useMutation({
    onSuccess: data => {
      toast.success(t('seatAssignment.toast.saveSuccess'));
      setHasChanges(false);
      // Update local state based on the source of truth from backend
      const newMap = new Map<string, LocalAssignment>();
      data.forEach(a => {
        newMap.set(a.guestId, {
          layoutElementId: a.layoutElementId,
          layoutElementLabel: a.layoutElement?.label,
        });
      });
      setCurrentAssignments(newMap);
      refetchAssignments(); // Refetch might also be good
      void utils.guests.getAll.invalidate({
        eventId,
      });
    },
    onError: error => {
      toast.error(t('seatAssignment.toast.saveError', { message: error.message }));
    },
  });

  const handleSaveAssignments = () => {
    // Prepare data for the mutation based on currentAssignments map
    const assignmentsToSave: {
      guestId: string;
      layoutElementId: string;
      seatIndex?: number | null;
    }[] = [];
    const unassignedGuestIds: string[] = [];

    currentAssignments.forEach((assignmentData, guestId) => {
      if (assignmentData === null) {
        // Guest was explicitly unassigned
        unassignedGuestIds.push(guestId);
      } else {
        // Guest has an assignment to save/update
        assignmentsToSave.push({
          guestId: guestId,
          layoutElementId: assignmentData.layoutElementId,
          // seatIndex: null, // Not implementing seat index yet
        });
      }
    });

    // Original logic to extract assigned guestIds for backend delete (still needed for re-assignments)
    // const guestIdsBeingAssigned = assignmentsToSave.map(a => a.guestId);

    if (assignmentsToSave.length === 0 && unassignedGuestIds.length === 0) {
      toast(t('seatAssignment.toast.noChanges'));
      return;
    }

    upsertAssignmentsMutation.mutate({
      eventId,
      assignments: assignmentsToSave,
      unassignedGuestIds: unassignedGuestIds, // Pass the new list
    });
  };

  // --- Zoom Handler ---
  const handleWheel = useCallback(
    (e: Konva.KonvaEventObject<WheelEvent>) =>
      handleWheelUtils(e, stageRef, setStageScale, setStagePosition),
    [setStageScale, setStagePosition]
  );

  // Handler to deselect table when clicking on stage background
  const handleStageClick = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    // Check if the click target is the stage itself
    if (e.target === e.target.getStage()) {
      setSelectedTableId(null);
      // Optionally deselect guest too?
      // setSelectedGuestId(null);
    }
    // If the click was on an element, the element's onClick/onTap will handle it.
  };

  // --- DND Kit Sensors --- (Using PointerSensor)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      // Prevent premature drag start when clicking
      activationConstraint: {
        distance: 8,
      },
    })
  );
  // --- End DND Kit Sensors ---

  // --- DND Event Handlers ---
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
    // Set pointer cursor to default
    document.body.style.cursor = 'grabbing';
    // Store guest details for DragOverlay and drop logic
    const guest = guestsWithAssignments.find(g => g.id === event.active.id);
    if (guest) {
      setActiveGuestData({
        name: guest.name,
        // hasPlusOne: guest.hasPlusOne,
        // plusOneName: guest.plusOneName, // Store plusOneName
        category: guest.category,
        status: guest.status,
      });
    } else {
      setActiveGuestData(null); // Should not happen if ID is valid
    }
    setHoveredTableId(null); // Clear hover on new drag start
    console.log('Drag Start:', event.active.id);
  };

  const handleDragMove = (event: DragMoveEvent) => {
    // Revert to dnd-kit delta calculation for konvaPos
    if (
      !stageRef.current ||
      !containerRef.current ||
      !event.active.rect.current.initial ||
      !layoutData
    )
      return;
    const stage = stageRef.current;

    // Calculate current top-left corner of the dragged item in viewport coordinates
    const currentViewportPos = {
      x: event.active.rect.current.initial.left + event.delta.x,
      y: event.active.rect.current.initial.top + event.delta.y,
    };

    const stageContainerRect = containerRef.current.getBoundingClientRect();

    // Pointer position relative to the stage container (using top-left of dragged item)
    const relativeX = currentViewportPos.x - stageContainerRect.left;
    const relativeY = currentViewportPos.y - stageContainerRect.top;

    // Convert position to Konva stage coordinates
    const stagePos = stage.position();
    const scale = stage.scaleX();
    const konvaPos = {
      x: (relativeX - stagePos.x) / scale,
      y: (relativeY - stagePos.y) / scale,
    };

    // --- Manual Hit Detection (using the calculated konvaPos) ---
    let foundTableId: string | null = null;
    // Iterate through layout elements reversed so top-most elements are checked first
    const reversedElements = [...layoutData.elements].reverse();

    for (const el of reversedElements) {
      if (el.type === LayoutElementType.TABLE) {
        // Get element properties including rotation
        const elX = el.x;
        const elY = el.y;
        const elWidth = el.width;
        const elHeight = el.height;
        const rotation = el.rotation || 0; // Get rotation in degrees, default to 0

        if (rotation === 0) {
          // Fast path: Simple Axis-Aligned Bounding Box check for non-rotated elements
          if (
            konvaPos.x >= elX &&
            konvaPos.x <= elX + elWidth &&
            konvaPos.y >= elY &&
            konvaPos.y <= elY + elHeight
          ) {
            foundTableId = el.id;
            break; // Found the top-most table, stop checking
          }
        } else {
          // Account for rotation - transform point to element's coordinate system
          // 1. Translate to origin relative to element center
          const centerX = elX + elWidth / 2;
          const centerY = elY + elHeight / 2;
          const relativeX = konvaPos.x - centerX;
          const relativeY = konvaPos.y - centerY;

          // 2. Rotate point in the opposite direction of element rotation
          const angleInRadians = (-rotation * Math.PI) / 180; // Convert to radians and negate
          const rotatedX =
            relativeX * Math.cos(angleInRadians) - relativeY * Math.sin(angleInRadians);
          const rotatedY =
            relativeX * Math.sin(angleInRadians) + relativeY * Math.cos(angleInRadians);

          // 3. Check if the rotated point is within the element's bounds (now axis-aligned)
          if (
            rotatedX >= -elWidth / 2 &&
            rotatedX <= elWidth / 2 &&
            rotatedY >= -elHeight / 2 &&
            rotatedY <= elHeight / 2
          ) {
            foundTableId = el.id;
            break; // Found the top-most table, stop checking
          }
        }
      }
    }

    if (hoveredTableId !== foundTableId) {
      setHoveredTableId(foundTableId);
      // console.log('Hover Update (Manual Check) -> Hovered Table ID:', foundTableId);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    // Set pointer cursor to default
    document.body.style.cursor = 'default';

    const guestId = activeId;
    const targetTableId = hoveredTableId;
    setActiveId(null);
    setActiveGuestData(null);
    setHoveredTableId(null);

    if (!guestId) {
      console.log('Invalid guest ID');
      return; // Dropped outside or not on a table
    }

    if (!targetTableId) {
      console.log('Invalid table ID');
      const hasTableAssignment = !!currentAssignments.get(guestId)?.layoutElementId;
      if (hasTableAssignment) {
        // Remove assignment if dropped outside
        setCurrentAssignments(prev => {
          const newMap = new Map(prev);
          newMap.delete(guestId);
          return newMap;
        });
      }
      return; // Dropped outside or not on a table
    }
    const guest = guestsWithAssignments.find(g => g.id === guestId);
    const table = layoutData?.elements.find(el => el.id === targetTableId);
    const tableLabel = table?.label;

    if (!guest || !isTableElement(table)) {
      toast.error(
        t('seatAssignment.toast.invalidGuest', {
          details: `${!!guest ? 'Guest' : ''} ${!!table ? 'Table' : ''}`
        })
      );
      return;
    }

    // Check if the guest is already assigned to the table
    const isAlreadyAssigned = currentAssignments.get(guestId)?.layoutElementId === targetTableId;
    if (isAlreadyAssigned) {
      return;
    }

    // Capacity Check
    const seatsNeeded = 1; // guest.hasPlusOne ? 2 : 1;
    const currentOccupancy = tableOccupancy.get(targetTableId) ?? 0;
    const capacity = table.numberOfSeats;
    const availableSeats = capacity - currentOccupancy;

    if (seatsNeeded > availableSeats) {
      toast.error(
        t('seatAssignment.toast.tableFull', {
          tableName: tableLabel ?? targetTableId.substring(0, 6),
          capacity: capacity,
          available: availableSeats,
          needed: seatsNeeded
        })
      );
      return;
    }

    // Update Assignment State
    setCurrentAssignments(prev => {
      const newMap = new Map(prev);
      newMap.set(guestId, {
        layoutElementId: targetTableId,
        layoutElementLabel: tableLabel,
      });
      return newMap;
    });

    setHasChanges(true);

    // Clear guest selection if it was used (optional, might remove checkbox selection)
    // setGuestSelection(prev => {
    //   const newSelection = new Set(prev);
    //   newSelection.delete(guestId);
    //   return newSelection;
    // });
  };
  // --- End DND Event Handlers ---

  // --- Re-introduce Checkbox Handlers ---
  const handleGuestSelectionChange = (guestId: string, isChecked: boolean) => {
    setGuestSelection(prevSelection => {
      const newSelection = new Set(prevSelection);
      if (isChecked) {
        newSelection.add(guestId);
      } else {
        newSelection.delete(guestId);
      }
      return newSelection;
    });
    // Optionally clear table selection when guest selection changes?
    // setSelectedTableId(null);
  };

  const handleAssign = () => {
    if (guestSelection.size === 0 || !selectedTableId) {
      if (guestSelection.size === 0) toast.error(t('seatAssignment.toast.noGuestsSelected'));
      if (!selectedTableId) toast.error(t('seatAssignment.toast.noTableSelected'));
      return;
    }

    const table = layoutData?.elements.find(el => el.id === selectedTableId);
    const tableLabel = table?.label;

    if (!isTableElement(table)) {
      toast.error(t('seatAssignment.toast.invalidTable'));
      return;
    }

    const selectedGuests = guestsWithAssignments.filter(g => guestSelection.has(g.id));
    const totalSeatsRequired = selectedGuests.reduce((sum, guest) => sum + 1, 0);

    const currentOccupancy = tableOccupancy.get(selectedTableId) ?? 0;
    const capacity = table.numberOfSeats;
    const availableSeats = capacity - currentOccupancy;

    if (totalSeatsRequired > availableSeats) {
      toast.error(
        t('seatAssignment.toast.tableFull', {
          tableName: tableLabel ?? selectedTableId.substring(0, 6),
          capacity: capacity,
          available: availableSeats,
          needed: totalSeatsRequired
        })
      );
      return;
    }

    // Update Assignment State
    setCurrentAssignments(prev => {
      const newMap = new Map(prev);
      selectedGuests.forEach(guest => {
        newMap.set(guest.id, {
          layoutElementId: selectedTableId,
          layoutElementLabel: tableLabel,
        });
      });
      return newMap;
    });

    setHasChanges(true);
    // Clear selections after successful assignment
    setGuestSelection(new Set());
    setSelectedTableId(null); // Clear table selection too
  };
  // --- End Re-introduce Checkbox Handlers ---

  const handleClearTable = (tableId: string | null) => {
    if (!tableId) return;

    setCurrentAssignments(prev => {
      const newMap = new Map(prev);
      let changed = false;
      newMap.forEach((assignment, guestId) => {
        if (assignment?.layoutElementId === tableId) {
          newMap.set(guestId, null); // Mark as unassigned
          changed = true;
        }
      });
      return changed ? newMap : prev; // Return new map only if changes were made
    });

    toast.success(
      t('seatAssignment.toast.tableCleared', {
        tableName: selectedTableLabel ?? tableId.substring(0, 6)
      })
    );
  };

  // --- Calculate Stats ---
  const totalTables = layoutData?.elements.filter(el => el.type === LayoutElementType.TABLE).length;
  const totalSeats = layoutData?.elements.reduce((sum, el) => {
    if (el.type === LayoutElementType.TABLE && typeof el.numberOfSeats === 'number') {
      return sum + el.numberOfSeats;
    }
    return sum;
  }, 0);

  return (
    <AdminLayout>
      {/* Wrap the main content area with DndContext */}
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragMove={handleDragMove}
        onDragEnd={handleDragEnd}
      >
        <div className="flex flex-col h-full mx-auto px-6 py-8">
          {/* Navigation */}
          <div className="mb-2 shrink-0">
            <Button
              variant="ghost"
              onClick={() => router.push(`/admin/events/${eventId}`)}
              className="text-gray-600 hover:text-gray-900 h-8 px-2 -ml-2"
            >
              <FiArrowLeft className="mr-1.5 h-4 w-4" />
              <span className="text-xs">{t('seatAssignment.backToEvent')}</span>
            </Button>
          </div>

          {/* Header Section */}
          <div className="flex justify-between items-start mb-4 shrink-0">
            <div className="flex items-center gap-2 w-full justify-between">
              <h1 className="text-2xl font-medium text-gray-900 mb-1">{t('seatAssignment.title')}</h1>
              <div className="flex items-center gap-2">
                <Link href={`/admin/events/${eventId}/seatmap`}>
                  <Button variant="outline">
                    <span className="text-xs">{t('seatAssignment.editSeatmap')}</span>
                  </Button>
                </Link>
                <Button
                  onClick={handleSaveAssignments}
                  disabled={isLoading || upsertAssignmentsMutation.isPending}
                >
                  {upsertAssignmentsMutation.isPending ? t('seatAssignment.saving') : t('seatAssignment.saveChanges')}
                </Button>
              </div>
            </div>
          </div>
          {/* Stats Section */}
          <div className="mb-4 flex justify-between items-center space-x-6 shrink-0 p-1 text-sm text-gray-600">
            <div className="flex items-center space-x-2 ">
              <p>
                <span className="font-medium text-gray-800">{totalTables}</span> {t('seatAssignment.tables')}
              </p>
              <p>
                <span className="font-medium text-gray-800">{totalSeats}</span> {t('seatAssignment.totalSeats')}
              </p>
            </div>
            {hasChanges && (
              <p className="font-medium text-red-500">
                <span className="font-medium text-red-500">{t('seatAssignment.unsavedChanges')}</span>
              </p>
            )}
          </div>

          {/* Main Content - Should grow and allow internal scrolling */}
          <div className="flex flex-grow overflow-hidden min-h-0">
            {/* Layout View Area - Add droppable here */}
            <div
              ref={containerRef}
              className="flex-grow relative border border-gray-300 rounded-lg bg-gray-100"
            >
              {isLoading ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Skeleton className="h-3/4 w-3/4" />
                </div>
              ) : isError || !layoutData ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                  <p className="text-gray-600">{t('seatAssignment.noLayout')}</p>
                  <Link href={`/admin/events/${eventId}/seatmap`}>
                    <Button variant="default">{t('seatAssignment.createLayout')}</Button>
                  </Link>
                </div>
              ) : (
                <>
                  <Stage
                    ref={stageRef}
                    width={stageSize.width}
                    height={stageSize.height}
                    onWheel={handleWheel}
                    scaleX={stageScale}
                    scaleY={stageScale}
                    x={stagePosition.x}
                    y={stagePosition.y}
                    draggable
                    // onDragStart={e => handleStageDragStart(e, true)}
                    // onDragEnd={e => handleStageDragEnd(e, true, setStagePosition)}
                    onMouseDown={handleStageClick} // Still needed for deselecting table
                    onTouchStart={handleStageClick}
                  >
                    <Layer>
                      {/* Background Rect with Gradient - Matches Editor */}
                      <LayoutBackground
                        src={layoutData.backgroundUrl ?? ''}
                        stageSize={stageSize}
                      />
                      {/* Render Layout Elements - Updated Logic */}
                      {layoutData.elements.map(el => {
                        const isTableSelectedForAssignment = selectedTableId === el.id;
                        const isTableHoveredForDrop = hoveredTableId === el.id && activeId !== null;

                        const elementColor = getElementColor(el);

                        const groupProps = {
                          id: el.id,
                          x: el.x,
                          y: el.y,
                          rotation: el.rotation ?? 0,
                          // Keep original click/tap handlers for manual selection
                          onClick: () => handleSelectTable(el.id, el.type),
                          onTap: () => handleSelectTable(el.id, el.type),
                        };

                        const shapeProps = {
                          fill: elementColor,
                          stroke: isTableHoveredForDrop // Hover takes precedence
                            ? '#c6b3f3' // Purple for hover drop target
                            : isTableSelectedForAssignment
                              ? '#c6b3f3' // Purple again for manual selection
                              : '#333', // Default
                          strokeWidth: isTableHoveredForDrop
                            ? 3 // Thicker for hover
                            : isTableSelectedForAssignment
                              ? 3 // Highlight for selection
                              : 1, // Default
                          opacity: el.opacity
                            ? el.opacity
                            : activeId // Dim elements when dragging
                              ? 0.6
                              : 1,
                          // Add shadow for hover effect
                          shadowColor:
                            isTableHoveredForDrop || isTableSelectedForAssignment
                              ? '#c6b3f3'
                              : undefined,
                          shadowBlur:
                            isTableHoveredForDrop || isTableSelectedForAssignment ? 20 : 0,
                          shadowOpacity:
                            isTableHoveredForDrop || isTableSelectedForAssignment ? 0.8 : 0,
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

                        // --- Occupancy Text specific props ---
                        const occupancyCount = tableOccupancy.get(el.id) ?? 0;
                        const capacity = el.numberOfSeats ?? 0;
                        // --- End Occupancy Text props ---

                        const guestsAtThisTable = assignedGuestsByTableId.get(el.id) ?? [];
                        const seatPositions = isTableElement(el) ? calculateSeatPositions(el) : [];

                        return (
                          <Group key={el.id} {...groupProps}>
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
                                cornerRadius={
                                  el.cornerStyle === ElementCornerStyle.ROUNDED ? 10 : 0
                                }
                              />
                            )}
                            <Text text={el.label ?? ''} {...textProps} />
                            {/* Display seat count and occupancy in a single text element */}
                            {isTableElement(el) && (
                              <>
                                {/* Dark background for labels - minimal padding */}
                                <Rect
                                  width={80} // Further reduced fixed width
                                  height={14} // Further reduced height
                                  fill="rgba(0, 0, 0, 0.6)"
                                  cornerRadius={2} // Slightly smaller corner radius
                                  x={(el.width - 80) / 2} // Center based on new width
                                  y={
                                    el.shape === TableShape.CIRCLE
                                      ? el.width / 2 + 6 // Adjusted Y position
                                      : el.height + 6 // Adjusted Y position
                                  }
                                />
                                <Text
                                  text={t('seatAssignment.seats', {
                                    total: el.numberOfSeats,
                                    occupied: occupancyCount,
                                    capacity: capacity
                                  })}
                                  fontSize={8} // Keep font size
                                  fill="#ffffff"
                                  width={80} // Match Rect width
                                  height={14} // Match Rect height
                                  align="center"
                                  verticalAlign="middle"
                                  x={(el.width - 80) / 2} // Center based on new width
                                  y={
                                    el.shape === TableShape.CIRCLE
                                      ? el.width / 2 + 6 // Adjusted Y position
                                      : el.height + 6 // Adjusted Y position
                                  }
                                  listening={false}
                                  opacity={shapeProps.opacity}
                                />
                              </>
                            )}
                            {/* Render Assigned Guest Avatars instead of Seat Circles */}
                            {isTableElement(el) &&
                              guestsAtThisTable.map((guest, index) => {
                                // Basic sequential slot filling
                                if (index >= seatPositions.length) return null; // Should not happen if capacity check is correct

                                const pos = seatPositions[index];
                                if (!pos) return null; // Safety check

                                return (
                                  <SeatAvatar
                                    key={`avatar-${guest.id}`}
                                    guest={guest}
                                    x={pos.x}
                                    y={pos.y}
                                    opacity={shapeProps.opacity}
                                    stageRef={stageRef}
                                    onTooltipShow={handleTooltipShow}
                                    stageScale={stageScale}
                                    draggable
                                  />
                                );
                              })}
                          </Group>
                        );
                      })}
                    </Layer>
                  </Stage>

                  {/* Render tooltip outside of Konva */}
                  {tooltipContent && (
                    <AvatarTooltip content={tooltipContent} position={tooltipPosition} />
                  )}
                </>
              )}
              {/* Zoom Indicator Chip */}
              <div className="absolute bottom-4 right-4 bg-gray-800 bg-opacity-70 text-white text-xs px-2 py-1 rounded shadow">
                <span>{t('seatAssignment.zoom', { percent: (stageScale * 100).toFixed(0) })}</span>
              </div>
            </div>

            {/* Guest List / Assignment Panel */}
            <div className="w-80 bg-background pt-0.5 p-4 flex flex-col space-y-4 overflow-y-auto shrink-0">
              {/* --- Filter and Search Controls --- */}
              <div className="space-y-2">
                <Input
                  placeholder={t('seatAssignment.searchGuests')}
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                />
                <div className="flex space-x-2">
                  <Select
                    value={selectedCategory}
                    onValueChange={value => setSelectedCategory(value as string | 'all')}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder={t('seatAssignment.filterByCategory')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('seatAssignment.allCategories')}</SelectItem>
                      {/* Categories will be populated dynamically */}
                      {uniqueCategories.map(category => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={selectedStatus}
                    onValueChange={value => setSelectedStatus(value as GuestStatus | 'all')}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder={t('seatAssignment.filterByStatus')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('seatAssignment.allStatuses')}</SelectItem>
                      {/* Statuses will be populated dynamically */}
                      {uniqueStatuses.map(status => {
                        const props = getRsvpBadgeProps(status);
                        return (
                          <SelectItem key={status} value={status}>
                            {props?.text ?? status} {/* Use display text from helper */}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
                {/* Assigned Guests Toggle */}
                <div className="flex items-center space-x-2 pt-2">
                  <Switch
                    id="include-assigned-guests"
                    checked={includeAssignedGuests}
                    onCheckedChange={setIncludeAssignedGuests}
                  />
                  <Label htmlFor="include-assigned-guests" className="text-xs font-normal">
                    {t('seatAssignment.showAssignedGuests')}
                  </Label>
                </div>
              </div>
              {/* --- End Filter and Search Controls --- */}

              {/* --- Mode Switcher --- */}
              <div className="flex items-center justify-center gap-2 py-2 border-b mb-2">
                <Button
                  variant={assignmentMode === 'drag' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setAssignmentMode('drag')}
                  className="flex-1 text-xs"
                >
                  {t('seatAssignment.dragDropMode')}
                </Button>
                <Button
                  variant={assignmentMode === 'select' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setAssignmentMode('select')}
                  className="flex-1 text-xs"
                >
                  {t('seatAssignment.selectMode')}
                </Button>
              </div>
              {/* --- End Mode Switcher --- */}

              {/* --- Assigned Guests to Selected Table (Conditional) --- */}
              {selectedTableId && (
                <div className="shrink-0 pt-3 mt-3 p-3 bg-gray-50 border rounded-md">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-sm font-semibold text-gray-700">
                      {t('seatAssignment.guestsAtTable', {
                        tableName: selectedTableLabel,
                        count: assignedGuestsToSelectedTable.length
                      })}
                    </h3>
                    {assignedGuestsToSelectedTable.length > 0 && (
                      <Button
                        variant="outline"
                        className="h-5 px-2 text-xs hover:bg-red-50 hover:text-red-700 hover:border-red-300 text-xs"
                        onClick={() => {
                          if (window.confirm(t('seatAssignment.clearTableConfirm'))) {
                            handleClearTable(selectedTableId);
                          }
                        }}
                      >
                        {t('seatAssignment.clear')}
                      </Button>
                    )}
                  </div>
                  {assignedGuestsToSelectedTable.length > 0 ? (
                    <ul className="space-y-1 text-xs list-disc list-inside text-gray-600">
                      {assignedGuestsToSelectedTable
                        .sort((a, b) => a.name.localeCompare(b.name))
                        .map(guest => (
                          <li key={guest.id} className="flex items-center space-x-1.5">
                            <span className="truncate" title={guest.name}>
                              {guest.name}
                            </span>
                            {/* {guest.hasPlusOne && (
                              <TooltipProvider delayDuration={100}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="flex items-center gap-1">
                                      <LucideAmpersand
                                        className="w-3 h-3 text-purple-600 flex-shrink-0" // Adjusted color
                                        aria-label="Has plus one"
                                      />
                                      <span className="">{guest.plusOneName}</span>
                                    </div>
                                  </TooltipTrigger>
                                  {guest.plusOneName && (
                                    <TooltipContent>
                                      <p>+1: {guest.plusOneName}</p>
                                    </TooltipContent>
                                  )}
                                </Tooltip>
                              </TooltipProvider>
                            )} */}
                          </li>
                        ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">
                      {t('seatAssignment.noGuestsAtTable')}
                    </p>
                  )}
                </div>
              )}
              {/* --- End Assigned Guests --- */}

              {/* --- Scrollable Guest List --- */}
              {isGuestsLoading ? (
                <p className="px-2 py-4 text-sm text-muted-foreground">{t('seatAssignment.loadingGuests')}</p>
              ) : isGuestsError ? (
                <p className="px-2 py-4 text-sm text-destructive">{t('seatAssignment.errorLoadingGuests')}</p>
              ) : (
                <div
                  className={cn(
                    'flex-grow space-y-0.5 -mx-2 overflow-y-auto pt-4',
                    activeId && 'scroll-none overflow-hidden'
                  )}
                >
                  {filteredGuests
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map(guest =>
                      assignmentMode === 'drag' ? (
                        <DraggableGuestItem
                          key={`drag-${guest.id}`}
                          guest={guest}
                          assignedLabel={currentAssignments.get(guest.id)?.layoutElementLabel}
                        />
                      ) : (
                        <SelectableGuestItem
                          key={`select-${guest.id}`}
                          guest={guest}
                          assignedLabel={currentAssignments.get(guest.id)?.layoutElementLabel}
                          isSelected={guestSelection.has(guest.id)}
                          onSelectionChange={handleGuestSelectionChange}
                        />
                      )
                    )}
                  {/* Display message if filters result in no guests */}
                  {filteredGuests.length === 0 && guestsWithAssignments.length > 0 && (
                    <p className="px-2 py-4 text-sm text-muted-foreground text-center">
                      {t('seatAssignment.noGuestsMatch')}
                    </p>
                  )}
                  {guestsWithAssignments.length === 0 && !isLoading && (
                    <p className="px-2 py-4 text-sm text-muted-foreground">
                      {t('seatAssignment.noGuestsFound')}
                    </p>
                  )}
                </div>
              )}
              {/* --- Assign Button Area (Conditional based on mode) --- */}
              {assignmentMode === 'select' && (
                <div className="flex justify-center mt-4">
                  <Button
                    onClick={handleAssign}
                    disabled={isLoading || guestSelection.size === 0 || !selectedTableId}
                  >
                    {t('seatAssignment.assignGuests')}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Drag Overlay - Render the "pegman" */}
        <DragOverlay dropAnimation={null}>
          {activeId && activeGuestData ? (
            // Show avatar(s) and name
            <div className="bg-transparent text-gray-800 rounded-lg px-2.5 py-1.5 pointer-events-none flex items-center gap-2">
              {/* Avatar Section - Mirror List Items */}
              <div className="flex flex-shrink-0 -translate-x-6 -translate-y-6">
                <img
                  src={getNotionizedCharacter(activeGuestData.name)}
                  alt={`${activeGuestData.name} avatar`}
                  // Slightly larger avatars in overlay
                  className={cn(
                    'w-12 h-12 rounded-full bg-gray-200 border border-white z-10 shadow',
                    hoveredTableId ? 'animate-pulse border-[#c6b3f3] border-2' : ''
                  )}
                />
                {/* {activeGuestData.hasPlusOne && (
                  <img
                    src={getNotionizedCharacter(
                      activeGuestData.plusOneName || `${activeGuestData.name}+1`
                    )}
                    alt={`${activeGuestData.plusOneName || 'Plus One'} avatar`}
                    // Slightly larger avatars, adjust overlap
                    className={cn(
                      'w-12 h-12 rounded-full bg-gray-300 border border-white -ml-3 z-0 shadow',
                      hoveredTableId ? 'animate-pulse border-[#c6b3f3] border-2' : ''
                    )}
                  />
                )} */}
              </div>
              <div className="flex flex-col items-start justify-center gap-1  -translate-x-6 -translate-y-6">
                <span className="text-xs font-medium whitespace-nowrap truncate flex items-center gap-1">
                  {activeGuestData.name}
                  {/* {activeGuestData.hasPlusOne ? ' & ' : ''}
                  {activeGuestData.plusOneName} */}
                  <span className="text-xs text-muted-foreground">
                    {activeGuestData.status === 'CONFIRMED' ? (
                      <LucideCircleCheck className="w-3 h-3 text-green-600" />
                    ) : activeGuestData.status === 'PENDING' ? (
                      <LucideCircleX className="w-3 h-3 text-red-500" />
                    ) : (
                      <LucideCircleX className="w-3 h-3 text-red-500" />
                    )}
                  </span>
                </span>
                <span className="text-xs text-muted-foreground">{activeGuestData.category}</span>
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </AdminLayout>
  );
}
