import React from 'react';
import { Box, Text } from 'ink';
import type { Actor, Skill } from '../engine/state.js';
import TerminalBox from './TerminalBox.js';
import { useTheme } from '../themes.js';
import type { SkillNodeLayout } from './skillTreeLayout.js';

interface SkillTreeViewProps {
  skills: Record<string, Skill>;
  player: Actor | undefined;
  layout: SkillNodeLayout[];
  canvasWidth: number;
  canvasHeight: number;
  selectedSkillId: string | null;
  width?: number;
  height?: number;
}

interface Cell {
  char: string;
  color?: string;
  backgroundColor?: string;
}

const MAX_LABEL_LENGTH = 16;

const createEmptyGrid = (height: number, width: number): Cell[][] =>
  Array.from({ length: height }, () =>
    Array.from({ length: width }, () => ({ char: ' ' } as Cell))
  );

function placeConnection(
  grid: Cell[][],
  parent: SkillNodeLayout,
  child: SkillNodeLayout,
  color: string
) {
  const height = grid.length;
  const width = grid[0]?.length ?? 0;

  if (height === 0 || width === 0) {
    return;
  }

  if (parent.x === child.x) {
    const start = Math.min(parent.y, child.y);
    const end = Math.max(parent.y, child.y);
    for (let y = start + 1; y < end; y++) {
      const cell = grid[y]?.[parent.x];
      if (cell) {
        cell.char = '|';
        cell.color = color;
      }
    }
    return;
  }

  const startY = Math.min(parent.y, child.y);
  const endY = Math.max(parent.y, child.y);
  const midY = Math.max(startY + 1, Math.min(endY - 1, Math.floor((parent.y + child.y) / 2)));

  for (let y = startY + 1; y <= midY; y++) {
    const cell = grid[y]?.[parent.x];
    if (cell) {
      cell.char = '|';
      cell.color = color;
    }
  }

  const startX = Math.min(parent.x, child.x);
  const endX = Math.max(parent.x, child.x);
  for (let x = startX; x <= endX; x++) {
    const cell = grid[midY]?.[x];
    if (cell) {
      cell.char = '-';
      cell.color = color;
    }
  }

  for (let y = midY + 1; y < endY; y++) {
    const cell = grid[y]?.[child.x];
    if (cell) {
      cell.char = '|';
      cell.color = color;
    }
  }

  const parentCell = grid[midY]?.[parent.x];
  if (parentCell) {
    parentCell.char = '+';
    parentCell.color = color;
  }

  const childCell = grid[midY]?.[child.x];
  if (childCell) {
    childCell.char = '+';
    childCell.color = color;
  }
}

function placeLabel(
  grid: Cell[][],
  node: SkillNodeLayout,
  label: string,
  color: string,
  backgroundColor?: string
) {
  if (grid.length === 0 || grid[0]?.length === 0) {
    return;
  }

  const row = grid[node.y];
  if (!row) {
    return;
  }

  const truncated =
    label.length > MAX_LABEL_LENGTH
      ? `${label.slice(0, MAX_LABEL_LENGTH - 1)}…`
      : label;

  const startX = Math.max(
    0,
    Math.min(row.length - truncated.length, node.x - Math.floor(truncated.length / 2))
  );

  for (let i = 0; i < truncated.length; i++) {
    const cell = row[startX + i];
    if (cell) {
      cell.char = truncated[i];
      cell.color = color;
      cell.backgroundColor = backgroundColor;
    }
  }
}

