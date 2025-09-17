
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

export interface Project {
  id: string;
  name: string;
  planningDocument: string;
  implementationPlan: string;
  scratchpad: string;
  tasks: Task[];
  phaseColors: Record<string, string>;
  subPhaseColors: Record<string, string>;
}

export interface TutorialStep {
  elementSelector: string;
  title: string;
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  action?: () => void;
}
