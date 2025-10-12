import React, { useState, useEffect } from 'react';
import { Text } from 'ink';

interface Props {
  label: string;
  color: string;
  isSelected: boolean;
}

const BRACKET_FRAMES = ['[', '<', '{', '<'];
const TEXT_FRAMES = (label: string) => [
  label.toUpperCase(),
  ` ${label.toLowerCase()}`,
  label.toUpperCase(),
  ` ${label.toUpperCase()}`,
];

const AnimatedChoice: React.FC<Props> = ({ label, color, isSelected }) => {
  const [frameIndex, setFrameIndex] = useState(0);

  useEffect(() => {
    if (isSelected) {
      const timer = setInterval(() => {
        setFrameIndex((prev) => (prev + 1) % BRACKET_FRAMES.length);
      }, 150);
      return () => clearInterval(timer);
    }
  }, [isSelected]);

  if (!isSelected) {
    return <Text color="grey">  {label}  </Text>;
  }

  const bracket = BRACKET_FRAMES[frameIndex];
  const text = TEXT_FRAMES(label)[frameIndex];

  return (
    <Text color={color}>
      {bracket} {text} {bracket}
    </Text>
  );
};

export default AnimatedChoice;
