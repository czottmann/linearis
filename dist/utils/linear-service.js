import { LinearClient } from "@linear/sdk";
import { getApiToken } from "./auth.js";
import { isUuid } from "./uuid.js";
import { parseIssueIdentifier } from "./identifier-parser.js";
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
            targetDate: project.targetDate?.toISOString(),
            createdAt: project.createdAt?.toISOString() || new Date().toISOString(),
            updatedAt: project.updatedAt?.toISOString() || new Date().toISOString(),
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
}
export async function createLinearService(options) {
    const apiToken = await getApiToken(options);
    return new LinearService(apiToken);
}
