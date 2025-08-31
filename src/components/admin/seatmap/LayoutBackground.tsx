import { useState, useEffect } from 'react';
import { Stage, Layer, Image as KonvaImage, Rect } from 'react-konva';

interface LayoutBackgroundProps {
  src: string;
  stageSize: { width: number; height: number };
}

const LayoutBackground = ({ src, stageSize }: LayoutBackgroundProps) => {
  // Add background image state
  const [backgroundImage, setBackgroundImage] = useState<HTMLImageElement | undefined>(undefined);

  // Load background image
  useEffect(() => {
    const image = new Image();
    image.src = src;
    image.onload = () => setBackgroundImage(image);
  }, [src]);

  if (!backgroundImage || !src) {
    return (
      <Rect
        x={0}
        y={0}
        width={stageSize.width}
        height={stageSize.height}
        listening={false}
        stroke="#d3d3d3"
        cornerRadius={8}
        dash={[3, 3]}
        strokeWidth={1}
        strokeOpacity={0.5}
        fill="rgba(255, 255, 255, 0.89)"
      />
    );
  }

  return <KonvaImage image={backgroundImage} listening={false} opacity={0.85} />;
};

export default LayoutBackground;
