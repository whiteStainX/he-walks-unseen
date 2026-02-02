//! Causal propagation engine.

use std::collections::{HashMap, HashSet};

use crate::core::components::EntityId;
use crate::core::entity::Entity;
use crate::core::position::Position;
use crate::core::time_cube::CubeError;
use crate::core::TimeCube;

/// Context for a propagation operation.
#[derive(Debug, Clone)]
pub struct PropagationContext {
    /// Earliest time slice that changed.
    pub dirty_from: i32,
    /// Set of entity IDs that were affected.
    pub affected_entities: HashSet<EntityId>,
    /// Number of slices actually re-propagated.
    pub slices_updated: usize,
}

/// Result of a propagation operation.
#[derive(Debug, Clone)]
pub struct PropagationResult {
    /// Context with details of what was propagated.
    pub context: PropagationContext,
    /// Any non-fatal issues encountered.
    pub warnings: Vec<PropagationWarning>,
}

/// Non-fatal issues during propagation.
#[derive(Debug, Clone)]
pub enum PropagationWarning {
    /// Entity collision during propagation (entities overlapped).
    EntityCollision {
        /// First entity.
        entity_a: EntityId,
        /// Second entity.
        entity_b: EntityId,
        /// Position of collision.
        at: Position,
    },
    /// Entity propagated out of bounds (clipped).
    OutOfBounds {
        /// Entity id.
        entity_id: EntityId,
        /// Attempted position.
        attempted: Position,
    },
}

/// Options for propagation behavior.
#[derive(Debug, Clone, Default)]
pub struct PropagationOptions {
    /// Only propagate specific entities (None = all time-persistent).
    pub only_entities: Option<HashSet<EntityId>>,
    /// Stop propagation at this time (None = propagate to end).
    pub stop_at: Option<i32>,
    /// Skip entities that would collide (vs. still adding them).
    pub skip_collisions: bool,
}

/// Propagate all time-persistent entities from time `t` to all future slices.
pub fn propagate_from(cube: &mut TimeCube, from_t: i32) -> Result<PropagationResult, CubeError> {
    propagate_from_with_options(cube, from_t, PropagationOptions::default())
}

/// Propagate with custom options.
pub fn propagate_from_with_options(
    cube: &mut TimeCube,
    from_t: i32,
    options: PropagationOptions,
) -> Result<PropagationResult, CubeError> {
    let source = cube
        .slice(from_t)
        .ok_or(CubeError::TimeSliceNotFound(from_t))?;

    let mut warnings = Vec::new();
    let mut affected_entities = HashSet::new();
    let mut slices_updated = 0;

    let stop_at = options
        .stop_at
        .unwrap_or(cube.time_depth - 1)
        .min(cube.time_depth - 1);

    let mut source_entities: Vec<Entity> = Vec::new();
    for entity in source.all_entities() {
        if !entity.is_time_persistent() || entity.is_player() {
            continue;
        }
        if let Some(only) = &options.only_entities
            && !only.contains(&entity.id)
        {
            continue;
        }
        affected_entities.insert(entity.id);
        source_entities.push(entity.clone());
    }

    for target_t in (from_t + 1)..=stop_at {
        let mut to_add: Vec<Entity> = Vec::new();
        let mut position_map: HashMap<Position, EntityId> = HashMap::new();
        for entity in &source_entities {
            let propagated = match compute_propagated_entity(entity, target_t) {
                Some(entity) => entity,
                None => continue,
            };

            if !cube.in_bounds(propagated.position) {
                warnings.push(PropagationWarning::OutOfBounds {
                    entity_id: propagated.id,
                    attempted: propagated.position,
                });
                continue;
            }

            if let Some(existing) = position_map.get(&propagated.position) {
                warnings.push(PropagationWarning::EntityCollision {
                    entity_a: *existing,
                    entity_b: propagated.id,
                    at: propagated.position,
                });
                if options.skip_collisions {
                    continue;
                }
            }

            if let Some(slice) = cube.slice(target_t) {
                for other in slice.entities_at(propagated.position.spatial()) {
                    if other.id == propagated.id {
                        continue;
                    }
                    if would_collide(&propagated, other) {
                        warnings.push(PropagationWarning::EntityCollision {
                            entity_a: other.id,
                            entity_b: propagated.id,
                            at: propagated.position,
                        });
                        if options.skip_collisions {
                            continue;
                        }
                    }
                }
            }

            position_map.insert(propagated.position, propagated.id);
            to_add.push(propagated);
        }

        if !to_add.is_empty() {
            if let Some(slice) = cube.slice_mut(target_t) {
                for entity in to_add {
                    slice.add_entity(entity);
                }
            }
            slices_updated += 1;
        }
    }

    Ok(PropagationResult {
        context: PropagationContext {
            dirty_from: from_t,
            affected_entities,
            slices_updated,
        },
        warnings,
    })
}

/// Propagate a specific entity from its current time to all future slices.
pub fn propagate_entity(
    cube: &mut TimeCube,
    entity_id: EntityId,
    from_t: i32,
) -> Result<PropagationResult, CubeError> {
    let mut only = HashSet::new();
    only.insert(entity_id);
    propagate_from_with_options(
        cube,
        from_t,
        PropagationOptions {
            only_entities: Some(only),
            stop_at: None,
            skip_collisions: false,
        },
    )
}

/// Remove an entity from all slices starting at time `t`.
pub fn depropagate_entity(
    cube: &mut TimeCube,
    entity_id: EntityId,
    from_t: i32,
) -> Result<usize, CubeError> {
    if from_t < 0 || from_t >= cube.time_depth {
        return Err(CubeError::TimeSliceNotFound(from_t));
    }
    let mut removed = 0;
    for t in from_t..cube.time_depth {
        if let Some(slice) = cube.slice_mut(t)
            && slice.remove_entity(entity_id).is_some()
        {
            removed += 1;
        }
    }
    Ok(removed)
}

/// Determine how an entity should be propagated to the next time slice.
pub fn compute_propagated_entity(entity: &Entity, target_t: i32) -> Option<Entity> {
    if !entity.is_time_persistent() || entity.is_player() {
        return None;
    }
    let mut propagated = entity.at_time(target_t);
    if let Some(patrol) = entity.patrol_data() {
        let new_spatial = patrol.position_at(target_t);
        propagated = propagated.at_position(Position::new(
            new_spatial.x,
            new_spatial.y,
            target_t,
        ));
    }
    Some(propagated)
}

/// Check if two entities would collide at the same position.
pub fn would_collide(a: &Entity, b: &Entity) -> bool {
    a.blocks_movement() && b.blocks_movement() && a.position.same_spacetime(&b.position)
}
