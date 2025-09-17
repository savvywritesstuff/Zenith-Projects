

export type Theme = 'dark' | 'light' | 'catppuccin' | 'solarized-light' | 'solarized-dark' | 'high-contrast' | 'dracula' | 'nord';

export const THEME_OPTIONS: { value: Theme; label: string }[] = [
    { value: 'dark', label: 'Dark' },
    { value: 'light', label: 'Light' },
    { value: 'catppuccin', label: 'Catppuccin' },
    { value: 'solarized-light', label: 'Solarized Light' },
    { value: 'solarized-dark', label: 'Solarized Dark' },
    { value: 'high-contrast', label: 'High Contrast' },
    { value: 'dracula', label: 'Dracula' },
    { value: 'nord', label: 'Nord' },
];

export type FontFamily = 'sans' | 'serif' | 'mono';
export const FONT_FAMILY_OPTIONS: { value: FontFamily; label: string }[] = [
    { value: 'sans', label: 'Sans-Serif' },
    { value: 'serif', label: 'Serif' },
    { value: 'mono', label: 'Monospace' },
];

export type FontSize = 'sm' | 'base' | 'lg';
export const FONT_SIZE_OPTIONS: { value: FontSize; label: string }[] = [
    { value: 'sm', label: 'Small' },
    { value: 'base', label: 'Medium' },
    { value: 'lg', label: 'Large' },
];


export enum TaskStatus {
  Backlog = 'Backlog',
  ToDo = 'To-Do',
  InProgress = 'In Progress',
  Review = 'Review',
  Done = 'Done',
  Future = 'Future',
}

export enum Priority {
  High = 'High',
  Medium = 'Medium',
  Low = 'Low',
  None = 'None',
}

export interface Task {
  id: string; // Task-ID
  description: string;
  status: TaskStatus;
  phase: string;
  subPhase: string;
  priority: Priority;
  subProjectId?: string;
}

export enum CommentStatus {
  Active = 'Active',
  Resolved = 'Resolved',
  Discarded = 'Discarded',
}

export interface Comment {
  id: string;
  taskId: string;
  content: string;
  createdAt: string; // ISO 8601 date string
  status: CommentStatus;
}

export interface Label {
  id: string;
  name: string;
  color: string;
}

export interface Folder {
  id: string;
  name: string;
}

export interface Project {
  id: string;
  name: string;
  planningDocument: string;
  implementationPlan: string;
  scratchpad: string;
  tasks: Task[];
  comments: Comment[];
  phaseColors: Record<string, string>;
  subPhaseColors: Record<string, string>;
  theme?: Theme;
  fontFamily?: FontFamily;
  fontSize?: FontSize;
  lastBackupDate?: string; // ISO 8601
  folderId?: string | null; // null for root
  labelIds?: string[];
  isArchived?: boolean;
}


export type BackupFrequency = 'daily' | 'weekly' | 'monthly' | 'never';

export interface AppSettings {
    backupFrequency: BackupFrequency;
    lastBackupAllDate?: string; // ISO 8601
    dashboardTheme: Theme;
    applyThemeToAllProjects: boolean;
}


export interface TutorialStep {
  elementSelector: string;
  title: string;
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  action?: () => void;
}