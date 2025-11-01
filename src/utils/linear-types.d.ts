export interface LinearIssue {
  id: string;
  identifier: string;
  title: string;
  description?: string;
  state: {
    id: string;
    name: string;
  };
  assignee?: {
    id: string;
    name: string;
  };
  team: {
    id: string;
    key: string;
    name: string;
  };
  project?: {
    id: string;
    name: string;
  };
  cycle?: {
    id: string;
    name: string;
    number: number;
  };
  projectMilestone?: {
    id: string;
    name: string;
    targetDate?: string;
  };
  priority: number;
  estimate?: number;
  labels: Array<{
    id: string;
    name: string;
  }>;
  comments?: Array<{
    id: string;
    body: string;
    user: {
      id: string;
      name: string;
    };
    createdAt: string;
    updatedAt: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface LinearProject {
  id: string;
  name: string;
  description?: string;
  state: string;
  progress: number;
  teams: Array<{
    id: string;
    key: string;
    name: string;
  }>;
  lead?: {
    id: string;
    name: string;
  };
  targetDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateIssueArgs {
  title: string;
  teamId?: string;
  description?: string;
  assigneeId?: string;
  priority?: number;
  projectId?: string;
  stateId?: string;
  labelIds?: string[];
  estimate?: number;
  parentId?: string;
  milestoneId?: string;
  cycleId?: string;
}

export interface UpdateIssueArgs {
  id: string;
  title?: string;
  description?: string;
  stateId?: string;
  priority?: number;
  assigneeId?: string;
  projectId?: string;
  labelIds?: string[];
  estimate?: number;
  parentId?: string;
  milestoneId?: string | null;
  cycleId?: string | null;
}

export interface SearchIssuesArgs {
  query?: string;
  teamId?: string;
  assigneeId?: string;
  projectId?: string;
  states?: string[];
  limit?: number;
}

export interface LinearLabel {
  id: string;
  name: string;
  color: string;
  scope: "workspace" | "team";
  team?: {
    id: string;
    name: string;
  };
  group?: {
    id: string;
    name: string;
  };
}

export interface CreateCommentArgs {
  issueId: string;
  body: string;
}

export interface LinearComment {
  id: string;
  body: string;
  user: {
    id: string;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface LinearProjectMilestone {
  id: string;
  name: string;
  description?: string;
  targetDate?: string;
  sortOrder: number;
  project: {
    id: string;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface LinearProjectMilestoneWithIssues extends LinearProjectMilestone {
  issues: LinearIssue[];
}

export interface ListProjectMilestonesArgs {
  projectId: string;  // Project name or UUID (will be resolved)
  limit?: number;
}

export interface GetProjectMilestoneArgs {
  milestoneId: string;  // Milestone name or UUID (will be resolved)
  projectId?: string;   // Optional project context for name resolution
  issuesFirst?: number; // How many issues to fetch
}

export interface CreateProjectMilestoneArgs {
  name: string;
  projectId: string;    // Project name or UUID (will be resolved)
  description?: string;
  targetDate?: string;  // ISO date string
}

export interface UpdateProjectMilestoneArgs {
  id: string;           // Milestone ID or name (will be resolved)
  projectId?: string;   // Optional project context for name resolution
  name?: string;
  description?: string;
  targetDate?: string;  // ISO date string
  sortOrder?: number;
}
