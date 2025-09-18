import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import JSZip from 'jszip';
import { GiGearHammer } from 'react-icons/gi';
import { CiStickyNote } from 'react-icons/ci';
import { HiOutlineClipboardDocumentList, HiChevronDoubleLeft, HiChevronDoubleRight } from 'react-icons/hi2';
import { Project, Task, TaskStatus, Priority, TutorialStep, Theme, THEME_OPTIONS, FontFamily, FONT_FAMILY_OPTIONS, FontSize, FONT_SIZE_OPTIONS, Comment, AppSettings, BackupFrequency, Folder, Label, CommentStatus } from './types';
import { KANBAN_COLUMNS } from './constants';
import { KanbanBoard } from './components/Kanban';
import { TaskListView } from './components/TaskListView';
import { EditableDocumentPanel, implementationPlanHelpText } from './components/Documents';
import CommentsView from './components/CommentsView';
import Tutorial from './components/Tutorial';
import { ProgressBar, ContextMenu, Modal, EditTaskForm, EditIcon, TrashIcon, PlusIcon, ImplementTaskForm, InfoTooltip, HelpIcon, HelpDocumentation, ArchiveIcon, UploadIcon, SettingsIcon, CommentIcon, AddCommentIcon, BackupAllIcon, RestoreIcon, RemoveAllCommentsIcon, ProjectProgressBar, FolderIcon, AddFolderIcon, GridViewIcon, ListViewIcon, CompletedStamp, Confetti, SearchIcon, FilterIcon, ChevronDownIcon, XIcon } from './components/UI';
import { getInitialData, parseImplementationPlan, generateImplementationPlanText, assignColors } from './services/projectService';
import { AppData, saveDataToCookie, loadDataFromCookie, saveSettingsToLocalStorage, loadSettingsFromLocalStorage } from './services/storageService';

type ContextMenuState = {
    x: number;
    y: number;
    content: React.ReactNode;
} | null;

type DocumentType = 'planning' | 'implementation' | 'scratchpad' | 'comments';
type EditableDocumentType = 'planning' | 'implementation' | 'scratchpad';


// --- FILTER DROPDOWN ---
interface FilterDropdownProps {
    options: string[];
    selected: string[];
    onChange: (selected: string[]) => void;
    placeholder: string;
}
const FilterDropdown: React.FC<FilterDropdownProps> = ({ options, selected, onChange, placeholder }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleToggleOption = (option: string) => {
        const newSelected = new Set(selected);
        if (newSelected.has(option)) {
            newSelected.delete(option);
        } else {
            newSelected.add(option);
        }
        onChange(Array.from(newSelected));
    };

    return (
        <div ref={dropdownRef} className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center justify-between w-40 px-3 py-1.5 bg-tertiary border border-secondary rounded-md text-sm text-primary hover:bg-hover transition-colors"
            >
                <span>
                    {placeholder} {selected.length > 0 ? `(${selected.length})` : ''}
                </span>
                <ChevronDownIcon />
            </button>
            {isOpen && (
                <div className="absolute top-full mt-1 w-56 bg-secondary border border-secondary rounded-md shadow-lg z-30 p-2 max-h-60 overflow-y-auto">
                    {options.map(option => (
                        <label key={option} className="flex items-center gap-2 p-1.5 rounded hover:bg-hover cursor-pointer">
                            <input
                                type="checkbox"
                                checked={selected.includes(option)}
                                onChange={() => handleToggleOption(option)}
                                className="w-4 h-4 rounded bg-primary border-secondary text-accent focus:ring-accent focus:ring-offset-secondary"
                            />
                            <span className="text-sm text-primary">{option}</span>
                        </label>
                    ))}
                </div>
            )}
        </div>
    );
};


// --- PROJECT VIEW ---
interface ProjectViewProps {
    project: Project;
    allProjects: Project[];
    updateProject: (updatedProject: Project) => void;
    deleteProject: (projectId: string) => void;
    selectProject: (projectId: string | null) => void;
    onTaskDrillDown: (task: Task) => void;
    isReadOnly: boolean;
}

const TabButton: React.FC<{ title: string; active: boolean; onClick: () => void; children: React.ReactNode; 'data-tutorial-id'?: string }> = ({ title, active, onClick, children, ...props }) => (
    <button 
        onClick={onClick}
        title={title}
        aria-label={title}
        className={`p-2 rounded-md flex-1 flex justify-center items-center transition-colors ${
            active 
            ? 'bg-accent text-accent-text' 
            : 'text-secondary hover:bg-hover'
        }`}
        {...props}
    >
        {children}
    </button>
);

