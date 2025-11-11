# PR #7 Post-Merge Fixes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Ticket:** ZCO-1576

**Goal:** Fix type safety, code quality, and organizational issues introduced in PR #7 (cycles & milestones features)

**Architecture:** Refactor inline helpers to service layer, add proper TypeScript types, remove development artifacts, fix CI configuration, and improve error handling consistency.

**Tech Stack:** TypeScript, Node.js, Vitest, GitHub Actions, Linear SDK

---

## Phase 1: Critical Cleanup

### Task 1: Remove Development Artifacts

**Files:**

- Delete: `github-issue-labels-enhancement.md`
- Delete: `github-issue-project-crud.md`
- Delete: `labels-research.md`
- Delete: `labels-summary.md`
- Delete: `pr-7-description.md`
- Delete: `project-labels-research.md`

**Step 1: Verify files exist and are not referenced**

Run: `grep -r "github-issue-labels-enhancement\|labels-research\|pr-7-description" src/ tests/ docs/` Expected: No results (these files aren't referenced in code)

**Step 2: Remove files**

```bash
git rm github-issue-labels-enhancement.md \
  github-issue-project-crud.md \
  labels-research.md \
  labels-summary.md \
  pr-7-description.md \
  project-labels-research.md
```

Expected: Files staged for deletion

**Step 3: Verify removal**

Run: `git status` Expected: 6 files deleted, staged for commit

**Step 4: Commit**

```bash
git commit -m "[CHORE] Remove development artifacts from repository

These files were accidentally committed in PR #7:
- Research notes (labels-*, github-issue-*, project-labels-*)
- PR description draft (pr-7-description.md)

They belong in local notes/drafts, not the repository."
```

---

### Task 2: Clean Up .gitignore

**Files:**

- Modify: `.gitignore:25-30`

**Step 1: Read current .gitignore section**

Run: `sed -n '22,35p' .gitignore` Expected: See the Catalyst/test-pr4.sh section

**Step 2: Update .gitignore**

Replace lines 25-30 with:

```gitignore
# Development artifacts
thoughts/
coverage/

# Test scripts (keep locally)
test-*.sh
*.test.sh
```

**Step 3: Verify changes**

Run: `git diff .gitignore` Expected: See simplified comments and pattern-based exclusions

**Step 4: Test .gitignore patterns**

```bash
touch test-example.sh
git status
rm test-example.sh
```

Expected: `test-example.sh` appears in untracked files (not ignored - that's correct, we want these in .gitignore to ignore them)

Actually, verify it's ignored:

```bash
touch test-example.sh
git check-ignore -v test-example.sh
rm test-example.sh
```

Expected: Shows `.gitignore:30:test-*.sh	test-example.sh`

**Step 5: Commit**

```bash
git add .gitignore
git commit -m "[CHORE] Simplify .gitignore patterns

Changes:
- Remove unexplained 'Catalyst' reference
- Use patterns (test-*.sh) instead of specific filenames
- More concise comments"
```

---

### Task 3: Fix Redundant CI Test Step

**Files:**

- Modify: `.github/workflows/ci.yml:40-45`

**Step 1: Review current CI configuration**

Run: `sed -n '35,50p' .github/workflows/ci.yml` Expected: See two test steps (lines 39 and 42)

**Step 2: Remove redundant integration test step**

Delete lines 42-47 (the "Run integration tests" step).

Keep only:

```yaml
- name: Build project
  run: pnpm run build

- name: Run tests
  run: pnpm test
```

**Step 3: Verify YAML is valid**

Run: `cat .github/workflows/ci.yml | head -50` Expected: Valid YAML, single test step

**Step 4: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "[FIX] Remove redundant test step in CI workflow

The workflow was running 'pnpm test' twice:
1. Unconditionally in 'Run unit tests'
2. Conditionally in 'Run integration tests'

Vitest already skips integration tests when LINEAR_API_TOKEN
is not set, so the conditional step was unnecessary and wasteful."
```

**Step 5: Push and verify CI**

```bash
git push
```

Then check GitHub Actions to ensure CI passes with single test run.

---

## Phase 2: Type Safety

### Task 4: Add Cycle Type Definitions

**Files:**

- Modify: `src/utils/linear-types.d.ts` (add at end)
- Modify: `src/commands/cycles.ts:1` (add import)

**Step 1: Add LinearCycle interface**

Add to `src/utils/linear-types.d.ts`:

```typescript
export interface LinearCycle {
  id: string;
  name: string;
  number: number;
  startsAt?: string;
  endsAt?: string;
  isActive: boolean;
  isPrevious?: boolean;
  isNext?: boolean;
  progress: number;
  issueCountHistory: number[];
  team?: {
    id: string;
    key: string;
    name: string;
  };
  issues?: LinearIssue[];
}
```

**Step 2: Add cycles command option types**

Add to `src/utils/linear-types.d.ts`:

```typescript
export interface CycleListOptions {
  team?: string;
  active?: boolean;
  aroundActive?: string;
}

export interface CycleReadOptions {
  team?: string;
  issuesFirst?: string;
}
```

**Step 3: Verify types compile**

Run: `pnpm exec tsc --noEmit` Expected: No errors

**Step 4: Commit**

```bash
git add src/utils/linear-types.d.ts
git commit -m "[FEAT] Add TypeScript types for cycles"
```

---

### Task 5: Apply Cycle Types to Commands

**Files:**

- Modify: `src/commands/cycles.ts:1,16,35,37,40,46-47,62`

**Step 1: Add imports**

At top of `src/commands/cycles.ts`, after existing imports:

```typescript
import type { CycleListOptions, CycleReadOptions, LinearCycle } from "../utils/linear-types.js";
```

**Step 2: Replace first `any` (line 16)**

Change:

```typescript
async (options: any, command: Command) => {
```

To:

```typescript
async (options: CycleListOptions, command: Command) => {
```

**Step 3: Replace cycle type casts (lines 35, 37, 40, 46-47)**

Change:

```typescript
const activeCycle = allCycles.find((c: any) => c.isActive);
```

To:

```typescript
const activeCycle = allCycles.find((c: LinearCycle) => c.isActive);
```

Change:

```typescript
const filtered = allCycles
  .filter((c: any) => typeof c.number === "number" && c.number >= min && c.number <= max)
  .sort((a: any, b: any) => a.number - b.number);
```

To:

```typescript
const filtered = allCycles
  .filter((c: LinearCycle) => typeof c.number === "number" && c.number >= min && c.number <= max)
  .sort((a: LinearCycle, b: LinearCycle) => a.number - b.number);
```

**Step 4: Replace second `any` (line 62)**

Change:

```typescript
async (cycleIdOrName: string, options: any, command: Command) => {
```

To:

```typescript
async (cycleIdOrName: string, options: CycleReadOptions, command: Command) => {
```

**Step 5: Verify types compile**

Run: `pnpm exec tsc --noEmit` Expected: No errors

**Step 6: Verify build succeeds**

Run: `pnpm run build` Expected: Successful compilation

**Step 7: Commit**

```bash
git add src/commands/cycles.ts
git commit -m "[REFACTOR] Apply proper types to cycles commands

Replaced 'any' types with LinearCycle and option interfaces:
- CycleListOptions for list command options
- CycleReadOptions for read command options
- LinearCycle for cycle objects"
```

---

### Task 6: Add Milestone Type Definitions

**Files:**

- Modify: `src/utils/linear-types.d.ts` (add at end)

**Step 1: Add LinearProjectMilestone interface**

Add to `src/utils/linear-types.d.ts`:

```typescript
export interface LinearProjectMilestone {
  id: string;
  name: string;
  description?: string;
  targetDate?: string;
  sortOrder?: number;
  createdAt: string;
  updatedAt: string;
  project?: {
    id: string;
    name: string;
  };
  issues?: LinearIssue[];
}
```

**Step 2: Add milestone command option types**

Add to `src/utils/linear-types.d.ts`:

```typescript
export interface MilestoneListOptions {
  project: string;
  limit?: string;
}

export interface MilestoneReadOptions {
  project?: string;
  issuesFirst?: string;
}

export interface MilestoneCreateOptions {
  project: string;
  description?: string;
  targetDate?: string;
}

export interface MilestoneUpdateOptions {
  project?: string;
  name?: string;
  description?: string;
  targetDate?: string;
  sortOrder?: string;
}
```

**Step 3: Verify types compile**

Run: `pnpm exec tsc --noEmit` Expected: No errors

**Step 4: Commit**

```bash
git add src/utils/linear-types.d.ts
git commit -m "[FEAT] Add TypeScript types for project milestones"
```

---

### Task 7: Apply Milestone Types to Commands

**Files:**

- Modify: `src/commands/projectMilestones.ts:1,15,33,99,127,160,203`

**Step 1: Add imports**

At top of `src/commands/projectMilestones.ts`, after existing imports:

```typescript
import type { LinearProjectMilestone, MilestoneCreateOptions, MilestoneListOptions, MilestoneReadOptions, MilestoneUpdateOptions } from "../utils/linear-types.js";
```

**Step 2: Type helper function parameters**

Change `resolveProjectId` (line 15):

```typescript
async function resolveProjectId(projectNameOrId: string, graphQLService: any): Promise<string> {
```

To:

```typescript
import type { GraphQLService } from "../utils/graphql-service.js";

async function resolveProjectId(projectNameOrId: string, graphQLService: GraphQLService): Promise<string> {
```

Change `resolveMilestoneId` (line 33):

```typescript
async function resolveMilestoneId(
  milestoneNameOrId: string,
  graphQLService: any,
  projectNameOrId?: string
): Promise<string> {
```

To:

```typescript
async function resolveMilestoneId(
  milestoneNameOrId: string,
  graphQLService: GraphQLService,
  projectNameOrId?: string
): Promise<string> {
```

**Step 3: Type milestone nodes in helper**

In `resolveMilestoneId`, change (line 43):

```typescript
let nodes: any[] = [];
```

To:

```typescript
let nodes: LinearProjectMilestone[] = [];
```

And change the map (line 72):

```typescript
const projectNames = nodes
  .map((m: any) => `"${m.name}" in project "${m.project?.name}"`)
  .join(", ");
```

To:

```typescript
const projectNames = nodes
  .map((m: LinearProjectMilestone) => `"${m.name}" in project "${m.project?.name}"`)
  .join(", ");
```

**Step 4: Type command options**

Change list command (line 99):

```typescript
async (options: any, command: Command) => {
```

To:

```typescript
async (options: MilestoneListOptions, command: Command) => {
```

Change read command (line 127):

```typescript
async (milestoneIdOrName: string, options: any, command: Command) => {
```

To:

```typescript
async (milestoneIdOrName: string, options: MilestoneReadOptions, command: Command) => {
```

Change create command (line 160):

```typescript
async (name: string, options: any, command: Command) => {
```

To:

```typescript
async (name: string, options: MilestoneCreateOptions, command: Command) => {
```

Change update command (line 203):

```typescript
async (milestoneIdOrName: string, options: any, command: Command) => {
```

To:

```typescript
async (milestoneIdOrName: string, options: MilestoneUpdateOptions, command: Command) => {
```

**Step 5: Type updateVars object**

Change (line 215):

```typescript
const updateVars: any = { id: milestoneId };
```

To:

```typescript
const updateVars: Partial<LinearProjectMilestone> & { id: string } = { id: milestoneId };
```

**Step 6: Verify types compile**

Run: `pnpm exec tsc --noEmit` Expected: No errors (may need to export GraphQLService class)

**Step 7: Export GraphQLService if needed**

If step 6 shows error about GraphQLService not being exported, modify `src/utils/graphql-service.ts`:

Change:

```typescript
class GraphQLService {
```

To:

```typescript
export class GraphQLService {
```

**Step 8: Verify build succeeds**

Run: `pnpm run build` Expected: Successful compilation

**Step 9: Commit**

```bash
git add src/commands/projectMilestones.ts src/utils/graphql-service.ts
git commit -m "[REFACTOR] Apply proper types to project milestones commands

Replaced 'any' types with proper interfaces:
- MilestoneListOptions, MilestoneReadOptions, etc.
- LinearProjectMilestone for milestone objects
- GraphQLService for service parameters

Exported GraphQLService class for type imports."
```

---

### Task 8: Fix Date Handling in LinearService

**Files:**

- Modify: `src/utils/linear-service.ts:167-169,397-398,427-428,483-484`

**Step 1: Investigate Linear SDK date types**

Run: `grep -A 2 "targetDate\|startsAt\|endsAt" node_modules/@linear/sdk/dist/*.d.ts | head -20`

Expected: Reveals whether these are Date objects or TimelessDate objects

**Step 2: Read current implementation**

Run: `sed -n '165,172p' src/utils/linear-service.ts` Expected: See the `String()` conversions

**Step 3: Check TimelessDate type**

Linear SDK uses `TimelessDate` for dates. Check the type:

```bash
grep -A 5 "class TimelessDate" node_modules/@linear/sdk/dist/*.d.ts
```

Expected: TimelessDate has a `toString()` method

**Step 4: Document why String() is used**

Based on investigation, if TimelessDate is used, add comment explaining the conversion.

At line 166, add comment:

```typescript
return projects.map((project) => ({
  id: project.id,
  name: project.name,
  state: project.state,
  progress: project.progress,
  lead: project.lead
    ? {
      id: project.lead.id,
      name: project.lead.name,
    }
    : undefined,
  // Linear SDK returns TimelessDate objects, convert to ISO strings for JSON serialization
  targetDate: project.targetDate ? String(project.targetDate) : undefined,
  createdAt: project.createdAt ? String(project.createdAt) : new Date().toISOString(),
  updatedAt: project.updatedAt ? String(project.updatedAt) : new Date().toISOString(),
}));
```

**Step 5: Add same comment to cycle methods**

At line 394:

```typescript
return {
  id: cycle.id,
  name: cycle.name,
  number: cycle.number,
  // Linear SDK TimelessDate/DateTime objects, convert to strings for JSON
  startsAt: cycle.startsAt ? String(cycle.startsAt) : undefined,
  endsAt: cycle.endsAt ? String(cycle.endsAt) : undefined,
```

At line 479:

```typescript
nodes.push({
  id: cycle.id,
  name: cycle.name,
  number: cycle.number,
  // Linear SDK DateTime conversion
  startsAt: cycle.startsAt,
```

Wait, line 479 doesn't convert to String - this is inconsistent!

**Step 6: Fix inconsistency at line 479-481**

Change:

```typescript
startsAt: cycle.startsAt,
isActive: cycle.isActive,
```

To:

```typescript
startsAt: cycle.startsAt ? String(cycle.startsAt) : undefined,
isActive: cycle.isActive,
```

**Step 7: Verify changes**

Run: `git diff src/utils/linear-service.ts` Expected: See comments added and consistency fix

**Step 8: Test build**

Run: `pnpm run build` Expected: Successful compilation

**Step 9: Commit**

```bash
git add src/utils/linear-service.ts
git commit -m "[DOC] Document date handling and fix inconsistency

Linear SDK returns TimelessDate/DateTime objects which need
String() conversion for JSON serialization.

Also fixed inconsistency in resolveCycleId where startsAt
wasn't being converted to string like other date fields."
```

---

### Task 9: Handle Deprecated Cycles Query File

**Files:**

- Modify: `src/queries/cycles.ts:1` (add deprecation notice)
- OR Delete: `src/queries/cycles.ts` and `dist/queries/cycles.js`

**Step 1: Check if file is imported anywhere**

Run: `grep -r "from.*queries/cycles" src/` Expected: No results (not imported)

**Step 2: Decide deletion vs deprecation**

Since file is not used, deletion is cleaner.

**Step 3: Delete the files**

```bash
git rm src/queries/cycles.ts
git rm dist/queries/cycles.js
```

**Step 4: Verify no build errors**

Run: `pnpm run build` Expected: Successful build

**Step 5: Commit**

```bash
git commit -m "[CHORE] Remove deprecated cycles GraphQL queries

These queries were replaced with Linear SDK implementation
in PR #7 to avoid GraphQL complexity errors with large
datasets (500+ cycles).

The file was not imported or used anywhere in the codebase."
```

---

## Phase 3: Service Layer Refactoring

### Task 10: Move resolveProjectId to LinearService

**Files:**

- Modify: `src/utils/linear-service.ts:369` (add method)
- Modify: `src/commands/projectMilestones.ts:14-30` (remove helper, use service)

**Step 1: Add method to LinearService**

In `src/utils/linear-service.ts`, after the `resolveCycleId` method (around line 537), add:

```typescript
  /**
   * Resolve project identifier to UUID
   *
   * @param projectNameOrId - Project name or UUID
   * @returns Project UUID
   * @throws Error if project not found
   */
  async resolveProjectId(projectNameOrId: string): Promise<string> {
    if (isUuid(projectNameOrId)) {
      return projectNameOrId;
    }

    const filter = buildEqualityFilter("name", projectNameOrId);
    const projectsConnection = await this.client.projects({ filter, first: 1 });

    if (projectsConnection.nodes.length === 0) {
      throw new Error(`Project "${projectNameOrId}" not found`);
    }

    return projectsConnection.nodes[0].id;
  }
```

**Step 2: Verify it compiles**

Run: `pnpm exec tsc --noEmit` Expected: No errors

**Step 3: Commit service change**

```bash
git add src/utils/linear-service.ts
git commit -m "[REFACTOR] Add resolveProjectId to LinearService

Moved from inline helper in projectMilestones command.
Makes it reusable and testable."
```

---

### Task 11: Update projectMilestones to Use Service

**Files:**

- Modify: `src/commands/projectMilestones.ts:1,14-30,104,135,166,206`

**Step 1: Import LinearService**

At top of file, add:

```typescript
import { createLinearService } from "../utils/linear-service.js";
```

**Step 2: Remove resolveProjectId helper function**

Delete lines 14-30 (the entire `resolveProjectId` function).

**Step 3: Update resolveMilestoneId to take LinearService**

The `resolveMilestoneId` function currently creates GraphQLService internally. We need it to call `linearService.resolveProjectId()`.

But wait - `resolveMilestoneId` uses GraphQL directly. We have an architecture problem:

- Milestones use GraphQLService
- Projects use LinearService (SDK)

**Step 4: Decide on approach**

Option A: Keep both services, pass both to resolveMilestoneId Option B: Add resolveMilestoneId to LinearService too Option C: Keep helper but call linearService.resolveProjectId()

Let's use Option C for now (minimal change).

Change `resolveMilestoneId` signature (line 33):

```typescript
async function resolveMilestoneId(
  milestoneNameOrId: string,
  graphQLService: GraphQLService,
  linearService: any,
  projectNameOrId?: string
): Promise<string> {
```

**Step 5: Update resolveMilestoneId to use linearService**

In the function body (line 45-47), change:

```typescript
if (projectNameOrId) {
  // Resolve project ID first
  const projectId = await resolveProjectId(projectNameOrId, graphQLService);
```

To:

```typescript
if (projectNameOrId) {
  // Resolve project ID using LinearService
  const projectId = await linearService.resolveProjectId(projectNameOrId);
```

**Step 6: Update all command actions to create and pass linearService**

In list command (line 99), change:

```typescript
      handleAsyncCommand(async (options: MilestoneListOptions, command: Command) => {
        const graphQLService = await createGraphQLService(
          command.parent!.parent!.opts(),
        );

        // Resolve project ID if needed
        const projectId = await resolveProjectId(options.project, graphQLService);
```

To:

```typescript
      handleAsyncCommand(async (options: MilestoneListOptions, command: Command) => {
        const [graphQLService, linearService] = await Promise.all([
          createGraphQLService(command.parent!.parent!.opts()),
          createLinearService(command.parent!.parent!.opts()),
        ]);

        // Resolve project ID using LinearService
        const projectId = await linearService.resolveProjectId(options.project);
```

**Step 7: Update read command**

Change (line 127):

```typescript
const graphQLService = await createGraphQLService(
  command.parent!.parent!.opts(),
);

const milestoneId = await resolveMilestoneId(
  milestoneIdOrName,
  graphQLService,
  options.project,
);
```

To:

```typescript
const [graphQLService, linearService] = await Promise.all([
  createGraphQLService(command.parent!.parent!.opts()),
  createLinearService(command.parent!.parent!.opts()),
]);

const milestoneId = await resolveMilestoneId(
  milestoneIdOrName,
  graphQLService,
  linearService,
  options.project,
);
```

**Step 8: Update create command**

Change (line 160):

```typescript
const graphQLService = await createGraphQLService(
  command.parent!.parent!.opts(),
);

// Resolve project ID if needed
const projectId = await resolveProjectId(options.project, graphQLService);
```

To:

```typescript
const [graphQLService, linearService] = await Promise.all([
  createGraphQLService(command.parent!.parent!.opts()),
  createLinearService(command.parent!.parent!.opts()),
]);

// Resolve project ID using LinearService
const projectId = await linearService.resolveProjectId(options.project);
```

**Step 9: Update update command**

Change (line 203):

```typescript
const graphQLService = await createGraphQLService(
  command.parent!.parent!.opts(),
);

const milestoneId = await resolveMilestoneId(
  milestoneIdOrName,
  graphQLService,
  options.project,
);
```

To:

```typescript
const [graphQLService, linearService] = await Promise.all([
  createGraphQLService(command.parent!.parent!.opts()),
  createLinearService(command.parent!.parent!.opts()),
]);

const milestoneId = await resolveMilestoneId(
  milestoneIdOrName,
  graphQLService,
  linearService,
  options.project,
);
```

**Step 10: Fix type error**

Change the linearService parameter type in resolveMilestoneId:

```typescript
async function resolveMilestoneId(
  milestoneNameOrId: string,
  graphQLService: GraphQLService,
  linearService: any,  // <-- fix this
  projectNameOrId?: string
): Promise<string> {
```

To:

```typescript
import type { LinearService } from "../utils/linear-service.js";

async function resolveMilestoneId(
  milestoneNameOrId: string,
  graphQLService: GraphQLService,
  linearService: LinearService,
  projectNameOrId?: string
): Promise<string> {
```

Wait, LinearService is a class not exported as type. Let's just leave as `any` for now since it's a helper function.

**Step 11: Verify build**

Run: `pnpm run build` Expected: Successful build

**Step 12: Commit**

```bash
git add src/commands/projectMilestones.ts
git commit -m "[REFACTOR] Use LinearService.resolveProjectId in milestones

Removed inline resolveProjectId helper function.
Now uses LinearService.resolveProjectId() for consistency.

Both services (GraphQL and Linear SDK) are created in each
command handler as needed."
```

---

### Task 12: Add Error Handling Documentation

**Files:**

- Modify: `src/utils/linear-service.ts:395`

**Step 1: Add JSDoc comment before Promise.all**

At line 393, add:

```typescript
// Fetch all relationships in parallel for all cycles
// Note: Uses Promise.all - entire operation fails if any team fetch fails.
// This ensures data consistency (all cycles have team data or none do).
// If partial failures are acceptable, use Promise.allSettled instead.
const cyclesWithData = await Promise.all(
```

**Step 2: Verify no functional changes**

Run: `git diff src/utils/linear-service.ts` Expected: Only comment added

**Step 3: Commit**

```bash
git add src/utils/linear-service.ts
git commit -m "[DOC] Document Promise.all behavior in getCycles

Clarifies that operation fails fast if any cycle's team
fetch fails, which ensures data consistency."
```

---

## Phase 4: Testing

### Task 13: Add Tests for Cycle Error Cases

**Files:**

- Modify: `tests/unit/linear-service-cycles.test.ts`

**Step 1: Read existing tests**

Run: `head -50 tests/unit/linear-service-cycles.test.ts` Expected: See existing test structure

**Step 2: Add test for ambiguous cycle name**

Add to the test file:

```typescript
describe("resolveCycleId - error cases", () => {
  it("should throw when cycle not found", async () => {
    const mockClient = {
      cycles: vi.fn().mockResolvedValue({
        nodes: [],
      }),
    };

    const service = new LinearService("fake-token");
    (service as any).client = mockClient;

    await expect(service.resolveCycleId("Nonexistent Cycle")).rejects.toThrow(
      'Cycle "Nonexistent Cycle" not found',
    );
  });

  it("should throw when multiple cycles match and none are active/next/previous", async () => {
    const mockClient = {
      cycles: vi.fn().mockResolvedValue({
        nodes: [
          {
            id: "cycle-1",
            name: "Sprint 1",
            number: 1,
            startsAt: "2025-01-01",
            isActive: false,
            isNext: false,
            isPrevious: false,
            team: Promise.resolve({ id: "team-1", key: "ENG", name: "Engineering" }),
          },
          {
            id: "cycle-2",
            name: "Sprint 1",
            number: 2,
            startsAt: "2025-02-01",
            isActive: false,
            isNext: false,
            isPrevious: false,
            team: Promise.resolve({ id: "team-2", key: "PROD", name: "Product" }),
          },
        ],
      }),
    };

    const service = new LinearService("fake-token");
    (service as any).client = mockClient;

    await expect(service.resolveCycleId("Sprint 1")).rejects.toThrow(
      /Ambiguous cycle name.*multiple matches found/,
    );
  });

  it("should prefer active cycle when multiple matches exist", async () => {
    const mockClient = {
      cycles: vi.fn().mockResolvedValue({
        nodes: [
          {
            id: "cycle-inactive",
            name: "Sprint 1",
            number: 1,
            startsAt: "2025-01-01",
            isActive: false,
            isNext: false,
            isPrevious: false,
            team: Promise.resolve({ id: "team-1", key: "ENG", name: "Engineering" }),
          },
          {
            id: "cycle-active",
            name: "Sprint 1",
            number: 2,
            startsAt: "2025-02-01",
            isActive: true,
            isNext: false,
            isPrevious: false,
            team: Promise.resolve({ id: "team-2", key: "PROD", name: "Product" }),
          },
        ],
      }),
    };

    const service = new LinearService("fake-token");
    (service as any).client = mockClient;

    const result = await service.resolveCycleId("Sprint 1");
    expect(result).toBe("cycle-active");
  });
});
```

**Step 3: Run tests**

Run: `pnpm test tests/unit/linear-service-cycles.test.ts` Expected: New tests pass

**Step 4: Commit**

```bash
git add tests/unit/linear-service-cycles.test.ts
git commit -m "[TEST] Add error case tests for cycle resolution

Tests for:
- Cycle not found
- Ambiguous cycle names
- Disambiguation logic (prefers active)"
```

---

### Task 14: Add Integration Tests for Cycle Errors

**Files:**

- Modify: `tests/integration/cycles-cli.test.ts`

**Step 1: Add test for --around-active without --team**

Add to the test file:

```typescript
describe("Cycles CLI - Error Cases", () => {
  it("should reject --around-active without --team", async () => {
    if (!hasApiToken) return;

    await expect(
      execAsync(`node ${CLI_PATH} cycles list --around-active 3`),
    ).rejects.toThrow(/--around-active requires --team/);
  });

  it("should reject --around-active with non-numeric value", async () => {
    if (!hasApiToken) return;

    await expect(
      execAsync(`node ${CLI_PATH} cycles list --around-active abc --team Engineering`),
    ).rejects.toThrow(/--around-active requires a non-negative integer/);
  });

  it("should reject --around-active with negative value", async () => {
    if (!hasApiToken) return;

    await expect(
      execAsync(`node ${CLI_PATH} cycles list --around-active -5 --team Engineering`),
    ).rejects.toThrow(/--around-active requires a non-negative integer/);
  });
});
```

**Step 2: Run integration tests**

Run: `LINEAR_API_TOKEN=xxx pnpm test tests/integration/cycles-cli.test.ts` Expected: New tests pass (or skip if no token)

**Step 3: Commit**

```bash
git add tests/integration/cycles-cli.test.ts
git commit -m "[TEST] Add integration tests for cycles error cases

Tests validation of --around-active flag:
- Requires --team
- Requires non-negative integer"
```

---

### Task 15: Add Tests for Milestone Create/Update

**Files:**

- Modify: `tests/integration/project-milestones-cli.test.ts`

**Step 1: Add create test with cleanup**

Add to the test file:

```typescript
describe("Project Milestones - Create", () => {
  const TEST_MILESTONE_NAME = `Test Milestone ${Date.now()}`;

  afterEach(async () => {
    // Cleanup: delete test milestone if it exists
    // Note: Linear CLI doesn't have delete command, so this is manual cleanup
    // In real usage, you'd need to delete via Linear SDK or web UI
  });

  it("should create milestone with all fields", async () => {
    if (!hasApiToken) {
      console.warn("Skipping create test - no API token");
      return;
    }

    // Note: This test requires a valid project name from your Linear workspace
    // Replace "Test Project" with an actual project name
    const result = await execAsync(
      `node ${CLI_PATH} project-milestones create "${TEST_MILESTONE_NAME}" ` +
        `--project "Test Project" ` +
        `--description "Test milestone created by integration test" ` +
        `--target-date 2025-12-31`,
    );

    const output = JSON.parse(result.stdout);
    expect(output).toHaveProperty("id");
    expect(output.name).toBe(TEST_MILESTONE_NAME);
    expect(output.description).toBe("Test milestone created by integration test");
    expect(output.targetDate).toBe("2025-12-31");
  });

  it("should create milestone with minimal fields", async () => {
    if (!hasApiToken) {
      console.warn("Skipping create test - no API token");
      return;
    }

    const result = await execAsync(
      `node ${CLI_PATH} project-milestones create "${TEST_MILESTONE_NAME} Minimal" ` +
        `--project "Test Project"`,
    );

    const output = JSON.parse(result.stdout);
    expect(output).toHaveProperty("id");
    expect(output.name).toBe(`${TEST_MILESTONE_NAME} Minimal`);
  });
});
```

**Step 2: Add note about cleanup**

At top of file, add comment:

```typescript
/**
 * Integration tests for project-milestones CLI command
 *
 * Note: Create/update tests leave test data in Linear workspace.
 * Manual cleanup may be required. Consider using a test workspace.
 *
 * These tests require LINEAR_API_TOKEN to be set in environment.
 * If not set, tests will be skipped.
 */
```

**Step 3: Run tests**

Run: `LINEAR_API_TOKEN=xxx pnpm test tests/integration/project-milestones-cli.test.ts` Expected: Tests pass or skip

**Step 4: Commit**

```bash
git add tests/integration/project-milestones-cli.test.ts
git commit -m "[TEST] Add integration tests for milestone create

Tests create command with:
- All fields (name, description, target date)
- Minimal fields (name only)

Note: Tests leave data in workspace, manual cleanup needed."
```

---

## Phase 5: Documentation & Polish

### Task 16: Document Flag Interactions

**Files:**

- Modify: `README.md:97` (add section after cycles examples)

**Step 1: Find insertion point**

Run: `sed -n '95,110p' README.md` Expected: See end of cycles section

**Step 2: Add flag combinations section**

After the cycles examples (around line 110), add:

```markdown
#### Flag Combinations

The `cycles list` command supports several flag combinations:

**Valid combinations:**

- `cycles list` - All cycles across all teams
- `cycles list --team Backend` - All Backend cycles
- `cycles list --active` - Active cycles from all teams
- `cycles list --team Backend --active` - Backend's active cycle only
- `cycles list --team Backend --around-active 3` - Backend's active cycle ± 3 cycles

**Invalid combinations:**

- `cycles list --around-active 3` - ❌ Error: requires `--team`

**Note:** Using `--active --around-active` together works but `--active` is redundant since `--around-active` always includes the active cycle.
```

**Step 3: Verify markdown formatting**

Run: `cat README.md | grep -A 15 "Flag Combinations"` Expected: Proper markdown

**Step 4: Commit**

```bash
git add README.md
git commit -m "[DOC] Document cycles command flag combinations

Clarifies valid and invalid flag combinations for cycles list.
Helps users understand how --team, --active, and --around-active
interact."
```

---

### Task 17: Add Pagination Documentation to Service Methods

**Files:**

- Modify: `src/utils/linear-service.ts:415,538`

**Step 1: Add JSDoc to getCycleById**

Before `getCycleById` method (line 415), update JSDoc:

```typescript
/**
 * Get single cycle by ID with issues
 *
 * @param cycleId - Cycle UUID
 * @param issuesLimit - Maximum issues to fetch (default 50)
 * @returns Cycle with issues
 *
 * @remarks
 * This method does not paginate issues. If a cycle has more issues than
 * the limit, only the first N will be returned sorted by creation date.
 *
 * Linear API limits single requests to 250 items. Values above 250 may
 * result in errors or truncation.
 *
 * To get all issues in a large cycle, either:
 * 1. Increase the limit (up to 250)
 * 2. Fetch issues separately using the issues API with pagination
 * 3. Make multiple requests with cursor-based pagination
 */
async getCycleById(cycleId: string, issuesLimit: number = 50): Promise<any> {
```

**Step 2: Add JSDoc to getCycles**

Before `getCycles` method (line 372), update JSDoc:

```typescript
/**
 * Get all cycles with automatic pagination
 *
 * @param teamFilter - Optional team key, name, or ID to filter cycles
 * @param activeOnly - If true, return only active cycles
 * @returns Array of cycles with team information
 *
 * @remarks
 * Uses Linear SDK automatic pagination with 250 cycles per request.
 * This method will make multiple API calls if necessary to fetch all
 * matching cycles.
 *
 * For workspaces with hundreds of cycles, consider using team filtering
 * to reduce result set size and improve performance.
 */
async getCycles(teamFilter?: string, activeOnly?: boolean): Promise<any[]> {
```

**Step 3: Verify no functional changes**

Run: `git diff src/utils/linear-service.ts` Expected: Only JSDoc comments added

**Step 4: Commit**

```bash
git add src/utils/linear-service.ts
git commit -m "[DOC] Add pagination documentation to cycle methods

Documents:
- Issue fetch limits (250 max per request)
- Automatic pagination in getCycles
- How to handle large datasets"
```

---

### Task 18: Standardize Error Messages

**Files:**

- Modify: `src/commands/cycles.ts:21,32,37`
- Modify: `src/commands/projectMilestones.ts:27,69,76`
- Modify: `src/utils/linear-service.ts:518,531`

**Step 1: Define error message patterns**

Create `src/utils/error-messages.ts`:

```typescript
/**
 * Standard error message formatters
 */

export function notFoundError(entityType: string, identifier: string, context?: string): Error {
  const contextStr = context ? ` ${context}` : "";
  return new Error(`${entityType} "${identifier}"${contextStr} not found`);
}

export function multipleMatchesError(
  entityType: string,
  identifier: string,
  matches: string[],
  disambiguation: string,
): Error {
  const matchList = matches.join(", ");
  return new Error(
    `Multiple ${entityType}s found matching "${identifier}". ` +
      `Candidates: ${matchList}. ` +
      `Please ${disambiguation}.`,
  );
}

export function invalidParameterError(parameter: string, reason: string): Error {
  return new Error(`Invalid ${parameter}: ${reason}`);
}

export function requiresParameterError(flag: string, requiredFlag: string): Error {
  return new Error(`${flag} requires ${requiredFlag} to be specified`);
}
```

**Step 2: Use in cycles.ts**

At top of `src/commands/cycles.ts`, add:

```typescript
import { invalidParameterError, notFoundError, requiresParameterError } from "../utils/error-messages.js";
```

Change line 21:

```typescript
throw new Error("--around-active requires --team to be specified");
```

To:

```typescript
throw requiresParameterError("--around-active", "--team");
```

Change line 32:

```typescript
throw new Error("--around-active requires a non-negative integer");
```

To:

```typescript
throw invalidParameterError("--around-active", "requires a non-negative integer");
```

Change line 37:

```typescript
throw new Error(`No active cycle found for team "${options.team}"`);
```

To:

```typescript
throw notFoundError("Active cycle", options.team, `for team`);
```

**Step 3: Use in projectMilestones.ts**

At top of file, add:

```typescript
import { multipleMatchesError, notFoundError } from "../utils/error-messages.js";
```

Change line 27:

```typescript
throw new Error(`Project "${projectNameOrId}" not found`);
```

To:

```typescript
throw notFoundError("Project", projectNameOrId);
```

Change line 69:

```typescript
throw new Error(`Milestone "${milestoneNameOrId}" not found`);
```

To:

```typescript
throw notFoundError("Milestone", milestoneNameOrId);
```

Change lines 72-77:

```typescript
if (nodes.length > 1) {
  const projectNames = nodes
    .map((m: LinearProjectMilestone) => `"${m.name}" in project "${m.project?.name}"`)
    .join(", ");
  throw new Error(
    `Multiple milestones found with name "${milestoneNameOrId}": ${projectNames}. Please specify --project or use the milestone ID`,
  );
}
```

To:

```typescript
if (nodes.length > 1) {
  const matches = nodes.map((m: LinearProjectMilestone) => `"${m.name}" in project "${m.project?.name}"`);
  throw multipleMatchesError(
    "milestone",
    milestoneNameOrId,
    matches,
    "specify --project or use the milestone ID",
  );
}
```

**Step 4: Use in linear-service.ts**

At top of file, add:

```typescript
import { multipleMatchesError, notFoundError } from "./error-messages.js";
```

Change line 518:

```typescript
const context = teamFilter ? ` for team ${teamFilter}` : "";
throw new Error(`Cycle "${cycleNameOrId}"${context} not found`);
```

To:

```typescript
throw notFoundError("Cycle", cycleNameOrId, teamFilter ? `for team ${teamFilter}` : undefined);
```

Change lines 527-532:

```typescript
if (!chosen) {
  const list = nodes.map((n: any) => `${n.id} (${n.team?.key || "?"} / #${n.number} / ${n.startsAt})`).join("; ");
  throw new Error(
    `Ambiguous cycle name "${cycleNameOrId}" — multiple matches found: ${list}. Please use an ID or scope with --team.`,
  );
}
```

To:

```typescript
if (!chosen) {
  const matches = nodes.map((n: any) => `${n.id} (${n.team?.key || "?"} / #${n.number} / ${n.startsAt})`);
  throw multipleMatchesError(
    "cycle",
    cycleNameOrId,
    matches,
    "use an ID or scope with --team",
  );
}
```

**Step 5: Build to check compilation**

Run: `pnpm run build` Expected: Successful build

**Step 6: Run tests to ensure error messages still work**

Run: `pnpm test` Expected: All tests pass (error message content may differ slightly)

**Step 7: Update tests if needed**

If tests check exact error message strings, update them to match new format.

**Step 8: Commit**

```bash
git add src/utils/error-messages.ts src/commands/cycles.ts src/commands/projectMilestones.ts src/utils/linear-service.ts tests/
git commit -m "[REFACTOR] Standardize error message formatting

Created error-messages.ts with standard formatters:
- notFoundError()
- multipleMatchesError()
- invalidParameterError()
- requiresParameterError()

Applied consistently across cycles and milestones commands."
```

---

### Task 19: Review and Update tsconfig Test Exclusion

**Files:**

- Modify: `tsconfig.json:29-38` (potentially)

**Step 1: Test current type checking**

Run: `pnpm exec tsc --noEmit` Expected: No errors (tests excluded)

**Step 2: Check if tests have type errors**

Temporarily remove test exclusions from tsconfig.json:

```json
"exclude": [
  "node_modules",
  "dist"
]
```

Run: `pnpm exec tsc --noEmit` Expected: Check if tests have type errors

**Step 3: Analyze results**

If errors:

- Are they trivial (vitest globals)? → Add `types: ["vitest/globals"]` to compilerOptions
- Are they real issues? → Fix them
- Are they unavoidable? → Keep tests excluded but document why

If no errors:

- Remove test exclusions (better type safety)

**Step 4: Decision**

Assuming vitest globals cause issues, update tsconfig.json:

```json
{
  "compilerOptions": {
    "types": [
      "node",
      "vitest/globals"
    ]
  },
  "include": [
    "src/**/*",
    "tests/**/*"
  ],
  "exclude": [
    "node_modules",
    "dist"
  ]
}
```

**Step 5: Verify**

Run: `pnpm exec tsc --noEmit` Expected: No errors

**Step 6: Commit**

```bash
git add tsconfig.json
git commit -m "[CHORE] Include tests in TypeScript type checking

Added vitest/globals to types and removed test exclusions.
Tests are now type-checked along with source code."
```

**Alternative Step 6 (if keeping excluded):**

Add comment in tsconfig.json:

```json
"exclude": [
  "node_modules",
  "dist",
  // Tests excluded from type checking due to vitest globals conflicts
  // Tests are validated at runtime by vitest
  "tests"
]
```

```bash
git add tsconfig.json
git commit -m "[DOC] Document why tests excluded from type checking

Tests excluded due to vitest globals type conflicts.
Runtime validation by vitest is sufficient."
```

---

## Execution Plan Complete

**Total estimated time:**

- Phase 1 (Critical): 6 minutes
- Phase 2 (Type Safety): 1 hour 5 minutes
- Phase 3 (Service Layer): 55 minutes
- Phase 4 (Testing): 3.5 hours
- Phase 5 (Documentation): 1.5 hours

**Grand total: ~7 hours of focused work**

---

## Plan complete and saved to `docs/plans/2025-11-09-pr7-post-merge-fixes.md`.

**Two execution options:**

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans skill, batch execution with checkpoints

**Which approach, Carlo?**
