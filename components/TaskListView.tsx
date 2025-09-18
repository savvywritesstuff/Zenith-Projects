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

const ListHeader = () => (
    <div className="flex-shrink-0 flex items-center px-4 py-3 text-xs text-secondary uppercase bg-tertiary border-b border-secondary sticky top-0 z-10 font-semibold">
        <div className="w-24 flex-shrink-0 pr-4">ID</div>
        <div className="flex-1 min-w-0 pr-4">Description</div>
        <div className="w-36 flex-shrink-0 pr-4">Status</div>
        <div className="w-28 flex-shrink-0 pr-4">Priority</div>
        <div className="w-48 flex-shrink-0 pr-4">Phase / Sub-Phase</div>
        <div className="w-20 flex-shrink-0 text-center">Comments</div>
    </div>
);

const TaskRow: React.FC<Omit<TaskListViewProps, 'tasks' | 'project'> & { task: Task, comments: Comment[], phaseColor: string }> = ({ task, comments, onTaskUpdate, onRightClick, onTaskDrillDown, phaseColor }) => {
    const activeComments = comments.filter(c => c.status === CommentStatus.Active);
    
    return (
        <div
            onContextMenu={(e) => onRightClick(e, task)}
            onDoubleClick={() => onTaskDrillDown(task)}
            className="flex items-center border-b border-secondary hover:bg-hover cursor-pointer group text-sm"
            style={{ borderLeft: `4px solid ${phaseColor}` }}
        >
            <div className="w-24 flex-shrink-0 px-4 py-3 font-mono text-secondary group-hover:text-primary truncate">{task.id}</div>
            <div className="flex-1 min-w-0 pr-4 truncate" title={task.description}>{task.description}</div>
            <div className="w-36 flex-shrink-0 pr-4">
                 <select 
                    value={task.status} 
                    onChange={(e) => onTaskUpdate({ ...task, status: e.target.value as TaskStatus })}
                    onClick={(e) => e.stopPropagation()} // Prevent row click when changing status
                    className="w-full bg-primary border border-secondary rounded-md p-1.5 focus:ring-2 focus:ring-accent outline-none text-xs"
                  >
                    {Object.values(TaskStatus).map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
            </div>
            <div className="w-28 flex-shrink-0 pr-4">
                  <select 
                    value={task.priority} 
                    onChange={(e) => onTaskUpdate({ ...task, priority: e.target.value as Priority })}
                    onClick={(e) => e.stopPropagation()}
                    className={`w-full bg-primary border border-secondary rounded-md p-1.5 focus:ring-2 focus:ring-accent outline-none text-xs font-semibold ${getPriorityClass(task.priority)}`}
                  >
                    {Object.values(Priority).map(p => <option key={p} value={p} className="bg-primary text-primary">{p}</option>)}
                  </select>
            </div>
            <div className="w-48 flex-shrink-0 pr-4 truncate">
                <span className="font-semibold">{task.phase}</span>
                <span className="text-secondary"> / {task.subPhase}</span>
            </div>
            <div className="w-20 flex-shrink-0 flex justify-center">
                 {activeComments.length > 0 && (
                    <div 
                      className="flex items-center justify-center gap-1 text-xs text-secondary bg-tertiary px-2 py-1 rounded-full" 
                      title={`${activeComments.length} active comment(s)`}
                    >
                      <CommentIndicatorIcon />
                      <span>{activeComments.length}</span>
                    </div>
                  )}
            </div>
        </div>
    );
};


export const TaskListView: React.FC<TaskListViewProps> = ({ tasks, project, ...props }) => {
  if (tasks.length === 0) {
    return (
      <div className="flex-grow flex items-center justify-center bg-secondary/70 rounded-lg border border-secondary text-secondary">
        <p>No tasks match the current filters.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-secondary/70 rounded-lg border border-secondary text-primary">
      <ListHeader />
      <div className="flex-grow overflow-y-auto">
          {tasks.map(task => (
            <TaskRow
                key={task.id}
                task={task}
                comments={props.comments}
                phaseColor={project.phaseColors[task.phase] || 'var(--color-bg-tertiary)'}
                {...props}
            />
          ))}
      </div>
    </div>
  );
};
