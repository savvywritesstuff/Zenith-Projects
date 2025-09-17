import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { GiGearHammer } from 'react-icons/gi';
import { CiStickyNote } from 'react-icons/ci';
import { HiOutlineClipboardDocumentList, HiChevronDoubleLeft, HiChevronDoubleRight } from 'react-icons/hi2';
import { Project, Task, TaskStatus, Priority, TutorialStep } from './types';
import { KanbanBoard } from './components/Kanban';
import { EditableDocumentPanel, implementationPlanHelpText } from './components/Documents';
import Tutorial from './components/Tutorial';
import { ProgressBar, ContextMenu, Modal, EditTaskForm, EditIcon, TrashIcon, PlusIcon, ImplementTaskForm, InfoTooltip, HelpIcon, HelpDocumentation } from './components/UI';
import { getInitialProjects, parseImplementationPlan, generateImplementationPlanText, assignColors } from './services/projectService';

type ContextMenuState = {
    x: number;
    y: number;
    content: React.ReactNode;
} | null;

type DocumentType = 'planning' | 'implementation' | 'scratchpad';
type EditableDocumentType = 'planning' | 'implementation' | 'scratchpad';


// --- PROJECT VIEW ---
interface ProjectViewProps {
    project: Project;
    allProjects: Project[];
    updateProject: (updatedProject: Project) => void;
    selectProject: (projectId: string | null) => void;
    onTaskDrillDown: (task: Task) => void;
}

const TabButton: React.FC<{ title: string; active: boolean; onClick: () => void; children: React.ReactNode; 'data-tutorial-id'?: string }> = ({ title, active, onClick, children, ...props }) => (
    <button 
        onClick={onClick}
        title={title}
        aria-label={title}
        className={`p-2 rounded-md flex-1 flex justify-center items-center transition-colors ${
            active 
            ? 'bg-blue-600 text-white' 
            : 'text-slate-300 hover:bg-slate-700'
        }`}
        {...props}
    >
        {children}
    </button>
);

