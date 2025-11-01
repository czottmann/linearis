import { Command } from "commander";
import { createGraphQLService } from "../utils/graphql-service.js";
import { handleAsyncCommand, outputSuccess } from "../utils/output.js";
import {
  LIST_PROJECT_MILESTONES_QUERY,
  GET_PROJECT_MILESTONE_BY_ID_QUERY,
  FIND_PROJECT_MILESTONE_BY_NAME_SCOPED,
  FIND_PROJECT_MILESTONE_BY_NAME_GLOBAL,
  CREATE_PROJECT_MILESTONE_MUTATION,
  UPDATE_PROJECT_MILESTONE_MUTATION,
} from "../queries/projectMilestones.js";
import { isUuid } from "../utils/uuid.js";

export function setupProjectMilestonesCommands(program: Command): void {
  const projectMilestones = program
    .command("project-milestones")
    .description("Project milestone operations");

  projectMilestones.action(() => projectMilestones.help());

  // List milestones in a project
  projectMilestones
    .command("list")
    .description("List milestones in a project")
    .requiredOption("--project <project>", "project name or ID")
    .option("-l, --limit <number>", "limit results", "50")
    .action(
      handleAsyncCommand(async (options: any, command: Command) => {
        const graphQLService = await createGraphQLService(
          command.parent!.parent!.opts(),
        );

        // Resolve project ID if needed
        let projectId = options.project;
        if (!isUuid(options.project)) {
          const projectRes = await graphQLService.rawRequest(
            `query FindProject($name: String!) { projects(filter: { name: { eq: $name } }, first: 1) { nodes { id name } } }`,
            { name: options.project },
          );
          const projects = projectRes.projects?.nodes || [];
          if (!projects.length) {
            throw new Error(`Project "${options.project}" not found`);
          }
          projectId = projects[0].id;
        }

        const result = await graphQLService.rawRequest(
          LIST_PROJECT_MILESTONES_QUERY,
          {
            projectId,
            first: parseInt(options.limit),
          },
        );

        outputSuccess(result.project?.projectMilestones?.nodes || []);
      }),
    );

  // Get milestone details with issues
  projectMilestones
    .command("read <milestoneIdOrName>")
    .description(
      "Get milestone details including issues. Accepts UUID or milestone name (optionally scoped by --project)",
    )
    .option("--project <project>", "project name or ID to scope name lookup")
    .option("--issues-first <n>", "how many issues to fetch (default 50)", "50")
    .action(
      handleAsyncCommand(
        async (milestoneIdOrName: string, options: any, command: Command) => {
          const graphQLService = await createGraphQLService(
            command.parent!.parent!.opts(),
          );

          let milestoneId = milestoneIdOrName;

          if (!isUuid(milestoneIdOrName)) {
            // Resolve by name; prefer scoped project lookup when --project is supplied
            let nodes: any[] = [];

            if (options.project) {
              // Resolve project ID first
              let projectId = options.project;
              if (!isUuid(options.project)) {
                const projectRes = await graphQLService.rawRequest(
                  `query FindProject($name: String!) { projects(filter: { name: { eq: $name } }, first: 1) { nodes { id name } } }`,
                  { name: options.project },
                );
                const projects = projectRes.projects?.nodes || [];
                if (!projects.length) {
                  throw new Error(`Project "${options.project}" not found`);
                }
                projectId = projects[0].id;
              }

              // Scoped lookup
              const findRes = await graphQLService.rawRequest(
                FIND_PROJECT_MILESTONE_BY_NAME_SCOPED,
                {
                  name: milestoneIdOrName,
                  projectId,
                },
              );
              nodes = findRes.project?.projectMilestones?.nodes || [];
            }

            // If scoped lookup didn't find anything (or no project provided), try global
            if (!nodes.length) {
              const findRes = await graphQLService.rawRequest(
                FIND_PROJECT_MILESTONE_BY_NAME_GLOBAL,
                { name: milestoneIdOrName },
              );
              nodes = findRes.projectMilestones?.nodes || [];
            }

            if (!nodes.length) {
              throw new Error(
                `Milestone with name "${milestoneIdOrName}" not found`,
              );
            }

            // Disambiguate: if only one match, use it; otherwise error
            let chosen: any | undefined;
            if (nodes.length === 1) {
              chosen = nodes[0];
            }

            if (!chosen) {
              const list = nodes
                .map(
                  (n: any) =>
                    `${n.id} (${n.project?.name || "?"} / ${n.targetDate || "no date"})`,
                )
                .join("; ");
              throw new Error(
                `Ambiguous milestone name "${milestoneIdOrName}" — multiple matches found: ${list}. Please use an ID or scope with --project.`,
              );
            }

            milestoneId = chosen.id;
          }

          const result = await graphQLService.rawRequest(
            GET_PROJECT_MILESTONE_BY_ID_QUERY,
            {
              id: milestoneId,
              issuesFirst: parseInt(options.issuesFirst || "50"),
            },
          );

          outputSuccess(result.projectMilestone);
        },
      ),
    );

  // Create a new milestone
  projectMilestones
    .command("create <name>")
    .description("Create a new project milestone")
    .requiredOption("--project <project>", "project name or ID")
    .option("-d, --description <description>", "milestone description")
    .option("--target-date <date>", "target date in ISO format (YYYY-MM-DD)")
    .action(
      handleAsyncCommand(
        async (name: string, options: any, command: Command) => {
          const graphQLService = await createGraphQLService(
            command.parent!.parent!.opts(),
          );

          // Resolve project ID if needed
          let projectId = options.project;
          if (!isUuid(options.project)) {
            const projectRes = await graphQLService.rawRequest(
              `query FindProject($name: String!) { projects(filter: { name: { eq: $name } }, first: 1) { nodes { id name } } }`,
              { name: options.project },
            );
            const projects = projectRes.projects?.nodes || [];
            if (!projects.length) {
              throw new Error(`Project "${options.project}" not found`);
            }
            projectId = projects[0].id;
          }

          const result = await graphQLService.rawRequest(
            CREATE_PROJECT_MILESTONE_MUTATION,
            {
              projectId,
              name,
              description: options.description,
              targetDate: options.targetDate,
            },
          );

          if (!result.projectMilestoneCreate?.success) {
            throw new Error("Failed to create project milestone");
          }

          outputSuccess(result.projectMilestoneCreate.projectMilestone);
        },
      ),
    );

  // Update an existing milestone
  projectMilestones
    .command("update <milestoneIdOrName>")
    .description(
      "Update an existing project milestone. Accepts UUID or milestone name (optionally scoped by --project)",
    )
    .option("--project <project>", "project name or ID to scope name lookup")
    .option("-n, --name <name>", "new milestone name")
    .option("-d, --description <description>", "new milestone description")
    .option("--target-date <date>", "new target date in ISO format (YYYY-MM-DD)")
    .option("--sort-order <number>", "new sort order")
    .action(
      handleAsyncCommand(
        async (milestoneIdOrName: string, options: any, command: Command) => {
          const graphQLService = await createGraphQLService(
            command.parent!.parent!.opts(),
          );

          let milestoneId = milestoneIdOrName;

          // Resolve milestone ID if not a UUID
          if (!isUuid(milestoneIdOrName)) {
            let nodes: any[] = [];

            if (options.project) {
              // Resolve project ID first
              let projectId = options.project;
              if (!isUuid(options.project)) {
                const projectRes = await graphQLService.rawRequest(
                  `query FindProject($name: String!) { projects(filter: { name: { eq: $name } }, first: 1) { nodes { id name } } }`,
                  { name: options.project },
                );
                const projects = projectRes.projects?.nodes || [];
                if (!projects.length) {
                  throw new Error(`Project "${options.project}" not found`);
                }
                projectId = projects[0].id;
              }

              // Scoped lookup
              const findRes = await graphQLService.rawRequest(
                FIND_PROJECT_MILESTONE_BY_NAME_SCOPED,
                {
                  name: milestoneIdOrName,
                  projectId,
                },
              );
              nodes = findRes.project?.projectMilestones?.nodes || [];
            }

            // If scoped lookup didn't find anything (or no project provided), try global
            if (!nodes.length) {
              const findRes = await graphQLService.rawRequest(
                FIND_PROJECT_MILESTONE_BY_NAME_GLOBAL,
                { name: milestoneIdOrName },
              );
              nodes = findRes.projectMilestones?.nodes || [];
            }

            if (!nodes.length) {
              throw new Error(
                `Milestone with name "${milestoneIdOrName}" not found`,
              );
            }

            // Disambiguate: if only one match, use it; otherwise error
            let chosen: any | undefined;
            if (nodes.length === 1) {
              chosen = nodes[0];
            }

            if (!chosen) {
              const list = nodes
                .map(
                  (n: any) =>
                    `${n.id} (${n.project?.name || "?"} / ${n.targetDate || "no date"})`,
                )
                .join("; ");
              throw new Error(
                `Ambiguous milestone name "${milestoneIdOrName}" — multiple matches found: ${list}. Please use an ID or scope with --project.`,
              );
            }

            milestoneId = chosen.id;
          }

          // Build update input (only include provided fields)
          const updateVars: any = { id: milestoneId };
          if (options.name !== undefined) updateVars.name = options.name;
          if (options.description !== undefined) updateVars.description = options.description;
          if (options.targetDate !== undefined) updateVars.targetDate = options.targetDate;
          if (options.sortOrder !== undefined) updateVars.sortOrder = parseFloat(options.sortOrder);

          const result = await graphQLService.rawRequest(
            UPDATE_PROJECT_MILESTONE_MUTATION,
            updateVars,
          );

          if (!result.projectMilestoneUpdate?.success) {
            throw new Error("Failed to update project milestone");
          }

          outputSuccess(result.projectMilestoneUpdate.projectMilestone);
        },
      ),
    );
}
