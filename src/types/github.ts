/**
 * GitHub API 类型定义
 */

export interface User {
  login: string;
  id: number;
  avatar_url: string;
  url: string;
  html_url: string;
  followers_url: string;
  following_url: string;
  gists_url: string;
  starred_url: string;
  subscriptions_url: string;
  organizations_url: string;
  repos_url: string;
  events_url: string;
  received_events_url: string;
  type: 'User' | 'Organization';
  user_view_type: string;
  name: string | null;
  company: string | null;
  blog: string;
  location: string | null;
  email: string | null;
  bio: string | null;
  twitter_username: string | null;
  public_repos: number;
  public_gists: number;
  followers: number;
  following: number;
  created_at: string;
  updated_at: string;
  disk_usage?: number;
  collaborators?: number;
  two_factor_authentication?: boolean;
  plan?: {
    name: string;
    space: number;
    private_repos?: number;
  };
}

export interface Repository {
  id: number;
  node_id: string;
  name: string;
  full_name: string;
  owner: User;
  private: boolean;
  html_url: string;
  description: string | null;
  fork: boolean;
  url: string;
  created_at: string;
  updated_at: string;
  pushed_at: string;
  homepage: string | null;
  size: number;
  stargazers_count: number;
  watchers_count: number;
  language: string | null;
  forks_count: number;
  open_issues_count: number;
  default_branch: string;
  topics: string[];
  visibility: 'public' | 'private';
  archived: boolean;
  disabled: boolean;
}

export interface PinnedRepository extends Repository {
  pinned: boolean;
}

export interface Commit {
  sha: string;
  node_id: string;
  url: string;
  html_url: string;
  author: CommitAuthor;
  committer: CommitAuthor;
  message: string;
  tree: {
    sha: string;
    url: string;
  };
  parents: Array<{
    sha: string;
    url: string;
    html_url: string;
  }>;
}

export interface CommitAuthor {
  date: string;
  name: string;
  email: string;
}

export interface PullRequest {
  id: number;
  node_id: string;
  number: number;
  title: string;
  user: User;
  body: string | null;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  merged_at: string | null;
  merge_commit_sha: string | null;
  head: {
    label: string;
    ref: string;
    sha: string;
    user: User;
    repo: Repository | null;
  };
  base: {
    label: string;
    ref: string;
    sha: string;
    user: User;
    repo: Repository;
  };
  state: 'open' | 'closed';
  locked: boolean;
  draft: boolean;
  author_association: string;
  auto_merge: null;
  active_lock_reason: null;
  html_url: string;
  url: string;
  additions: number;
  deletions: number;
  changed_files: number;
}

export interface Issue {
  id: number;
  node_id: string;
  number: number;
  title: string;
  user: User;
  labels: Array<{
    id: number;
    url: string;
    name: string;
    color: string;
    default: boolean;
    description: string | null;
  }>;
  state: 'open' | 'closed';
  locked: boolean;
  assignee: User | null;
  assignees: User[];
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  body: string | null;
  url: string;
  html_url: string;
  author_association: string;
}

export interface ContributionData {
  date: string;
  count: number;
}

export interface Event {
  id: string;
  type:
    | 'PushEvent'
    | 'PullRequestEvent'
    | 'IssueCommentEvent'
    | 'IssuesEvent'
    | 'CreateEvent'
    | 'DeleteEvent'
    | 'StarEvent'
    | 'FollowEvent'
    | string;
  actor: User;
  repo: {
    id: number;
    name: string;
    url: string;
  };
  payload: Record<string, any>;
  public: boolean;
  created_at: string;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  status: number;
  message?: string;
}

export interface PaginationParams {
  page?: number;
  per_page?: number;
  sort?: string;
  direction?: 'asc' | 'desc';
}
