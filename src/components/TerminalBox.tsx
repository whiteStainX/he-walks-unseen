import React from 'react';
import { Box } from 'ink';

// This is a simple pass-through component. All styling will be applied directly
// on the components that use it, to avoid complex border-rendering bugs.
const TerminalBox: React.FC<{ children: React.ReactNode; [key: string]: any }> = ({
  children,
  ...rest
}) => {
  return <Box {...rest}>{children}</Box>;
};

export default TerminalBox;
