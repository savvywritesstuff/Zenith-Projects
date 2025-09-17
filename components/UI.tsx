import React, { useEffect, useRef } from 'react';
import { Task, TaskStatus, Priority } from '../types';
import { HiQuestionMarkCircle } from 'react-icons/hi2';

// --- ICONS ---
export const PlusIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

export const TrashIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
);

export const EditIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002 2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
);

export const ExpandIcon = () => (
     <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4h4m12 4V4h-4M4 16v4h4m12-4v4h-4" />
    </svg>
);

export const InfoIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

export const FullScreenIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4h4m12 4V4h-4m-8 8v4h4m8-8v4h-4" />
    </svg>
);

export const ExitFullScreenIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4v4m-4-4l5 5M4 4h4v4m-4-4l5 5m0 10H4v-4m4 4l-5-5m15 5h-4v-4m4 4l-5-5" />
    </svg>
);

export const PencilIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z" />
    </svg>
);

export const HelpIcon = () => (
    <HiQuestionMarkCircle className="h-6 w-6" />
);


// --- PROGRESS BAR ---
interface ProgressBarProps {
  tasks: Task[];
}
export const ProgressBar: React.FC<ProgressBarProps> = ({ tasks }) => {
  const totalTasks = tasks.length;
  const doneTasks = tasks.filter(t => t.status === TaskStatus.Done || t.status === TaskStatus.Future).length;
  const progress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  return (
    <div className="w-full bg-slate-700 rounded-full h-4 my-4 relative overflow-hidden">
      <div
        className="bg-gradient-to-r from-cyan-500 to-blue-500 h-4 rounded-full transition-all duration-500 ease-out"
        style={{ width: `${progress}%` }}
      ></div>
      <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">
        {progress}% Complete ({doneTasks}/{totalTasks})
      </span>
    </div>
  );
};


// --- CONTEXT MENU ---
interface ContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  children: React.ReactNode;
}
export const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, onClose, children }) => {
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [onClose]);

    return (
        <div
            ref={menuRef}
            className="absolute z-50 bg-slate-800 border border-slate-600 rounded-md shadow-lg py-2 min-w-[150px]"
            style={{ top: y, left: x }}
        >
            {children}
        </div>
    );
};

// --- TOOLTIP ---
interface InfoTooltipProps {
  children: React.ReactNode;
}
export const InfoTooltip: React.FC<InfoTooltipProps> = ({ children }) => {
  return (
    <div className="relative group flex items-center cursor-help">
      <InfoIcon />
      <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-max max-w-sm
                      bg-slate-700 text-white text-sm rounded-md shadow-lg p-3
                      opacity-0 group-hover:opacity-100 transition-opacity duration-300
                      pointer-events-none z-10 border border-slate-600">
        {children}
        <div className="absolute left-1/2 -translate-x-1/2 bottom-full w-0 h-0
                        border-x-8 border-x-transparent
                        border-b-8 border-b-slate-700"></div>
      </div>
    </div>
  );
};


// --- MODAL ---
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}
export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center">
      <div className="bg-slate-800 rounded-lg shadow-xl w-full max-w-2xl m-4 border border-slate-700">
        <div className="flex justify-between items-center p-4 border-b border-slate-700">
          <h3 className="text-xl font-semibold text-slate-100">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">&times;</button>
        </div>
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
};

// --- TASK EDIT FORM ---
interface EditTaskFormProps {
    task: Task;
    onSave: (updatedTask: Task) => void;
    onCancel: () => void;
}

