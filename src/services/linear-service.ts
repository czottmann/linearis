/**
`LinearService` was taken wholesale from
https://github.com/tacticlaunch/mcp-linear/blob/fdfb7fdd26e9b42182d0768be1d441accd4c9e01/src/services/linear-service.ts

I'd like to thank the maintainers for releasing it under the MIT License, you're
stars!

> MIT License
>
> Copyright (c) 2025 Alexey Elizarov
>
> Permission is hereby granted, free of charge, to any person obtaining a copy
> of this software and associated documentation files (the “Software”), to deal
> in the Software without restriction, including without limitation the rights
> to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
> copies of the Software, and to permit persons to whom the Software is
> furnished to do so, subject to the following conditions:
>
> The above copyright notice and this permission notice shall be included in all
> copies or substantial portions of the Software.
>
> THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
> IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
> FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
> AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
> LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
> OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
> SOFTWARE.

*/

import { LinearClient } from '@linear/sdk';

// Define Linear API service
export class LinearService {
  private client: LinearClient;

  constructor(client: LinearClient) {
    this.client = client;
  }

  async getUserInfo() {
    const viewer = await this.client.viewer;
    return {
      id: viewer.id,
      name: viewer.name,
      email: viewer.email,
      displayName: viewer.displayName,
      active: viewer.active,
    };
  }

  async getOrganizationInfo() {
    const organization = await this.client.organization;
    return {
      id: organization.id,
      name: organization.name,
      urlKey: organization.urlKey,
      logoUrl: organization.logoUrl,
      createdAt: organization.createdAt,
      // Include subscription details if available
      subscription: organization.subscription || null,
    };
  }

