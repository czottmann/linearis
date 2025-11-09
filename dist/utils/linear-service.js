import { LinearClient } from "@linear/sdk";
import { getApiToken } from "./auth.js";
import { isUuid } from "./uuid.js";
import { parseIssueIdentifier } from "./identifier-parser.js";
import { multipleMatchesError, notFoundError } from "./error-messages.js";
const DEFAULT_CYCLE_PAGINATION_LIMIT = 250;
function resolveId(input) {
    if (isUuid(input)) {
        return input;
    }
    return input;
}
function buildEqualityFilter(field, value) {
    return {
        [field]: { eq: value },
    };
}
async function executeLinearQuery(queryFn, entityName, identifier) {
    const result = await queryFn();
    if (result.nodes.length === 0) {
        throw new Error(`${entityName} "${identifier}" not found`);
    }
    return result.nodes[0];
}
export class LinearService {
    client;
    constructor(apiToken) {
        this.client = new LinearClient({ apiKey: apiToken });
    }
    async resolveIssueId(issueId) {
        if (isUuid(issueId)) {
            return issueId;
        }
        const { teamKey, issueNumber } = parseIssueIdentifier(issueId);
        const issues = await this.client.issues({
            filter: {
                number: { eq: issueNumber },
                team: { key: { eq: teamKey } },
            },
            first: 1,
        });
        if (issues.nodes.length === 0) {
            throw new Error(`Issue with identifier "${issueId}" not found`);
        }
        return issues.nodes[0].id;
    }
    async getProjects() {
        const projects = await this.client.projects({
            first: 100,
            orderBy: "updatedAt",
            includeArchived: false,
        });
        const projectsWithData = await Promise.all(projects.nodes.map(async (project) => {
            const [teams, lead] = await Promise.all([
                project.teams(),
                project.lead,
            ]);
            return { project, teams, lead };
        }));
        return projectsWithData.map(({ project, teams, lead }) => ({
            id: project.id,
            name: project.name,
            description: project.description || undefined,
            state: project.state,
            progress: project.progress,
            teams: teams.nodes.map((team) => ({
                id: team.id,
                key: team.key,
                name: team.name,
            })),
            lead: lead
                ? {
                    id: lead.id,
                    name: lead.name,
                }
                : undefined,
            targetDate: project.targetDate ? String(project.targetDate) : undefined,
            createdAt: project.createdAt
                ? String(project.createdAt)
                : new Date().toISOString(),
            updatedAt: project.updatedAt
                ? String(project.updatedAt)
                : new Date().toISOString(),
        }));
    }
    async resolveTeamId(teamKeyOrNameOrId) {
        const resolved = resolveId(teamKeyOrNameOrId);
        if (resolved === teamKeyOrNameOrId && isUuid(teamKeyOrNameOrId)) {
            return teamKeyOrNameOrId;
        }
        try {
            const team = await executeLinearQuery(() => this.client.teams({
                filter: buildEqualityFilter("key", teamKeyOrNameOrId),
                first: 1,
            }), "Team", teamKeyOrNameOrId);
            return team.id;
        }
        catch {
            const team = await executeLinearQuery(() => this.client.teams({
                filter: buildEqualityFilter("name", teamKeyOrNameOrId),
                first: 1,
            }), "Team", teamKeyOrNameOrId);
            return team.id;
        }
    }
    async resolveStateId(stateName, teamId) {
        if (isUuid(stateName)) {
            return stateName;
        }
        const filter = {
            name: { eqIgnoreCase: stateName },
        };
        if (teamId) {
            filter.team = { id: { eq: teamId } };
        }
        const states = await this.client.workflowStates({
            filter,
            first: 1,
        });
        if (states.nodes.length === 0) {
            const context = teamId ? ` for team ${teamId}` : "";
            throw new Error(`State "${stateName}"${context} not found`);
        }
        return states.nodes[0].id;
    }
    async getLabels(teamFilter) {
        const labels = [];
        if (teamFilter) {
            const teamId = await this.resolveTeamId(teamFilter);
            const team = await this.client.team(teamId);
            const teamLabels = await this.client.issueLabels({
                filter: { team: { id: { eq: teamId } } },
                first: 100,
            });
            for (const label of teamLabels.nodes) {
                if (label.isGroup) {
                    continue;
                }
                const parent = await label.parent;
                const labelData = {
                    id: label.id,
                    name: label.name,
                    color: label.color,
                    scope: "team",
                    team: {
                        id: team.id,
                        name: team.name,
                    },
                };
                if (parent) {
                    const parentLabel = await this.client.issueLabel(parent.id);
                    labelData.group = {
                        id: parent.id,
                        name: parentLabel.name,
                    };
                }
                labels.push(labelData);
            }
        }
        else {
            const allLabels = await this.client.issueLabels({
                first: 100,
            });
            for (const label of allLabels.nodes) {
                if (label.isGroup) {
                    continue;
                }
                const [team, parent] = await Promise.all([
                    label.team,
                    label.parent,
                ]);
                const labelData = {
                    id: label.id,
                    name: label.name,
                    color: label.color,
                    scope: team ? "team" : "workspace",
                };
                if (team) {
                    labelData.team = {
                        id: team.id,
                        name: team.name,
                    };
                }
                if (parent) {
                    const parentLabel = await this.client.issueLabel(parent.id);
                    labelData.group = {
                        id: parent.id,
                        name: parentLabel.name,
                    };
                }
                labels.push(labelData);
            }
        }
        return { labels };
    }
    async createComment(args) {
        const payload = await this.client.createComment({
            issueId: args.issueId,
            body: args.body,
        });
        if (!payload.success) {
            throw new Error("Failed to create comment");
        }
        const comment = await payload.comment;
        if (!comment) {
            throw new Error("Failed to retrieve created comment");
        }
        const user = await comment.user;
        if (!user) {
            throw new Error("Failed to retrieve comment user information");
        }
        return {
            id: comment.id,
            body: comment.body,
            user: {
                id: user.id,
                name: user.name,
            },
            createdAt: comment.createdAt.toISOString(),
            updatedAt: comment.updatedAt.toISOString(),
        };
    }
    async getCycles(teamFilter, activeOnly) {
        const filter = {};
        if (teamFilter) {
            const teamId = await this.resolveTeamId(teamFilter);
            filter.team = { id: { eq: teamId } };
        }
        if (activeOnly) {
            filter.isActive = { eq: true };
        }
        const cyclesConnection = await this.client.cycles({
            filter: Object.keys(filter).length > 0 ? filter : undefined,
            orderBy: "createdAt",
            first: DEFAULT_CYCLE_PAGINATION_LIMIT,
        });
        const cyclesWithData = await Promise.all(cyclesConnection.nodes.map(async (cycle) => {
            const team = await cycle.team;
            return {
                id: cycle.id,
                name: cycle.name,
                number: cycle.number,
                startsAt: cycle.startsAt ? String(cycle.startsAt) : undefined,
                endsAt: cycle.endsAt ? String(cycle.endsAt) : undefined,
                isActive: cycle.isActive,
                isPrevious: cycle.isPrevious,
                isNext: cycle.isNext,
                progress: cycle.progress,
                issueCountHistory: cycle.issueCountHistory,
                team: team
                    ? {
                        id: team.id,
                        key: team.key,
                        name: team.name,
                    }
                    : undefined,
            };
        }));
        return cyclesWithData;
    }
    async getCycleById(cycleId, issuesLimit = 50) {
        const cycle = await this.client.cycle(cycleId);
        const [team, issuesConnection] = await Promise.all([
            cycle.team,
            cycle.issues({ first: issuesLimit }),
        ]);
        const issues = [];
        for (const issue of issuesConnection.nodes) {
            const [state, assignee, issueTeam, project, labels] = await Promise.all([
                issue.state,
                issue.assignee,
                issue.team,
                issue.project,
                issue.labels(),
            ]);
            issues.push({
                id: issue.id,
                identifier: issue.identifier,
                title: issue.title,
                description: issue.description || undefined,
                priority: issue.priority,
                estimate: issue.estimate || undefined,
                state: state ? { id: state.id, name: state.name } : undefined,
                assignee: assignee
                    ? { id: assignee.id, name: assignee.name }
                    : undefined,
                team: issueTeam
                    ? { id: issueTeam.id, key: issueTeam.key, name: issueTeam.name }
                    : undefined,
                project: project ? { id: project.id, name: project.name } : undefined,
                labels: labels.nodes.map((label) => ({
                    id: label.id,
                    name: label.name,
                })),
                createdAt: issue.createdAt
                    ? String(issue.createdAt)
                    : new Date().toISOString(),
                updatedAt: issue.updatedAt
                    ? String(issue.updatedAt)
                    : new Date().toISOString(),
            });
        }
        return {
            id: cycle.id,
            name: cycle.name,
            number: cycle.number,
            startsAt: cycle.startsAt ? String(cycle.startsAt) : undefined,
            endsAt: cycle.endsAt ? String(cycle.endsAt) : undefined,
            isActive: cycle.isActive,
            progress: cycle.progress,
            issueCountHistory: cycle.issueCountHistory,
            team: team
                ? {
                    id: team.id,
                    key: team.key,
                    name: team.name,
                }
                : undefined,
            issues,
        };
    }
    async resolveCycleId(cycleNameOrId, teamFilter) {
        if (isUuid(cycleNameOrId)) {
            return cycleNameOrId;
        }
        const filter = {
            name: { eq: cycleNameOrId },
        };
        if (teamFilter) {
            const teamId = await this.resolveTeamId(teamFilter);
            filter.team = { id: { eq: teamId } };
        }
        const cyclesConnection = await this.client.cycles({
            filter,
            first: 10,
        });
        const cyclesData = cyclesConnection.nodes;
        const nodes = [];
        for (const cycle of cyclesData) {
            const team = await cycle.team;
            nodes.push({
                id: cycle.id,
                name: cycle.name,
                number: cycle.number,
                startsAt: cycle.startsAt ? String(cycle.startsAt) : undefined,
                isActive: cycle.isActive,
                isNext: cycle.isNext,
                isPrevious: cycle.isPrevious,
                team: team
                    ? { id: team.id, key: team.key, name: team.name }
                    : undefined,
            });
        }
        if (nodes.length === 0) {
            throw notFoundError("Cycle", cycleNameOrId, teamFilter ? `for team ${teamFilter}` : undefined);
        }
        let chosen = nodes.find((n) => n.isActive);
        if (!chosen)
            chosen = nodes.find((n) => n.isNext);
        if (!chosen)
            chosen = nodes.find((n) => n.isPrevious);
        if (!chosen && nodes.length === 1)
            chosen = nodes[0];
        if (!chosen) {
            const matches = nodes.map((n) => `${n.id} (${n.team?.key || "?"} / #${n.number} / ${n.startsAt})`);
            throw multipleMatchesError("cycle", cycleNameOrId, matches, "use an ID or scope with --team");
        }
        return chosen.id;
    }
    async resolveProjectId(projectNameOrId) {
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
}
export async function createLinearService(options) {
    const apiToken = await getApiToken(options);
    return new LinearService(apiToken);
}