const ProjectView: React.FC<ProjectViewProps> = ({ project, allProjects, updateProject, selectProject, onTaskDrillDown }) => {
    const [contextMenu, setContextMenu] = useState<ContextMenuState>(null);
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [isImplementModalOpen, setIsImplementModalOpen] = useState(false);
    const [selectedText, setSelectedText] = useState('');
    
    const [activeTab, setActiveTab] = useState<DocumentType>('planning');
    const [editingTab, setEditingTab] = useState<EditableDocumentType | null>(null);
    const [fullScreenTab, setFullScreenTab] = useState<EditableDocumentType | null>(null);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [isTutorialRunning, setIsTutorialRunning] = useState(false);

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
        const newTasksFromPlan = parseImplementationPlan(project.implementationPlan);
        const mergedTasks = newTasksFromPlan.map(newTask => {
            const existingTask = project.tasks.find(t => t.id === newTask.id);
            return { ...newTask, subProjectId: existingTask?.subProjectId };
        });
        const { phaseColors, subPhaseColors } = assignColors(mergedTasks, project.phaseColors, project.subPhaseColors);
        if (JSON.stringify(mergedTasks) !== JSON.stringify(project.tasks) || 
            JSON.stringify(phaseColors) !== JSON.stringify(project.phaseColors) ||
            JSON.stringify(subPhaseColors) !== JSON.stringify(project.subPhaseColors)) {
            updateProject({ ...project, tasks: mergedTasks, phaseColors, subPhaseColors });
        }
    }, [project.implementationPlan, project.tasks, project.phaseColors, project.subPhaseColors, updateProject]);

    const updateTasksAndPlan = useCallback((newTasks: Task[]) => {
        const newPlan = generateImplementationPlanText(newTasks);
        const { phaseColors, subPhaseColors } = assignColors(newTasks, project.phaseColors, project.subPhaseColors);
        updateProject({ ...project, tasks: newTasks, implementationPlan: newPlan, phaseColors, subPhaseColors });
    }, [project, updateProject]);

    const handleContentChange = useCallback((docType: EditableDocumentType, content: string) => {
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
    }, [project, updateProject]);
    

    const handleTextSelection = (text: string) => setSelectedText(text);

    const handleContextMenu = (e: React.MouseEvent) => {
        if (selectedText) {
            e.preventDefault();
            setContextMenu({
                x: e.clientX, y: e.clientY,
                content: (
                    <button onClick={() => { setIsImplementModalOpen(true); setContextMenu(null); }}
                        className="block w-full text-left px-4 py-2 text-sm text-slate-200 hover:bg-slate-700">
                        Implement Task
                    </button>
                ),
            });
        }
    };
    
    const handleCreateTaskFromSelection = (taskData: { id: string; phase: string; subPhase: string; priority: Priority; description: string; status: TaskStatus; }) => {
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

    const handleTaskRightClick = (e: React.MouseEvent<HTMLDivElement>, task: Task) => {
        e.preventDefault();
        setContextMenu({
            x: e.clientX, y: e.clientY,
            content: (
                <>
                    <button onClick={() => { setEditingTask(task); setContextMenu(null); }}
                        className="flex items-center w-full text-left px-4 py-2 text-sm text-slate-200 hover:bg-slate-700">
                        <EditIcon /> Edit Task
                    </button>
                    <button onClick={() => handleTaskDelete(task.id)}
                        className="flex items-center w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-slate-700">
                        <TrashIcon /> Delete Task
                    </button>
                </>
            ),
        });
    };

    const handleTaskUpdate = (updatedTask: Task) => {
        const newTasks = project.tasks.map(t => t.id === updatedTask.id ? updatedTask : t);
        updateTasksAndPlan(newTasks);
        setEditingTask(null);
    };

    const handleTaskDelete = (taskId: string) => {
        const newTasks = project.tasks.filter(t => t.id !== taskId);
        updateTasksAndPlan(newTasks);
        setContextMenu(null);
    };

    const handleTaskMove = (taskId: string, newStatus: TaskStatus) => {
        const newTasks = project.tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t);
        updateTasksAndPlan(newTasks);
    };

    const parentProject = allProjects.find(p => p.id !== project.id && p.tasks.some(t => t.subProjectId === project.id));

    const getDocumentProps = useCallback((docType: EditableDocumentType) => {
        const baseProps = {
            docType,
            isEditing: editingTab === docType,
            onToggleEdit: () => setEditingTab(prev => (prev === docType ? null : docType)),
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
    }, [project, editingTab, fullScreenTab, handleContentChange]);

    return (
        <div className="h-screen w-screen flex flex-col p-4 bg-slate-900 overflow-hidden">
            {isTutorialRunning && project.id === 'proj-tutorial' && (
                <Tutorial steps={tutorialSteps} onComplete={() => setIsTutorialRunning(false)} />
            )}
            <header className="flex-shrink-0">
                 <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-sky-400 to-blue-600" data-tutorial-id="project-title">
                            {project.name}
                        </h1>
                        {project.id === 'proj-tutorial' && !isTutorialRunning && (
                            <button 
                                onClick={() => setIsTutorialRunning(true)}
                                className="px-4 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors animate-pulse"
                            >
                                Start Tutorial
                            </button>
                        )}
                    </div>
                     {parentProject ? (
                        <button onClick={() => selectProject(parentProject.id)} className="px-4 py-2 text-sm bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors">
                            &larr; Back to Parent: {parentProject.name}
                        </button>
                     ) : (
                        <button onClick={() => selectProject(null)} className="px-4 py-2 text-sm bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors" data-tutorial-id="back-to-dashboard">
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
                    className="absolute top-1/2 -translate-y-1/2 z-20 bg-slate-800 text-slate-300 hover:bg-slate-700 p-2 rounded-full border border-slate-600 transition-all duration-300"
                    style={{ left: isSidebarCollapsed ? '0' : 'calc(33.3333% - 1rem)', transition: 'left 0.3s ease-in-out' }}
                >
                    {isSidebarCollapsed ? <HiChevronDoubleRight className="h-5 w-5" /> : <HiChevronDoubleLeft className="h-5 w-5" />}
                </button>

                <div className={`transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'w-0' : 'w-1/3'}`} data-tutorial-id="document-panel">
                    <div className={`h-full flex flex-col gap-2 transition-opacity duration-150 ${isSidebarCollapsed ? 'opacity-0 invisible' : 'opacity-100'}`}>
                        <div className="flex-shrink-0 flex items-center bg-slate-800/50 rounded-lg p-1 border border-slate-700 gap-1">
                            <TabButton data-tutorial-id="planning-tab" title="Planning Document" active={activeTab === 'planning'} onClick={() => setActiveTab('planning')}>
                                <HiOutlineClipboardDocumentList className="w-7 h-7" />
                            </TabButton>
                            <TabButton data-tutorial-id="implementation-tab" title="Implementation Plan" active={activeTab === 'implementation'} onClick={() => setActiveTab('implementation')}>
                                <GiGearHammer className="w-7 h-7" />
                            </TabButton>
                            <TabButton title="Scratchpad" active={activeTab === 'scratchpad'} onClick={() => setActiveTab('scratchpad')}>
                                <CiStickyNote className="w-7 h-7" />
                            </TabButton>
                        </div>
                        <div className="flex-grow min-h-0" data-tutorial-id="implementation-editor">
                           {<EditableDocumentPanel {...getDocumentProps(activeTab)} />}
                        </div>
                    </div>
                </div>
                <div className={`flex flex-col transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'w-full pl-6' : 'w-2/3 pl-4'}`}>
                    <KanbanBoard
                        tasks={project.tasks}
                        project={project}
                        onTaskUpdate={handleTaskUpdate}
                        onTaskDelete={handleTaskDelete}
                        onTaskMove={handleTaskMove}
                        onRightClick={handleTaskRightClick}
                        onTaskDrillDown={onTaskDrillDown}
                    />
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
            {fullScreenTab && (
                <EditableDocumentPanel {...getDocumentProps(fullScreenTab)} />
            )}
        </div>
    );
};

// --- DASHBOARD VIEW ---
interface DashboardProps {
    projects: Project[];
    onSelectProject: (id: string) => void;
    onAddProject: (name: string) => void;
    onDeleteProject: (id: string) => void;
    showTutorial: boolean;
    setShowTutorial: (show: boolean) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ projects, onSelectProject, onAddProject, onDeleteProject, showTutorial, setShowTutorial }) => {
    const [showAddModal, setShowAddModal] = useState(false);
    const [newProjectName, setNewProjectName] = useState('');
    const [isHelpOpen, setIsHelpOpen] = useState(false);

    const handleAddProject = () => {
        if (newProjectName.trim()) {
            onAddProject(newProjectName.trim());
            setNewProjectName('');
            setShowAddModal(false);
        }
    };
    
    // Filter projects for the dashboard view
    const mainProjects = projects.filter(p => {
      const isSubProject = projects.some(parent => parent.tasks.some(t => t.subProjectId === p.id));
      if (isSubProject) return false;
      if (p.id === 'proj-tutorial' && !showTutorial) return false;
      return true;
    });


    return (
        <div className="min-h-screen bg-slate-900 flex flex-col items-center p-8">
            <header className="w-full max-w-4xl mb-10">
                <div className="flex justify-between items-center">
                    <h1 className="text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600">
                        Zenith Projects
                    </h1>
                    <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 text-slate-400 cursor-pointer hover:text-white transition-colors">
                            <input
                                type="checkbox"
                                checked={showTutorial}
                                onChange={(e) => setShowTutorial(e.target.checked)}
                                className="w-4 h-4 rounded bg-slate-700 border-slate-500 text-blue-500 focus:ring-blue-500"
                            />
                            Show Tutorial
                        </label>
                        <button onClick={() => setIsHelpOpen(true)} title="Help" className="text-slate-400 hover:text-white transition-colors">
                           <HelpIcon />
                        </button>
                    </div>
                </div>
            </header>
            <div className="w-full max-w-4xl">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {mainProjects.map(project => (
                        <div key={project.id} className="bg-slate-800 rounded-lg p-5 group relative border border-slate-700 hover:border-blue-500 transition-all duration-300">
                           <div onClick={() => onSelectProject(project.id)} className="cursor-pointer">
                                <h2 className="text-xl font-bold text-slate-200 truncate">{project.name}</h2>
                                <p className="text-slate-400 mt-2">{project.tasks.length} tasks</p>
                            </div>
                            <button
                                onClick={() => onDeleteProject(project.id)}
                                className="absolute top-3 right-3 p-1.5 rounded-full bg-slate-700 text-slate-400 opacity-0 group-hover:opacity-100 hover:bg-red-500 hover:text-white transition-all duration-300"
                                title="Delete Project"
                            >
                                <TrashIcon />
                            </button>
                        </div>
                    ))}
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="border-2 border-dashed border-slate-600 rounded-lg flex flex-col items-center justify-center p-5 text-slate-400 hover:border-blue-500 hover:text-blue-500 transition-colors"
                    >
                        <PlusIcon />
                        <span className="mt-2 font-semibold">New Project</span>
                    </button>
                </div>
            </div>
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
                        className="w-full bg-slate-900 border border-slate-600 rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                    <div className="flex justify-end">
                        <button onClick={handleAddProject} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md transition-colors">
                            Create
                        </button>
                    </div>
                </div>
            </Modal>
            <Modal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} title="Help & Documentation">
                <HelpDocumentation />
            </Modal>
        </div>
    );
};