function convertGridToLines(grid: Cell[][]) {
  return grid.map((row, rowIndex) => {
    if (!row) {
      return <Text key={rowIndex}></Text>;
    }

    const segments: { text: string; color?: string; backgroundColor?: string }[] = [];
    let currentText = '';
    let currentColor: string | undefined;
    let currentBackground: string | undefined;

    const pushSegment = () => {
      if (currentText.length === 0) return;
      segments.push({
        text: currentText.replace(/ /g, ' '),
        color: currentColor,
        backgroundColor: currentBackground,
      });
      currentText = '';
    };

    for (const cell of row) {
      const { char, color, backgroundColor } = cell;
      if (currentColor === color && currentBackground === backgroundColor) {
        currentText += char;
      } else {
        pushSegment();
        currentText = char;
        currentColor = color;
        currentBackground = backgroundColor;
      }
    }

    pushSegment();

    return (
      <Text key={rowIndex}>
        {segments.map((segment, idx) => (
          <Text
            // eslint-disable-next-line react/no-array-index-key
            key={idx}
            color={segment.color}
            backgroundColor={segment.backgroundColor}
          >
            {segment.text}
          </Text>
        ))}
      </Text>
    );
  });
}

const SkillTreeView: React.FC<SkillTreeViewProps> = ({
  skills,
  player,
  layout,
  canvasWidth,
  canvasHeight,
  selectedSkillId,
  width,
  height,
}) => {
  const theme = useTheme();
  const learnedSkills = player?.learnedSkills ?? {};

  const grid = React.useMemo(() => {
    const canvas = createEmptyGrid(canvasHeight, canvasWidth);
    const layoutById = new Map(layout.map((node) => [node.id, node]));

    for (const node of layout) {
      const skill = skills[node.id];
      if (!skill) continue;
      const prereqs = skill.prerequisites ?? [];
      for (const prereqId of prereqs) {
        const parent = layoutById.get(prereqId);
        if (parent) {
          placeConnection(canvas, parent, node, theme.dim);
        }
      }
    }

    for (const node of layout) {
      const skill = skills[node.id];
      if (!skill) continue;
      const isLearned = Boolean(learnedSkills[node.id]);
      const prereqs = skill.prerequisites ?? [];
      const hasAllPrereqs = prereqs.every((id) => learnedSkills[id]);
      const isSelected = node.id === selectedSkillId;

      let color = theme.primary;
      let background: string | undefined;

      if (isSelected) {
        color = theme.textOnPrimary;
        background = theme.accent;
      } else if (isLearned) {
        color = theme.accent;
      } else if (!hasAllPrereqs) {
        color = theme.dim;
      }

      const label = isSelected ? `[${skill.name}]` : skill.name;
      placeLabel(canvas, node, label, color, background);
    }

    return canvas;
  }, [canvasHeight, canvasWidth, layout, learnedSkills, selectedSkillId, skills, theme]);

  const selectedSkill = selectedSkillId ? skills[selectedSkillId] : undefined;
  const lines = React.useMemo(() => convertGridToLines(grid), [grid]);

  return (
    <TerminalBox
      flexDirection="column"
      paddingX={1}
      borderStyle="round"
      borderColor={theme.accent}
      width={width}
      height={height}
    >
      <Box paddingBottom={1} flexDirection="column">
        <Text bold color={theme.accent}>
          Skill Tree (press Esc or 'k' to close)
        </Text>
        <Text color={theme.primary}>Use arrow keys to navigate skills.</Text>
      </Box>
      <Box flexDirection="column" height={canvasHeight}>
        {lines}
      </Box>
      {selectedSkill && (
        <Box marginTop={1} flexDirection="column">
          <Text bold color={theme.accent}>{selectedSkill.name}</Text>
          <Text color={theme.primary}>{selectedSkill.description}</Text>
          <Text color={theme.primary}>Cost: {selectedSkill.cost ?? 0} skill point(s)</Text>
          <Text color={theme.primary}>
            Status:{' '}
            {learnedSkills[selectedSkill.id]
              ? 'Learned'
              : (selectedSkill.prerequisites ?? []).every((id) => learnedSkills[id])
              ? 'Available'
              : 'Locked'}
          </Text>
          <Text color={theme.primary}>
            Prerequisites:{' '}
            {(selectedSkill.prerequisites ?? []).length === 0
              ? 'None'
              : (selectedSkill.prerequisites ?? [])
                  .map((id) => `${skills[id]?.name ?? id}${learnedSkills[id] ? ' (✓)' : ''}`)
                  .join(', ')}
          </Text>
        </Box>
      )}
    </TerminalBox>
  );
};

export default SkillTreeView;
