
import { TaskStatus } from './types';

export const KANBAN_COLUMNS: TaskStatus[] = [
  TaskStatus.Backlog,
  TaskStatus.ToDo,
  TaskStatus.InProgress,
  TaskStatus.Review,
  TaskStatus.Done,
  TaskStatus.Future,
];
