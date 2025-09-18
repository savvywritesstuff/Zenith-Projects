import React from 'react';
import { Task, Project, Comment, TaskStatus, Priority, CommentStatus } from '../types';
import { CommentIndicatorIcon } from './UI';

interface TaskListViewProps {
  tasks: Task[];
  project: Project;
  comments: Comment[];
  onTaskUpdate: (updatedTask: Task) => void;
  onRightClick: (e: React.MouseEvent, task: Task) => void;
  onTaskDrillDown: (task: Task) => void;
}

const getPriorityClass = (priority: Priority): string => {
  switch (priority) {
    case Priority.High: return 'bg-red-500/20 text-red-300';
    case Priority.Medium: return 'bg-yellow-500/20 text-yellow-300';
    case Priority.Low: return 'bg-green-500/20 text-green-300';
    default: return 'bg-slate-500/20 text-slate-300';
  }
};

export const TaskListView: React.FC<TaskListViewProps> = ({ tasks, project, comments, onTaskUpdate, onRightClick, onTaskDrillDown }) => {
  if (tasks.length === 0) {
    return (
      <div className="flex-grow flex items-center justify-center bg-secondary/70 rounded-lg border border-secondary text-secondary">
        <p>No tasks match the current filters.</p>
      </div>
    );
  }

  return (
    <div className="flex-grow overflow-y-auto bg-secondary/70 rounded-lg border border-secondary relative">
      <table className="w-full text-sm text-left text-primary table-fixed">
        <thead className="text-xs text-secondary uppercase bg-tertiary sticky top-0 z-10">
          <tr>
            <th scope="col" className="px-4 py-3 w-24">ID</th>
            <th scope="col" className="px-4 py-3 w-2/5">Description</th>
            <th scope="col" className="px-4 py-3 w-40">Status</th>
            <th scope="col" className="px-4 py-3 w-32">Priority</th>
            <th scope="col" className="px-4 py-3">Phase / Sub-Phase</th>
            <th scope="col" className="px-4 py-3 w-20 text-center">Comments</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-secondary">
          {tasks.map(task => {
            const activeComments = comments.filter(c => c.taskId === task.id && c.status === CommentStatus.Active);
            const phaseColor = project.phaseColors[task.phase] || 'var(--color-bg-tertiary)';

            return (
              <tr 
                key={task.id}
                onContextMenu={(e) => onRightClick(e, task)}
                onDoubleClick={() => onTaskDrillDown(task)}
                className="hover:bg-hover cursor-pointer group"
                style={{ borderLeft: `4px solid ${phaseColor}` }}
              >
                <td className="px-4 py-2 font-mono text-secondary group-hover:text-primary">{task.id}</td>
                <td className="px-4 py-2 truncate">{task.description}</td>
                <td className="px-4 py-2">
                  <select 
                    value={task.status} 
                    onChange={(e) => onTaskUpdate({ ...task, status: e.target.value as TaskStatus })}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full bg-primary border border-secondary rounded-md p-1 focus:ring-2 focus:ring-accent outline-none text-xs"
                  >
                    {Object.values(TaskStatus).map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
                <td className="px-4 py-2">
                   <select 
                    value={task.priority} 
                    onChange={(e) => onTaskUpdate({ ...task, priority: e.target.value as Priority })}
                    onClick={(e) => e.stopPropagation()}
                    className={`w-full bg-primary border border-secondary rounded-md p-1 focus:ring-2 focus:ring-accent outline-none text-xs font-semibold ${getPriorityClass(task.priority)}`}
                  >
                    {Object.values(Priority).map(p => <option key={p} value={p} className="bg-primary text-primary">{p}</option>)}
                  </select>
                </td>
                <td className="px-4 py-2 truncate">
                    <span className="font-semibold">{task.phase}</span>
                    <span className="text-secondary"> / {task.subPhase}</span>
                </td>
                <td className="px-4 py-2">
                  {activeComments.length > 0 && (
                    <div 
                      className="flex items-center justify-center gap-1 text-xs text-secondary bg-tertiary px-2 py-1 rounded-full" 
                      title={`${activeComments.length} active comment(s)`}
                    >
                      <CommentIndicatorIcon />
                      <span>{activeComments.length}</span>
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