  async getAllUsers() {
    const users = await this.client.users();
    return users.nodes.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      displayName: user.displayName,
      active: user.active,
    }));
  }

  async getLabels() {
    const labels = await this.client.issueLabels();
    return Promise.all(
      labels.nodes.map(async (label) => {
        const teamData = label.team ? await label.team : null;

        return {
          id: label.id,
          name: label.name,
          color: label.color,
          description: label.description,
          team: teamData
            ? {
              id: teamData.id,
              name: teamData.name,
            }
            : null,
        };
      }),
    );
  }

  async getTeams() {
    const teams = await this.client.teams();
    return teams.nodes.map((team) => ({
      id: team.id,
      name: team.name,
      key: team.key,
      description: team.description,
    }));
  }

  async getProjects() {
    const projects = await this.client.projects();
    return Promise.all(
      projects.nodes.map(async (project) => {
        // We need to fetch teams using the relationship
        const teams = await project.teams();

        return {
          id: project.id,
          name: project.name,
          description: project.description,
          content: project.content,
          state: project.state,
          teams: teams.nodes.map((team) => ({
            id: team.id,
            name: team.name,
          })),
        };
      }),
    );
  }

  async getIssues(limit = 25) {
    const issues = await this.client.issues({ first: limit });
    return Promise.all(
      issues.nodes.map(async (issue) => {
        // For relations, we need to fetch the objects
        const teamData = issue.team ? await issue.team : null;
        const assigneeData = issue.assignee ? await issue.assignee : null;
        const projectData = issue.project ? await issue.project : null;
        const cycleData = issue.cycle ? await issue.cycle : null;
        const parentData = issue.parent ? await issue.parent : null;

        // Get labels
        const labels = await issue.labels();
        const labelsList = labels.nodes.map((label) => ({
          id: label.id,
          name: label.name,
          color: label.color,
        }));

        return {
          id: issue.id,
          title: issue.title,
          description: issue.description,
          state: issue.state,
          priority: issue.priority,
          estimate: issue.estimate,
          dueDate: issue.dueDate,
          team: teamData
            ? {
              id: teamData.id,
              name: teamData.name,
            }
            : null,
          assignee: assigneeData
            ? {
              id: assigneeData.id,
              name: assigneeData.name,
            }
            : null,
          project: projectData
            ? {
              id: projectData.id,
              name: projectData.name,
            }
            : null,
          cycle: cycleData
            ? {
              id: cycleData.id,
              name: cycleData.name,
            }
            : null,
          parent: parentData
            ? {
              id: parentData.id,
              title: parentData.title,
            }
            : null,
          labels: labelsList,
          sortOrder: issue.sortOrder,
          createdAt: issue.createdAt,
          updatedAt: issue.updatedAt,
          url: issue.url,
        };
      }),
    );
  }

  async getIssueById(id: string) {
    const issue = await this.client.issue(id);

    if (!issue) {
      throw new Error(`Issue with ID ${id} not found`);
    }

    // For relations, we need to fetch the objects
    const teamData = issue.team ? await issue.team : null;
    const assigneeData = issue.assignee ? await issue.assignee : null;
    const projectData = issue.project ? await issue.project : null;
    const cycleData = issue.cycle ? await issue.cycle : null;
    const parentData = issue.parent ? await issue.parent : null;

    // Get comments
    const comments = await issue.comments();
    const commentsList = await Promise.all(
      comments.nodes.map(async (comment) => {
        const userData = comment.user ? await comment.user : null;

        return {
          id: comment.id,
          body: comment.body,
          createdAt: comment.createdAt,
          user: userData
            ? {
              id: userData.id,
              name: userData.name,
            }
            : null,
        };
      }),
    );

    // Get labels
    const labels = await issue.labels();
    const labelsList = labels.nodes.map((label) => ({
      id: label.id,
      name: label.name,
      color: label.color,
    }));

    return {
      id: issue.id,
      title: issue.title,
      description: issue.description,
      state: issue.state,
      priority: issue.priority,
      estimate: issue.estimate,
      dueDate: issue.dueDate,
      team: teamData
        ? {
          id: teamData.id,
          name: teamData.name,
        }
        : null,
      assignee: assigneeData
        ? {
          id: assigneeData.id,
          name: assigneeData.name,
        }
        : null,
      project: projectData
        ? {
          id: projectData.id,
          name: projectData.name,
        }
        : null,
      cycle: cycleData
        ? {
          id: cycleData.id,
          name: cycleData.name,
        }
        : null,
      parent: parentData
        ? {
          id: parentData.id,
          title: parentData.title,
        }
        : null,
      labels: labelsList,
      sortOrder: issue.sortOrder,
      createdAt: issue.createdAt,
      updatedAt: issue.updatedAt,
      url: issue.url,
      comments: commentsList,
    };
  }

  async searchIssues(args: {
    query?: string;
    teamId?: string;
    assigneeId?: string;
    projectId?: string;
    states?: string[];
    limit?: number;
  }) {
    try {
      // Build filter object
      const filter: any = {};

      if (args.teamId) {
        filter.team = { id: { eq: args.teamId } };
      }

      if (args.assigneeId) {
        filter.assignee = { id: { eq: args.assigneeId } };
      }

      if (args.projectId) {
        filter.project = { id: { eq: args.projectId } };
      }

      // Handle state filtering
      if (args.states && args.states.length > 0) {
        // First, get all workflow states to map names to IDs if needed
        let stateIds: string[] = [];

        if (args.teamId) {
          // If we have a teamId, get workflow states for that team
          const workflowStates = await this.getWorkflowStates(args.teamId);

          // Map state names to IDs
          for (const stateName of args.states) {
            const matchingState = workflowStates.find(
              (state) => state.name.toLowerCase() === stateName.toLowerCase(),
            );

            if (matchingState) {
              stateIds.push(matchingState.id);
            }
          }
        } else {
          // If no teamId, we need to get all teams and their workflow states
          const teams = await this.getTeams();

          for (const team of teams) {
            const workflowStates = await this.getWorkflowStates(team.id);

            // Map state names to IDs
            for (const stateName of args.states) {
              const matchingState = workflowStates.find(
                (state) => state.name.toLowerCase() === stateName.toLowerCase(),
              );

              if (matchingState) {
                stateIds.push(matchingState.id);
              }
            }
          }
        }

        // If we found matching state IDs, filter by them
        if (stateIds.length > 0) {
          filter.state = { id: { in: stateIds } };
        }
      }

      // Handle text search
      let searchFilter = filter;
      if (args.query) {
        searchFilter = {
          ...filter,
          or: [{ title: { contains: args.query } }, { description: { contains: args.query } }],
        };
      }

      // Execute the search
      const issues = await this.client.issues({
        first: args.limit || 10,
        filter: searchFilter,
      });

      // Process the results
      return Promise.all(
        issues.nodes.map(async (issue) => {
          // For relations, we need to fetch the objects
          const teamData = issue.team ? await issue.team : null;
          const assigneeData = issue.assignee ? await issue.assignee : null;
          const projectData = issue.project ? await issue.project : null;
          const cycleData = issue.cycle ? await issue.cycle : null;
          const parentData = issue.parent ? await issue.parent : null;

          // Get labels
          const labels = await issue.labels();
          const labelsList = labels.nodes.map((label) => ({
            id: label.id,
            name: label.name,
            color: label.color,
          }));

          // Get state data
          const stateData = issue.state ? await issue.state : null;

          return {
            id: issue.id,
            title: issue.title,
            description: issue.description,
            state: stateData
              ? {
                id: stateData.id,
                name: stateData.name,
                color: stateData.color,
                type: stateData.type,
              }
              : null,
            priority: issue.priority,
            estimate: issue.estimate,
            dueDate: issue.dueDate,
            team: teamData
              ? {
                id: teamData.id,
                name: teamData.name,
              }
              : null,
            assignee: assigneeData
              ? {
                id: assigneeData.id,
                name: assigneeData.name,
              }
              : null,
            project: projectData
              ? {
                id: projectData.id,
                name: projectData.name,
              }
              : null,
            cycle: cycleData
              ? {
                id: cycleData.id,
                name: cycleData.name,
              }
              : null,
            parent: parentData
              ? {
                id: parentData.id,
                title: parentData.title,
              }
              : null,
            labels: labelsList,
            sortOrder: issue.sortOrder,
            createdAt: issue.createdAt,
            updatedAt: issue.updatedAt,
            url: issue.url,
          };
        }),
      );
    } catch (error) {
      console.error('Error searching issues:', error);
      throw error;
    }
  }

  async createIssue(args: {
    title: string;
    description?: string;
    teamId: string;
    assigneeId?: string;
    priority?: number;
    projectId?: string;
    cycleId?: string;
    estimate?: number;
    dueDate?: string;
    labelIds?: string[];
    parentId?: string;
    subscriberIds?: string[];
    stateId?: string;
    templateId?: string;
    sortOrder?: number;
  }) {
    const createdIssue = await this.client.createIssue({
      title: args.title,
      description: args.description,
      teamId: args.teamId,
      assigneeId: args.assigneeId,
      priority: args.priority,
      projectId: args.projectId,
      cycleId: args.cycleId,
      estimate: args.estimate,
      dueDate: args.dueDate,
      labelIds: args.labelIds,
      parentId: args.parentId,
      subscriberIds: args.subscriberIds,
      stateId: args.stateId,
      templateId: args.templateId,
      sortOrder: args.sortOrder,
    });

    // Access the issue from the payload
    if (createdIssue.success && createdIssue.issue) {
      const issueData = await createdIssue.issue;
      return {
        id: issueData.id,
        title: issueData.title,
        description: issueData.description,
        url: issueData.url,
      };
    } else {
      throw new Error('Failed to create issue');
    }
  }

  async updateIssue(args: {
    id: string;
    title?: string;
    description?: string;
    stateId?: string;
    priority?: number;
    projectId?: string;
    assigneeId?: string;
    cycleId?: string;
    estimate?: number;
    dueDate?: string;
    labelIds?: string[];
    addedLabelIds?: string[];
    removedLabelIds?: string[];
    parentId?: string;
    subscriberIds?: string[];
    teamId?: string;
    sortOrder?: number;
  }) {
    const updatedIssue = await this.client.updateIssue(args.id, {
      title: args.title,
      description: args.description,
      stateId: args.stateId,
      priority: args.priority,
      projectId: args.projectId,
      assigneeId: args.assigneeId,
      cycleId: args.cycleId,
      estimate: args.estimate,
      dueDate: args.dueDate,
      labelIds: args.labelIds,
      addedLabelIds: args.addedLabelIds,
      removedLabelIds: args.removedLabelIds,
      parentId: args.parentId,
      subscriberIds: args.subscriberIds,
      teamId: args.teamId,
      sortOrder: args.sortOrder,
    });

    if (updatedIssue.success && updatedIssue.issue) {
      const issueData = await updatedIssue.issue;
      return {
        id: issueData.id,
        title: issueData.title,
        description: issueData.description,
        url: issueData.url,
      };
    } else {
      throw new Error('Failed to update issue');
    }
  }

  async createComment(args: { issueId: string; body: string; parentId?: string }) {
    const createdComment = await this.client.createComment({
      issueId: args.issueId,
      body: args.body,
      parentId: args.parentId,
    });

    if (createdComment.success && createdComment.comment) {
      const commentData = await createdComment.comment;
      const parent = commentData.parent ? await commentData.parent : null;
      return {
        id: commentData.id,
        body: commentData.body,
        url: commentData.url,
        parentId: parent?.id,
      };
    } else {
      throw new Error('Failed to create comment');
    }
  }

  async createProject(args: {
    name: string;
    description?: string;
    content?: string;
    teamIds: string[] | string;
    state?: string;
    startDate?: string;
    targetDate?: string;
    leadId?: string;
    memberIds?: string[] | string;
    sortOrder?: number;
    icon?: string;
    color?: string;
  }) {
    const teamIds = Array.isArray(args.teamIds) ? args.teamIds : [args.teamIds];
    const memberIds = args.memberIds
      ? Array.isArray(args.memberIds)
        ? args.memberIds
        : [args.memberIds]
      : undefined;

    const createdProject = await this.client.createProject({
      name: args.name,
      description: args.description,
      content: args.content,
      teamIds: teamIds,
      state: args.state,
      startDate: args.startDate ? new Date(args.startDate) : undefined,
      targetDate: args.targetDate ? new Date(args.targetDate) : undefined,
      leadId: args.leadId,
      memberIds: memberIds,
      sortOrder: args.sortOrder,
      icon: args.icon,
      color: args.color,
    });

    if (createdProject.success && createdProject.project) {
      const projectData = await createdProject.project;
      const leadData = projectData.lead ? await projectData.lead : null;

      return {
        id: projectData.id,
        name: projectData.name,
        description: projectData.description,
        content: projectData.content,
        state: projectData.state,
        startDate: projectData.startDate,
        targetDate: projectData.targetDate,
        lead: leadData
          ? {
            id: leadData.id,
            name: leadData.name,
          }
          : null,
        icon: projectData.icon,
        color: projectData.color,
        url: projectData.url,
      };
    } else {
      throw new Error('Failed to create project');
    }
  }

  /**
   * Adds a label to an issue
   * @param issueId The ID or identifier of the issue
   * @param labelId The ID of the label to add
   * @returns Success status and IDs
   */
  async addIssueLabel(issueId: string, labelId: string) {
    // Get the issue
    const issue = await this.client.issue(issueId);

    if (!issue) {
      throw new Error(`Issue not found: ${issueId}`);
    }

    // Get the current labels
    const currentLabels = await issue.labels();
    const currentLabelIds = currentLabels.nodes.map((label) => label.id);

    // Add the new label ID if it's not already present
    if (!currentLabelIds.includes(labelId)) {
      await issue.update({
        labelIds: [...currentLabelIds, labelId],
      });
    }

    return {
      success: true,
      issueId: issue.id,
      labelId,
    };
  }

  /**
   * Removes a label from an issue
   * @param issueId The ID or identifier of the issue
   * @param labelId The ID of the label to remove
   * @returns Success status and IDs
   */
  async removeIssueLabel(issueId: string, labelId: string) {
    // Get the issue
    const issue = await this.client.issue(issueId);

    if (!issue) {
      throw new Error(`Issue not found: ${issueId}`);
    }

    // Get the current labels
    const currentLabels = await issue.labels();
    const currentLabelIds = currentLabels.nodes.map((label) => label.id);

    // Filter out the label ID to remove
    const updatedLabelIds = currentLabelIds.filter((id) => id !== labelId);

    // Only update if the label was actually present
    if (currentLabelIds.length !== updatedLabelIds.length) {
      await issue.update({
        labelIds: updatedLabelIds,
      });
    }

    return {
      success: true,
      issueId: issue.id,
      labelId,
    };
  }

  /**
   * Assigns an issue to a user
   */
  async assignIssue(issueId: string, assigneeId: string) {
    try {
      // Get the issue
      const issue = await this.client.issue(issueId);
      if (!issue) {
        throw new Error(`Issue with ID ${issueId} not found`);
      }

      // Get the user to assign
      const user = assigneeId ? await this.client.user(assigneeId) : null;

      // Update the issue with the new assignee
      const updatedIssue = await issue.update({
        assigneeId: assigneeId,
      });

      // Get the updated assignee data
      // We need to get the full issue record and its relationships
      const issueData = await this.client.issue(issue.id);
      const assigneeData = issueData && issueData.assignee ? await issueData.assignee : null;

      return {
        success: true,
        issue: {
          id: issue.id,
          identifier: issue.identifier,
          title: issue.title,
          assignee: assigneeData
            ? {
              id: assigneeData.id,
              name: assigneeData.name,
              displayName: assigneeData.displayName,
            }
            : null,
          url: issue.url,
        },
      };
    } catch (error) {
      console.error('Error assigning issue:', error);
      throw error;
    }
  }

  /**
   * Subscribes to issue updates
   */
  async subscribeToIssue(issueId: string) {
    try {
      // Get the issue
      const issue = await this.client.issue(issueId);
      if (!issue) {
        throw new Error(`Issue with ID ${issueId} not found`);
      }

      // Get current user info
      const viewer = await this.client.viewer;

      // For now, we'll just acknowledge the request with a success message
      // The actual subscription logic would need to be implemented based on the Linear SDK specifics
      // In a production environment, we should check the SDK documentation for the correct method

      return {
        success: true,
        message: `User ${viewer.name} (${viewer.id}) would be subscribed to issue ${issue.identifier}. (Note: Actual subscription API call implementation needed)`,
      };
    } catch (error) {
      console.error('Error subscribing to issue:', error);
      throw error;
    }
  }

  /**
   * Converts an issue to a subtask of another issue
   */
  async convertIssueToSubtask(issueId: string, parentIssueId: string) {
    try {
      // Get both issues
      const issue = await this.client.issue(issueId);
      if (!issue) {
        throw new Error(`Issue with ID ${issueId} not found`);
      }

      const parentIssue = await this.client.issue(parentIssueId);
      if (!parentIssue) {
        throw new Error(`Parent issue with ID ${parentIssueId} not found`);
      }

      // Convert the issue to a subtask
      const updatedIssue = await issue.update({
        parentId: parentIssueId,
      });

      // Get parent data - we need to fetch the updated issue to get relationships
      const updatedIssueData = await this.client.issue(issue.id);
      const parentData =
        updatedIssueData && updatedIssueData.parent ? await updatedIssueData.parent : null;

      return {
        success: true,
        issue: {
          id: issue.id,
          identifier: issue.identifier,
          title: issue.title,
          parent: parentData
            ? {
              id: parentData.id,
              identifier: parentData.identifier,
              title: parentData.title,
            }
            : null,
          url: issue.url,
        },
      };
    } catch (error) {
      console.error('Error converting issue to subtask:', error);
      throw error;
    }
  }

  /**
   * Creates a relation between two issues
   */
  async createIssueRelation(issueId: string, relatedIssueId: string, type: string) {
    try {
      // Get both issues
      const issue = await this.client.issue(issueId);
      if (!issue) {
        throw new Error(`Issue with ID ${issueId} not found`);
      }

      const relatedIssue = await this.client.issue(relatedIssueId);
      if (!relatedIssue) {
        throw new Error(`Related issue with ID ${relatedIssueId} not found`);
      }

      // For now, we'll just acknowledge the request with a success message
      // The actual relation creation logic would need to be implemented based on the Linear SDK specifics
      // In a production environment, we should check the SDK documentation for the correct method

      return {
        success: true,
        relation: {
          id: 'relation-id-would-go-here',
          type: type,
          issueIdentifier: issue.identifier,
          relatedIssueIdentifier: relatedIssue.identifier,
        },
      };
    } catch (error) {
      console.error('Error creating issue relation:', error);
      throw error;
    }
  }

  /**
   * Archives an issue
   */
  async archiveIssue(issueId: string) {
    try {
      // Get the issue
      const issue = await this.client.issue(issueId);
      if (!issue) {
        throw new Error(`Issue with ID ${issueId} not found`);
      }

      // Archive the issue
      await issue.archive();

      return {
        success: true,
        message: `Issue ${issue.identifier} has been archived`,
      };
    } catch (error) {
      console.error('Error archiving issue:', error);
      throw error;
    }
  }

  /**
   * Sets the priority of an issue
   */
  async setIssuePriority(issueId: string, priority: number) {
    try {
      // Get the issue
      const issue = await this.client.issue(issueId);
      if (!issue) {
        throw new Error(`Issue with ID ${issueId} not found`);
      }

      // Update the issue priority
      await issue.update({
        priority: priority,
      });

      // Get the updated issue
      const updatedIssue = await this.client.issue(issue.id);

      return {
        success: true,
        issue: {
          id: updatedIssue.id,
          identifier: updatedIssue.identifier,
          title: updatedIssue.title,
          priority: updatedIssue.priority,
          url: updatedIssue.url,
        },
      };
    } catch (error) {
      console.error('Error setting issue priority:', error);
      throw error;
    }
  }

  /**
   * Transfers an issue to another team
   */
  async transferIssue(issueId: string, teamId: string) {
    try {
      // Get the issue
      const issue = await this.client.issue(issueId);
      if (!issue) {
        throw new Error(`Issue with ID ${issueId} not found`);
      }

      // Get the team
      const team = await this.client.team(teamId);
      if (!team) {
        throw new Error(`Team with ID ${teamId} not found`);
      }

      // Transfer the issue
      await issue.update({
        teamId: teamId,
      });

      // Get the updated issue
      const updatedIssue = await this.client.issue(issue.id);
      const teamData = updatedIssue.team ? await updatedIssue.team : null;

      return {
        success: true,
        issue: {
          id: updatedIssue.id,
          identifier: updatedIssue.identifier,
          title: updatedIssue.title,
          team: teamData
            ? {
              id: teamData.id,
              name: teamData.name,
              key: teamData.key,
            }
            : null,
          url: updatedIssue.url,
        },
      };
    } catch (error) {
      console.error('Error transferring issue:', error);
      throw error;
    }
  }

  /**
   * Duplicates an issue
   */
  async duplicateIssue(issueId: string) {
    try {
      // Get the issue
      const issue = await this.client.issue(issueId);
      if (!issue) {
        throw new Error(`Issue with ID ${issueId} not found`);
      }

      // Get all the relevant issue data
      const teamData = await issue.team;
      if (!teamData) {
        throw new Error('Could not retrieve team data for the issue');
      }

      // Create a new issue using the createIssue method of this service
      const newIssueData = await this.createIssue({
        title: `${issue.title} (Copy)`,
        description: issue.description,
        teamId: teamData.id,
        // We'll have to implement getting these properties in a production environment
        // For now, we'll just create a basic copy with title and description
      });

      // Get the full issue details with identifier
      const newIssue = await this.client.issue(newIssueData.id);

      return {
        success: true,
        originalIssue: {
          id: issue.id,
          identifier: issue.identifier,
          title: issue.title,
        },
        duplicatedIssue: {
          id: newIssue.id,
          identifier: newIssue.identifier,
          title: newIssue.title,
          url: newIssue.url,
        },
      };
    } catch (error) {
      console.error('Error duplicating issue:', error);
      throw error;
    }
  }

  /**
   * Gets the history of changes made to an issue
   */
  async getIssueHistory(issueId: string, limit = 10) {
    try {
      // Get the issue
      const issue = await this.client.issue(issueId);
      if (!issue) {
        throw new Error(`Issue with ID ${issueId} not found`);
      }

      // Get the issue history
      const history = await issue.history({ first: limit });

      // Process and format each history event
      const historyEvents = await Promise.all(
        history.nodes.map(async (event) => {
          // Get the actor data if available
          const actorData = event.actor ? await event.actor : null;

          return {
            id: event.id,
            createdAt: event.createdAt,
            actor: actorData
              ? {
                id: actorData.id,
                name: actorData.name,
                displayName: actorData.displayName,
              }
              : null,
            // Use optional chaining to safely access properties that may not exist
            type: (event as any).type || 'unknown',
            from: (event as any).from || null,
            to: (event as any).to || null,
          };
        }),
      );

      return {
        issueId: issue.id,
        identifier: issue.identifier,
        history: historyEvents,
      };
    } catch (error) {
      console.error('Error getting issue history:', error);
      throw error;
    }
  }

  /**
   * Get all comments for an issue
   * @param issueId The ID or identifier of the issue
   * @param limit Maximum number of comments to return
   * @returns List of comments
   */
  async getComments(issueId: string, limit = 25) {
    try {
      // Get the issue
      const issue = await this.client.issue(issueId);
      if (!issue) {
        throw new Error(`Issue with ID ${issueId} not found`);
      }

      // Get comments
      const comments = await issue.comments({ first: limit });

      // Process comments
      return Promise.all(
        comments.nodes.map(async (comment) => {
          const userData = comment.user ? await comment.user : null;

          return {
            id: comment.id,
            body: comment.body,
            createdAt: comment.createdAt,
            user: userData
              ? {
                id: userData.id,
                name: userData.name,
                displayName: userData.displayName,
              }
              : null,
            url: comment.url,
          };
        }),
      );
    } catch (error) {
      console.error('Error getting comments:', error);
      throw error;
    }
  }

  /**
   * Update an existing project
   * @param args Project update data
   * @returns Updated project
   */
  async updateProject(args: {
    id: string;
    name?: string;
    description?: string;
    content?: string;
    state?: string;
    startDate?: string;
    targetDate?: string;
    leadId?: string;
    memberIds?: string[] | string;
    sortOrder?: number;
    icon?: string;
    color?: string;
  }) {
    try {
      // Get the project
      const project = await this.client.project(args.id);
      if (!project) {
        throw new Error(`Project with ID ${args.id} not found`);
      }

      // Process member IDs if provided
      const memberIds = args.memberIds
        ? Array.isArray(args.memberIds)
          ? args.memberIds
          : [args.memberIds]
        : undefined;

      // Update the project using client.updateProject
      const updatePayload = await this.client.updateProject(args.id, {
        name: args.name,
        description: args.description,
        content: args.content,
        state: args.state as any,
        startDate: args.startDate ? new Date(args.startDate) : undefined,
        targetDate: args.targetDate ? new Date(args.targetDate) : undefined,
        leadId: args.leadId,
        memberIds: memberIds,
        sortOrder: args.sortOrder,
        icon: args.icon,
        color: args.color,
      });

      if (updatePayload.success) {
        // Get the updated project data
        const updatedProject = await this.client.project(args.id);
        const leadData = updatedProject.lead ? await updatedProject.lead : null;

        // Return the updated project info
        return {
          id: updatedProject.id,
          name: updatedProject.name,
          description: updatedProject.description,
          content: updatedProject.content,
          state: updatedProject.state,
          startDate: updatedProject.startDate,
          targetDate: updatedProject.targetDate,
          lead: leadData
            ? {
              id: leadData.id,
              name: leadData.name,
            }
            : null,
          icon: updatedProject.icon,
          color: updatedProject.color,
          url: updatedProject.url,
        };
      } else {
        throw new Error('Failed to update project');
      }
    } catch (error) {
      console.error('Error updating project:', error);
      throw error;
    }
  }

  /**
   * Add an issue to a project
   * @param issueId ID of the issue to add
   * @param projectId ID of the project
   * @returns Success status and issue details
   */
  async addIssueToProject(issueId: string, projectId: string) {
    try {
      // Get the issue
      const issue = await this.client.issue(issueId);
      if (!issue) {
        throw new Error(`Issue with ID ${issueId} not found`);
      }

      // Get the project
      const project = await this.client.project(projectId);
      if (!project) {
        throw new Error(`Project with ID ${projectId} not found`);
      }

      // Update the issue with the project ID
      await issue.update({
        projectId: projectId,
      });

      // Get the updated issue data with project
      const updatedIssue = await this.client.issue(issueId);
      const projectData = updatedIssue.project ? await updatedIssue.project : null;

      return {
        success: true,
        issue: {
          id: updatedIssue.id,
          identifier: updatedIssue.identifier,
          title: updatedIssue.title,
          project: projectData
            ? {
              id: projectData.id,
              name: projectData.name,
            }
            : null,
        },
      };
    } catch (error) {
      console.error('Error adding issue to project:', error);
      throw error;
    }
  }

  /**
   * Get all issues associated with a project
   * @param projectId ID of the project
   * @param limit Maximum number of issues to return
   * @returns List of issues in the project
   */
  async getProjectIssues(projectId: string, limit = 25) {
    try {
      // Get the project
      const project = await this.client.project(projectId);
      if (!project) {
        throw new Error(`Project with ID ${projectId} not found`);
      }

      // Get issues for the project
      const issues = await this.client.issues({
        first: limit,
        filter: {
          project: {
            id: { eq: projectId },
          },
        },
      });

      // Process the issues
      return Promise.all(
        issues.nodes.map(async (issue) => {
          const teamData = issue.team ? await issue.team : null;
          const assigneeData = issue.assignee ? await issue.assignee : null;

          return {
            id: issue.id,
            identifier: issue.identifier,
            title: issue.title,
            description: issue.description,
            state: issue.state,
            priority: issue.priority,
            team: teamData
              ? {
                id: teamData.id,
                name: teamData.name,
              }
              : null,
            assignee: assigneeData
              ? {
                id: assigneeData.id,
                name: assigneeData.name,
              }
              : null,
            url: issue.url,
          };
        }),
      );
    } catch (error) {
      console.error('Error getting project issues:', error);
      throw error;
    }
  }

  /**
   * Gets a list of all cycles
   * @param teamId Optional team ID to filter cycles by team
   * @param limit Maximum number of cycles to return
   * @returns List of cycles
   */
  async getCycles(teamId?: string, limit = 25) {
    try {
      const filters: Record<string, any> = {};

      if (teamId) {
        filters.team = { id: { eq: teamId } };
      }

      const cycles = await this.client.cycles({
        filter: filters,
        first: limit,
      });

      const cyclesData = await cycles.nodes;

      return Promise.all(
        cyclesData.map(async (cycle) => {
          // Get team information
          const team = cycle.team ? await cycle.team : null;

          return {
            id: cycle.id,
            number: cycle.number,
            name: cycle.name,
            description: cycle.description,
            startsAt: cycle.startsAt,
            endsAt: cycle.endsAt,
            completedAt: cycle.completedAt,
            team: team
              ? {
                id: team.id,
                name: team.name,
                key: team.key,
              }
              : null,
          };
        }),
      );
    } catch (error) {
      console.error('Error getting cycles:', error);
      throw error;
    }
  }

  /**
   * Gets the currently active cycle for a team
   * @param teamId ID of the team
   * @returns Active cycle information with progress stats
   */
  async getActiveCycle(teamId: string) {
    try {
      // Get the team
      const team = await this.client.team(teamId);
      if (!team) {
        throw new Error(`Team with ID ${teamId} not found`);
      }

      // Get the active cycle for the team
      const activeCycle = await team.activeCycle;
      if (!activeCycle) {
        throw new Error(`No active cycle found for team ${team.name}`);
      }

      // Get cycle issues for count and progress
      const cycleIssues = await this.client.issues({
        filter: {
          cycle: { id: { eq: activeCycle.id } },
        },
      });
      const issueNodes = await cycleIssues.nodes;

      // Calculate progress
      const totalIssues = issueNodes.length;
      const completedIssues = issueNodes.filter((issue) => issue.completedAt).length;
      const progress = totalIssues > 0 ? (completedIssues / totalIssues) * 100 : 0;

      return {
        id: activeCycle.id,
        number: activeCycle.number,
        name: activeCycle.name,
        description: activeCycle.description,
        startsAt: activeCycle.startsAt,
        endsAt: activeCycle.endsAt,
        team: {
          id: team.id,
          name: team.name,
          key: team.key,
        },
        progress: Math.round(progress * 100) / 100, // Round to 2 decimal places
        issueCount: totalIssues,
        completedIssueCount: completedIssues,
      };
    } catch (error) {
      console.error('Error getting active cycle:', error);
      throw error;
    }
  }

  /**
   * Adds an issue to a cycle
   * @param issueId ID or identifier of the issue
   * @param cycleId ID of the cycle
   * @returns Success status and updated issue information
   */
  async addIssueToCycle(issueId: string, cycleId: string) {
    try {
      // Get the issue
      const issueResult = await this.client.issue(issueId);
      if (!issueResult) {
        throw new Error(`Issue with ID ${issueId} not found`);
      }

      // Get the cycle
      const cycleResult = await this.client.cycle(cycleId);
      if (!cycleResult) {
        throw new Error(`Cycle with ID ${cycleId} not found`);
      }

      // Update the issue with the cycle ID
      await this.client.updateIssue(issueResult.id, { cycleId: cycleId });

      // Get the updated issue data
      const updatedIssue = await this.client.issue(issueId);
      const cycleData = await this.client.cycle(cycleId);

      return {
        success: true,
        issue: {
          id: updatedIssue.id,
          identifier: updatedIssue.identifier,
          title: updatedIssue.title,
          cycle: cycleData
            ? {
              id: cycleData.id,
              number: cycleData.number,
              name: cycleData.name,
            }
            : null,
        },
      };
    } catch (error) {
      console.error('Error adding issue to cycle:', error);
      throw error;
    }
  }

  /**
   * Get workflow states for a team
   * @param teamId ID of the team to get workflow states for
   * @param includeArchived Whether to include archived states (default: false)
   * @returns Array of workflow states with their details
   */
  async getWorkflowStates(teamId: string, includeArchived = false) {
    try {
      // Use GraphQL to query workflow states for the team
      const response = await this.client.workflowStates({
        filter: {
          team: { id: { eq: teamId } },
        },
      });

      if (!response.nodes || response.nodes.length === 0) {
        return [];
      }

      // Filter out archived states if includeArchived is false
      let states = response.nodes;
      if (!includeArchived) {
        states = states.filter((state) => !state.archivedAt);
      }

      // Map the response to match our output schema
      return states.map((state) => ({
        id: state.id,
        name: state.name,
        type: state.type,
        position: state.position,
        color: state.color,
        description: state.description || '',
      }));
    } catch (error: unknown) {
      // Properly handle the unknown error type
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      throw new Error(`Failed to get workflow states: ${errorMessage}`);
    }
  }

  /**
   * Creates a project update
   * @param args Project update parameters
   * @returns Created project update details
   */
  async createProjectUpdate(args: {
    projectId: string;
    body: string;
    health?: 'onTrack' | 'atRisk' | 'offTrack' | string;
    userId?: string;
    attachments?: string[];
  }) {
    try {
      // Get the project
      const project = await this.client.project(args.projectId);
      if (!project) {
        throw new Error(`Project with ID ${args.projectId} not found`);
      }

      // Create the project update
      const createPayload = await this.client.createProjectUpdate({
        projectId: args.projectId,
        body: args.body,
        health: args.health as any,
        // Note: userId and attachmentIds are not supported in the direct API input
        // The SDK uses the authenticated user by default
      });

      if (createPayload.success && createPayload.projectUpdate) {
        const updateData = await createPayload.projectUpdate;
        const userData = updateData.user ? await updateData.user : null;

        return {
          id: updateData.id,
          body: updateData.body,
          health: updateData.health,
          createdAt: updateData.createdAt,
          updatedAt: updateData.updatedAt,
          user: userData
            ? {
              id: userData.id,
              name: userData.name,
            }
            : null,
          project: {
            id: project.id,
            name: project.name,
          },
        };
      } else {
        throw new Error('Failed to create project update');
      }
    } catch (error) {
      console.error('Error creating project update:', error);
      throw error;
    }
  }

  /**
   * Updates an existing project update
   * @param args Update parameters
   * @returns Updated project update details
   */
  async updateProjectUpdate(args: {
    id: string;
    body?: string;
    health?: 'onTrack' | 'atRisk' | 'offTrack' | string;
  }) {
    try {
      // Get the project update
      const projectUpdate = await this.client.projectUpdate(args.id);
      if (!projectUpdate) {
        throw new Error(`Project update with ID ${args.id} not found`);
      }

      // Get project info for the response
      const projectData = await projectUpdate.project;
      if (!projectData) {
        throw new Error(`Project not found for update with ID ${args.id}`);
      }

      // Update the project update
      const updatePayload = await this.client.updateProjectUpdate(args.id, {
        body: args.body,
        health: args.health as any,
      });

      if (updatePayload.success) {
        // Get the updated project update data
        const updatedProjectUpdate = await this.client.projectUpdate(args.id);
        const userData = updatedProjectUpdate.user ? await updatedProjectUpdate.user : null;

        // Return the updated project update info
        return {
          id: updatedProjectUpdate.id,
          body: updatedProjectUpdate.body,
          health: updatedProjectUpdate.health,
          createdAt: updatedProjectUpdate.createdAt,
          updatedAt: updatedProjectUpdate.updatedAt,
          user: userData
            ? {
              id: userData.id,
              name: userData.name,
            }
            : null,
          project: {
            id: projectData.id,
            name: projectData.name,
          },
        };
      } else {
        throw new Error('Failed to update project update');
      }
    } catch (error) {
      console.error('Error updating project update:', error);
      throw error;
    }
  }

  /**
   * Gets updates for a project
   * @param projectId ID of the project
   * @param limit Maximum number of updates to return
   * @returns List of project updates
   */
  async getProjectUpdates(projectId: string, limit = 25) {
    try {
      // Get the project
      const project = await this.client.project(projectId);
      if (!project) {
        throw new Error(`Project with ID ${projectId} not found`);
      }

      // Get project updates
      const updates = await this.client.projectUpdates({
        first: limit,
        filter: {
          project: {
            id: { eq: projectId },
          },
        },
      });

      // Process and return the updates
      return Promise.all(
        updates.nodes.map(async (update) => {
          const userData = update.user ? await update.user : null;

          return {
            id: update.id,
            body: update.body,
            health: update.health,
            createdAt: update.createdAt,
            updatedAt: update.updatedAt,
            user: userData
              ? {
                id: userData.id,
                name: userData.name,
              }
              : null,
            project: {
              id: project.id,
              name: project.name,
            },
          };
        }),
      );
    } catch (error) {
      console.error('Error getting project updates:', error);
      throw error;
    }
  }

  /**
   * Archives a project
   * @param projectId ID of the project to archive
   * @returns Success status and archived project info
   */
  async archiveProject(projectId: string) {
    try {
      // Get the project
      const project = await this.client.project(projectId);
      if (!project) {
        throw new Error(`Project with ID ${projectId} not found`);
      }

      // Archive the project
      const archivePayload = await project.archive();

      if (archivePayload.success) {
        // Get the archived project data
        const archivedProject = await this.client.project(projectId);

        return {
          success: true,
          project: {
            id: archivedProject.id,
            name: archivedProject.name,
            state: archivedProject.state,
            archivedAt: archivedProject.archivedAt,
          },
        };
      } else {
        throw new Error('Failed to archive project');
      }
    } catch (error) {
      console.error('Error archiving project:', error);
      throw error;
    }
  }

  /**
   * Get all initiatives
   * @returns List of all initiatives
   */
  async getInitiatives(args: { includeArchived?: boolean; limit?: number } = {}) {
    try {
      const initiatives = await this.client.initiatives({
        first: args.limit || 50,
        includeArchived: args.includeArchived || false,
      });
      return Promise.all(
        initiatives.nodes.map(async (initiative) => {
          // Fetch owner data if available
          const ownerData = initiative.owner ? await initiative.owner : null;

          return {
            id: initiative.id,
            name: initiative.name,
            description: initiative.description,
            content: initiative.content,
            icon: initiative.icon,
            color: initiative.color,
            status: initiative.status,
            targetDate: initiative.targetDate,
            sortOrder: initiative.sortOrder,
            owner: ownerData
              ? {
                id: ownerData.id,
                name: ownerData.name,
                email: ownerData.email,
              }
              : null,
            url: initiative.url,
          };
        }),
      );
    } catch (error) {
      console.error('Error getting initiatives:', error);
      throw error;
    }
  }

  /**
   * Get a specific initiative by ID
   * @param id Initiative ID
   * @param includeProjects Whether to include associated projects
   * @returns Initiative details with optional projects
   */
  async getInitiativeById(id: string, includeProjects = true) {
    try {
      const initiative = await this.client.initiative(id);
      if (!initiative) {
        throw new Error(`Initiative with ID ${id} not found`);
      }

      // Fetch owner data if available
      const ownerData = initiative.owner ? await initiative.owner : null;

      // Fetch associated projects if requested
      let projectsData;
      if (includeProjects) {
        const projects = await initiative.projects();
        projectsData = await Promise.all(
          projects.nodes.map(async (project) => ({
            id: project.id,
            name: project.name,
            state: project.state,
          })),
        );
      }

      return {
        id: initiative.id,
        name: initiative.name,
        description: initiative.description,
        content: initiative.content,
        icon: initiative.icon,
        color: initiative.color,
        status: initiative.status,
        targetDate: initiative.targetDate,
        sortOrder: initiative.sortOrder,
        owner: ownerData
          ? {
            id: ownerData.id,
            name: ownerData.name,
            email: ownerData.email,
          }
          : null,
        ...(includeProjects && { projects: projectsData }),
        url: initiative.url,
      };
    } catch (error) {
      console.error('Error getting initiative by ID:', error);
      throw error;
    }
  }

  /**
   * Create a new initiative
   * @param args Initiative creation arguments
   * @returns Created initiative details
   */
  async createInitiative(args: {
    name: string;
    description?: string;
    content?: string;
    icon?: string;
    color?: string;
    status?: string;
    targetDate?: string;
    ownerId?: string;
    sortOrder?: number;
  }) {
    try {
      const createPayload = await this.client.createInitiative({
        name: args.name,
        description: args.description,
        content: args.content,
        icon: args.icon,
        color: args.color,
        status: args.status as any,
        targetDate: args.targetDate,
        ownerId: args.ownerId,
        sortOrder: args.sortOrder,
      });

      if (createPayload.success && createPayload.initiative) {
        const initiative = await createPayload.initiative;
        return {
          id: initiative.id,
          name: initiative.name,
          description: initiative.description,
          status: initiative.status,
          url: initiative.url,
        };
      } else {
        throw new Error('Failed to create initiative');
      }
    } catch (error) {
      console.error('Error creating initiative:', error);
      throw error;
    }
  }

  /**
   * Update an existing initiative
   * @param initiativeId Initiative ID to update
   * @param updateData Update data
   * @returns Updated initiative details
   */
  async updateInitiative(
    initiativeId: string,
    updateData: {
      name?: string;
      description?: string;
      content?: string;
      icon?: string;
      color?: string;
      status?: string;
      targetDate?: string;
      ownerId?: string;
      sortOrder?: number;
    },
  ) {
    try {
      const updatePayload = await this.client.updateInitiative(initiativeId, {
        name: updateData.name,
        description: updateData.description,
        content: updateData.content,
        icon: updateData.icon,
        color: updateData.color,
        status: updateData.status as any,
        targetDate: updateData.targetDate,
        ownerId: updateData.ownerId,
        sortOrder: updateData.sortOrder,
      });

      if (updatePayload.success && updatePayload.initiative) {
        const initiative = await updatePayload.initiative;
        return {
          id: initiative.id,
          name: initiative.name,
          description: initiative.description,
          status: initiative.status,
          url: initiative.url,
        };
      } else {
        throw new Error('Failed to update initiative');
      }
    } catch (error) {
      console.error('Error updating initiative:', error);
      throw error;
    }
  }

  /**
   * Archive an initiative
   * @param id Initiative ID to archive
   * @returns Success status and archived initiative info
   */
  async archiveInitiative(id: string) {
    try {
      const archivePayload = await this.client.archiveInitiative(id);

      if (archivePayload.success) {
        const entity = archivePayload.entity ? await archivePayload.entity : null;
        return {
          success: true,
          entity: entity
            ? {
              id: entity.id,
              name: entity.name,
            }
            : null,
        };
      } else {
        throw new Error('Failed to archive initiative');
      }
    } catch (error) {
      console.error('Error archiving initiative:', error);
      throw error;
    }
  }

  /**
   * Unarchive an initiative
   * @param id Initiative ID to unarchive
   * @returns Success status and unarchived initiative info
   */
  async unarchiveInitiative(id: string) {
    try {
      const unarchivePayload = await this.client.unarchiveInitiative(id);

      if (unarchivePayload.success) {
        const entity = unarchivePayload.entity ? await unarchivePayload.entity : null;
        return {
          success: true,
          entity: entity
            ? {
              id: entity.id,
              name: entity.name,
            }
            : null,
        };
      } else {
        throw new Error('Failed to unarchive initiative');
      }
    } catch (error) {
      console.error('Error unarchiving initiative:', error);
      throw error;
    }
  }

  /**
   * Delete (trash) an initiative
   * @param id Initiative ID to delete
   * @returns Success status
   */
  async deleteInitiative(id: string) {
    try {
      const deletePayload = await this.client.deleteInitiative(id);

      return {
        success: deletePayload.success,
      };
    } catch (error) {
      console.error('Error deleting initiative:', error);
      throw error;
    }
  }

  /**
   * Get all projects associated with an initiative
   * @param initiativeId Initiative ID
   * @param includeArchived Whether to include archived projects
   * @returns List of projects in the initiative
   */
  async getInitiativeProjects(initiativeId: string, includeArchived = false) {
    try {
      const initiative = await this.client.initiative(initiativeId);
      if (!initiative) {
        throw new Error(`Initiative with ID ${initiativeId} not found`);
      }

      const projects = await initiative.projects({
        first: 50,
        includeArchived: includeArchived,
      });
      return Promise.all(
        projects.nodes.map(async (project) => {
          // Fetch teams data
          const teams = await project.teams();
          const teamsData = teams.nodes.map((team) => ({
            id: team.id,
            name: team.name,
          }));

          return {
            id: project.id,
            name: project.name,
            description: project.description,
            state: project.state,
            progress: project.progress,
            startDate: project.startDate,
            targetDate: project.targetDate,
            teams: teamsData,
            url: project.url,
          };
        }),
      );
    } catch (error) {
      console.error('Error getting initiative projects:', error);
      throw error;
    }
  }

  /**
   * Add a project to an initiative
   * @param initiativeId Initiative ID
   * @param projectId Project ID
   * @param sortOrder Sort order within the initiative
   * @returns Success status and project details
   */
  async addProjectToInitiative(initiativeId: string, projectId: string, sortOrder?: number) {
    try {
      // First, get the project to update it
      const project = await this.client.project(projectId);
      if (!project) {
        throw new Error(`Project with ID ${projectId} not found`);
      }

      // Get the initiative to verify it exists
      const initiative = await this.client.initiative(initiativeId);
      if (!initiative) {
        throw new Error(`Initiative with ID ${initiativeId} not found`);
      }

      // Create an InitiativeToProject relation
      const createPayload = await this.client.createInitiativeToProject({
        projectId: projectId,
        initiativeId: initiativeId,
        sortOrder: sortOrder,
      });

      if (createPayload.success) {
        return {
          success: true,
          project: {
            id: project.id,
            name: project.name,
            initiative: {
              id: initiative.id,
              name: initiative.name,
            },
          },
        };
      } else {
        throw new Error('Failed to add project to initiative');
      }
    } catch (error) {
      console.error('Error adding project to initiative:', error);
      throw error;
    }
  }

  /**
   * Remove a project from an initiative
   * @param initiativeId Initiative ID
   * @param projectId Project ID
   * @returns Success status and project details
   */
  async removeProjectFromInitiative(initiativeId: string, projectId: string) {
    try {
      // Get the project
      const project = await this.client.project(projectId);
      if (!project) {
        throw new Error(`Project with ID ${projectId} not found`);
      }

      // Get the initiative to verify it exists
      const initiative = await this.client.initiative(initiativeId);
      if (!initiative) {
        throw new Error(`Initiative with ID ${initiativeId} not found`);
      }

      // First, verify the project belongs to this initiative
      const projectInitiatives = await project.initiatives();
      const belongsToInitiative = projectInitiatives.nodes.some((init) => init.id === initiativeId);

      if (!belongsToInitiative) {
        throw new Error(`Project ${projectId} is not associated with initiative ${initiativeId}`);
      }

      // Query for InitiativeToProject relationships
      // Note: The API doesn't support filtering by initiative/project, so we need to search through all
      let targetRelationId: string | null = null;
      let hasMore = true;
      let cursor: string | undefined = undefined;

      // Paginate through all InitiativeToProject relationships to find the one we need
      while (hasMore && !targetRelationId) {
        const initiativeToProjects = await this.client.initiativeToProjects({
          first: 100,
          after: cursor,
          includeArchived: false,
        });

        // Search through this page of results
        for (const relation of initiativeToProjects.nodes) {
          const relInitiative = await relation.initiative;
          const relProject = await relation.project;
          if (relInitiative?.id === initiativeId && relProject?.id === projectId) {
            targetRelationId = relation.id;
            break;
          }
        }

        // Check if there are more pages
        hasMore = initiativeToProjects.pageInfo.hasNextPage;
        cursor = initiativeToProjects.pageInfo.endCursor || undefined;
      }

      if (!targetRelationId) {
        // This shouldn't happen if belongsToInitiative is true, but let's be defensive
        throw new Error(`Could not find InitiativeToProject relationship between initiative ${initiativeId} and project ${projectId}`);
      }

      // Delete the InitiativeToProject relationship
      const deletePayload = await this.client.deleteInitiativeToProject(targetRelationId);

      if (deletePayload.success) {
        return {
          success: true,
          project: {
            id: project.id,
            name: project.name,
          },
          initiative: {
            id: initiative.id,
            name: initiative.name,
          },
        };
      } else {
        throw new Error('Failed to remove project from initiative');
      }
    } catch (error) {
      console.error('Error removing project from initiative:', error);
      throw error;
    }
  }
}