export const EditTaskForm: React.FC<EditTaskFormProps> = ({ task, onSave, onCancel }) => {
    const [formData, setFormData] = React.useState(task);
    const formRef = React.useRef<HTMLFormElement>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };
    
    const handleKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
        if (e.key === 'Enter' && !(e.target instanceof HTMLTextAreaElement)) {
            e.preventDefault();
            formRef.current?.dispatchEvent(
                new Event("submit", { cancelable: true, bubbles: true })
            );
        }
    };


    return (
        <form ref={formRef} onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="space-y-4">
             <div>
                <label htmlFor="id" className="block text-sm font-medium text-slate-400">Task ID</label>
                <input type="text" name="id" value={formData.id} onChange={handleChange} className="w-full bg-slate-900 border border-slate-600 rounded-md p-2 mt-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
            </div>
            <div>
                <label htmlFor="description" className="block text-sm font-medium text-slate-400">Description</label>
                <textarea name="description" value={formData.description} onChange={handleChange} rows={3} className="w-full bg-slate-900 border border-slate-600 rounded-md p-2 mt-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"></textarea>
            </div>
             <div>
                <label htmlFor="priority" className="block text-sm font-medium text-slate-400">Priority</label>
                <select name="priority" value={formData.priority} onChange={handleChange} className="w-full bg-slate-900 border border-slate-600 rounded-md p-2 mt-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none">
                    {Object.values(Priority).map(p => <option key={p} value={p}>{p}</option>)}
                </select>
            </div>
            <div className="flex justify-end space-x-3 pt-4">
                <button type="button" onClick={onCancel} className="px-4 py-2 bg-slate-600 hover:bg-slate-700 rounded-md transition-colors">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md transition-colors">Save Changes</button>
            </div>
        </form>
    );
};

// --- IMPLEMENT TASK FORM ---
interface ImplementTaskFormProps {
    initialDescription: string;
    existingPhases: string[];
    existingSubPhases: string[];
    allTasks: Task[];
    onSave: (data: { id: string; phase: string; subPhase: string; priority: Priority; description: string; status: TaskStatus }) => void;
    onCancel: () => void;
}

export const ImplementTaskForm: React.FC<ImplementTaskFormProps> = ({ initialDescription, existingPhases, existingSubPhases, allTasks, onSave, onCancel }) => {
    const [formData, setFormData] = React.useState({
        id: '',
        description: initialDescription,
        phase: '',
        subPhase: '',
        priority: Priority.Medium,
        status: TaskStatus.Backlog,
    });
    const formRef = React.useRef<HTMLFormElement>(null);

    React.useEffect(() => {
        const subPhase = formData.subPhase;
        if (subPhase && existingSubPhases.includes(subPhase)) {
            const tasksInSubPhase = allTasks.filter(t => t.subPhase === subPhase);

            if (tasksInSubPhase.length > 0) {
                const sampleId = tasksInSubPhase[0].id;
                const match = sampleId.match(/^([a-zA-Z0-9]+)-(\d+)$/);

                if (match) {
                    const prefix = match[1];
                    let maxNum = 0;
                    
                    allTasks.forEach(t => {
                        const taskMatch = t.id.match(new RegExp(`^${prefix}-(\\d+)$`));
                        if (taskMatch) {
                            const num = parseInt(taskMatch[1], 10);
                            if (num > maxNum) {
                                maxNum = num;
                            }
                        }
                    });
                    
                    const newNum = maxNum + 1;
                    const newId = `${prefix}-${String(newNum).padStart(2, '0')}`;
                    setFormData(prev => ({ ...prev, id: newId }));
                }
            }
        }
    }, [formData.subPhase, allTasks, existingSubPhases]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (formData.id && formData.phase && formData.subPhase && formData.description) {
            if (allTasks.some(task => task.id.toLowerCase() === formData.id.toLowerCase())) {
                 alert(`Task ID "${formData.id}" already exists. Please choose a unique ID.`);
                 return;
            }
            onSave(formData);
        } else {
            alert("Task ID, Phase, Sub-Phase, and Description are required.");
        }
    };
    
    const handleKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
        if (e.key === 'Enter' && !(e.target instanceof HTMLTextAreaElement)) {
            e.preventDefault();
            formRef.current?.dispatchEvent(
                new Event("submit", { cancelable: true, bubbles: true })
            );
        }
    };

    return (
        <form ref={formRef} onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="space-y-4">
            <div>
                <label htmlFor="phase" className="block text-sm font-medium text-slate-400">Phase Name</label>
                <input type="text" list="phases" name="phase" value={formData.phase} onChange={handleChange} placeholder="e.g., Backend" className="w-full bg-slate-900 border border-slate-600 rounded-md p-2 mt-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" required />
                <datalist id="phases">
                    {existingPhases.map(p => <option key={p} value={p} />)}
                </datalist>
            </div>
            <div>
                <label htmlFor="subPhase" className="block text-sm font-medium text-slate-400">Sub-Phase Name</label>
                <input type="text" list="subphases" name="subPhase" value={formData.subPhase} onChange={handleChange} placeholder="e.g., Database" className="w-full bg-slate-900 border border-slate-600 rounded-md p-2 mt-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" required />
                <datalist id="subphases">
                    {existingSubPhases.map(sp => <option key={sp} value={sp} />)}
                </datalist>
            </div>
            <div>
                <label htmlFor="id" className="block text-sm font-medium text-slate-400">Task ID</label>
                <input type="text" name="id" value={formData.id} onChange={handleChange} placeholder="e.g., DB-02 (auto-generates for existing sub-phases)" className="w-full bg-slate-900 border border-slate-600 rounded-md p-2 mt-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" required />
            </div>
            <div>
                <label htmlFor="description" className="block text-sm font-medium text-slate-400">Task Description</label>
                <textarea name="description" value={formData.description} onChange={handleChange} rows={4} className="w-full bg-slate-900 border border-slate-600 rounded-md p-2 mt-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" required></textarea>
            </div>
            <div>
                <label htmlFor="priority" className="block text-sm font-medium text-slate-400">Priority</label>
                <select name="priority" value={formData.priority} onChange={handleChange} className="w-full bg-slate-900 border border-slate-600 rounded-md p-2 mt-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none">
                    {Object.values(Priority).map(p => <option key={p} value={p}>{p}</option>)}
                </select>
            </div>
            <div>
                <label htmlFor="status" className="block text-sm font-medium text-slate-400">Status</label>
                <select name="status" value={formData.status} onChange={handleChange} className="w-full bg-slate-900 border border-slate-600 rounded-md p-2 mt-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none">
                    {Object.values(TaskStatus).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
            </div>
            <div className="flex justify-end space-x-3 pt-4">
                <button type="button" onClick={onCancel} className="px-4 py-2 bg-slate-600 hover:bg-slate-700 rounded-md transition-colors">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md transition-colors">Create Task</button>
            </div>
        </form>
    );
};