const ProjectView: React.FC<ProjectViewProps> = ({ project, allProjects, updateProject, deleteProject, selectProject, onTaskDrillDown, isReadOnly }) => {
    const [contextMenu, setContextMenu] = useState<ContextMenuState>(null);
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [commentingTask, setCommentingTask] = useState<Task | null>(null);
    const [newComment, setNewComment] = useState('');
    const [isImplementModalOpen, setIsImplementModalOpen] = useState(false);
    const [selectedText, setSelectedText] = useState('');
    
    const [activeTab, setActiveTab] = useState<DocumentType>('planning');
    const [editingTab, setEditingTab] = useState<EditableDocumentType | null>(null);
    const [fullScreenTab, setFullScreenTab] = useState<EditableDocumentType | null>(null);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [isTutorialRunning, setIsTutorialRunning] = useState(false);
    const [isAppearanceModalOpen, setIsAppearanceModalOpen] = useState(false);
    const [confirmRemoveAllCommentsTask, setConfirmRemoveAllCommentsTask] = useState<Task | null>(null);
    const [isCompletionModalOpen, setIsCompletionModalOpen] = useState(false);
    const [commentToDelete, setCommentToDelete] = useState<Comment | null>(null);
    const [taskView, setTaskView] = useState<'board' | 'list'>('board');

    // Filter states
    const [selectedPhases, setSelectedPhases] = useState<string[]>([]);
    const [selectedSubPhases, setSelectedSubPhases] = useState<string[]>([]);
    const [selectedPriorities, setSelectedPriorities] = useState<Priority[]>([]);

    const allPhases = useMemo(() => [...new Set(project.tasks.map(t => t.phase))].sort(), [project.tasks]);
    const allSubPhases = useMemo(() => [...new Set(project.tasks.map(t => t.subPhase))].sort(), [project.tasks]);
    const allPriorities = useMemo(() => Object.values(Priority), []);

    const filteredTasks = useMemo(() => {
        return project.tasks.filter(task => {
            const phaseMatch = selectedPhases.length === 0 || selectedPhases.includes(task.phase);
            const subPhaseMatch = selectedSubPhases.length === 0 || selectedSubPhases.includes(task.subPhase);
            const priorityMatch = selectedPriorities.length === 0 || selectedPriorities.includes(task.priority);
            return phaseMatch && subPhaseMatch && priorityMatch;
        });
    }, [project.tasks, selectedPhases, selectedSubPhases, selectedPriorities]);

    const clearFilters = () => {
        setSelectedPhases([]);
        setSelectedSubPhases([]);
        setSelectedPriorities([]);
    };

    const filtersAreActive = selectedPhases.length > 0 || selectedSubPhases.length > 0 || selectedPriorities.length > 0;

    useEffect(() => {
        if (isReadOnly || project.completionNotified) return;

        const totalTasks = project.tasks.length;
        if (totalTasks === 0) return;

        const doneTasks = project.tasks.filter(t => t.status === TaskStatus.Done || t.status === TaskStatus.Future).length;
        const progress = Math.round((doneTasks / totalTasks) * 100);

        if (progress === 100) {
            setIsCompletionModalOpen(true);
            updateProject({ ...project, completionNotified: true });
        }
    }, [project.tasks, project.completionNotified, isReadOnly, updateProject, project]);

    const tutorialSteps = useMemo<TutorialStep[]>(() => [
        {
            elementSelector: '[data-tutorial-id="project-title"]',
            title: 'Welcome to the Interactive Tutorial!',
            content: 'This guided tour will walk you through the key features of Zenith. Click "Next" to begin.',
            position: 'bottom',
        },
        {
            elementSelector: '[data-tutorial-id="document-panel"]',
            title: 'The Document Panel',
            content: 'This is your mission control. You have several tabs for managing your project.',
            position: 'right',
        },
        {
            elementSelector: '[data-tutorial-id="implementation-tab"]',
            title: 'The Implementation Plan',
            content: "This is the heart of Zenith. It's a structured text document that is the *single source of truth* for your Kanban board.",
            position: 'bottom',
            action: () => setActiveTab('implementation'),
        },
        {
            elementSelector: '[data-tutorial-id="implementation-editor"]',
            title: 'Plan & Board in Sync',
            content: "Any changes you make here—like editing this task's text—will instantly update the corresponding card on the Kanban board to the right.",
            position: 'right',
        },
         {
            elementSelector: '[data-tutorial-id="kanban-board"]',
            title: 'The Kanban Board',
            content: 'This board is a visual representation of your Implementation Plan. Tasks are automatically placed in the correct columns based on your document.',
            position: 'left',
        },
        {
            elementSelector: '[data-task-id="TUT-03"]',
            title: 'Drag & Drop',
            content: "You can change a task's status by dragging it to a new column. Try it! Notice how the Implementation Plan document will update automatically.",
            position: 'left',
        },
         {
            elementSelector: '[data-task-id="TUT-05"]',
            title: 'Sub-Projects',
            content: 'For complex tasks, you can double-click a card to create an entire sub-project for it, with its own documents and board. This is great for breaking down large pieces of work.',
            position: 'left',
        },
        {
            elementSelector: '[data-tutorial-id="back-to-dashboard"]',
            title: 'You\'re All Set!',
            content: "That's a quick tour of Zenith's core features. Feel free to explore and build something amazing. Click here to return to the dashboard when you're done.",
            position: 'bottom',
        },
    ], []);

    useEffect(() => {
        // When switching document tabs, automatically exit edit mode.
        // The content is already saved in the state on every change.
        setEditingTab(null);
    }, [activeTab]);


    useEffect(() => {
        if (isReadOnly) return;
        const newTasksFromPlan = parseImplementationPlan(project.implementationPlan);
        const mergedTasks = newTasksFromPlan.map(newTask => {
            const existingTask = project.tasks.find(t => t.id === newTask.id);
            return { ...newTask, subProjectId: existingTask?.subProjectId };
        });
        const { phaseColors, subPhaseColors } = assignColors(mergedTasks, project.phaseColors, project.subPhaseColors, project.theme || 'dark');
        if (JSON.stringify(mergedTasks) !== JSON.stringify(project.tasks) || 
            JSON.stringify(phaseColors) !== JSON.stringify(project.phaseColors) ||
            JSON.stringify(subPhaseColors) !== JSON.stringify(project.subPhaseColors)) {
            updateProject({ ...project, tasks: mergedTasks, phaseColors, subPhaseColors });
        }
    }, [project.implementationPlan, project.tasks, project.phaseColors, project.subPhaseColors, project.theme, updateProject, isReadOnly]);

    const updateTasksAndPlan = useCallback((newTasks: Task[]) => {
        if (isReadOnly) return;
        const newPlan = generateImplementationPlanText(newTasks);
        const { phaseColors, subPhaseColors } = assignColors(newTasks, project.phaseColors, project.subPhaseColors, project.theme || 'dark');
        updateProject({ ...project, tasks: newTasks, implementationPlan: newPlan, phaseColors, subPhaseColors });
    }, [project, updateProject, isReadOnly]);

    const handleContentChange = useCallback((docType: EditableDocumentType, content: string) => {
        if (isReadOnly) return;
        switch (docType) {
            case 'planning':
                updateProject({ ...project, planningDocument: content });
                break;
            case 'implementation':
                updateProject({ ...project, implementationPlan: content });
                break;
            case 'scratchpad':
                updateProject({ ...project, scratchpad: content });
                break;
        }
    }, [project, updateProject, isReadOnly]);
    

    const handleTextSelection = (text: string) => {
      if (isReadOnly) return;
      setSelectedText(text);
    }

    const handleContextMenu = (e: React.MouseEvent) => {
        if (selectedText && !isReadOnly) {
            e.preventDefault();
            setContextMenu({
                x: e.clientX, y: e.clientY,
                content: (
                    <button onClick={() => { setIsImplementModalOpen(true); setContextMenu(null); }}
                        className="block w-full text-left px-4 py-2 text-sm text-primary hover:bg-hover">
                        Implement Task
                    </button>
                ),
            });
        }
    };
    
    const handleCreateTaskFromSelection = (taskData: { id: string; phase: string; subPhase: string; priority: Priority; description: string; status: TaskStatus; }) => {
        if (isReadOnly) return;
        const newTask: Task = {
            id: taskData.id.trim(),
            description: taskData.description.replace(/\n/g, ' '),
            status: taskData.status,
            phase: taskData.phase.trim(),
            subPhase: taskData.subPhase.trim(),
            priority: taskData.priority,
        };
        updateTasksAndPlan([...project.tasks, newTask]);
        setIsImplementModalOpen(false);
        setSelectedText('');
    };
    
    const handleTaskMove = (taskId: string, newStatus: TaskStatus) => {
        if (isReadOnly) return;
        const newTasks = project.tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t);
        updateTasksAndPlan(newTasks);
    };

    const handleTaskRightClick = (e: React.MouseEvent, task: Task) => {
        e.preventDefault();
        if (isReadOnly) return;
        setContextMenu({
            x: e.clientX, y: e.clientY,
            content: (
                <>
                    <button onClick={() => { setEditingTask(task); setContextMenu(null); }}
                        className="flex items-center w-full text-left px-4 py-2 text-sm text-primary hover:bg-hover">
                        <EditIcon /> Edit Task
                    </button>
                    <button onClick={() => { setCommentingTask(task); setContextMenu(null); }}
                        className="flex items-center w-full text-left px-4 py-2 text-sm text-primary hover:bg-hover">
                        <AddCommentIcon /> Add Comment
                    </button>
                     <button onClick={() => { setConfirmRemoveAllCommentsTask(task); setContextMenu(null); }}
                        className="flex items-center w-full text-left px-4 py-2 text-sm text-primary hover:bg-hover">
                        <RemoveAllCommentsIcon /> Remove All Comments
                    </button>
                    <button onClick={() => handleTaskDelete(task.id)}
                        className="flex items-center w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-hover">
                        <TrashIcon /> Delete Task
                    </button>
                     <div className="border-t border-primary/20 my-1"></div>
                     <div className="px-4 pt-2 pb-1 text-xs text-secondary">Change Status</div>
                     {KANBAN_COLUMNS.map(status => (
                        <button
                            key={status}
                            disabled={task.status === status}
                            onClick={() => {
                                handleTaskMove(task.id, status);
                                setContextMenu(null);
                            }}
                            className="block w-full text-left px-4 py-2 text-sm text-primary hover:bg-hover disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {status}
                        </button>
                     ))}
                </>
            ),
        });
    };

    const handleTaskUpdate = (updatedTask: Task) => {
        if (isReadOnly) return;
        const newTasks = project.tasks.map(t => t.id === updatedTask.id ? updatedTask : t);
        updateTasksAndPlan(newTasks);
        setEditingTask(null);
    };

    const handleTaskDelete = (taskId: string) => {
        if (isReadOnly) return;
        const newTasks = project.tasks.filter(t => t.id !== taskId);
        const newComments = project.comments.filter(c => c.taskId !== taskId);
        const newPlan = generateImplementationPlanText(newTasks);
        const { phaseColors, subPhaseColors } = assignColors(newTasks, project.phaseColors, project.subPhaseColors, project.theme || 'dark');
        updateProject({ ...project, tasks: newTasks, implementationPlan: newPlan, phaseColors, subPhaseColors, comments: newComments });
        setContextMenu(null);
    };

    const handleAddComment = () => {
        if (isReadOnly || !commentingTask || !newComment.trim()) return;

        const comment: Comment = {
            id: `comment-${Date.now()}`,
            taskId: commentingTask.id,
            content: newComment.trim(),
            createdAt: new Date().toISOString(),
            status: CommentStatus.Active,
        };
        const updatedComments = [...project.comments, comment];
        updateProject({ ...project, comments: updatedComments });
        
        setCommentingTask(null);
        setNewComment('');
    };

    const handleDeleteComment = (commentId: string) => {
        if (isReadOnly) return;
        const updatedComments = project.comments.filter(c => c.id !== commentId);
        updateProject({ ...project, comments: updatedComments });
    };

    const handleRequestDeleteComment = (comment: Comment) => {
        if (isReadOnly) return;
        setCommentToDelete(comment);
    };

    const handleConfirmDeleteComment = () => {
        if (!commentToDelete) return;
        handleDeleteComment(commentToDelete.id);
        setCommentToDelete(null);
    };

    const handleConfirmRemoveAllComments = () => {
        if (isReadOnly || !confirmRemoveAllCommentsTask) return;
        const updatedComments = project.comments.filter(c => c.taskId !== confirmRemoveAllCommentsTask.id);
        updateProject({ ...project, comments: updatedComments });
        setConfirmRemoveAllCommentsTask(null);
    };

    const handleUpdateCommentStatus = useCallback((commentId: string, status: CommentStatus) => {
        if (isReadOnly) return;
        const updatedComments = project.comments.map(c => 
            c.id === commentId ? { ...c, status } : c
        );
        updateProject({ ...project, comments: updatedComments });
    }, [project, updateProject, isReadOnly]);


    const parentProject = allProjects.find(p => p.id !== project.id && p.tasks.some(t => t.subProjectId === project.id));

    const getDocumentProps = useCallback((docType: EditableDocumentType) => {
        const baseProps = {
            docType,
            isEditing: isReadOnly ? false : editingTab === docType,
            onToggleEdit: isReadOnly ? () => {} : () => setEditingTab(prev => (prev === docType ? null : docType)),
            isFullScreen: fullScreenTab === docType,
            onToggleFullScreen: () => setFullScreenTab(prev => (prev === docType ? null : docType)),
        };

        switch(docType) {
            case 'planning':
                return { ...baseProps, title: "Planning Document", content: project.planningDocument, onContentChange: (c: string) => handleContentChange('planning', c), onTextSelection: handleTextSelection, onContextMenu: handleContextMenu };
            case 'implementation':
                return { ...baseProps, title: "Implementation Plan", content: project.implementationPlan, onContentChange: (c: string) => handleContentChange('implementation', c), allTasks: project.tasks, accessory: <InfoTooltip>{implementationPlanHelpText}</InfoTooltip> };
            case 'scratchpad':
                return { ...baseProps, title: "Scratchpad", content: project.scratchpad, onContentChange: (c: string) => handleContentChange('scratchpad', c) };
        }
    }, [project, editingTab, fullScreenTab, handleContentChange, isReadOnly]);

    const handleRestore = () => {
        updateProject({ ...project, isArchived: false, folderId: null });
        selectProject(null); // Go back to dashboard after restoring
    }

    return (
        <div className={`h-screen w-screen flex flex-col p-4 bg-primary overflow-hidden ${isReadOnly ? 'pt-12' : ''}`}>
             {isReadOnly && (
                <div className="absolute top-0 left-0 right-0 bg-yellow-600/90 text-white text-center p-2 text-sm z-50 flex items-center justify-center shadow-lg">
                    This project is archived (Read-Only). 
                    <button onClick={handleRestore} className="ml-4 font-bold underline hover:text-yellow-200 transition-colors">Restore Project</button>
                </div>
            )}
            {isTutorialRunning && project.id === 'proj-tutorial' && (
                <Tutorial steps={tutorialSteps} onComplete={() => setIsTutorialRunning(false)} />
            )}
            <header className="flex-shrink-0">
                 <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <h1 className="text-3xl font-bold special-text-gradient-alt" data-tutorial-id="project-title">
                            {project.name}
                        </h1>
                         <button onClick={() => setIsAppearanceModalOpen(true)} title="Appearance Settings" className="text-secondary hover:text-primary transition-colors">
                           <SettingsIcon />
                        </button>
                        {project.id === 'proj-tutorial' && !isTutorialRunning && (
                            <button 
                                onClick={() => setIsTutorialRunning(true)}
                                className="px-4 py-1.5 text-sm bg-accent hover:bg-accent-hover rounded-lg transition-colors animate-pulse text-accent-text"
                            >
                                Start Tutorial
                            </button>
                        )}
                    </div>
                     {parentProject ? (
                        <button onClick={() => selectProject(parentProject.id)} className="px-4 py-2 text-sm bg-tertiary hover:bg-hover rounded-lg transition-colors">
                            &larr; Back to Parent: {parentProject.name}
                        </button>
                     ) : (
                        <button onClick={() => selectProject(null)} className="px-4 py-2 text-sm bg-tertiary hover:bg-hover rounded-lg transition-colors" data-tutorial-id="back-to-dashboard">
                            &larr; Back to Dashboard
                        </button>
                     )}
                </div>
                <ProgressBar tasks={project.tasks} />
            </header>
            <main className="flex-grow flex min-h-0 relative">
                <button
                    onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                    title={isSidebarCollapsed ? 'Show sidebar' : 'Collapse sidebar'}
                    aria-label={isSidebarCollapsed ? 'Show sidebar' : 'Collapse sidebar'}
                    className="absolute top-1/2 -translate-y-1/2 z-20 bg-secondary text-secondary hover:bg-hover p-2 rounded-full border border-secondary transition-all duration-300"
                    style={{ left: isSidebarCollapsed ? '0' : 'calc(33.3333% - 1rem)', transition: 'left 0.3s ease-in-out' }}
                >
                    {isSidebarCollapsed ? <HiChevronDoubleRight className="h-5 w-5" /> : <HiChevronDoubleLeft className="h-5 w-5" />}
                </button>

                <div className={`transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'w-0' : 'w-1/3'}`} data-tutorial-id="document-panel">
                    <div className={`h-full flex flex-col gap-2 transition-opacity duration-150 ${isSidebarCollapsed ? 'opacity-0 invisible' : 'opacity-100'}`}>
                        <div className="flex-shrink-0 flex items-center bg-secondary/50 rounded-lg p-1 border border-secondary gap-1">
                            <TabButton data-tutorial-id="planning-tab" title="Planning Document" active={activeTab === 'planning'} onClick={() => setActiveTab('planning')}>
                                <HiOutlineClipboardDocumentList className="w-7 h-7" />
                            </TabButton>
                            <TabButton data-tutorial-id="implementation-tab" title="Implementation Plan" active={activeTab === 'implementation'} onClick={() => setActiveTab('implementation')}>
                                <GiGearHammer className="w-7 h-7" />
                            </TabButton>
                            <TabButton title="Scratchpad" active={activeTab === 'scratchpad'} onClick={() => setActiveTab('scratchpad')}>
                                <CiStickyNote className="w-7 h-7" />
                            </TabButton>
                             <TabButton title="Comments" active={activeTab === 'comments'} onClick={() => setActiveTab('comments')}>
                                <CommentIcon />
                            </TabButton>
                        </div>
                        <div className="flex-grow min-h-0" data-tutorial-id="implementation-editor">
                           {activeTab === 'comments' ? (
                                <CommentsView 
                                    comments={project.comments} 
                                    tasks={project.tasks} 
                                    onRequestDeleteComment={handleRequestDeleteComment} 
                                    onUpdateCommentStatus={handleUpdateCommentStatus} 
                                />
                           ) : (
                                <EditableDocumentPanel {...getDocumentProps(activeTab as EditableDocumentType)} />
                           )}
                        </div>
                    </div>
                </div>
                <div className={`flex flex-col flex-grow transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'w-full pl-6' : 'w-2/3 pl-4'}`}>
                    {!isReadOnly && (
                        <div className="flex-shrink-0 flex items-center gap-2 p-2 mb-2 bg-secondary/70 rounded-lg border border-secondary">
                            <FilterIcon />
                            <span className="text-sm font-semibold text-secondary">Filter by:</span>
                            <FilterDropdown options={allPhases} selected={selectedPhases} onChange={setSelectedPhases} placeholder="Phase" />
                            <FilterDropdown options={allSubPhases} selected={selectedSubPhases} onChange={setSelectedSubPhases} placeholder="Sub-Phase" />
                            <FilterDropdown options={allPriorities} selected={selectedPriorities} onChange={(p) => setSelectedPriorities(p as Priority[])} placeholder="Priority" />
                            <div className="flex-grow" />
                            {filtersAreActive && (
                                <button onClick={clearFilters} className="flex items-center gap-1 text-sm text-secondary hover:text-primary transition-colors px-2 py-1 rounded-md hover:bg-hover">
                                    <XIcon /> Clear
                                </button>
                            )}
                             <div className="h-5 w-px bg-tertiary mx-2" />
                             <button
                                onClick={() => setTaskView('board')}
                                title="Board View"
                                className={`p-1.5 rounded-md transition-colors ${taskView === 'board' ? 'bg-accent text-accent-text' : 'text-secondary hover:bg-hover'}`}
                            >
                                <GridViewIcon />
                            </button>
                            <button
                                onClick={() => setTaskView('list')}
                                title="List View"
                                className={`p-1.5 rounded-md transition-colors ${taskView === 'list' ? 'bg-accent text-accent-text' : 'text-secondary hover:bg-hover'}`}
                            >
                                <ListViewIcon />
                            </button>
                        </div>
                    )}
                    <div className="flex-grow min-h-0">
                         {taskView === 'board' ? (
                            <KanbanBoard
                                tasks={filteredTasks}
                                project={project}
                                comments={project.comments}
                                onTaskUpdate={handleTaskUpdate}
                                onTaskDelete={handleTaskDelete}
                                onTaskMove={handleTaskMove}
                                onRightClick={handleTaskRightClick}
                                onTaskDrillDown={onTaskDrillDown}
                                onUpdateCommentStatus={handleUpdateCommentStatus}
                            />
                         ) : (
                            <TaskListView
                                tasks={filteredTasks}
                                project={project}
                                comments={project.comments}
                                onTaskUpdate={handleTaskUpdate}
                                onRightClick={handleTaskRightClick}
                                onTaskDrillDown={onTaskDrillDown}
                            />
                         )}
                    </div>
                </div>
            </main>
            {contextMenu && (
                <ContextMenu x={contextMenu.x} y={contextMenu.y} onClose={() => setContextMenu(null)}>
                    {contextMenu.content}
                </ContextMenu>
            )}
            <Modal isOpen={!!editingTask} onClose={() => setEditingTask(null)} title="Edit Task">
                {editingTask && <EditTaskForm task={editingTask} onSave={handleTaskUpdate} onCancel={() => setEditingTask(null)} />}
            </Modal>
             <Modal isOpen={!!commentingTask} onClose={() => setCommentingTask(null)} title={`Add Comment to ${commentingTask?.id}`}>
                <div className="space-y-4">
                    <textarea
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Write your comment here..."
                        rows={4}
                        className="w-full bg-primary border border-secondary rounded-md p-2 focus:ring-2 focus:ring-accent outline-none"
                        autoFocus
                    />
                    <div className="flex justify-end space-x-3">
                        <button onClick={() => setCommentingTask(null)} className="px-4 py-2 bg-tertiary hover:bg-hover rounded-md transition-colors">Cancel</button>
                        <button onClick={handleAddComment} className="px-4 py-2 bg-accent hover:bg-accent-hover text-accent-text rounded-md transition-colors">Save Comment</button>
                    </div>
                </div>
            </Modal>
            <Modal isOpen={isImplementModalOpen} onClose={() => setIsImplementModalOpen(false)} title="Implement New Task">
                 {isImplementModalOpen && <ImplementTaskForm 
                    initialDescription={selectedText}
                    existingPhases={[...new Set(project.tasks.map(t => t.phase))]}
                    existingSubPhases={[...new Set(project.tasks.map(t => t.subPhase))]}
                    allTasks={project.tasks}
                    onSave={handleCreateTaskFromSelection}
                    onCancel={() => setIsImplementModalOpen(false)}
                />}
            </Modal>
             <Modal isOpen={isAppearanceModalOpen} onClose={() => setIsAppearanceModalOpen(false)} title="Appearance Settings">
                 <div className="space-y-4">
                    <div>
                        <label htmlFor="theme-select" className="block text-sm font-medium text-secondary mb-2">
                            Color Theme
                        </label>
                        <select
                            id="theme-select"
                            value={project.theme || 'dark'}
                            onChange={(e) => {
                                const newTheme = e.target.value as Theme;
                                // Force-regenerate all colors from scratch using the new theme's palette
                                const { phaseColors, subPhaseColors } = assignColors(project.tasks, {}, {}, newTheme);
                                updateProject({ ...project, theme: newTheme, phaseColors, subPhaseColors });
                            }}
                            className="w-full bg-primary border border-secondary rounded-md p-2 focus:ring-2 focus:ring-accent outline-none"
                        >
                            {THEME_OPTIONS.map(option => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="font-family-select" className="block text-sm font-medium text-secondary mb-2">
                            Font Family
                        </label>
                        <select
                            id="font-family-select"
                            value={project.fontFamily || 'sans'}
                            onChange={(e) => updateProject({ ...project, fontFamily: e.target.value as FontFamily })}
                            className="w-full bg-primary border border-secondary rounded-md p-2 focus:ring-2 focus:ring-accent outline-none"
                        >
                            {FONT_FAMILY_OPTIONS.map(option => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                        </select>
                    </div>
                     <div>
                        <label htmlFor="font-size-select" className="block text-sm font-medium text-secondary mb-2">
                            Font Size
                        </label>
                        <select
                            id="font-size-select"
                            value={project.fontSize || 'base'}
                            onChange={(e) => updateProject({ ...project, fontSize: e.target.value as FontSize })}
                            className="w-full bg-primary border border-secondary rounded-md p-2 focus:ring-2 focus:ring-accent outline-none"
                        >
                            {FONT_SIZE_OPTIONS.map(option => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </Modal>
             <Modal isOpen={!!confirmRemoveAllCommentsTask} onClose={() => setConfirmRemoveAllCommentsTask(null)} title={`Remove all comments from ${confirmRemoveAllCommentsTask?.id}?`}>
                <div className="space-y-4">
                    <p className="text-primary">Are you sure you want to permanently delete all comments on this task? This action cannot be undone.</p>
                    <div className="flex justify-end space-x-3 pt-4">
                        <button onClick={() => setConfirmRemoveAllCommentsTask(null)} className="px-4 py-2 bg-tertiary hover:bg-hover rounded-md transition-colors">Cancel</button>
                        <button onClick={handleConfirmRemoveAllComments} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors">
                           Delete All
                        </button>
                    </div>
                </div>
            </Modal>
            {fullScreenTab && (
                <EditableDocumentPanel {...getDocumentProps(fullScreenTab)} />
            )}
             <Modal isOpen={isCompletionModalOpen} onClose={() => setIsCompletionModalOpen(false)} title="Congratulations!">
                <Confetti />
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-primary mb-2">Project Completed!</h2>
                    <p className="text-secondary mb-6">You've finished all tasks in "{project.name}". What's next?</p>
                    <div className="flex justify-center gap-4">
                        <button 
                            onClick={() => {
                                updateProject({ ...project, isArchived: true });
                                selectProject(null);
                            }}
                            className="px-4 py-2 bg-tertiary hover:bg-hover rounded-md transition-colors"
                        >
                            Archive Project
                        </button>
                        <button 
                            onClick={() => deleteProject(project.id)}
                            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors"
                        >
                            Delete Project
                        </button>
                         <button 
                            onClick={() => setIsCompletionModalOpen(false)}
                            className="px-4 py-2 bg-accent hover:bg-accent-hover text-accent-text rounded-md transition-colors"
                        >
                            Keep on Dashboard
                        </button>
                    </div>
                </div>
            </Modal>
            <Modal isOpen={!!commentToDelete} onClose={() => setCommentToDelete(null)} title="Delete Comment?">
                {commentToDelete && (
                    <div className="space-y-4">
                        <p className="text-primary">Are you sure you want to permanently delete this comment?</p>
                        <blockquote className="border-l-4 border-secondary pl-4 text-secondary italic whitespace-pre-wrap">
                            {commentToDelete.content}
                        </blockquote>
                        <div className="flex justify-end space-x-3 pt-4">
                            <button onClick={() => setCommentToDelete(null)} className="px-4 py-2 bg-tertiary hover:bg-hover rounded-md transition-colors">Cancel</button>
                            <button onClick={handleConfirmDeleteComment} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors">
                               Delete
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

// --- IMPORT FORM ---
type ImportData = {
    targetProjectId: string | 'new';
    newProjectName?: string;
    documents: {
        planningDocument: string;
        implementationPlan: string;
        scratchpad: string;
    };
};
interface ImportProjectFormProps {
    projects: Project[];
    onImport: (data: ImportData) => void;
    onCancel: () => void;
}

const ImportProjectForm: React.FC<ImportProjectFormProps> = ({ projects, onImport, onCancel }) => {
    const [targetProjectId, setTargetProjectId] = useState<string | 'new'>('new');
    const [newProjectName, setNewProjectName] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleFileRead = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event) => resolve(event.target?.result as string);
            reader.onerror = (error) => reject(error);
            reader.readAsText(file);
        });
    };

    const handleImportFromZip = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsLoading(true);
        setError(null);
        try {
            const zip = await JSZip.loadAsync(file);
            const planningDocument = await zip.file('planning_document.md')?.async('string') ?? '';
            const implementationPlan = await zip.file('implementation_plan.md')?.async('string') ?? '';
            const scratchpad = await zip.file('scratchpad.md')?.async('string') ?? '';
            
            handleSubmit({ planningDocument, implementationPlan, scratchpad });

        } catch (err) {
            setError('Failed to read the ZIP file. Please ensure it is a valid backup.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleSubmit = (documents: ImportData['documents']) => {
        if (targetProjectId === 'new' && !newProjectName.trim()) {
            setError('Please provide a name for the new project.');
            return;
        }
        onImport({
            targetProjectId,
            newProjectName,
            documents,
        });
    };


    return (
         <div className="space-y-4">
            {error && <p className="text-red-400 bg-red-900/50 p-3 rounded-md">{error}</p>}
             <div>
                <label className="block text-sm font-medium text-secondary mb-1">Target Project</label>
                <select 
                    value={targetProjectId}
                    onChange={(e) => setTargetProjectId(e.target.value)}
                    className="w-full bg-primary border border-secondary rounded-md p-2 focus:ring-2 focus:ring-accent outline-none"
                >
                    <option value="new">-- Create New Project --</option>
                    {projects.filter(p => p.id !== 'proj-tutorial').map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                </select>
            </div>

            {targetProjectId === 'new' && (
                 <div>
                    <label className="block text-sm font-medium text-secondary mb-1">New Project Name</label>
                    <input
                        type="text"
                        value={newProjectName}
                        onChange={(e) => setNewProjectName(e.target.value)}
                        placeholder="Enter name for the new project"
                        className="w-full bg-primary border border-secondary rounded-md p-2 focus:ring-2 focus:ring-accent outline-none"
                    />
                </div>
            )}
            
            <div>
                 <label className="block text-sm font-medium text-secondary mb-2">Import from Backup (.zip)</label>
                 <input
                    type="file"
                    accept=".zip"
                    onChange={handleImportFromZip}
                    disabled={isLoading}
                    className="w-full text-sm text-secondary file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-tertiary file:text-primary hover:file:bg-hover"
                 />
                 <p className="text-xs text-secondary mt-1">Select a .zip file created from the backup option.</p>
            </div>
             <div className="flex justify-end pt-4">
                 <button onClick={onCancel} className="px-4 py-2 bg-tertiary hover:bg-hover rounded-md transition-colors">
                     {isLoading ? 'Close' : 'Cancel'}
                 </button>
            </div>
         </div>
    );
};


// --- DASHBOARD VIEW ---
interface DashboardProps {
    appData: AppData;
    settings: AppSettings;
    onUpdateProject: (project: Project) => void;
    onUpdateAppData: (data: Partial<AppData>) => void;
    onUpdateSettings: (settings: Partial<AppSettings>) => void;
    onSelectProject: (id: string) => void;
    onAddProject: (name: string, folderId: string | null) => void;
    onDeleteProject: (id: string) => void;
    onImportProject: (data: ImportData) => void;
    showTutorial: boolean;
    setShowTutorial: (show: boolean) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ appData, settings, onUpdateProject, onUpdateAppData, onUpdateSettings, onSelectProject, onAddProject, onDeleteProject, onImportProject, showTutorial, setShowTutorial }) => {
    const { projects, folders, labels } = appData;
    const [showAddModal, setShowAddModal] = useState(false);
    const [newProjectName, setNewProjectName] = useState('');
    const [isHelpOpen, setIsHelpOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
    const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number; project: Project } | null>(null);
    const [editingProject, setEditingProject] = useState<Project | null>(null);
    const [updatedProjectName, setUpdatedProjectName] = useState('');
    const [isArchiveView, setIsArchiveView] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    
    const [viewType, setViewType] = useState<'grid' | 'list'>('grid');
    const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
    const [isAddFolderModalOpen, setIsAddFolderModalOpen] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [moveProjectModal, setMoveProjectModal] = useState<Project | null>(null);

    const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
    const [dragOverId, setDragOverId] = useState<string | null>(null);

    const handleDragStart = (e: React.DragEvent, projectId: string) => {
        e.dataTransfer.setData("projectId", projectId);
        // Use timeout to allow DOM to update before hiding the original element
        setTimeout(() => {
            setDraggedItemId(projectId);
        }, 0);
    };

    const handleDragEnd = () => {
        setDraggedItemId(null);
        setDragOverId(null);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault(); // Necessary to allow drop
    };

    const handleDragEnter = (e: React.DragEvent, id: string) => {
        e.preventDefault();
        if (id !== draggedItemId) {
            setDragOverId(id);
        }
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOverId(null);
    };

    const handleDrop = (e: React.DragEvent, target: { type: 'folder' | 'project' | 'breadcrumb', id: string | null }) => {
        e.preventDefault();
        const draggedProjectId = e.dataTransfer.getData("projectId");
        if (!draggedProjectId) return;

        if (target.type === 'folder') {
            const project = projects.find(p => p.id === draggedProjectId);
            if (project && project.folderId !== target.id) {
                onUpdateProject({ ...project, folderId: target.id as string });
            }
        } else if (target.type === 'breadcrumb') {
            const project = projects.find(p => p.id === draggedProjectId);
            if (project && project.folderId !== null) {
                onUpdateProject({ ...project, folderId: null });
            }
        } else if (target.type === 'project') {
            if (draggedProjectId === target.id) return;

            const newProjects = [...projects];
            const draggedIdx = newProjects.findIndex(p => p.id === draggedProjectId);
            const targetIdx = newProjects.findIndex(p => p.id === target.id);
            
            if (draggedIdx > -1 && targetIdx > -1 && newProjects[draggedIdx].folderId === newProjects[targetIdx].folderId) {
                const [draggedItem] = newProjects.splice(draggedIdx, 1);
                newProjects.splice(targetIdx, 0, draggedItem);
                onUpdateAppData({ projects: newProjects });
            }
        }

        handleDragEnd(); // Reset state
    };


    const handleAddProject = () => {
        if (newProjectName.trim()) {
            onAddProject(newProjectName.trim(), currentFolderId);
            setNewProjectName('');
            setShowAddModal(false);
        }
    };
    
    const handleAddFolder = () => {
        if (newFolderName.trim()) {
            const newFolder: Folder = {
                id: `folder-${Date.now()}`,
                name: newFolderName.trim(),
            };
            onUpdateAppData({ folders: [...folders, newFolder] });
            setNewFolderName('');
            setIsAddFolderModalOpen(false);
        }
    };

    const handleMoveProject = (targetFolderId: string | null) => {
        if (!moveProjectModal) return;
        onUpdateProject({ ...moveProjectModal, folderId: targetFolderId });
        setMoveProjectModal(null);
    };

    const handleContextMenu = (e: React.MouseEvent, project: Project) => {
        e.preventDefault();
        setContextMenu({ x: e.clientX, y: e.clientY, project });
    };

    const handleRenameProject = () => {
        if (editingProject && updatedProjectName.trim()) {
            onUpdateProject({ ...editingProject, name: updatedProjectName.trim() });
            setEditingProject(null);
            setUpdatedProjectName('');
        }
    };
    
    const handleArchiveProject = (project: Project) => {
        onUpdateProject({ ...project, isArchived: true });
        setContextMenu(null);
    };

    const handleRestoreProject = (project: Project) => {
        onUpdateProject({ ...project, isArchived: false, folderId: null });
        setContextMenu(null);
    }
    
    const mainProjects = projects.filter(p => {
        const isSubProject = projects.some(parent => parent.tasks.some(t => t.subProjectId === p.id));
        if (isSubProject) return false;
        if (p.id === 'proj-tutorial' && !showTutorial) return false;
        if (p.isArchived) return false;
        return true;
    });

    const archivedProjects = projects.filter(p => p.isArchived);
    const currentFolder = folders.find(f => f.id === currentFolderId);

    const projectsInCurrentView = mainProjects
        .filter(p => currentFolderId ? p.folderId === currentFolderId : !p.folderId)
        .filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const projectsToDisplay = isArchiveView 
        ? archivedProjects.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
        : projectsInCurrentView;

    const foldersToDisplay = isArchiveView || currentFolderId 
        ? [] 
        : folders.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()));

    return (
        <div className="min-h-screen bg-primary flex flex-col items-center p-8">
            <header className="w-full max-w-5xl mb-10">
                <div className="flex justify-between items-center mb-4">
                    <h1 className="text-5xl font-bold special-text-gradient">
                        {isArchiveView ? "Archived Projects" : (currentFolder ? currentFolder.name : "Zenith Projects")}
                    </h1>
                    <div className="flex items-center gap-2 text-secondary">
                        <button onClick={() => setViewType(viewType === 'grid' ? 'list' : 'grid')} title="Toggle View" className="p-2 hover:text-primary transition-colors">
                            {viewType === 'grid' ? <ListViewIcon /> : <GridViewIcon />}
                        </button>
                        {!isArchiveView && (
                            <button onClick={() => setIsAddFolderModalOpen(true)} title="New Folder" className="p-2 hover:text-primary transition-colors">
                               <AddFolderIcon />
                            </button>
                        )}
                        {!isArchiveView && (
                             <label className="flex items-center gap-2 cursor-pointer hover:text-primary transition-colors">
                                <input
                                    type="checkbox"
                                    checked={showTutorial}
                                    onChange={(e) => setShowTutorial(e.target.checked)}
                                    className="w-4 h-4 rounded bg-tertiary border-secondary text-accent focus:ring-accent"
                                />
                                Show Tutorial
                            </label>
                        )}
                         <button onClick={() => setIsArchiveView(!isArchiveView)} title={isArchiveView ? "View Active Projects" : "View Archive"} className="p-2 hover:text-primary transition-colors">
                           <ArchiveIcon />
                        </button>
                        <button onClick={() => setIsBackupModalOpen(true)} title="Backup All Projects" className="p-2 hover:text-primary transition-colors">
                            <BackupAllIcon />
                        </button>
                        <button onClick={() => setIsImportModalOpen(true)} title="Import Project" className="p-2 hover:text-primary transition-colors">
                           <UploadIcon />
                        </button>
                        <button onClick={() => setIsSettingsModalOpen(true)} title="Settings" className="p-2 hover:text-primary transition-colors">
                           <SettingsIcon />
                        </button>
                        <button onClick={() => setIsHelpOpen(true)} title="Help" className="p-2 hover:text-primary transition-colors">
                           <HelpIcon />
                        </button>
                    </div>
                </div>
                 <div className="flex justify-between items-center mt-4">
                    {!isArchiveView ? (
                        <div className="flex items-center gap-2 text-sm text-secondary">
                            <button 
                                onClick={() => setCurrentFolderId(null)} 
                                className={`transition-colors ${!currentFolderId ? 'font-bold text-primary' : 'hover:underline'} ${dragOverId === 'breadcrumb-root' ? 'text-accent underline' : ''}`}
                                onDrop={(e) => handleDrop(e, { type: 'breadcrumb', id: null })}
                                onDragOver={handleDragOver}
                                onDragEnter={(e) => handleDragEnter(e, 'breadcrumb-root')}
                                onDragLeave={handleDragLeave}
                            >Projects</button>
                            {currentFolder && (
                                <>
                                    <span>/</span>
                                    <span className="font-bold text-primary">{currentFolder.name}</span>
                                </>
                            )}
                        </div>
                    ) : <div />}
                    <div className="relative w-full max-w-xs">
                         <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <SearchIcon />
                        </div>
                        <input
                            type="search"
                            placeholder="Search projects..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-secondary border border-secondary rounded-md py-2 pl-10 pr-4 focus:ring-2 focus:ring-accent outline-none"
                        />
                    </div>
                 </div>
            </header>
            <main className="w-full max-w-5xl">
                 {projectsToDisplay.length === 0 && foldersToDisplay.length === 0 && !isArchiveView && (
                    <div className="text-center p-10">
                         <h2 className="text-xl font-semibold text-secondary">{searchQuery ? 'No projects or folders match your search.' : 'This folder is empty.'}</h2>
                         {!searchQuery && (
                            <button
                                onClick={() => setShowAddModal(true)}
                                className="mt-4 px-4 py-2 bg-accent hover:bg-accent-hover text-accent-text rounded-md transition-colors"
                            >
                                Create a Project
                            </button>
                         )}
                    </div>
                )}
                 {projectsToDisplay.length === 0 && isArchiveView && (
                    <div className="w-full text-center p-10 text-secondary">
                        <p>{searchQuery ? 'No archived projects match your search.' : 'No archived projects found.'}</p>
                        {!searchQuery && <p className="text-sm">You can archive a project by right-clicking it on the main dashboard.</p>}
                    </div>
                )}
                <div className={viewType === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "flex flex-col gap-4"}>
                    {foldersToDisplay.map(folder => {
                        const baseClasses = "bg-secondary/70 rounded-lg group relative border hover:border-accent transition-all duration-300 cursor-pointer flex items-center";
                        const gridClasses = "p-5 gap-3";
                        const listClasses = "p-4 justify-between";
                        const dragOverClasses = dragOverId === folder.id ? "border-accent ring-2 ring-accent" : "border-secondary";
                        return (
                            <div
                                key={folder.id}
                                onClick={() => setCurrentFolderId(folder.id)}
                                className={`${baseClasses} ${viewType === 'grid' ? gridClasses : listClasses} ${dragOverClasses}`}
                                onDrop={(e) => handleDrop(e, { type: 'folder', id: folder.id })}
                                onDragOver={handleDragOver}
                                onDragEnter={(e) => handleDragEnter(e, folder.id)}
                                onDragLeave={handleDragLeave}
                            >
                                <div className="flex items-center gap-3">
                                    <FolderIcon />
                                    <h2 className="text-xl font-bold text-primary truncate">{folder.name}</h2>
                                </div>
                            </div>
                        )
                    })}
                    {projectsToDisplay.map(project => {
                        const totalTasks = project.tasks.length;
                        const doneTasks = project.tasks.filter(t => t.status === TaskStatus.Done || t.status === TaskStatus.Future).length;
                        const isCompleted = totalTasks > 0 && doneTasks === totalTasks;
                        const isBeingDragged = draggedItemId === project.id;
                        const isDragOver = dragOverId === project.id;
                        const baseClasses = "bg-secondary rounded-lg group relative border hover:border-accent transition-all duration-300 cursor-pointer";
                        const gridClasses = "p-5";
                        const listClasses = "p-4 flex items-center justify-between";
                        const stateClasses = `${isBeingDragged ? 'opacity-30' : ''} ${isDragOver ? 'border-accent ring-2 ring-accent' : 'border-secondary'}`;
                        
                        return (
                            <div 
                                key={project.id} 
                                draggable={!isArchiveView}
                                onDragStart={(e) => handleDragStart(e, project.id)}
                                onDragEnd={handleDragEnd}
                                onDrop={(e) => handleDrop(e, { type: 'project', id: project.id })}
                                onDragOver={handleDragOver}
                                onDragEnter={(e) => handleDragEnter(e, project.id)}
                                onDragLeave={handleDragLeave}
                                onClick={() => onSelectProject(project.id)}
                                onContextMenu={(e) => handleContextMenu(e, project)}
                                className={`${baseClasses} ${viewType === 'grid' ? gridClasses : listClasses} ${stateClasses}`}
                            >
                                <div>
                                    <h2 className="text-xl font-bold text-primary truncate">{project.name}</h2>
                                    <p className="text-secondary text-sm mt-1">{project.tasks.length} tasks</p>
                                </div>
                                <div className={viewType === 'grid' ? 'w-full' : 'w-1/3'}>
                                   <ProjectProgressBar tasks={project.tasks} />
                                </div>
                                {isCompleted && <CompletedStamp />}
                            </div>
                        )
                    })}
                    {!isArchiveView && searchQuery.length === 0 && (
                         <button
                            onClick={() => setShowAddModal(true)}
                            className={viewType === 'grid' 
                                ? "border-2 border-dashed border-secondary rounded-lg flex flex-col items-center justify-center p-5 text-secondary hover:border-accent hover:text-accent transition-colors min-h-[140px]"
                                : "border-2 border-dashed border-secondary rounded-lg flex items-center justify-center p-4 text-secondary hover:border-accent hover:text-accent transition-colors"
                            }
                        >
                            <PlusIcon />
                            <span className="ml-2 font-semibold">New Project</span>
                        </button>
                    )}
                </div>
            </main>
            <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Create New Project">
                <div className="space-y-4">
                    <input
                        type="text"
                        value={newProjectName}
                        onChange={(e) => setNewProjectName(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleAddProject();
                        }}
                        placeholder="Project Name"
                        className="w-full bg-primary border border-secondary rounded-md p-2 focus:ring-2 focus:ring-accent outline-none"
                        autoFocus
                    />
                    <div className="flex justify-end">
                        <button onClick={handleAddProject} className="px-4 py-2 bg-accent hover:bg-accent-hover text-accent-text rounded-md transition-colors">
                            Create
                        </button>
                    </div>
                </div>
            </Modal>
             <Modal isOpen={isAddFolderModalOpen} onClose={() => setIsAddFolderModalOpen(false)} title="Create New Folder">
                 <div className="space-y-4">
                    <input
                        type="text"
                        value={newFolderName}
                        onChange={(e) => setNewFolderName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleAddFolder(); }}
                        placeholder="Folder Name"
                        className="w-full bg-primary border border-secondary rounded-md p-2 focus:ring-2 focus:ring-accent outline-none"
                        autoFocus
                    />
                    <div className="flex justify-end">
                        <button onClick={handleAddFolder} className="px-4 py-2 bg-accent hover:bg-accent-hover text-accent-text rounded-md transition-colors">
                            Create Folder
                        </button>
                    </div>
                </div>
            </Modal>
             <Modal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} title="Import Project Data" size="lg">
                <ImportProjectForm 
                    projects={projects}
                    onImport={(data) => {
                        onImportProject(data);
                        setIsImportModalOpen(false);
                    }}
                    onCancel={() => setIsImportModalOpen(false)}
                />
            </Modal>
             <Modal isOpen={isSettingsModalOpen} onClose={() => setIsSettingsModalOpen(false)} title="Settings">
                 <div className="space-y-6">
                     <div>
                        <label htmlFor="dashboard-theme-select" className="block text-sm font-medium text-secondary mb-2">
                           Dashboard Theme
                        </label>
                        <select
                            id="dashboard-theme-select"
                            value={settings.dashboardTheme}
                            onChange={(e) => onUpdateSettings({ dashboardTheme: e.target.value as Theme })}
                            className="w-full bg-primary border border-secondary rounded-md p-2 focus:ring-2 focus:ring-accent outline-none"
                        >
                            {THEME_OPTIONS.map(option => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex items-center gap-3">
                        <input
                            type="checkbox"
                            id="apply-theme-globally"
                            checked={settings.applyThemeToAllProjects}
                            onChange={(e) => onUpdateSettings({ applyThemeToAllProjects: e.target.checked })}
                            className="w-4 h-4 rounded bg-tertiary border-secondary text-accent focus:ring-accent"
                        />
                        <label htmlFor="apply-theme-globally" className="text-sm text-primary">
                            Apply Theme to All Projects
                        </label>
                        <InfoTooltip>
                            When enabled, the selected dashboard theme will be applied to all current and future projects, overriding their individual appearance settings.
                        </InfoTooltip>
                    </div>
                    <div className="border-t border-secondary pt-4">
                        <label htmlFor="backup-frequency" className="block text-sm font-medium text-secondary mb-2">
                           Backup Reminder Frequency
                        </label>
                        <select
                            id="backup-frequency"
                            value={settings.backupFrequency}
                            onChange={(e) => onUpdateSettings({ backupFrequency: e.target.value as BackupFrequency })}
                            className="w-full bg-primary border border-secondary rounded-md p-2 focus:ring-2 focus:ring-accent outline-none"
                        >
                            <option value="daily">Daily</option>
                            <option value="weekly">Weekly</option>
                            <option value="monthly">Monthly</option>
                            <option value="never">Never</option>
                        </select>
                         <p className="text-xs text-secondary mt-1">If a backup hasn't been made in this timeframe, you'll be prompted on startup.</p>
                    </div>
                </div>
            </Modal>
            <Modal isOpen={isBackupModalOpen} onClose={() => setIsBackupModalOpen(false)} title="Backup Projects" size="lg">
                <BackupModal 
                    projects={projects.filter(p => !p.isArchived)} 
                    onBackup={(selectedProjects) => {
                        onUpdateAppData({ projects: projects.map(p => selectedProjects.find(sp => sp.id === p.id) ? { ...p, lastBackupDate: new Date().toISOString() } : p) });
                        onUpdateSettings({ lastBackupAllDate: new Date().toISOString() });
                        setIsBackupModalOpen(false);
                    }}
                    onClose={() => setIsBackupModalOpen(false)}
                />
            </Modal>
            <Modal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} title="Help & Documentation">
                <HelpDocumentation />
            </Modal>
             {contextMenu && (
                <ContextMenu x={contextMenu.x} y={contextMenu.y} onClose={() => setContextMenu(null)}>
                    <button
                        onClick={() => {
                            setEditingProject(contextMenu.project);
                            setUpdatedProjectName(contextMenu.project.name);
                            setContextMenu(null);
                        }}
                        className="flex items-center w-full text-left px-4 py-2 text-sm text-primary hover:bg-hover"
                    >
                        <EditIcon /> Rename
                    </button>
                     {!isArchiveView && (
                        <button
                            onClick={() => {
                                setMoveProjectModal(contextMenu.project);
                                setContextMenu(null);
                            }}
                            className="flex items-center w-full text-left px-4 py-2 text-sm text-primary hover:bg-hover"
                        >
                            <FolderIcon /> Move...
                        </button>
                    )}
                    {isArchiveView ? (
                         <button
                            onClick={() => handleRestoreProject(contextMenu.project)}
                            className="flex items-center w-full text-left px-4 py-2 text-sm text-primary hover:bg-hover"
                        >
                            <RestoreIcon /> Restore
                        </button>
                    ) : (
                        <button
                            onClick={() => handleArchiveProject(contextMenu.project)}
                            className="flex items-center w-full text-left px-4 py-2 text-sm text-primary hover:bg-hover"
                        >
                            <ArchiveIcon /> Archive
                        </button>
                    )}
                    {contextMenu.project.id !== 'proj-tutorial' && (
                        <button
                            onClick={() => {
                                const message = isArchiveView 
                                    ? `Are you sure you want to PERMANENTLY DELETE the archived project "${contextMenu.project.name}"? This action cannot be undone.`
                                    : `Are you sure you want to delete "${contextMenu.project.name}"? This action cannot be undone.`;

                                if(window.confirm(message)) {
                                    onDeleteProject(contextMenu.project.id);
                                }
                                setContextMenu(null);
                            }}
                            className="flex items-center w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-hover"
                        >
                            <TrashIcon /> Delete
                        </button>
                    )}
                </ContextMenu>
            )}
            <Modal isOpen={!!editingProject} onClose={() => setEditingProject(null)} title="Rename Project">
                <div className="space-y-4">
                    <input
                        type="text"
                        value={updatedProjectName}
                        onChange={(e) => setUpdatedProjectName(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleRenameProject();
                        }}
                        placeholder="Project Name"
                        className="w-full bg-primary border border-secondary rounded-md p-2 focus:ring-2 focus:ring-accent outline-none"
                        autoFocus
                    />
                    <div className="flex justify-end space-x-3 pt-4">
                         <button onClick={() => setEditingProject(null)} className="px-4 py-2 bg-tertiary hover:bg-hover rounded-md transition-colors">Cancel</button>
                        <button onClick={handleRenameProject} className="px-4 py-2 bg-accent hover:bg-accent-hover text-accent-text rounded-md transition-colors">
                            Save
                        </button>
                    </div>
                </div>
            </Modal>
             <Modal isOpen={!!moveProjectModal} onClose={() => setMoveProjectModal(null)} title={`Move "${moveProjectModal?.name}" to...`}>
                <div className="flex flex-col gap-2">
                    <button
                        onClick={() => handleMoveProject(null)}
                        className="w-full text-left px-4 py-3 text-sm text-primary bg-tertiary rounded-md hover:bg-hover transition-colors"
                    >
                        / (Root Folder)
                    </button>
                    {folders
                        .filter(folder => folder.id !== moveProjectModal?.folderId)
                        .map(folder => (
                        <button
                            key={folder.id}
                            onClick={() => handleMoveProject(folder.id)}
                            className="w-full text-left px-4 py-3 text-sm text-primary bg-tertiary rounded-md hover:bg-hover transition-colors"
                        >
                           {folder.name}
                        </button>
                    ))}
                </div>
            </Modal>
        </div>
    );
};

interface BackupModalProps {
    projects: Project[];
    onBackup: (selectedProjects: Project[]) => void;
    onClose: () => void;
}

const BackupModal: React.FC<BackupModalProps> = ({ projects, onBackup, onClose }) => {
    const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set(projects.map(p => p.id)));

    const handleToggle = (projectId: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(projectId)) {
            newSet.delete(projectId);
        } else {
            newSet.add(projectId);
        }
        setSelectedIds(newSet);
    };

    const handleBackup = async () => {
        const selectedProjects = projects.filter(p => selectedIds.has(p.id));
        if (selectedProjects.length === 0) {
            alert("Please select at least one project to back up.");
            return;
        }

        const zip = new JSZip();
        for (const project of selectedProjects) {
            const safeName = project.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
            const projectFolder = zip.folder(safeName);
            projectFolder?.file('planning_document.md', project.planningDocument);
            projectFolder?.file('implementation_plan.md', project.implementationPlan);
            projectFolder?.file('scratchpad.md', project.scratchpad);
        }

        const content = await zip.generateAsync({ type: 'blob' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(content);
        link.download = `zenith_backup_${new Date().toISOString().split('T')[0]}.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);

        onBackup(selectedProjects);
    };

    return (
        <div className="space-y-4">
            <p className="text-secondary">Select the projects you want to include in the backup .zip file.</p>
            <div className="max-h-64 overflow-y-auto border border-secondary rounded-md p-2 space-y-2">
                {projects.map(project => (
                    <label key={project.id} className="flex items-center gap-3 p-2 hover:bg-hover rounded cursor-pointer">
                        <input
                            type="checkbox"
                            checked={selectedIds.has(project.id)}
                            onChange={() => handleToggle(project.id)}
                            className="w-4 h-4 rounded bg-tertiary border-secondary text-accent focus:ring-accent"
                        />
                        <span className="text-primary">{project.name}</span>
                    </label>
                ))}
            </div>
            <div className="flex justify-end space-x-3 pt-4">
                <button onClick={onClose} className="px-4 py-2 bg-tertiary hover:bg-hover rounded-md transition-colors">Cancel</button>
                <button onClick={handleBackup} disabled={selectedIds.size === 0} className="px-4 py-2 bg-accent hover:bg-accent-hover text-accent-text rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                    Download Backup ({selectedIds.size})
                </button>
            </div>
        </div>
    );
};


// --- APP ---
const App: React.FC = () => {
    const [appData, setAppData] = useState<AppData>(() => loadDataFromCookie() || getInitialData());
    const { projects } = appData;

    const [settings, setSettings] = useState<AppSettings>(loadSettingsFromLocalStorage);
    const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
    const [showTutorial, setShowTutorial] = useState(() => {
        const saved = localStorage.getItem('showTutorial');
        return saved !== null ? JSON.parse(saved) : true;
    });
     const [showBackupPrompt, setShowBackupPrompt] = useState(false);
     const [isBackupModalOpenFromPrompt, setIsBackupModalOpenFromPrompt] = useState(false);

    const activeProject = useMemo(() => projects.find(p => p.id === activeProjectId), [projects, activeProjectId]);

    useEffect(() => {
        saveDataToCookie(appData);
    }, [appData]);

     useEffect(() => {
        saveSettingsToLocalStorage(settings);
    }, [settings]);

    useEffect(() => {
        localStorage.setItem('showTutorial', JSON.stringify(showTutorial));
    }, [showTutorial]);

     useEffect(() => {
        // 1. Never show if frequency is 'never'
        if (settings.backupFrequency === 'never') return;

        // 2. Find projects eligible for triggering the backup reminder
        const eligibleProjects = appData.projects.filter(p =>
            p.id !== 'proj-tutorial' && p.tasks.length > 0
        );
        
        // 3. If no eligible projects exist, don't show the prompt
        if (eligibleProjects.length === 0) {
            setShowBackupPrompt(false);
            return;
        }

        // 4. Find the creation date of the oldest eligible project from its ID
        const projectCreationTimestamps = eligibleProjects
            .map(p => {
                const parts = p.id.split('-');
                if (parts[0] === 'proj' && parts.length > 1) {
                    const timestamp = parseInt(parts[1], 10);
                    return isNaN(timestamp) ? null : timestamp;
                }
                return null;
            })
            .filter((ts): ts is number => ts !== null);

        if (projectCreationTimestamps.length === 0) {
            setShowBackupPrompt(false); // No projects with a valid timestamped ID
            return;
        }

        const oldestProjectTimestamp = Math.min(...projectCreationTimestamps);
        const now = new Date().getTime();
        const oneWeekInMs = 7 * 24 * 60 * 60 * 1000;

        // 5. Only proceed if the oldest eligible project is at least one week old
        if (now - oldestProjectTimestamp < oneWeekInMs) {
            setShowBackupPrompt(false);
            return;
        }
        
        // 6. If grace period is over, apply the original frequency logic
        const lastBackup = settings.lastBackupAllDate ? new Date(settings.lastBackupAllDate).getTime() : null;
        if (!lastBackup) {
            setShowBackupPrompt(true); // First time showing the prompt after the grace period
            return;
        }

        const daysSinceBackup = (now - lastBackup) / (1000 * 3600 * 24);

        let threshold = Infinity;
        if (settings.backupFrequency === 'daily') threshold = 1;
        if (settings.backupFrequency === 'weekly') threshold = 7;
        if (settings.backupFrequency === 'monthly') threshold = 30;

        if (daysSinceBackup > threshold) {
            setShowBackupPrompt(true);
        } else {
            setShowBackupPrompt(false);
        }
    }, [settings.backupFrequency, settings.lastBackupAllDate, appData.projects]);


    useEffect(() => {
        // This effect ensures the correct theme and appearance settings are applied
        // when switching between the dashboard and a project view.
        const root = document.documentElement;
        if (activeProject) {
            root.setAttribute('data-theme', activeProject.theme || settings.dashboardTheme);
            root.setAttribute('data-font-family', activeProject.fontFamily || 'sans');
            root.setAttribute('data-font-size', activeProject.fontSize || 'base');
        } else {
            // Reset to dashboard settings
            root.setAttribute('data-theme', settings.dashboardTheme);
            root.setAttribute('data-font-family', 'sans');
            root.setAttribute('data-font-size', 'base');
        }
    }, [activeProject, settings.dashboardTheme]);

    const updateAppData = (updates: Partial<AppData>) => {
        setAppData(prev => ({ ...prev, ...updates }));
    };
    
    const handleUpdateSettings = (newSettings: Partial<AppSettings>) => {
        const updatedSettings = { ...settings, ...newSettings };
        
        const themeChanged = newSettings.dashboardTheme && newSettings.dashboardTheme !== settings.dashboardTheme;
        const toggleEnabled = newSettings.applyThemeToAllProjects === true && settings.applyThemeToAllProjects === false;

        if ((themeChanged && updatedSettings.applyThemeToAllProjects) || toggleEnabled) {
            const newTheme = updatedSettings.dashboardTheme;
            const updatedProjects = projects.map(p => {
                const { phaseColors, subPhaseColors } = assignColors(p.tasks, {}, {}, newTheme);
                return { ...p, theme: newTheme, phaseColors, subPhaseColors };
            });
            updateAppData({ projects: updatedProjects });
        }

        setSettings(updatedSettings);
    };

    const handleUpdateProject = (updatedProject: Project) => {
        updateAppData({ projects: projects.map(p => p.id === updatedProject.id ? updatedProject : p) });
    };
    
    const handleAddProject = (name: string, folderId: string | null) => {
        const newProjectId = `proj-${Date.now()}`;
        const newProject: Project = {
            id: newProjectId,
            name,
            planningDocument: `# Planning for ${name}`,
            implementationPlan: `# Backlog\n## General\n- Initial Task, TASK-01, Setup project structure, High\n`,
            scratchpad: `# Scratchpad for ${name}\n\n- Jot down initial ideas here.`,
            tasks: [],
            comments: [],
            theme: settings.applyThemeToAllProjects ? settings.dashboardTheme : 'dark',
            fontFamily: 'sans',
            fontSize: 'base',
            phaseColors: {},
            subPhaseColors: {},
            isArchived: false,
            folderId,
            labelIds: [],
        };
        const newTasks = parseImplementationPlan(newProject.implementationPlan);
        newProject.tasks = newTasks;
        const { phaseColors, subPhaseColors } = assignColors(newTasks, {}, {}, newProject.theme);
        newProject.phaseColors = phaseColors;
        newProject.subPhaseColors = subPhaseColors;

        updateAppData({ projects: [...projects, newProject] });
        setActiveProjectId(newProjectId);
    };

    const handleDeleteProject = (id: string) => {
        if (id === 'proj-tutorial') {
            alert("The tutorial project cannot be deleted. You can hide it using the checkbox on the dashboard.");
            return;
        }
        updateAppData({ projects: projects.filter(p => p.id !== id) });
        setActiveProjectId(null);
    };

    const handleImportProject = (data: ImportData) => {
        if (data.targetProjectId === 'new') {
            const newProject: Project = {
                id: `proj-${Date.now()}`,
                name: data.newProjectName!,
                planningDocument: data.documents.planningDocument,
                implementationPlan: data.documents.implementationPlan,
                scratchpad: data.documents.scratchpad,
                tasks: [],
                comments: [],
                theme: settings.applyThemeToAllProjects ? settings.dashboardTheme : 'dark',
                fontFamily: 'sans',
                fontSize: 'base',
                phaseColors: {},
                subPhaseColors: {},
                 isArchived: false,
                 folderId: null,
                 labelIds: [],
            };
            const newTasks = parseImplementationPlan(newProject.implementationPlan);
            newProject.tasks = newTasks;
            const { phaseColors, subPhaseColors } = assignColors(newTasks, {}, {}, newProject.theme);
            newProject.phaseColors = phaseColors;
            newProject.subPhaseColors = subPhaseColors;
            updateAppData({ projects: [...projects, newProject] });
        } else {
            const updatedProjects = projects.map(p => {
                if (p.id === data.targetProjectId) {
                    const updatedProject = {
                        ...p,
                        planningDocument: data.documents.planningDocument,
                        implementationPlan: data.documents.implementationPlan,
                        scratchpad: data.documents.scratchpad,
                    };
                    const newTasks = parseImplementationPlan(updatedProject.implementationPlan);
                    updatedProject.tasks = newTasks;
                    const { phaseColors, subPhaseColors } = assignColors(newTasks, p.phaseColors, p.subPhaseColors, p.theme || 'dark');
                    updatedProject.phaseColors = phaseColors;
                    updatedProject.subPhaseColors = subPhaseColors;
                    return updatedProject;
                }
                return p;
            });
            updateAppData({ projects: updatedProjects });
        }
    };


    const handleTaskDrillDown = (task: Task, parentProjectId: string) => {
        const existingSubProject = projects.find(p => p.id === task.subProjectId);
        if (existingSubProject) {
            setActiveProjectId(task.subProjectId);
            return;
        }

        const newSubProjectId = `proj-${Date.now()}`;
        const parentProject = projects.find(p => p.id === parentProjectId);
        const newSubProject: Project = {
            id: newSubProjectId,
            name: `Task: ${task.description}`,
            planningDocument: `# Parent Task: ${task.description}\n\n**ID:** ${task.id}\n**Phase:** ${task.phase} / ${task.subPhase}\n**Priority:** ${task.priority}\n\n## Objective\nBreak down and manage the work required to complete this task.`,
            implementationPlan: `# Backlog\n## General\n- New Task, TASK-01, Describe the first step, Medium`,
            scratchpad: `Notes for task: ${task.description}`,
            tasks: [],
            comments: [],
            theme: parentProject?.theme || 'dark',
            fontFamily: parentProject?.fontFamily || 'sans',
            fontSize: parentProject?.fontSize || 'base',
            phaseColors: {},
            subPhaseColors: {},
            isArchived: false,
            folderId: null,
            labelIds: [],
        };
        
        const subTasks = parseImplementationPlan(newSubProject.implementationPlan);
        newSubProject.tasks = subTasks;
        const { phaseColors, subPhaseColors } = assignColors(subTasks, {}, {}, newSubProject.theme);
        newSubProject.phaseColors = phaseColors;
        newSubProject.subPhaseColors = subPhaseColors;
        
        const updatedTask = { ...task, subProjectId: newSubProjectId };
        
        const newProjects = [
            ...projects.map(p => 
                p.id === parentProjectId 
                ? { ...p, tasks: p.tasks.map(t => t.id === task.id ? updatedTask : t) } 
                : p
            ),
            newSubProject
        ];
        
        updateAppData({ projects: newProjects });
        setActiveProjectId(newSubProjectId);
    };

    if (activeProject) {
        return <ProjectView 
            project={activeProject} 
            allProjects={projects} 
            updateProject={handleUpdateProject} 
            deleteProject={handleDeleteProject}
            selectProject={setActiveProjectId}
            onTaskDrillDown={(task) => handleTaskDrillDown(task, activeProject.id)}
            isReadOnly={!!activeProject.isArchived}
        />;
    }

    return (
        <>
            <Dashboard 
                appData={appData}
                settings={settings}
                onUpdateProject={handleUpdateProject}
                onUpdateAppData={updateAppData}
                onUpdateSettings={handleUpdateSettings}
                onSelectProject={setActiveProjectId} 
                onAddProject={handleAddProject} 
                onDeleteProject={handleDeleteProject}
                onImportProject={handleImportProject}
                showTutorial={showTutorial}
                setShowTutorial={setShowTutorial}
            />
            <Modal isOpen={showBackupPrompt} onClose={() => setShowBackupPrompt(false)} title="Backup Reminder">
                <div className="space-y-4">
                    <p className="text-primary">It's been a while since your last backup. It's a good idea to back up your projects regularly to prevent data loss.</p>
                    <div className="flex justify-end space-x-3 pt-4">
                        <button onClick={() => setShowBackupPrompt(false)} className="px-4 py-2 bg-tertiary hover:bg-hover rounded-md transition-colors">Remind Me Later</button>
                        <button onClick={() => {
                            setShowBackupPrompt(false);
                            setIsBackupModalOpenFromPrompt(true);
                        }} className="px-4 py-2 bg-accent hover:bg-accent-hover text-accent-text rounded-md transition-colors">
                            Backup Now
                        </button>
                    </div>
                </div>
            </Modal>
             <Modal isOpen={isBackupModalOpenFromPrompt} onClose={() => setIsBackupModalOpenFromPrompt(false)} title="Backup Projects" size="lg">
                <BackupModal 
                    projects={projects.filter(p => !p.isArchived)} 
                    onBackup={(selectedProjects) => {
                        updateAppData({ projects: projects.map(p => selectedProjects.find(sp => sp.id === p.id) ? { ...p, lastBackupDate: new Date().toISOString() } : p) });
                        setSettings(prev => ({ ...prev, lastBackupAllDate: new Date().toISOString() }));
                        setIsBackupModalOpenFromPrompt(false);
                    }}
                    onClose={() => setIsBackupModalOpenFromPrompt(false)}
                />
            </Modal>
        </>
    );
};

export default App;