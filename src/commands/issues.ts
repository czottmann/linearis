import { Command } from "commander";
import { createLinearService } from "../utils/linear-service.js";
import { handleAsyncCommand, outputSuccess } from "../utils/output.js";

/**
 * Setup issues commands on the program
 * @param program - Commander.js program instance
 */
export function setupIssuesCommands(program: Command): void {
  const issues = program.command("issues")
    .description("Issue operations");

  // Show issues help when no subcommand
  issues.action(() => {
    issues.help();
  });

  issues.command("list")
    .description("List issues")
    .option("-l, --limit <number>", "limit results", "25")
    .action(handleAsyncCommand(async (options: any, command: Command) => {
      const service = await createLinearService(command.parent!.parent!.opts());
      const result = await service.getIssues(parseInt(options.limit));
      outputSuccess(result);
    }));

  issues.command("search <query>")
    .description("Search issues")
    .option("--team <team>", "filter by team key, name, or ID")
    .option("--assignee <assigneeId>", "filter by assignee ID")
    .option("--project <project>", "filter by project name or ID")
    .option("--states <states>", "filter by states (comma-separated)")
    .option("-l, --limit <number>", "limit results", "10")
    .action(
      handleAsyncCommand(
        async (query: string, options: any, command: Command) => {
          const service = await createLinearService(
            command.parent!.parent!.opts(),
          );

          // Resolve team if provided
          let teamId = options.team;
          if (teamId) {
            teamId = await service.resolveTeamId(teamId);
          }

          // Resolve project if provided
          let projectId = options.project;
          if (projectId) {
            projectId = await service.resolveProjectId(projectId);
          }

          const searchArgs = {
            query,
            teamId,
            assigneeId: options.assignee,
            projectId,
            states: options.states ? options.states.split(",") : undefined,
            limit: parseInt(options.limit),
          };
          const result = await service.searchIssues(searchArgs);
          outputSuccess(result);
        },
      ),
    );

  issues.command("create <title>")
    .description("Create new issue")
    .option("-d, --description <desc>", "issue description")
    .option("-a, --assignee <assigneeId>", "assign to user ID")
    .option("-p, --priority <priority>", "priority level (1-4)")
    .option("--project <project>", "add to project (name or ID)")
    .option(
      "--team <team>",
      "team key, name, or ID (required if not specified)",
    )
    .option("--labels <labels>", "labels (comma-separated names or IDs)")
    .option(
      "--milestone <milestone>",
      "milestone name or ID (requires --project)",
    )
    .option("--status <status>", "status name or ID")
    .option("--parent-ticket <parentId>", "parent issue ID or identifier")
    .action(
      handleAsyncCommand(
        async (title: string, options: any, command: Command) => {
          const service = await createLinearService(
            command.parent!.parent!.opts(),
          );

          // Resolve team
          let teamId = options.team;
          if (teamId) {
            teamId = await service.resolveTeamId(teamId);
          }

          // Resolve project if provided
          let projectId = options.project;
          if (projectId) {
            projectId = await service.resolveProjectId(projectId);
          }

          // Resolve labels
          let labelIds: string[] | undefined;
          if (options.labels) {
            const labelNames = options.labels.split(",").map((l: string) =>
              l.trim()
            );
            labelIds = await service.resolveLabelIds(labelNames);
          }

          // Resolve milestone if provided (requires project to be resolved first)
          let milestoneId = options.milestone;
          if (milestoneId && projectId) {
            milestoneId = await service.resolveMilestoneId(
              milestoneId,
              projectId,
            );
          }

          // Resolve parent ticket if provided
          let parentId = options.parentTicket;
          if (parentId) {
            // If it's not a UUID, try to resolve it as an identifier
            if (parentId.length !== 36 || !parentId.includes("-")) {
              const parentIssue = await service.getIssueById(parentId);
              parentId = parentIssue.id;
            }
          }

          const createArgs = {
            title,
            teamId,
            description: options.description,
            assigneeId: options.assignee,
            priority: options.priority ? parseInt(options.priority) : undefined,
            projectId,
            stateId: options.status,
            labelIds,
            parentId,
            milestoneId,
          };

          const result = await service.createIssue(createArgs);
          outputSuccess(result);
        },
      ),
    );

  issues.command("read <issueId>")
    .description(
      "Get issue details (supports both UUID and identifier like ZCO-123)",
    )
    .action(
      handleAsyncCommand(
        async (issueId: string, options: any, command: Command) => {
          const service = await createLinearService(
            command.parent!.parent!.opts(),
          );
          const result = await service.getIssueById(issueId);
          outputSuccess(result);
        },
      ),
    );

  issues.command("update <issueId>")
    .description(
      "Update issue (supports both UUID and identifier like ZCO-123)",
    )
    .option("-t, --title <title>", "new title")
    .option("-d, --description <desc>", "new description")
    .option("-s, --state <stateId>", "new state ID")
    .option("-p, --priority <priority>", "new priority (1-4)")
    .option("--assignee <assigneeId>", "new assignee ID")
    .option("--project <project>", "new project (name or ID)")
    .option("--labels <labels>", "new labels (comma-separated names or IDs)")
    .action(
      handleAsyncCommand(
        async (issueId: string, options: any, command: Command) => {
          const service = await createLinearService(
            command.parent!.parent!.opts(),
          );

          // Resolve issue ID if it's an identifier
          let resolvedIssueId = issueId;
          if (issueId.length !== 36 || !issueId.includes("-")) {
            const issue = await service.getIssueById(issueId);
            resolvedIssueId = issue.id;
          }

          // Resolve project if provided
          let projectId = options.project;
          if (projectId) {
            projectId = await service.resolveProjectId(projectId);
          }

          // Resolve labels if provided
          let labelIds: string[] | undefined;
          if (options.labels) {
            const labelNames = options.labels.split(",").map((l: string) =>
              l.trim()
            );
            labelIds = await service.resolveLabelIds(labelNames);
          }

          const updateArgs = {
            id: resolvedIssueId,
            title: options.title,
            description: options.description,
            stateId: options.state,
            priority: options.priority ? parseInt(options.priority) : undefined,
            assigneeId: options.assignee,
            projectId,
            labelIds,
          };

          const result = await service.updateIssue(updateArgs);
          outputSuccess(result);
        },
      ),
    );
}
