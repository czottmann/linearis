import { createGraphQLService } from "../utils/graphql-service.js";
import { GraphQLIssuesService } from "../utils/graphql-issues-service.js";
import { createLinearService } from "../utils/linear-service.js";
import { handleAsyncCommand, outputSuccess } from "../utils/output.js";
export function setupIssuesCommands(program) {
    const issues = program.command("issues")
        .description("Issue operations");
    issues.action(() => {
        issues.help();
    });
    issues.command("list")
        .description("List issues.")
        .option("-l, --limit <number>", "limit results", "25")
        .action(handleAsyncCommand(async (options, command) => {
        const [graphQLService, linearService] = await Promise.all([
            createGraphQLService(command.parent.parent.opts()),
            createLinearService(command.parent.parent.opts()),
        ]);
        const issuesService = new GraphQLIssuesService(graphQLService, linearService);
        const result = await issuesService.getIssues(parseInt(options.limit));
        outputSuccess(result);
    }));
    issues.command("search <query>")
        .description("Search issues.")
        .option("--team <team>", "filter by team key, name, or ID")
        .option("--assignee <assigneeId>", "filter by assignee ID")
        .option("--project <project>", "filter by project name or ID")
        .option("--states <states>", "filter by states (comma-separated)")
        .option("-l, --limit <number>", "limit results", "10")
        .action(handleAsyncCommand(async (query, options, command) => {
        const [graphQLService, linearService] = await Promise.all([
            createGraphQLService(command.parent.parent.opts()),
            createLinearService(command.parent.parent.opts()),
        ]);
        const issuesService = new GraphQLIssuesService(graphQLService, linearService);
        const searchArgs = {
            query,
            teamId: options.team,
            assigneeId: options.assignee,
            projectId: options.project,
            states: options.states ? options.states.split(",") : undefined,
            limit: parseInt(options.limit),
        };
        const result = await issuesService.searchIssues(searchArgs);
        outputSuccess(result);
    }));
    issues.command("create <title>")
        .description("Create new issue.")
        .option("-d, --description <desc>", "issue description")
        .option("-a, --assignee <assigneeId>", "assign to user ID")
        .option("-p, --priority <priority>", "priority level (1-4)")
        .option("--project <project>", "add to project (name or ID)")
        .option("--team <team>", "team key, name, or ID (required if not specified)")
        .option("--labels <labels>", "labels (comma-separated names or IDs)")
        .option("--milestone <milestone>", "milestone name or ID (requires --project)")
        .option("--cycle <cycle>", "cycle name or ID (requires --team)")
        .option("--status <status>", "status name or ID")
        .option("--parent-ticket <parentId>", "parent issue ID or identifier")
        .action(handleAsyncCommand(async (title, options, command) => {
        const [graphQLService, linearService] = await Promise.all([
            createGraphQLService(command.parent.parent.opts()),
            createLinearService(command.parent.parent.opts()),
        ]);
        const issuesService = new GraphQLIssuesService(graphQLService, linearService);
        let labelIds;
        if (options.labels) {
            labelIds = options.labels.split(",").map((l) => l.trim());
        }
        const createArgs = {
            title,
            teamId: options.team,
            description: options.description,
            assigneeId: options.assignee,
            priority: options.priority ? parseInt(options.priority) : undefined,
            projectId: options.project,
            stateId: options.status,
            labelIds,
            parentId: options.parentTicket,
            milestoneId: options.milestone,
            cycleId: options.cycle,
        };
        const result = await issuesService.createIssue(createArgs);
        outputSuccess(result);
    }));
    issues.command("read <issueId>")
        .description("Get issue details.")
        .addHelpText("after", `\nWhen passing issue IDs, both UUID and identifiers like ABC-123 are supported.`)
        .action(handleAsyncCommand(async (issueId, _options, command) => {
        const [graphQLService, linearService] = await Promise.all([
            createGraphQLService(command.parent.parent.opts()),
            createLinearService(command.parent.parent.opts()),
        ]);
        const issuesService = new GraphQLIssuesService(graphQLService, linearService);
        const result = await issuesService.getIssueById(issueId);
        outputSuccess(result);
    }));
    issues.command("update <issueId>")
        .description("Update an issue.")
        .addHelpText("after", `\nWhen passing issue IDs, both UUID and identifiers like ABC-123 are supported.`)
        .option("-t, --title <title>", "new title")
        .option("-d, --description <desc>", "new description")
        .option("-s, --state <stateId>", "new state name or ID")
        .option("-p, --priority <priority>", "new priority (1-4)")
        .option("--assignee <assigneeId>", "new assignee ID")
        .option("--project <project>", "new project (name or ID)")
        .optionsGroup("Labels-related options:")
        .option("--labels <labels>", "labels to work with (comma-separated names or IDs)")
        .option("--label-by <mode>", "how to apply labels: 'adding' (default) or 'overwriting'")
        .option("--clear-labels", "remove all labels from issue")
        .optionsGroup("Parent ticket-related options:")
        .option("--parent-ticket <parentId>", "set parent issue ID or identifier")
        .option("--clear-parent-ticket", "clear existing parent relationship")
        .optionsGroup("Milestone-related options:")
        .option("--milestone <milestone>", "set milestone (can use name or ID, will try to resolve within project context first)")
        .option("--clear-milestone", "clear existing milestone assignment")
        .optionsGroup("Cycle-related options:")
        .option("--cycle <cycle>", "set cycle (can use name or ID, will try to resolve within team context first)")
        .option("--clear-cycle", "clear existing cycle assignment")
        .action(handleAsyncCommand(async (issueId, options, command) => {
        if (options.parentTicket && options.clearParentTicket) {
            throw new Error("Cannot use --parent-ticket and --clear-parent-ticket together");
        }
        if (options.milestone && options.clearMilestone) {
            throw new Error("Cannot use --milestone and --clear-milestone together");
        }
        if (options.cycle && options.clearCycle) {
            throw new Error("Cannot use --cycle and --clear-cycle together");
        }
        if (options.labelBy && !options.labels) {
            throw new Error("--label-by requires --labels to be specified");
        }
        if (options.clearLabels && options.labels) {
            throw new Error("--clear-labels cannot be used with --labels");
        }
        if (options.clearLabels && options.labelBy) {
            throw new Error("--clear-labels cannot be used with --label-by");
        }
        if (options.labelBy &&
            !["adding", "overwriting"].includes(options.labelBy)) {
            throw new Error("--label-by must be either 'adding' or 'overwriting'");
        }
        const [graphQLService, linearService] = await Promise.all([
            createGraphQLService(command.parent.parent.opts()),
            createLinearService(command.parent.parent.opts()),
        ]);
        const issuesService = new GraphQLIssuesService(graphQLService, linearService);
        let labelIds;
        if (options.clearLabels) {
            labelIds = [];
        }
        else if (options.labels) {
            const labelNames = options.labels.split(",").map((l) => l.trim());
            labelIds = labelNames;
        }
        const updateArgs = {
            id: issueId,
            title: options.title,
            description: options.description,
            stateId: options.state,
            priority: options.priority ? parseInt(options.priority) : undefined,
            assigneeId: options.assignee,
            projectId: options.project,
            labelIds,
            parentId: options.parentTicket ||
                (options.clearParentTicket ? null : undefined),
            milestoneId: options.milestone ||
                (options.clearMilestone ? null : undefined),
            cycleId: options.cycle || (options.clearCycle ? null : undefined),
        };
        const labelMode = options.labelBy || "adding";
        const result = await issuesService.updateIssue(updateArgs, labelMode);
        outputSuccess(result);
    }));
}
