import { Guest } from '@prisma/client';
import { KonvaEventObject } from 'konva/lib/Node';
import Konva from 'konva';
import { useState, useEffect } from 'react';
import { cn, getNotionizedCharacter, shortenCoupleName, shortenName } from '@/lib/utils';
import { AVATAR_SIZE } from '@/lib/utils/konva-utils';
import { Rect, Text, Image as KonvaImage, Group } from 'react-konva';
import { useDraggable } from '@dnd-kit/core';
import { Html } from 'react-konva-utils';
import { useClientTranslation } from '@/app/i18n/client/TranslationsProvider';

export type GuestWithAssignment = Guest & {
  assignedElementId?: string | null;
  assignedElementLabel?: string | null;
};

export function SeatAvatar({
  guest,
  x,
  y,
  opacity,
  stageRef,
  onTooltipShow,
  stageScale,
}: {
  guest: GuestWithAssignment;
  x: number;
  y: number;
  opacity: number;
  stageRef: React.RefObject<Konva.Stage>;
  onTooltipShow: (content: string, position: { x: number; y: number }) => void;
  stageScale: number;
  draggable: boolean;
}) {
  const { t } = useClientTranslation('common');
  // State for loaded images
  const [img1Element, setImg1Element] = useState<HTMLImageElement | undefined>();
  const [img2Element, setImg2Element] = useState<HTMLImageElement | undefined>();

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `${guest.id}`,
    data: { guest, type: 'seat-avatar' },
  });

  // Calculate current position based on transform (drag offset)
  // Adjusting transform by stageScale for accurate dragging at different zoom levels
  const currentGroupX = x + (transform ? transform.x / stageScale : 0);
  const currentGroupY = y + (transform ? transform.y / stageScale : 0);

  // Load primary avatar image
  useEffect(() => {
    if (!guest?.name) return;
    const img = new window.Image();
    img.src = getNotionizedCharacter(guest.name);
    img.onload = () => setImg1Element(img);
    // Optional: Handle image loading error
    img.onerror = () => console.error(`Failed to load avatar for ${guest.name}`);
    // Cleanup function
    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [guest?.name]); // Reload if guest name changes

  // // Load plus one avatar image
  // useEffect(() => {
  //   if (!guest?.hasPlusOne) {
  //     setImg2Element(undefined); // Ensure img2 is cleared if guest no longer has +1
  //     return;
  //   }
  //   const plusOneSeed = guest.plusOneName || `${guest.name}+1`;
  //   const img = new window.Image();
  //   img.src = getNotionizedCharacter(plusOneSeed);
  //   img.onload = () => setImg2Element(img);
  //   img.onerror = () => console.error(`Failed to load avatar for ${plusOneSeed}`);
  //   return () => {
  //     img.onload = null;
  //     img.onerror = null;
  //   };
  // }, [guest?.hasPlusOne, guest?.plusOneName, guest?.name]); // Reload if +1 status or names change

  // Calculate offset based on whether there's a plus one
  const groupOffsetX = AVATAR_SIZE / 2;
  const groupOffsetY = AVATAR_SIZE / 2;

  // Format display name
  const displayName =
    guest.hasPlusOne && guest.plusOneName
      ? shortenCoupleName(guest.name, guest.plusOneName)
      : guest.hasPlusOne
        ? `${shortenName(guest.name)} & ${t('seatAvatar.plusOne')}`
        : shortenName(guest.name);

  // Whether to show name (when zoomed in enough)
  const showName = stageScale > 1.5;

  // Calculate width for name label - scale based on name length
  const nameWidth = Math.max(
    Math.min(displayName.length * 6, AVATAR_SIZE * 1.5),
    AVATAR_SIZE * 1.5
  );

  // Handle hover events to show/hide tooltip
  const handleMouseEnter = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!stageRef.current || isDragging) return; // Don't show tooltip while dragging

    const stage = stageRef.current;
    const pointerPosition = stage.getPointerPosition();

    if (pointerPosition) {
      // Generate tooltip content
      let content = guest.name;
      if (guest.hasPlusOne && guest.plusOneName) {
        content += ` & ${guest.plusOneName}`;
      } else if (guest.hasPlusOne) {
        content += ` & ${t('seatAvatar.plusOne')}`;
      }

      onTooltipShow(content, {
        x: pointerPosition.x,
        y: pointerPosition.y - 10,
      });
    }
  };

  const handleMouseLeave = () => {
    onTooltipShow('', { x: 0, y: 0 }); // Hide tooltip
  };

  // Calculate the dimensions for the HTML handle
  const handleX = -groupOffsetX;
  const handleY = -groupOffsetY;
  const handleWidth = AVATAR_SIZE;
  const handleHeight = AVATAR_SIZE;

  return (
    <Group
      x={currentGroupX}
      y={currentGroupY}
      opacity={isDragging ? 0 : opacity}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Main Guest Avatar */}
      <KonvaImage
        image={img1Element}
        width={AVATAR_SIZE}
        height={AVATAR_SIZE}
        cornerRadius={AVATAR_SIZE / 2}
        offsetX={groupOffsetX}
        offsetY={groupOffsetY}
        stroke="#fff"
        strokeWidth={1}
        alt={t('seatAvatar.guestAvatar', { name: guest.name })}
      />

      {/* Plus One Avatar (if applicable) */}
      {/* {guest.hasPlusOne && img2Element && (
        <KonvaImage
          image={img2Element}
          width={AVATAR_SIZE}
          height={AVATAR_SIZE}
          cornerRadius={AVATAR_SIZE / 2}
          x={AVATAR_SIZE * 0.5} // Shift right relative to the group origin
          offsetX={groupOffsetX}
          offsetY={groupOffsetY}
          stroke="#fff"
          strokeWidth={1}
          alt={t('seatAvatar.plusOneAvatar', { name: guest.plusOneName || `${guest.name}+1` })}
        />
      )} */}

      {/* Name label (only visible when zoomed in enough) */}
      {showName && (
        <>
          {/* Text background for better readability */}
          <Rect
            width={nameWidth}
            height={8}
            fill="rgba(0,0,0,0.6)"
            cornerRadius={3}
            x={0}
            y={AVATAR_SIZE * 0.6}
            offsetX={nameWidth / 2}
          />
          <Text
            text={displayName}
            fontSize={4}
            fill="#ffffff"
            width={nameWidth}
            height={8}
            align="center"
            verticalAlign="middle"
            x={0}
            y={AVATAR_SIZE * 0.6}
            offsetX={nameWidth / 2}
            ellipsis={true}
            wrap="none"
          />
        </>
      )}

      {/* HTML Draggable Handle */}
      <Html
        groupProps={{
          x: handleX,
          y: handleY,
          width: handleWidth,
          height: handleHeight,
        }}
      >
        <div
          ref={setNodeRef}
          {...attributes}
          {...listeners}
          style={{
            width: AVATAR_SIZE,
            height: AVATAR_SIZE,
            cursor: isDragging ? 'grabbing' : 'grab',
            pointerEvents: 'auto',
          }}
          className="w-4 h-4 bg-transparent"
        />
      </Html>
    </Group>
  );
}
