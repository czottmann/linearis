import { Command } from "commander";
import { createLinearService } from "../utils/linear-service.js";
import { handleAsyncCommand, outputSuccess } from "../utils/output.js";

export function setupCyclesCommands(program: Command): void {
  const cycles = program.command("cycles").description("Cycle operations");

  cycles.action(() => cycles.help());

  cycles.command("list")
    .description("List cycles")
    .option("--team <team>", "team key, name, or ID")
    .option("--active", "only active cycles")
    .option("--around-active <n>", "return active +/- n cycles (requires --team)")
    .action(
      handleAsyncCommand(async (options: any, command: Command) => {
        const linearService = await createLinearService(command.parent!.parent!.opts());

        // around-active requires a team to determine the current team's active cycle
        if (options.aroundActive && !options.team) {
          throw new Error("--around-active requires --team to be specified");
        }

        // Fetch cycles with automatic pagination
        const allCycles = await linearService.getCycles(
          options.team,
          options.active ? true : undefined
        );

        // If around-active is requested, filter by cycle number range
        if (options.aroundActive) {
          const n = parseInt(options.aroundActive);
          if (isNaN(n) || n < 0) {
            throw new Error("--around-active requires a non-negative integer");
          }

          const activeCycle = allCycles.find((c: any) => c.isActive);
          if (!activeCycle) {
            throw new Error(`No active cycle found for team "${options.team}"`);
          }

          const activeNumber = Number(activeCycle.number || 0);
          const min = activeNumber - n;
          const max = activeNumber + n;

          const filtered = allCycles
            .filter((c: any) => typeof c.number === "number" && c.number >= min && c.number <= max)
            .sort((a: any, b: any) => a.number - b.number);

          outputSuccess(filtered);
          return;
        }

        outputSuccess(allCycles);
      }),
    );

  cycles.command("read <cycleIdOrName>")
    .description("Get cycle details including issues. Accepts UUID or cycle name (optionally scoped by --team)")
    .option("--team <team>", "team key, name, or ID to scope name lookup")
    .option("--issues-first <n>", "how many issues to fetch (default 50)", "50")
    .action(
      handleAsyncCommand(async (cycleIdOrName: string, options: any, command: Command) => {
        const linearService = await createLinearService(command.parent!.parent!.opts());

        // Resolve cycle ID (handles both UUID and name-based lookup)
        const cycleId = await linearService.resolveCycleId(cycleIdOrName, options.team);

        // Fetch cycle with issues
        const cycle = await linearService.getCycleById(
          cycleId,
          parseInt(options.issuesFirst || "50")
        );

        outputSuccess(cycle);
      }),
    );
}
