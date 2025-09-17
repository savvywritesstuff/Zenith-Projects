import React, { useState, useMemo, useRef } from 'react';
import { KANBAN_COLUMNS } from '../constants';
import { Task, TaskStatus, Priority, Project, Comment, CommentStatus } from '../types';
import { CommentIndicatorIcon, ChevronLeftIcon, ChevronRightIcon, CheckIcon, XIcon } from './UI';


// --- PRIORITY TAG ---
const getPriorityClass = (priority: Priority): string => {
  switch (priority) {
    case Priority.High: return 'bg-red-500/80 text-white';
    case Priority.Medium: return 'bg-yellow-500/80 text-black';
    case Priority.Low: return 'bg-green-500/80 text-white';
    default: return 'bg-slate-500/80 text-white';
  }
};

const PriorityTag: React.FC<{ priority: Priority }> = ({ priority }) => (
  <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getPriorityClass(priority)}`}>
    {priority}
  </span>
);

// --- KANBAN CARD ---
interface KanbanCardProps {
  task: Task;
  project: Project;
  comments: Comment[];
  onDragStart: (e: React.DragEvent<HTMLDivElement>, taskId: string) => void;
  onRightClick: (e: React.MouseEvent<HTMLDivElement>, task: Task) => void;
  onDoubleClick: (task: Task) => void;
  onUpdateCommentStatus: (commentId: string, status: CommentStatus) => void;
}

const KanbanCardComponent: React.FC<KanbanCardProps> = ({ task, project, comments, onDragStart, onRightClick, onDoubleClick, onUpdateCommentStatus }) => {
  const phaseColor = project.phaseColors[task.phase] || '#334155';
  const subPhaseColor = project.subPhaseColors[task.subPhase] || '#475569';

  const cardStyle = {
    background: `linear-gradient(135deg, ${phaseColor} 50%, ${subPhaseColor} 50%)`,
  };

  const [popoverPosition, setPopoverPosition] = useState<{ x: number, y: number } | null>(null);
  const [currentCommentIndex, setCurrentCommentIndex] = useState(0);
  const popoverTimeoutRef = useRef<number | null>(null);

  const activeComments = useMemo(() => comments.filter(c => c.status === CommentStatus.Active), [comments]);
  
  const clearHideTimeout = () => {
    if (popoverTimeoutRef.current) {
      clearTimeout(popoverTimeoutRef.current);
      popoverTimeoutRef.current = null;
    }
  };

  const handleCommentIconMouseEnter = (e: React.MouseEvent) => {
    if (activeComments.length > 0) {
      clearHideTimeout();
      setPopoverPosition({ x: e.clientX, y: e.clientY });
    }
  };

  const handlePopoverAreaMouseLeave = () => {
    popoverTimeoutRef.current = window.setTimeout(() => {
      setPopoverPosition(null);
      setCurrentCommentIndex(0);
    }, 300);
  };
  
  const currentComment = activeComments[currentCommentIndex];

  return (
    <div
      className="relative"
      onMouseLeave={handlePopoverAreaMouseLeave}
      onMouseEnter={clearHideTimeout}
    >
      <div
        draggable
        onDragStart={(e) => onDragStart(e, task.id)}
        onContextMenu={(e) => onRightClick(e, task)}
        onDoubleClick={() => onDoubleClick(task)}
        className="p-1 mb-3 rounded-lg cursor-grab active:cursor-grabbing"
        style={cardStyle}
        data-task-id={task.id}
      >
        <div className="bg-secondary p-3 rounded-md shadow-lg hover:bg-hover transition-colors relative">
          <div className="flex justify-between items-start">
            <span className="text-sm font-bold text-primary break-words max-w-full">{task.description}</span>
          </div>
          <div className="text-xs text-secondary mt-2">
            <span className="font-mono bg-primary px-1.5 py-0.5 rounded mr-2">{task.id}</span>
            <span>{task.phase} / {task.subPhase}</span>
          </div>
          <div className="mt-3 flex justify-between items-center">
            <PriorityTag priority={task.priority} />
             {activeComments.length > 0 && (
                <div 
                  className="flex items-center gap-1 bg-tertiary px-1.5 py-0.5 rounded-full text-xs text-secondary"
                  onMouseEnter={handleCommentIconMouseEnter}
                >
                    <CommentIndicatorIcon />
                    <span>{activeComments.length}</span>
                </div>
              )}
          </div>
        </div>
      </div>

       {popoverPosition && currentComment && (
        <div 
          className="fixed w-72 bg-tertiary rounded-md shadow-xl p-2 z-50 animate-fade-in-up border border-secondary"
          style={{ 
            top: popoverPosition.y + 15, 
            left: popoverPosition.x + 15 
          }}
          onMouseEnter={clearHideTimeout}
        >
             <p className="text-sm text-primary mb-2 whitespace-pre-wrap">{currentComment.content}</p>
             <div className="flex justify-between items-center">
                <div className="flex items-center gap-1">
                    <button 
                        onClick={() => setCurrentCommentIndex(prev => prev - 1)} 
                        disabled={currentCommentIndex === 0}
                        className="p-1 rounded-full hover:bg-hover disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Previous Comment"
                    ><ChevronLeftIcon /></button>
                    <span className="text-xs text-secondary">{currentCommentIndex + 1} / {activeComments.length}</span>
                     <button 
                        onClick={() => setCurrentCommentIndex(prev => prev + 1)} 
                        disabled={currentCommentIndex === activeComments.length - 1}
                        className="p-1 rounded-full hover:bg-hover disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Next Comment"
                    ><ChevronRightIcon /></button>
                </div>
                <div className="flex items-center gap-1">
                     <button 
                        onClick={() => onUpdateCommentStatus(currentComment.id, CommentStatus.Resolved)}
                        className="p-1 rounded-full text-green-400 hover:bg-green-500/20"
                        title="Mark as Resolved"
                    ><CheckIcon /></button>
                     <button 
                        onClick={() => onUpdateCommentStatus(currentComment.id, CommentStatus.Discarded)}
                        className="p-1 rounded-full text-red-400 hover:bg-red-500/20"
                        title="Mark as Discarded"
                    ><XIcon /></button>
                </div>
             </div>
        </div>
      )}
    </div>
  );
};

export const KanbanCard = React.memo(KanbanCardComponent);

// --- KANBAN COLUMN ---
interface KanbanColumnProps {
  status: TaskStatus;
  tasks: Task[];
  project: Project;
  comments: Comment[];
  onDragStart: (e: React.DragEvent<HTMLDivElement>, taskId: string) => void;
  onRightClick: (e: React.MouseEvent<HTMLDivElement>, task: Task) => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>, status: TaskStatus) => void;
  onDoubleClick: (task: Task) => void;
  onUpdateCommentStatus: (commentId: string, status: CommentStatus) => void;
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({ status, tasks, project, comments, onDragStart, onRightClick, onDrop, onDoubleClick, onUpdateCommentStatus }) => {
  const [isOver, setIsOver] = React.useState(false);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsOver(true);
  };
  
  const handleDragLeave = () => setIsOver(false);

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    onDrop(e, status);
    setIsOver(false);
  };
  
  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`flex-shrink-0 w-64 bg-secondary/70 rounded-lg p-3 h-full flex flex-col transition-all duration-300 ${isOver ? 'bg-accent/20 ring-2 ring-accent' : ''}`}
    >
      <h3 className="font-bold text-lg mb-4 px-1 flex items-center text-primary">
        {status}
        <span className="ml-2 text-sm font-normal bg-tertiary text-secondary rounded-full h-6 w-6 flex items-center justify-center">
          {tasks.length}
        </span>
      </h3>
      <div className="overflow-y-auto flex-grow pr-2">
        {tasks.map(task => (
          <KanbanCard 
            key={task.id} 
            task={task} 
            project={project} 
            comments={comments.filter(c => c.taskId === task.id)}
            onDragStart={onDragStart} 
            onRightClick={onRightClick}
            onDoubleClick={onDoubleClick}
            onUpdateCommentStatus={onUpdateCommentStatus}
          />
        ))}
      </div>
    </div>
  );
};

// --- KANBAN BOARD ---
interface KanbanBoardProps {
  tasks: Task[];
  project: Project;
  comments: Comment[];
  onTaskUpdate: (updatedTask: Task) => void;
  onTaskDelete: (taskId: string) => void;
  onTaskMove: (taskId: string, newStatus: TaskStatus) => void;
  onTaskDrillDown: (task: Task) => void;
  onRightClick: (e: React.MouseEvent<HTMLDivElement>, task: Task) => void;
  onUpdateCommentStatus: (commentId: string, status: CommentStatus) => void;
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({ tasks, project, comments, onTaskMove, onTaskDrillDown, onUpdateCommentStatus, ...rest }) => {
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, taskId: string) => {
    e.dataTransfer.setData('taskId', taskId);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, newStatus: TaskStatus) => {
    const taskId = e.dataTransfer.getData('taskId');
    if (taskId) {
      onTaskMove(taskId, newStatus);
    }
  };

  return (
    <div className="flex-grow flex p-1 overflow-x-auto h-full" data-tutorial-id="kanban-board">
      {KANBAN_COLUMNS.map((status, index) => (
        <React.Fragment key={status}>
          <KanbanColumn
            status={status}
            tasks={tasks.filter(task => task.status === status)}
            project={project}
            comments={comments}
            onDragStart={handleDragStart}
            onDrop={handleDrop}
            onDoubleClick={onTaskDrillDown}
            onUpdateCommentStatus={onUpdateCommentStatus}
            {...rest}
          />
          {index < KANBAN_COLUMNS.length - 1 && (
            <div className="w-px bg-tertiary self-stretch flex-shrink-0 mx-2 my-4" />
          )}
        </React.Fragment>
      ))}
    </div>
  );
};