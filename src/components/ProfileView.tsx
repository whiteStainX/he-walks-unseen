import React from 'react';
import { Box, Text } from 'ink';
import { getResource } from '../engine/resourceManager.js';
import { useTheme } from '../themes.js';

interface Props {
  profileId?: string;
}

const ProfileView: React.FC<Props> = ({ profileId }) => {
  const theme = useTheme();
  const profiles = getResource<Record<string, string>>('profiles');
  const artKey = (profileId && profiles[profileId]) ? profiles[profileId] : 'no_signal';
  const artString = getResource<string>(artKey);
  const art = artString.split('\n');

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
