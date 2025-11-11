import { BATCH_RESOLVE_FOR_CREATE_QUERY, BATCH_RESOLVE_FOR_SEARCH_QUERY, BATCH_RESOLVE_FOR_UPDATE_QUERY, CREATE_ISSUE_MUTATION, FILTERED_SEARCH_ISSUES_QUERY, GET_ISSUE_BY_ID_QUERY, GET_ISSUE_BY_IDENTIFIER_QUERY, GET_ISSUES_QUERY, SEARCH_ISSUES_QUERY, UPDATE_ISSUE_MUTATION, } from "../queries/issues.js";
import { extractEmbeds } from "./embed-parser.js";
import { isUuid } from "./uuid.js";
import { parseIssueIdentifier, tryParseIssueIdentifier, } from "./identifier-parser.js";
export class GraphQLIssuesService {
    graphQLService;
    linearService;
    constructor(graphQLService, linearService) {
        this.graphQLService = graphQLService;
        this.linearService = linearService;
    }
    async getIssues(limit = 25) {
        const result = await this.graphQLService.rawRequest(GET_ISSUES_QUERY, {
            first: limit,
            orderBy: "updatedAt",
        });
        if (!result.issues?.nodes) {
            return [];
        }
        return result.issues.nodes.map((issue) => this.transformIssueData(issue));
    }
    async getIssueById(issueId) {
        let issueData;
        if (isUuid(issueId)) {
            const result = await this.graphQLService.rawRequest(GET_ISSUE_BY_ID_QUERY, {
                id: issueId,
            });
            if (!result.issue) {
                throw new Error(`Issue with ID "${issueId}" not found`);
            }
            issueData = result.issue;
        }
        else {
            const { teamKey, issueNumber } = parseIssueIdentifier(issueId);
            const result = await this.graphQLService.rawRequest(GET_ISSUE_BY_IDENTIFIER_QUERY, {
                teamKey,
                number: issueNumber,
            });
            if (!result.issues.nodes.length) {
                throw new Error(`Issue with identifier "${issueId}" not found`);
            }
            issueData = result.issues.nodes[0];
        }
        return this.transformIssueData(issueData);
    }
    async updateIssue(args, labelMode = "overwriting") {
        let resolvedIssueId = args.id;
        let currentIssueLabels = [];
        const resolveVariables = {};
        if (!isUuid(args.id)) {
            const { teamKey, issueNumber } = parseIssueIdentifier(args.id);
            resolveVariables.teamKey = teamKey;
            resolveVariables.issueNumber = issueNumber;
        }
        if (args.labelIds && Array.isArray(args.labelIds)) {
            const labelNames = args.labelIds.filter((id) => !isUuid(id));
            if (labelNames.length > 0) {
                resolveVariables.labelNames = labelNames;
            }
        }
        if (args.projectId && !isUuid(args.projectId)) {
            resolveVariables.projectName = args.projectId;
        }
        if (args.milestoneId && typeof args.milestoneId === "string" &&
            !isUuid(args.milestoneId)) {
            resolveVariables.milestoneName = args.milestoneId;
        }
        const resolveResult = await this.graphQLService.rawRequest(BATCH_RESOLVE_FOR_UPDATE_QUERY, resolveVariables);
        if (!isUuid(args.id)) {
            if (!resolveResult.issues.nodes.length) {
                throw new Error(`Issue with identifier "${args.id}" not found`);
            }
            resolvedIssueId = resolveResult.issues.nodes[0].id;
            currentIssueLabels = resolveResult.issues.nodes[0].labels.nodes.map((l) => l.id);
        }
        let finalLabelIds = args.labelIds;
        if (args.labelIds && Array.isArray(args.labelIds)) {
            const resolvedLabels = [];
            for (const labelIdOrName of args.labelIds) {
                if (isUuid(labelIdOrName)) {
                    resolvedLabels.push(labelIdOrName);
                }
                else {
                    const label = resolveResult.labels.nodes.find((l) => l.name === labelIdOrName);
                    if (!label) {
                        throw new Error(`Label "${labelIdOrName}" not found`);
                    }
                    resolvedLabels.push(label.id);
                }
            }
            if (labelMode === "adding") {
                finalLabelIds = [
                    ...new Set([...currentIssueLabels, ...resolvedLabels]),
                ];
            }
            else {
                finalLabelIds = resolvedLabels;
            }
        }
        let finalProjectId = args.projectId;
        if (args.projectId && !isUuid(args.projectId)) {
            if (!resolveResult.projects.nodes.length) {
                throw new Error(`Project "${args.projectId}" not found`);
            }
            finalProjectId = resolveResult.projects.nodes[0].id;
        }
        let finalMilestoneId = args.milestoneId;
        if (args.milestoneId && typeof args.milestoneId === "string" &&
            !isUuid(args.milestoneId)) {
            if (args.projectId &&
                resolveResult.projects?.nodes[0]?.projectMilestones?.nodes) {
                const projectMilestone = resolveResult.projects.nodes[0]
                    .projectMilestones.nodes
                    .find((m) => m.name === args.milestoneId);
                if (projectMilestone) {
                    finalMilestoneId = projectMilestone.id;
                }
            }
            if (finalMilestoneId && !isUuid(finalMilestoneId) &&
                resolveResult.issues?.nodes[0]?.project?.projectMilestones?.nodes) {
                const issueMilestone = resolveResult.issues.nodes[0].project
                    .projectMilestones.nodes
                    .find((m) => m.name === args.milestoneId);
                if (issueMilestone) {
                    finalMilestoneId = issueMilestone.id;
                }
            }
            if (finalMilestoneId && !isUuid(finalMilestoneId) &&
                resolveResult.milestones?.nodes?.length) {
                finalMilestoneId = resolveResult.milestones.nodes[0].id;
            }
            if (!finalMilestoneId || !isUuid(finalMilestoneId)) {
                throw new Error(`Milestone "${args.milestoneId}" not found`);
            }
        }
        let finalCycleId = args.cycleId;
        if (args.cycleId !== undefined && args.cycleId !== null) {
            if (args.cycleId === null) {
                finalCycleId = null;
            }
            else if (typeof args.cycleId === "string" && !isUuid(args.cycleId)) {
                let teamIdForCycle = resolveResult.issues?.nodes?.[0]?.team?.id;
                if (!teamIdForCycle && resolvedIssueId && isUuid(resolvedIssueId)) {
                    const issueTeamRes = await this.graphQLService.rawRequest(`query GetIssueTeam($issueId: String!) { issue(id: $issueId) { team { id } } }`, { issueId: resolvedIssueId });
                    teamIdForCycle = issueTeamRes.issue?.team?.id;
                }
                if (teamIdForCycle) {
                    const scopedRes = await this.graphQLService.rawRequest(`query FindCycleScoped($name: String!, $teamId: ID!) { cycles(filter: { and: [ { name: { eq: $name } }, { team: { id: { eq: $teamId } } } ] }, first: 10) { nodes { id name number startsAt isActive isNext isPrevious team { id key } } } }`, { name: args.cycleId, teamId: teamIdForCycle });
                    const scopedNodes = scopedRes.cycles?.nodes || [];
                    if (scopedNodes.length === 1) {
                        finalCycleId = scopedNodes[0].id;
                    }
                    else if (scopedNodes.length > 1) {
                        let chosen = scopedNodes.find((n) => n.isActive) ||
                            scopedNodes.find((n) => n.isNext) ||
                            scopedNodes.find((n) => n.isPrevious);
                        if (chosen)
                            finalCycleId = chosen.id;
                        else {
                            throw new Error(`Ambiguous cycle name "${args.cycleId}" for team ${teamIdForCycle}. Use ID or disambiguate.`);
                        }
                    }
                }
                if (!finalCycleId) {
                    const globalRes = await this.graphQLService.rawRequest(`query FindCycleGlobal($name: String!) { cycles(filter: { name: { eq: $name } }, first: 10) { nodes { id name number startsAt isActive isNext isPrevious team { id key } } } }`, { name: args.cycleId });
                    const globalNodes = globalRes.cycles?.nodes || [];
                    if (globalNodes.length === 1) {
                        finalCycleId = globalNodes[0].id;
                    }
                    else if (globalNodes.length > 1) {
                        let chosen = globalNodes.find((n) => n.isActive) ||
                            globalNodes.find((n) => n.isNext) ||
                            globalNodes.find((n) => n.isPrevious);
                        if (chosen)
                            finalCycleId = chosen.id;
                        else {
                            throw new Error(`Ambiguous cycle name "${args.cycleId}" — multiple matches found across teams. Use ID or scope with team.`);
                        }
                    }
                }
                if (!finalCycleId) {
                    throw new Error(`Cycle "${args.cycleId}" not found`);
                }
            }
        }
        let resolvedStateId = args.stateId;
        if (args.stateId && !isUuid(args.stateId)) {
            let teamId;
            if (resolvedIssueId && isUuid(resolvedIssueId)) {
                const issueResult = await this.graphQLService.rawRequest(`query GetIssueTeam($issueId: String!) {
            issue(id: $issueId) {
              team { id }
            }
          }`, { issueId: resolvedIssueId });
                teamId = issueResult.issue?.team?.id;
            }
            resolvedStateId = await this.linearService.resolveStateId(args.stateId, teamId);
        }
        const updateInput = {};
        if (args.title !== undefined)
            updateInput.title = args.title;
        if (args.description !== undefined) {
            updateInput.description = args.description;
        }
        if (resolvedStateId !== undefined)
            updateInput.stateId = resolvedStateId;
        if (args.priority !== undefined)
            updateInput.priority = args.priority;
        if (args.assigneeId !== undefined) {
            updateInput.assigneeId = args.assigneeId;
        }
        if (finalProjectId !== undefined)
            updateInput.projectId = finalProjectId;
        if (finalCycleId !== undefined)
            updateInput.cycleId = finalCycleId;
        if (args.estimate !== undefined)
            updateInput.estimate = args.estimate;
        if (args.parentId !== undefined)
            updateInput.parentId = args.parentId;
        if (finalMilestoneId !== undefined) {
            updateInput.projectMilestoneId = finalMilestoneId;
        }
        if (finalLabelIds !== undefined) {
            updateInput.labelIds = finalLabelIds;
        }
        const updateResult = await this.graphQLService.rawRequest(UPDATE_ISSUE_MUTATION, {
            id: resolvedIssueId,
            input: updateInput,
        });
        if (!updateResult.issueUpdate.success) {
            throw new Error("Failed to update issue");
        }
        if (!updateResult.issueUpdate.issue) {
            throw new Error("Failed to retrieve updated issue");
        }
        return this.transformIssueData(updateResult.issueUpdate.issue);
    }
    async createIssue(args) {
        const resolveVariables = {};
        if (args.teamId && !isUuid(args.teamId)) {
            if (args.teamId.length <= 5 && /^[A-Z]+$/.test(args.teamId)) {
                resolveVariables.teamKey = args.teamId;
            }
            else {
                resolveVariables.teamName = args.teamId;
            }
        }
        if (args.projectId && !isUuid(args.projectId)) {
            resolveVariables.projectName = args.projectId;
        }
        if (args.milestoneId && !isUuid(args.milestoneId)) {
            resolveVariables.milestoneName = args.milestoneId;
        }
        if (args.labelIds && Array.isArray(args.labelIds)) {
            const labelNames = args.labelIds.filter((id) => !isUuid(id));
            if (labelNames.length > 0) {
                resolveVariables.labelNames = labelNames;
            }
        }
        if (args.parentId && !isUuid(args.parentId)) {
            const parentParsed = tryParseIssueIdentifier(args.parentId);
            if (parentParsed) {
                resolveVariables.parentTeamKey = parentParsed.teamKey;
                resolveVariables.parentIssueNumber = parentParsed.issueNumber;
            }
        }
        let resolveResult = {};
        if (Object.keys(resolveVariables).length > 0) {
            resolveResult = await this.graphQLService.rawRequest(BATCH_RESOLVE_FOR_CREATE_QUERY, resolveVariables);
        }
        let finalTeamId = args.teamId;
        if (args.teamId && !isUuid(args.teamId)) {
            if (!resolveResult.teams?.nodes?.length) {
                throw new Error(`Team "${args.teamId}" not found`);
            }
            finalTeamId = resolveResult.teams.nodes[0].id;
        }
        else if (!finalTeamId) {
        }
        let finalProjectId = args.projectId;
        if (args.projectId && !isUuid(args.projectId)) {
            if (!resolveResult.projects?.nodes?.length) {
                throw new Error(`Project "${args.projectId}" not found`);
            }
            finalProjectId = resolveResult.projects.nodes[0].id;
        }
        let finalLabelIds = args.labelIds;
        if (args.labelIds && Array.isArray(args.labelIds)) {
            const resolvedLabels = [];
            for (const labelIdOrName of args.labelIds) {
                if (isUuid(labelIdOrName)) {
                    resolvedLabels.push(labelIdOrName);
                }
                else {
                    const label = resolveResult.labels?.nodes?.find((l) => l.name === labelIdOrName);
                    if (!label) {
                        throw new Error(`Label "${labelIdOrName}" not found`);
                    }
                    resolvedLabels.push(label.id);
                }
            }
            finalLabelIds = resolvedLabels;
        }
        let finalParentId = args.parentId;
        if (args.parentId && !isUuid(args.parentId)) {
            if (!resolveResult.parentIssues?.nodes?.length) {
                throw new Error(`Parent issue "${args.parentId}" not found`);
            }
            finalParentId = resolveResult.parentIssues.nodes[0].id;
        }
        let finalMilestoneId = args.milestoneId;
        if (args.milestoneId && !isUuid(args.milestoneId)) {
            if (resolveResult.projects?.nodes[0]?.projectMilestones?.nodes) {
                const projectMilestone = resolveResult.projects.nodes[0]
                    .projectMilestones.nodes
                    .find((m) => m.name === args.milestoneId);
                if (projectMilestone) {
                    finalMilestoneId = projectMilestone.id;
                }
            }
            if (!finalMilestoneId && resolveResult.milestones?.nodes?.length) {
                finalMilestoneId = resolveResult.milestones.nodes[0].id;
            }
            if (!finalMilestoneId) {
                const hint = finalProjectId
                    ? ` in project`
                    : ` (consider specifying --project)`;
                throw new Error(`Milestone "${args.milestoneId}" not found${hint}`);
            }
        }
        let finalCycleId = args.cycleId;
        if (args.cycleId && typeof args.cycleId === "string" && !isUuid(args.cycleId)) {
            if (finalTeamId) {
                const scopedRes = await this.graphQLService.rawRequest(`query FindCycleScoped($name: String!, $teamId: ID!) { cycles(filter: { and: [ { name: { eq: $name } }, { team: { id: { eq: $teamId } } } ] }, first: 1) { nodes { id name } } }`, { name: args.cycleId, teamId: finalTeamId });
                if (scopedRes.cycles?.nodes?.length) {
                    finalCycleId = scopedRes.cycles.nodes[0].id;
                }
            }
            if (!finalCycleId) {
                const globalRes = await this.graphQLService.rawRequest(`query FindCycleGlobal($name: String!) { cycles(filter: { name: { eq: $name } }, first: 1) { nodes { id name } } }`, { name: args.cycleId });
                if (globalRes.cycles?.nodes?.length) {
                    finalCycleId = globalRes.cycles.nodes[0].id;
                }
            }
            if (!finalCycleId) {
                throw new Error(`Cycle "${args.cycleId}" not found`);
            }
        }
        let resolvedStateId = args.stateId;
        if (args.stateId && !isUuid(args.stateId)) {
            resolvedStateId = await this.linearService.resolveStateId(args.stateId, finalTeamId);
        }
        const createInput = {
            title: args.title,
        };
        if (finalTeamId)
            createInput.teamId = finalTeamId;
        if (args.description)
            createInput.description = args.description;
        if (args.assigneeId)
            createInput.assigneeId = args.assigneeId;
        if (args.priority !== undefined)
            createInput.priority = args.priority;
        if (finalProjectId)
            createInput.projectId = finalProjectId;
        if (resolvedStateId)
            createInput.stateId = resolvedStateId;
        if (finalLabelIds && finalLabelIds.length > 0) {
            createInput.labelIds = finalLabelIds;
        }
        if (args.estimate !== undefined)
            createInput.estimate = args.estimate;
        if (finalParentId)
            createInput.parentId = finalParentId;
        if (finalMilestoneId)
            createInput.projectMilestoneId = finalMilestoneId;
        if (finalCycleId)
            createInput.cycleId = finalCycleId;
        const createResult = await this.graphQLService.rawRequest(CREATE_ISSUE_MUTATION, {
            input: createInput,
        });
        if (!createResult.issueCreate.success) {
            throw new Error("Failed to create issue");
        }
        if (!createResult.issueCreate.issue) {
            throw new Error("Failed to retrieve created issue");
        }
        return this.transformIssueData(createResult.issueCreate.issue);
    }
    async searchIssues(args) {
        const resolveVariables = {};
        let needsResolve = false;
        if (args.teamId && !isUuid(args.teamId)) {
            needsResolve = true;
            if (args.teamId.length <= 5 && /^[A-Z]+$/.test(args.teamId)) {
                resolveVariables.teamKey = args.teamId;
            }
            else {
                resolveVariables.teamName = args.teamId;
            }
        }
        if (args.projectId && !isUuid(args.projectId)) {
            needsResolve = true;
            resolveVariables.projectName = args.projectId;
        }
        if (args.assigneeId && !isUuid(args.assigneeId)) {
            needsResolve = true;
            if (args.assigneeId.includes("@")) {
                resolveVariables.assigneeEmail = args.assigneeId;
            }
        }
        let resolveResult = {};
        if (needsResolve) {
            resolveResult = await this.graphQLService.rawRequest(BATCH_RESOLVE_FOR_SEARCH_QUERY, resolveVariables);
        }
        let finalTeamId = args.teamId;
        if (args.teamId && !isUuid(args.teamId)) {
            if (!resolveResult.teams?.nodes?.length) {
                throw new Error(`Team "${args.teamId}" not found`);
            }
            finalTeamId = resolveResult.teams.nodes[0].id;
        }
        let finalProjectId = args.projectId;
        if (args.projectId && !isUuid(args.projectId)) {
            if (!resolveResult.projects?.nodes?.length) {
                throw new Error(`Project "${args.projectId}" not found`);
            }
            finalProjectId = resolveResult.projects.nodes[0].id;
        }
        let finalAssigneeId = args.assigneeId;
        if (args.assigneeId && !isUuid(args.assigneeId) &&
            args.assigneeId.includes("@")) {
            if (!resolveResult.users?.nodes?.length) {
                throw new Error(`User "${args.assigneeId}" not found`);
            }
            finalAssigneeId = resolveResult.users.nodes[0].id;
        }
        if (args.query) {
            const searchResult = await this.graphQLService.rawRequest(SEARCH_ISSUES_QUERY, {
                term: args.query,
                first: args.limit || 10,
            });
            if (!searchResult.searchIssues?.nodes) {
                return [];
            }
            let results = searchResult.searchIssues.nodes.map((issue) => this.transformIssueData(issue));
            if (finalTeamId) {
                results = results.filter((issue) => issue.team.id === finalTeamId);
            }
            if (finalAssigneeId) {
                results = results.filter((issue) => issue.assignee?.id === finalAssigneeId);
            }
            if (finalProjectId) {
                results = results.filter((issue) => issue.project?.id === finalProjectId);
            }
            if (args.states && args.states.length > 0) {
                results = results.filter((issue) => args.states.includes(issue.state.name));
            }
            return results;
        }
        else {
            const filter = {};
            if (finalTeamId)
                filter.team = { id: { eq: finalTeamId } };
            if (finalAssigneeId)
                filter.assignee = { id: { eq: finalAssigneeId } };
            if (finalProjectId)
                filter.project = { id: { eq: finalProjectId } };
            if (args.states && args.states.length > 0) {
                filter.state = { name: { in: args.states } };
            }
            const searchResult = await this.graphQLService.rawRequest(FILTERED_SEARCH_ISSUES_QUERY, {
                first: args.limit || 10,
                filter: Object.keys(filter).length > 0 ? filter : undefined,
                orderBy: "updatedAt",
            });
            if (!searchResult.issues?.nodes) {
                return [];
            }
            return searchResult.issues.nodes.map((issue) => this.transformIssueData(issue));
        }
    }
    transformIssueData(issue) {
        return {
            id: issue.id,
            identifier: issue.identifier,
            title: issue.title,
            description: issue.description || undefined,
            embeds: issue.description ? extractEmbeds(issue.description) : undefined,
            state: {
                id: issue.state.id,
                name: issue.state.name,
            },
            assignee: issue.assignee
                ? {
                    id: issue.assignee.id,
                    name: issue.assignee.name,
                }
                : undefined,
            team: {
                id: issue.team.id,
                key: issue.team.key,
                name: issue.team.name,
            },
            project: issue.project
                ? {
                    id: issue.project.id,
                    name: issue.project.name,
                }
                : undefined,
            cycle: issue.cycle
                ? {
                    id: issue.cycle.id,
                    name: issue.cycle.name,
                    number: issue.cycle.number,
                }
                : undefined,
            projectMilestone: issue.projectMilestone
                ? {
                    id: issue.projectMilestone.id,
                    name: issue.projectMilestone.name,
                    targetDate: issue.projectMilestone.targetDate || undefined,
                }
                : undefined,
            priority: issue.priority,
            estimate: issue.estimate || undefined,
            labels: issue.labels.nodes.map((label) => ({
                id: label.id,
                name: label.name,
            })),
            parentIssue: issue.parent
                ? {
                    id: issue.parent.id,
                    identifier: issue.parent.identifier,
                    title: issue.parent.title,
                }
                : undefined,
            subIssues: issue.children?.nodes.map((child) => ({
                id: child.id,
                identifier: child.identifier,
                title: child.title,
            })) || undefined,
            comments: issue.comments?.nodes.map((comment) => ({
                id: comment.id,
                body: comment.body,
                embeds: extractEmbeds(comment.body),
                user: {
                    id: comment.user.id,
                    name: comment.user.name,
                },
                createdAt: comment.createdAt instanceof Date
                    ? comment.createdAt.toISOString()
                    : (comment.createdAt
                        ? new Date(comment.createdAt).toISOString()
                        : new Date().toISOString()),
                updatedAt: comment.updatedAt instanceof Date
                    ? comment.updatedAt.toISOString()
                    : (comment.updatedAt
                        ? new Date(comment.updatedAt).toISOString()
                        : new Date().toISOString()),
            })) || [],
            createdAt: issue.createdAt instanceof Date
                ? issue.createdAt.toISOString()
                : (issue.createdAt
                    ? new Date(issue.createdAt).toISOString()
                    : new Date().toISOString()),
            updatedAt: issue.updatedAt instanceof Date
                ? issue.updatedAt.toISOString()
                : (issue.updatedAt
                    ? new Date(issue.updatedAt).toISOString()
                    : new Date().toISOString()),
        };
    }
}
