import React from 'react';
import { Box, Text } from 'ink';
import { getResource } from '../engine/resourceManager.js';
import { useTheme } from '../themes.js';

interface Props {
  profileId?: string;
}

const ProfileView: React.FC<Props> = ({ profileId }) => {
  const theme = useTheme();
  const profiles = getResource<Record<string, string[]>>('profiles');

  const art = (profileId && profiles[profileId]) ? profiles[profileId] : profiles['no_signal'];

  return (
    <Box
      borderStyle="round"
      borderColor={theme.border}
      flexDirection="column"
      width={20}
      height={10}
      alignItems="center"
      justifyContent="center"
    >
      {art.map((line, index) => (
        <Text key={index} color={theme.primary}>
          {line}
        </Text>
      ))}
    </Box>
  );
};

export default ProfileView;