// --- HELP DOCUMENTATION ---
export const HelpDocumentation: React.FC = () => (
    <div className="text-slate-300 max-h-[70vh] overflow-y-auto pr-4 markdown-preview">
        <h1>Zenith Help Documentation</h1>
        <p>Welcome to Zenith! Here's a guide to the core features.</p>
        
        <h2>Dashboard</h2>
        <p>This is your main view where you can see all your projects. Click on a project card to open it. You can create new projects or delete existing ones.</p>
        <ul>
            <li><strong>Show Tutorial Project:</strong> Use the checkbox at the top to show or hide the interactive tutorial project.</li>
        </ul>

        <h2>Project View</h2>
        <p>This is where the magic happens. The screen is divided into the Document Panel on the left and the Kanban Board on the right.</p>

        <h3>Document Panel</h3>
        <p>Use the icons at the top to switch between three tabs:</p>
        <ul>
            <li><strong>Planning Document:</strong> A free-form space for high-level ideas, goals, and notes.</li>
            <li><strong>Implementation Plan:</strong> A structured document that is the single source of truth for your Kanban board. Changes here instantly reflect on the board.</li>
            <li><strong>Scratchpad:</strong> A place for quick notes and brainstorming that doesn't affect your project tasks.</li>
        </ul>

        <h3>Implementation Plan Formatting</h3>
        <p>To create tasks, use this specific format:</p>
        <pre className="text-xs bg-slate-900 p-2 rounded font-mono whitespace-pre-wrap">
            <code>
{`# Status (e.g., To-Do, In Progress)
## Phase Name (e.g., Backend)
- SubPhase, Task-ID, Description, Priority`}
            </code>
        </pre>
        <p>Example:</p>
        <pre className="text-xs bg-slate-900 p-2 rounded font-mono whitespace-pre-wrap">
            <code>
{`# To-Do
## Frontend
- UI, UI-05, Design login page, High`}
            </code>
        </pre>
        
        <h2>Kanban Board</h2>
        <ul>
            <li><strong>Drag & Drop:</strong> Move tasks between columns to update their status. This will also update the Implementation Plan document.</li>
            <li><strong>Right-Click:</strong> Right-click a task card to open a menu to Edit or Delete the task.</li>
            <li><strong>Double-Click (Sub-Projects):</strong> Double-click a task to drill down and create a dedicated sub-project for it, complete with its own documents and board.</li>
        </ul>
    </div>
);