import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import { getResource } from '../engine/resourceManager.js';

interface Props {
  color: string;
  isSelected: boolean;
}

interface AnimationData {
  frames: string[][];
  staticFrameIndex: number;
}

const Pill: React.FC<Props> = ({ color, isSelected }) => {
  const animationData = getResource<Record<string, AnimationData>>('animations')[
    'pill-rotation'
  ];
  const ROTATION_FRAMES = animationData.frames;
  const STATIC_FRAME = ROTATION_FRAMES[animationData.staticFrameIndex];

  const [frameIndex, setFrameIndex] = useState(0);

  useEffect(() => {
    if (isSelected) {
      const timer = setInterval(() => {
        setFrameIndex((prev) => (prev + 1) % ROTATION_FRAMES.length);
      }, 150);
      return () => clearInterval(timer);
    }
  }, [isSelected]);

  const frame = isSelected ? ROTATION_FRAMES[frameIndex] : STATIC_FRAME;

  return (
    <Box flexDirection="column" alignItems="center" padding={1}>
      {frame.map((line, index) => (
        <Text key={index} color={isSelected ? color : 'grey'}>
          {line}
        </Text>
      ))}
    </Box>
  );
};

export default Pill;
