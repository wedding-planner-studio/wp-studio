export function AvatarTooltip({
  content,
  position,
}: {
  content: string;
  position: { x: number; y: number };
}) {
  if (!content) return null;

  return (
    <div
      style={{
        position: 'absolute',
        top: position.y,
        left: position.x,
        transform: 'translate(-50%, -100%)',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        color: 'white',
        padding: '4px 8px',
        borderRadius: '4px',
        fontSize: '12px',
        pointerEvents: 'none',
        zIndex: 1000,
        whiteSpace: 'nowrap',
      }}
    >
      {content}
    </div>
  );
}