// --- APP ---
const App: React.FC = () => {
    const [projects, setProjects] = useState<Project[]>(getInitialProjects());
    const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
    const [showTutorial, setShowTutorial] = useState(() => {
        const saved = localStorage.getItem('showTutorial');
        return saved !== null ? JSON.parse(saved) : true;
    });

    useEffect(() => {
        localStorage.setItem('showTutorial', JSON.stringify(showTutorial));
    }, [showTutorial]);

    const handleUpdateProject = (updatedProject: Project) => {
        setProjects(projects.map(p => p.id === updatedProject.id ? updatedProject : p));
    };
    
    const handleAddProject = (name: string) => {
        const newProject: Project = {
            id: `proj-${Date.now()}`,
            name,
            planningDocument: `# Planning for ${name}`,
            implementationPlan: `# Backlog\n## General\n- Initial Task, TASK-01, Setup project structure, High\n`,
            scratchpad: `# Scratchpad for ${name}\n\n- Jot down initial ideas here.`,
            tasks: [],
            phaseColors: {},
            subPhaseColors: {},
        };
        const newTasks = parseImplementationPlan(newProject.implementationPlan);
        newProject.tasks = newTasks;
        const { phaseColors, subPhaseColors } = assignColors(newTasks, {}, {});
        newProject.phaseColors = phaseColors;
        newProject.subPhaseColors = subPhaseColors;

        setProjects([...projects, newProject]);
    };

    const handleDeleteProject = (id: string) => {
        // Prevent deleting the tutorial project
        if (id === 'proj-tutorial') {
            alert("The tutorial project cannot be deleted. You can hide it using the checkbox on the dashboard.");
            return;
        }
        setProjects(projects.filter(p => p.id !== id));
    };

    const handleTaskDrillDown = (task: Task, parentProjectId: string) => {
        const existingSubProject = projects.find(p => p.id === task.subProjectId);
        if (existingSubProject) {
            setActiveProjectId(task.subProjectId);
            return;
        }

        const newSubProjectId = `proj-${Date.now()}`;
        const newSubProject: Project = {
            id: newSubProjectId,
            name: `Task: ${task.description}`,
            planningDocument: `# Parent Task: ${task.description}\n\n**ID:** ${task.id}\n**Phase:** ${task.phase} / ${task.subPhase}\n**Priority:** ${task.priority}\n\n## Objective\nBreak down and manage the work required to complete this task.`,
            implementationPlan: `# Backlog\n## General\n- New Task, TASK-01, Describe the first step, Medium`,
            scratchpad: `Notes for task: ${task.description}`,
            tasks: [],
            phaseColors: {},
            subPhaseColors: {},
        };
        
        const subTasks = parseImplementationPlan(newSubProject.implementationPlan);
        newSubProject.tasks = subTasks;
        const { phaseColors, subPhaseColors } = assignColors(subTasks, {}, {});
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
        
        setProjects(newProjects);
        setActiveProjectId(newSubProjectId);
    };


    const activeProject = projects.find(p => p.id === activeProjectId);

    if (activeProject) {
        return <ProjectView 
            project={activeProject} 
            allProjects={projects} 
            updateProject={handleUpdateProject} 
            selectProject={setActiveProjectId}
            onTaskDrillDown={(task) => handleTaskDrillDown(task, activeProject.id)}
        />;
    }

    return <Dashboard 
        projects={projects} 
        onSelectProject={setActiveProjectId} 
        onAddProject={handleAddProject} 
        onDeleteProject={handleDeleteProject}
        showTutorial={showTutorial}
        setShowTutorial={setShowTutorial}
    />;
};

export default App;