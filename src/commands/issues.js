import { createLinearService } from "../utils/linear-client.js";
import { handleAsyncCommand, outputSuccess } from "../utils/output.js";

/**
 * Setup issues commands on the program
 * @param {Command} program - Commander.js program instance
 */
export function setupIssuesCommands(program) {
  const issues = program.command("issues")
    .description("Issue operations");

  // Show issues help when no subcommand
  issues.action(() => {
    issues.help();
  });

  issues.command("list")
    .description("List issues")
    .option("-l, --limit <number>", "limit results", "25")
    .action(handleAsyncCommand(async (options, command) => {
      const service = await createLinearService(command.parent.parent.opts());
      const result = await service.getIssues(parseInt(options.limit));
      outputSuccess(result);
    }));

  issues.command("search <query>")
    .description("Search issues")
    .option("--team <teamId>", "filter by team ID")
    .option("--assignee <assigneeId>", "filter by assignee ID")
    .option("--project <projectId>", "filter by project ID")
    .option("--states <states>", "filter by states (comma-separated)")
    .option("-l, --limit <number>", "limit results", "10")
    .action(handleAsyncCommand(async (query, options, command) => {
      const service = await createLinearService(command.parent.parent.opts());
      const searchArgs = {
        query,
        teamId: options.team,
        assigneeId: options.assignee,
        projectId: options.project,
        states: options.states ? options.states.split(",") : undefined,
        limit: parseInt(options.limit),
      };
      const result = await service.searchIssues(searchArgs);
      outputSuccess(result);
    }));

  issues.command("create <title> <teamId>")
    .description("Create new issue")
    .option("-d, --description <desc>", "issue description")
    .option("-a, --assignee <assigneeId>", "assign to user ID")
    .option("-p, --priority <priority>", "priority level (1-4)")
    .option("--project <projectId>", "add to project ID")
    .action(handleAsyncCommand(async (title, teamId, options, command) => {
      const service = await createLinearService(command.parent.parent.opts());
      const createArgs = {
        title,
        teamId,
        description: options.description,
        assigneeId: options.assignee,
        priority: options.priority ? parseInt(options.priority) : undefined,
        projectId: options.project,
      };
      const result = await service.createIssue(createArgs);
      outputSuccess(result);
    }));

  issues.command("read <issueId>")
    .description("Get issue details")
    .action(handleAsyncCommand(async (issueId, options, command) => {
      const service = await createLinearService(command.parent.parent.opts());
      const result = await service.getIssueById(issueId);
      outputSuccess(result);
    }));

  issues.command("update <issueId>")
    .description("Update issue")
    .option("-t, --title <title>", "new title")
    .option("-d, --description <desc>", "new description")
    .option("-s, --state <stateId>", "new state ID")
    .option("-p, --priority <priority>", "new priority (1-4)")
    .action(handleAsyncCommand(async (issueId, options, command) => {
      const service = await createLinearService(command.parent.parent.opts());
      const updateArgs = {
        id: issueId,
        title: options.title,
        description: options.description,
        stateId: options.state,
        priority: options.priority ? parseInt(options.priority) : undefined,
      };
      const result = await service.updateIssue(updateArgs);
      outputSuccess(result);
    }));
}
