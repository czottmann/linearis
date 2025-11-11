import { createLinearService } from "../utils/linear-service.js";
import { handleAsyncCommand, outputSuccess } from "../utils/output.js";
import { invalidParameterError, notFoundError, requiresParameterError, } from "../utils/error-messages.js";
export function setupCyclesCommands(program) {
    const cycles = program.command("cycles").description("Cycle operations");
    cycles.action(() => cycles.help());
    cycles.command("list")
        .description("List cycles")
        .option("--team <team>", "team key, name, or ID")
        .option("--active", "only active cycles")
        .option("--around-active <n>", "return active +/- n cycles (requires --team)")
        .action(handleAsyncCommand(async (options, command) => {
        const linearService = await createLinearService(command.parent.parent.opts());
        if (options.aroundActive && !options.team) {
            throw requiresParameterError("--around-active", "--team");
        }
        const allCycles = await linearService.getCycles(options.team, options.active ? true : undefined);
        if (options.aroundActive) {
            const n = parseInt(options.aroundActive);
            if (isNaN(n) || n < 0) {
                throw invalidParameterError("--around-active", "requires a non-negative integer");
            }
            const activeCycle = allCycles.find((c) => c.isActive);
            if (!activeCycle) {
                throw notFoundError("Active cycle", options.team, "for team");
            }
            const activeNumber = Number(activeCycle.number || 0);
            const min = activeNumber - n;
            const max = activeNumber + n;
            const filtered = allCycles
                .filter((c) => typeof c.number === "number" && c.number >= min &&
                c.number <= max)
                .sort((a, b) => a.number - b.number);
            outputSuccess(filtered);
            return;
        }
        outputSuccess(allCycles);
    }));
    cycles.command("read <cycleIdOrName>")
        .description("Get cycle details including issues. Accepts UUID or cycle name (optionally scoped by --team)")
        .option("--team <team>", "team key, name, or ID to scope name lookup")
        .option("--issues-first <n>", "how many issues to fetch (default 50)", "50")
        .action(handleAsyncCommand(async (cycleIdOrName, options, command) => {
        const linearService = await createLinearService(command.parent.parent.opts());
        const cycleId = await linearService.resolveCycleId(cycleIdOrName, options.team);
        const cycle = await linearService.getCycleById(cycleId, parseInt(options.issuesFirst || "50"));
        outputSuccess(cycle);
    }));
}
