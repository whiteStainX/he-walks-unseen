import React from 'react';
import { Box, Text } from 'ink';

interface Props {
  title?: string;
  children: React.ReactNode;
  // Pass through any other Box props
  [key: string]: any;
}

const customBorderStyle = {
  topLeft: '╔',
  top: '═',
  topRight: '╗',
  left: '║',
  right: '║',
  bottomLeft: '╚',
  bottom: '═',
  bottomRight: '╝',
};

const TerminalBox: React.FC<Props> = ({ title, children, ...rest }) => {
  return (
    <Box flexDirection="column" borderStyle={customBorderStyle} {...rest}>
      {title && (
        <Box paddingBottom={1}>
          <Text bold>{title}</Text>
        </Box>
      )}
      {children}
    </Box>
  );
};

export default TerminalBox;