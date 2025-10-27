import { Command } from "commander";
import { createGraphQLService } from "../utils/graphql-service.js";
import { handleAsyncCommand, outputSuccess } from "../utils/output.js";
import {
  GET_CYCLES_LIST_QUERY,
  GET_CYCLES_QUERY,
  GET_CYCLE_BY_ID_QUERY,
  FIND_CYCLE_BY_NAME_SCOPED,
  FIND_CYCLE_BY_NAME_GLOBAL,
} from "../queries/cycles.js";
import { isUuid } from "../utils/uuid.js";

export function setupCyclesCommands(program: Command): void {
  const cycles = program.command("cycles").description("Cycle operations");

  cycles.action(() => cycles.help());

  cycles.command("list")
    .description("List cycles")
    .option("--team <team>", "team key, name, or ID")
    .option("-l, --limit <number>", "limit results", "25")
    .option("--around-active <n>", "return active +/- n cycles (requires --team)")
    .option("--active", "only active cycles")
    .action(
      handleAsyncCommand(async (options: any, command: Command) => {
        const graphQLService = await createGraphQLService(command.parent!.parent!.opts());

        // around-active requires a team to determine the current team's active cycle
        if (options.aroundActive && !options.team) {
          throw new Error("--around-active requires --team to be specified");
        }

        // If around-active is requested, find the active cycle for the team first
        if (options.aroundActive) {
          const n = parseInt(options.aroundActive);
          if (isNaN(n) || n < 0) throw new Error("--around-active requires a non-negative integer");

          // Find the active cycle for the team
          const activeRes = await graphQLService.rawRequest(GET_CYCLES_LIST_QUERY, {
            first: 1,
            teamKey: options.team,
            isActive: true,
          });
          const active = activeRes.cycles?.nodes?.[0];
          if (!active) {
            throw new Error(`No active cycle found for team "${options.team}"`);
          }

          const activeNumber = Number(active.number || 0);
          const min = activeNumber - n;
          const max = activeNumber + n;

          // Fetch a broader set for the team and filter by number range
          const fetchRes = await graphQLService.rawRequest(GET_CYCLES_LIST_QUERY, {
            first: Math.max(parseInt(options.limit), 100),
            teamKey: options.team,
          });
          const nodes = fetchRes.cycles?.nodes || [];
          const filtered = nodes
            .filter((c: any) => typeof c.number === "number" && c.number >= min && c.number <= max)
            .sort((a: any, b: any) => a.number - b.number);

          outputSuccess(filtered);
          return;
        }

        const vars: any = { first: parseInt(options.limit) };
        if (options.team) vars.teamKey = options.team;
        if (options.active) vars.isActive = true;

        const result = await graphQLService.rawRequest(GET_CYCLES_LIST_QUERY, vars);
        outputSuccess(result.cycles?.nodes || []);
      }),
    );

  cycles.command("read <cycleIdOrName>")
    .description("Get cycle details including issues. Accepts UUID or cycle name (optionally scoped by --team)")
    .option("--team <team>", "team key, name, or ID to scope name lookup")
    .option("--issues-first <n>", "how many issues to fetch (default 50)", "50")
    .action(
      handleAsyncCommand(async (cycleIdOrName: string, options: any, command: Command) => {
        const graphQLService = await createGraphQLService(command.parent!.parent!.opts());

        let cycleId = cycleIdOrName;
        if (!isUuid(cycleIdOrName)) {
          // Resolve by name; prefer scoped team lookup when --team is supplied
          let findRes: any;
          let nodes: any[] = [];

          if (options.team) {
            findRes = await graphQLService.rawRequest(FIND_CYCLE_BY_NAME_SCOPED, {
              name: cycleIdOrName,
              teamKey: options.team,
            });
            nodes = findRes.cycles?.nodes || [];
          }

          // If scoped lookup didn't find anything (or no team provided), try global
          if (!nodes.length) {
            findRes = await graphQLService.rawRequest(FIND_CYCLE_BY_NAME_GLOBAL, {
              name: cycleIdOrName,
            });
            nodes = findRes.cycles?.nodes || [];
          }

          if (!nodes.length) {
            throw new Error(`Cycle with name "${cycleIdOrName}" not found`);
          }

          // Disambiguate: prefer active, then next, then previous. If still ambiguous, show helpful error.
          let chosen: any | undefined = nodes.find((n: any) => n.isActive);
          if (!chosen) chosen = nodes.find((n: any) => n.isNext);
          if (!chosen) chosen = nodes.find((n: any) => n.isPrevious);
          if (!chosen && nodes.length === 1) chosen = nodes[0];

          if (!chosen) {
            const list = nodes.map((n: any) => `${n.id} (${n.team?.key || "?"} / #${n.number} / ${n.startsAt})`).join("; ");
            throw new Error(
              `Ambiguous cycle name "${cycleIdOrName}" — multiple matches found: ${list}. Please use an ID or scope with --team.`,
            );
          }

          cycleId = chosen.id;
        }

        const result = await graphQLService.rawRequest(GET_CYCLE_BY_ID_QUERY, {
          id: cycleId,
          issuesFirst: parseInt(options.issuesFirst || "50"),
        });

        outputSuccess(result.cycle);
      }),
    );
}
