# Game Development Review

## 1. Engine vs. Story Separation

- The directory split between `src/engine`, `src/game`, and `data` already gives you distinct homes for core systems, gameplay rules, and authored content, respectively, which is a solid baseline for isolating engine work from story iteration.【d98110†L1-L3】【5c8049†L1-L2】 Systems such as the resource cache and world schema validation are kept under `src/engine`, so content teams do not need to touch runtime code to add or tweak JSON content.[src/engine/resourceManager.ts:1-67](./src/engine/resourceManager.ts#L1-L67)[src/engine/schemas.ts:1-37](./src/engine/schemas.ts#L1-L37)
- There are still tight couplings that leak engine details into story work. `createInitialGameState` reaches into theme documents, rolls random encounters, hand-instantiates prefabs, and mutates door walkability, which forces narrative/map authors to understand engine-only mechanics when they add content.[src/game/initialState.ts:46-192](./src/game/initialState.ts#L46-L192) Moving the encounter spawning and post-processing of map tiles into dedicated engine services (e.g., `EncounterSpawner`, `StructurePlacer`) would let you expose higher-level knobs in data instead of low-level logic in code.
- Story-facing prefabs currently rely on engine-owned TypeScript definitions. For example, the `PortalInteraction` defined in `state.ts` expects `targetMapId` and `targetPortalId`, but the data document still ships with a `targetPosition` field that is never consumed.[src/engine/state.ts:22-43](./src/engine/state.ts#L22-L43)[data/entities.json:1-53](./data/entities.json#L1-L53) Aligning these models via shared schemas prevents invalid content from creeping into runtime, keeps story iteration safe, and lets you evolve engine internals without breaking authored data.
- The narrative engine’s Git-like commit tracking is globally scoped and implicitly watches the event bus; that makes every engine change ripple into story testing when state churn is high.[src/engine/narrativeEngine.ts:7-59](./src/engine/narrativeEngine.ts#L7-L59) Consider isolating it behind an explicit `HistoryManager` interface so you can stub it out (or switch to per-system history) when story designers do not need branchable timelines.

## 2. Path to Fully Data-Driven Story Development

To shift story production out of TypeScript and into content packs, treat the narrative stack as three cooperating layers—**data definitions**, **runtime loaders**, and **domain services**—and bring each up to parity.

### 2.1 Data Definition Layer

- Establish resource-specific schema modules (e.g., `schemas/parcels.ts`, `schemas/prefabs.ts`, `schemas/world.ts`) that mirror the runtime interfaces in `state.ts`. Right now authors can add unsupported fields or omit required ones without immediate feedback, which pushes bugs into playtests.[src/engine/state.ts:8-157](./src/engine/state.ts#L8-L157) Co-locating schemas with their resource files lets you lint story content during CI and inside authoring tools.
- Expand map/theme documents so they declare all encounter, trigger, and pacing information. Conversations already flow through data-only parcels; maps should achieve parity by describing encounter tables, scripted triggers, and environmental states directly in JSON/YAML instead of `createInitialGameState` switch statements.[src/game/conversation.ts:1-135](./src/game/conversation.ts#L1-L135)[src/game/initialState.ts:83-193](./src/game/initialState.ts#L83-L193) Schema-backed descriptors keep story beats declarative.
- Normalize entity/prefab definitions around narrative intent. Replace hard-coded prefab IDs with named roles (“wounded_guard”, “travelling_vendor”) and attach metadata (faction, temperament, encounter tags). The engine can later resolve roles to concrete prefabs based on difficulty or progression without changing authored content.

### 2.2 Runtime Loading Layer

- Teach `resourceManager` to register loaders via descriptors so every resource type supplies its own schema, migration logic, and post-processing hooks. This frees story tooling to evolve independently while guaranteeing engine compliance at load time.[src/engine/resourceManager.ts:1-67](./src/engine/resourceManager.ts#L1-L67)
- Introduce a `DataMigration` utility that can evolve JSON between versions. As soon as narrative authors own data files, schema drift becomes inevitable; migrations ensure you can change engine expectations without invalidating historical content packs.
- Cache resolved story assets (encounter tables, scripted sequences) the same way `conversation.ts` caches parcels, and expose read-only accessors. This prevents gameplay code from mutating authorial data, keeping the “data is source of truth” contract intact.

### 2.3 Domain Service Layer

- Extract encounter spawning, structure placement, and scripted trigger evaluation from `createInitialGameState` into dedicated services (e.g., `EncounterSpawner`, `TriggerService`) that consume the declarative descriptors above.[src/game/initialState.ts:46-192](./src/game/initialState.ts#L46-L192) Writers should only author data; services turn descriptors into concrete state.
- Wrap narrative-side systems (dialogue progression, quest state machines) in interfaces consumable by both runtime and tooling. With stable contracts, you can ship a lightweight “story simulator” that runs entirely off data without booting the full game.
- Provide observable hooks (events or signals) that emit when data-driven systems act. This gives story authors telemetry (e.g., “encounter rolled: ambush_a”) and supports future editor integrations.

### 2.4 Roadmap to “Pure Data” Authoring

1. **Schema parity** – Implement resource-specific schemas and validation during CI. Fail builds when narrative data is out of date so TypeScript never becomes the fallback source of truth.
2. **Loader modularisation** – Refactor the resource manager to load through per-resource descriptors, enabling migrations and post-processing in isolation.
3. **Service extraction** – Move encounter/trigger logic into services that only consume declarative descriptors, then delete bespoke initialization code.
4. **Authoring tooling** – Build CLI/editor tooling that lint, preview, and package story content using the same loaders/services the game uses. Once tooling runs entirely on data, story iteration no longer depends on engine engineers.

## 3. Recommended Roguelike Enhancements & Architectural Impact

- **Deeper procedural progression** (multi-level dungeons, biome transitions). You already persist per-map state inside `mapStates`, so expanding world progression means teaching `WorldSchema` about floor depth, branching exits, and generation parameters, and updating `createInitialGameState`/map loading to respect those descriptors.[src/engine/state.ts:179-201](./src/engine/state.ts#L179-L201)[src/engine/schemas.ts:24-37](./src/engine/schemas.ts#L24-L37) Expect ripple effects across saving/loading, portal validation, and UI (map selectors).
- **Persistent meta-systems** (permadeath records, unlocks). The narrative engine’s commit history plus the persistence module can evolve into a roguelike run log, but you will need to version `GameState` snapshots and extend the persistence layer to capture meta-progression separate from run state.[src/engine/narrativeEngine.ts:7-59](./src/engine/narrativeEngine.ts#L7-L59) This affects how you serialize actors, items, and resource references, so schema evolution planning becomes critical.
- **Advanced AI behaviours** (patrols, fleeing, squad tactics). The AI shape already anticipates patrol points and flee thresholds; to ship richer behaviours you’ll need a dedicated AI state machine, better pathfinding, and event hooks for coordination.[src/engine/state.ts:65-82](./src/engine/state.ts#L65-L82) That cascades into combat resolution, turn scheduling, and logging so designers can tune difficulty without diving into code.
- **Environmental interactions and status effects** (terrain hazards, DoTs). Items and equipment already support on-hit status payloads, so expanding to environmental sources means unifying effect processing in one subsystem (instead of scattering checks across combat, map updates, and scripts).[src/engine/state.ts:86-157](.src/engine/state.ts#L86-L157) Plan to audit every place that mutates HP or status arrays to keep effects consistent.

## 4. Ripple-Effect Assessment

- Changing resource formats forces updates in three places: the JSON itself, the loader/validator (`resourceManager`, schema files), and every gameplay system that reads the old shape. Track these dependencies explicitly—e.g., document which systems consume `themes` versus `world`—to avoid silent breakage when adding new rogue-like knobs.[src/engine/resourceManager.ts:1-67](./src/engine/resourceManager.ts#L1-L67)[src/game/initialState.ts:56-193](./src/game/initialState.ts#L56-L193)
- `GameState` is shared across combat, UI, persistence, and history tracking. Any addition (e.g., hunger meter, corruption level) must be plumbed through all handlers—action reducers, loggers, save files, tests. Invest in thin service layers (`CombatService`, `InventoryService`, etc.) so state mutations stay localized and ripple effects are minimized.[src/engine/state.ts:179-201](./src/engine/state.ts#L179-L201)[src/game/playerActions.ts:1-130](./src/game/playerActions.ts#L1-L130)
- Because the event bus is global, new events (for weather, faction reputation, etc.) can unintentionally wake systems that were listening broadly. Introduce typed channels or domain-specific emitters to contain side effects when you roll out new roguelike loops.[src/engine/events.ts:1-6](./src/engine/events.ts#L1-L6)
- Continue writing unit tests around subsystems (prefabs, resource manager) so you get immediate feedback when data or engine changes ripple outward. Expanding this coverage to world loading and conversation parsing will make the transition to data-first story development much safer.

## Suggested Next Steps

1. Ship resource-specific schemas and integrate validation into CI so narrative data becomes the single source of truth.
2. Refactor the resource manager around per-resource loaders with migration hooks, then extract encounter/trigger logic into services that consume those loaders.
3. Prototype a fully data-authored map (multi-floor dungeon descriptor) using the new schemas/services to validate the path and surface hidden dependencies before broader rollout.
