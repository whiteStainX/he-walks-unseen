import type { Skill } from '../engine/state.js';

export interface SkillNodeLayout {
  id: string;
  name: string;
  depth: number;
  x: number;
  y: number;
  prerequisites: string[];
}

function computeDepth(
  skillId: string,
  skills: Record<string, Skill>,
  cache: Map<string, number>,
  visiting: Set<string>
): number {
  if (cache.has(skillId)) {
    return cache.get(skillId)!;
  }

  if (visiting.has(skillId)) {
    // Circular dependency guard
    return 0;
  }

  visiting.add(skillId);
  const skill = skills[skillId];
  const prereqs = skill?.prerequisites ?? [];
  let depth = 0;

  for (const prereqId of prereqs) {
    if (!skills[prereqId]) continue;
    depth = Math.max(depth, computeDepth(prereqId, skills, cache, visiting) + 1);
  }

  visiting.delete(skillId);
  cache.set(skillId, depth);
  return depth;
}

export function buildSkillTreeLayout(
  skills: Record<string, Skill>,
  width: number,
  height: number
): SkillNodeLayout[] {
  const cache = new Map<string, number>();
  const visiting = new Set<string>();
  const depths = new Map<string, number>();

  for (const skillId of Object.keys(skills)) {
    const depth = computeDepth(skillId, skills, cache, visiting);
    depths.set(skillId, depth);
  }

  const maxDepth = depths.size > 0 ? Math.max(...depths.values()) : 0;
  const levelCount = maxDepth + 1;

  const topPadding = height > 6 ? 1 : 0;
  const bottomPadding = height > 6 ? 1 : 0;
  const usableHeight = Math.max(1, height - topPadding - bottomPadding);
  const levelYPositions: number[] = [];

  if (levelCount === 1) {
    levelYPositions[0] = Math.min(height - 1, Math.floor(height / 2));
  } else {
    const step = usableHeight / Math.max(1, levelCount - 1);
    for (let i = 0; i < levelCount; i++) {
      const rawY = topPadding + i * step;
      levelYPositions[i] = Math.min(height - 1, Math.max(0, Math.round(rawY)));
    }
  }

  const levels = new Map<number, SkillNodeLayout[]>();
  for (const [skillId, skill] of Object.entries(skills)) {
    const depth = depths.get(skillId) ?? 0;
    const node: SkillNodeLayout = {
      id: skillId,
      name: skill.name,
      depth,
      x: 0,
      y: levelYPositions[depth] ?? 0,
      prerequisites: skill.prerequisites ?? [],
    };
    const levelNodes = levels.get(depth) ?? [];
    levelNodes.push(node);
    levels.set(depth, levelNodes);
  }

  const layouts: SkillNodeLayout[] = [];
  const positioned = new Map<string, SkillNodeLayout>();

  for (let depth = 0; depth < levelCount; depth++) {
    const levelNodes = levels.get(depth) ?? [];
    if (levelNodes.length === 0) {
      continue;
    }

    const nodesWithParentCenters = levelNodes.map((node) => {
      if (node.prerequisites.length === 0) {
        return { node, parentCenter: Number.NaN };
      }

      const centers: number[] = [];
      for (const prereq of node.prerequisites) {
        const positionedParent = positioned.get(prereq);
        if (positionedParent) {
          centers.push(positionedParent.x);
        }
      }

      if (centers.length === 0) {
        return { node, parentCenter: Number.NaN };
      }

      const average = centers.reduce((sum, value) => sum + value, 0) / centers.length;
      return { node, parentCenter: average };
    });

    nodesWithParentCenters.sort((a, b) => {
      const aCenter = Number.isNaN(a.parentCenter) ? -Infinity : a.parentCenter;
      const bCenter = Number.isNaN(b.parentCenter) ? -Infinity : b.parentCenter;
      if (aCenter === bCenter) {
        return a.node.name.localeCompare(b.node.name);
      }
      return aCenter - bCenter;
    });

    const minGap = Math.max(6, Math.floor(width / Math.max(4, levelNodes.length * 2)));
    const defaultSpacing = Math.max(minGap, Math.floor(width / (levelNodes.length + 1)));
    let lastX = -Infinity;

    nodesWithParentCenters.forEach(({ node, parentCenter }, index) => {
      const desired = Number.isNaN(parentCenter)
        ? (index + 1) * defaultSpacing
        : parentCenter;

      const clampedDesired = Math.max(2, Math.min(width - 3, Math.round(desired)));
      let x = clampedDesired;

      if (lastX !== -Infinity && x - lastX < minGap) {
        x = lastX + minGap;
      }

      if (x > width - 3) {
        x = width - 3;
      }

      if (x < 2) {
        x = 2;
      }

      lastX = x;

      const positionedNode: SkillNodeLayout = { ...node, x };
      positioned.set(node.id, positionedNode);
      layouts.push(positionedNode);
    });
  }

  layouts.sort((a, b) => {
    if (a.depth === b.depth) {
      return a.x - b.x;
    }
    return a.depth - b.depth;
  });

  return layouts;
}
