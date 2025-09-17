import React from 'react';
import { Comment, Task, CommentStatus } from '../types';
import { TrashIcon } from './UI';

interface CommentsViewProps {
    comments: Comment[];
    tasks: Task[];
    onDeleteComment: (commentId: string) => void;
}

const getStatusClass = (status: CommentStatus) => {
  switch (status) {
    case CommentStatus.Active: return 'bg-blue-500/80 text-white';
    case CommentStatus.Resolved: return 'bg-green-500/80 text-white';
    case CommentStatus.Discarded: return 'bg-slate-500/80 text-white';
    default: return 'bg-tertiary text-secondary';
  }
}

const CommentsView: React.FC<CommentsViewProps> = ({ comments, tasks, onDeleteComment }) => {
    
    const sortedComments = [...comments].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const getTaskById = (taskId: string) => tasks.find(t => t.id === taskId);

    return (
        <div className="bg-secondary/50 rounded-lg p-4 flex flex-col h-full border border-secondary">
            <h2 className="text-xl font-bold text-secondary mb-3 flex-shrink-0">Project Comments</h2>
            {sortedComments.length === 0 ? (
                <div className="flex-grow flex items-center justify-center text-secondary">
                    <p>No comments yet. Right-click a task on the Kanban board to add one.</p>
                </div>
            ) : (
                <div className="overflow-y-auto flex-grow pr-2 space-y-4">
                    {sortedComments.map(comment => {
                        const task = getTaskById(comment.taskId);
                        return (
                            <div key={comment.id} className="bg-tertiary p-4 rounded-lg border border-secondary relative group">
                                {task && (
                                     <div className="text-xs text-secondary mb-2">
                                        Comment on: <span className="font-bold font-mono bg-secondary px-1.5 py-0.5 rounded">{task.id}</span>
                                        <p className="truncate text-primary">{task.description}</p>
                                    </div>
                                )}
                                <p className="text-primary whitespace-pre-wrap">{comment.content}</p>
                                <div className="text-xs text-secondary mt-3 flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        <span>{new Date(comment.createdAt).toLocaleString()}</span>
                                        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getStatusClass(comment.status)}`}>
                                            {comment.status}
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => {
                                            if (window.confirm('Are you sure you want to delete this comment?')) {
                                                onDeleteComment(comment.id);
                                            }
                                        }}
                                        className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition-opacity"
                                        title="Delete Comment"
                                    >
                                        <TrashIcon />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default CommentsView;