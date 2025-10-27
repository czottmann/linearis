import { createGraphQLService } from "../utils/graphql-service.js";
import { handleAsyncCommand, outputSuccess } from "../utils/output.js";
import { LIST_PROJECT_MILESTONES_QUERY, GET_PROJECT_MILESTONE_BY_ID_QUERY, FIND_PROJECT_MILESTONE_BY_NAME_SCOPED, FIND_PROJECT_MILESTONE_BY_NAME_GLOBAL, CREATE_PROJECT_MILESTONE_MUTATION, UPDATE_PROJECT_MILESTONE_MUTATION, } from "../queries/projectMilestones.js";
import { isUuid } from "../utils/uuid.js";
export function setupProjectMilestonesCommands(program) {
    const projectMilestones = program
        .command("projectMilestones")
        .description("Project milestone operations");
    projectMilestones.action(() => projectMilestones.help());
    projectMilestones
        .command("list")
        .description("List milestones in a project")
        .requiredOption("--project <project>", "project name or ID")
        .option("-l, --limit <number>", "limit results", "50")
        .action(handleAsyncCommand(async (options, command) => {
        const graphQLService = await createGraphQLService(command.parent.parent.opts());
        let projectId = options.project;
        if (!isUuid(options.project)) {
            const projectRes = await graphQLService.rawRequest(`query FindProject($name: String!) { projects(filter: { name: { eq: $name } }, first: 1) { nodes { id name } } }`, { name: options.project });
            const projects = projectRes.projects?.nodes || [];
            if (!projects.length) {
                throw new Error(`Project "${options.project}" not found`);
            }
            projectId = projects[0].id;
        }
        const result = await graphQLService.rawRequest(LIST_PROJECT_MILESTONES_QUERY, {
            projectId,
            first: parseInt(options.limit),
        });
        outputSuccess(result.project?.projectMilestones?.nodes || []);
    }));
    projectMilestones
        .command("read <milestoneIdOrName>")
        .description("Get milestone details including issues. Accepts UUID or milestone name (optionally scoped by --project)")
        .option("--project <project>", "project name or ID to scope name lookup")
        .option("--issues-first <n>", "how many issues to fetch (default 50)", "50")
        .action(handleAsyncCommand(async (milestoneIdOrName, options, command) => {
        const graphQLService = await createGraphQLService(command.parent.parent.opts());
        let milestoneId = milestoneIdOrName;
        if (!isUuid(milestoneIdOrName)) {
            let nodes = [];
            if (options.project) {
                let projectId = options.project;
                if (!isUuid(options.project)) {
                    const projectRes = await graphQLService.rawRequest(`query FindProject($name: String!) { projects(filter: { name: { eq: $name } }, first: 1) { nodes { id name } } }`, { name: options.project });
                    const projects = projectRes.projects?.nodes || [];
                    if (!projects.length) {
                        throw new Error(`Project "${options.project}" not found`);
                    }
                    projectId = projects[0].id;
                }
                const findRes = await graphQLService.rawRequest(FIND_PROJECT_MILESTONE_BY_NAME_SCOPED, {
                    name: milestoneIdOrName,
                    projectId,
                });
                nodes = findRes.project?.projectMilestones?.nodes || [];
            }
            if (!nodes.length) {
                const findRes = await graphQLService.rawRequest(FIND_PROJECT_MILESTONE_BY_NAME_GLOBAL, { name: milestoneIdOrName });
                nodes = findRes.projectMilestones?.nodes || [];
            }
            if (!nodes.length) {
                throw new Error(`Milestone with name "${milestoneIdOrName}" not found`);
            }
            let chosen;
            if (nodes.length === 1) {
                chosen = nodes[0];
            }
            if (!chosen) {
                const list = nodes
                    .map((n) => `${n.id} (${n.project?.name || "?"} / ${n.targetDate || "no date"})`)
                    .join("; ");
                throw new Error(`Ambiguous milestone name "${milestoneIdOrName}" — multiple matches found: ${list}. Please use an ID or scope with --project.`);
            }
            milestoneId = chosen.id;
        }
        const result = await graphQLService.rawRequest(GET_PROJECT_MILESTONE_BY_ID_QUERY, {
            id: milestoneId,
            issuesFirst: parseInt(options.issuesFirst || "50"),
        });
        outputSuccess(result.projectMilestone);
    }));
    projectMilestones
        .command("create <name>")
        .description("Create a new project milestone")
        .requiredOption("--project <project>", "project name or ID")
        .option("-d, --description <description>", "milestone description")
        .option("--target-date <date>", "target date in ISO format (YYYY-MM-DD)")
        .action(handleAsyncCommand(async (name, options, command) => {
        const graphQLService = await createGraphQLService(command.parent.parent.opts());
        let projectId = options.project;
        if (!isUuid(options.project)) {
            const projectRes = await graphQLService.rawRequest(`query FindProject($name: String!) { projects(filter: { name: { eq: $name } }, first: 1) { nodes { id name } } }`, { name: options.project });
            const projects = projectRes.projects?.nodes || [];
            if (!projects.length) {
                throw new Error(`Project "${options.project}" not found`);
            }
            projectId = projects[0].id;
        }
        const result = await graphQLService.rawRequest(CREATE_PROJECT_MILESTONE_MUTATION, {
            projectId,
            name,
            description: options.description,
            targetDate: options.targetDate,
        });
        if (!result.projectMilestoneCreate?.success) {
            throw new Error("Failed to create project milestone");
        }
        outputSuccess(result.projectMilestoneCreate.projectMilestone);
    }));
    projectMilestones
        .command("update <milestoneIdOrName>")
        .description("Update an existing project milestone. Accepts UUID or milestone name (optionally scoped by --project)")
        .option("--project <project>", "project name or ID to scope name lookup")
        .option("-n, --name <name>", "new milestone name")
        .option("-d, --description <description>", "new milestone description")
        .option("--target-date <date>", "new target date in ISO format (YYYY-MM-DD)")
        .option("--sort-order <number>", "new sort order")
        .action(handleAsyncCommand(async (milestoneIdOrName, options, command) => {
        const graphQLService = await createGraphQLService(command.parent.parent.opts());
        let milestoneId = milestoneIdOrName;
        if (!isUuid(milestoneIdOrName)) {
            let nodes = [];
            if (options.project) {
                let projectId = options.project;
                if (!isUuid(options.project)) {
                    const projectRes = await graphQLService.rawRequest(`query FindProject($name: String!) { projects(filter: { name: { eq: $name } }, first: 1) { nodes { id name } } }`, { name: options.project });
                    const projects = projectRes.projects?.nodes || [];
                    if (!projects.length) {
                        throw new Error(`Project "${options.project}" not found`);
                    }
                    projectId = projects[0].id;
                }
                const findRes = await graphQLService.rawRequest(FIND_PROJECT_MILESTONE_BY_NAME_SCOPED, {
                    name: milestoneIdOrName,
                    projectId,
                });
                nodes = findRes.project?.projectMilestones?.nodes || [];
            }
            if (!nodes.length) {
                const findRes = await graphQLService.rawRequest(FIND_PROJECT_MILESTONE_BY_NAME_GLOBAL, { name: milestoneIdOrName });
                nodes = findRes.projectMilestones?.nodes || [];
            }
            if (!nodes.length) {
                throw new Error(`Milestone with name "${milestoneIdOrName}" not found`);
            }
            let chosen;
            if (nodes.length === 1) {
                chosen = nodes[0];
            }
            if (!chosen) {
                const list = nodes
                    .map((n) => `${n.id} (${n.project?.name || "?"} / ${n.targetDate || "no date"})`)
                    .join("; ");
                throw new Error(`Ambiguous milestone name "${milestoneIdOrName}" — multiple matches found: ${list}. Please use an ID or scope with --project.`);
            }
            milestoneId = chosen.id;
        }
        const updateVars = { id: milestoneId };
        if (options.name !== undefined)
            updateVars.name = options.name;
        if (options.description !== undefined)
            updateVars.description = options.description;
        if (options.targetDate !== undefined)
            updateVars.targetDate = options.targetDate;
        if (options.sortOrder !== undefined)
            updateVars.sortOrder = parseFloat(options.sortOrder);
        const result = await graphQLService.rawRequest(UPDATE_PROJECT_MILESTONE_MUTATION, updateVars);
        if (!result.projectMilestoneUpdate?.success) {
            throw new Error("Failed to update project milestone");
        }
        outputSuccess(result.projectMilestoneUpdate.projectMilestone);
    }));
}
