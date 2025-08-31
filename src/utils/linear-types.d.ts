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
