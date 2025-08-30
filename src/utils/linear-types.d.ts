
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
  labels: {
    nodes: Array<{
      id: string;
      name: string;
    }>;
  };
  createdAt: string;
  updatedAt: string;
}

export interface LinearProject {
  id: string;
  name: string;
  description?: string;
  state: string;
  progress: number;
  teams: {
    nodes: Array<{
      id: string;
      key: string;
      name: string;
    }>;
  };
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
