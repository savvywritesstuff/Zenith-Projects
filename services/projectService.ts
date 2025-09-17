import { Project, Task, TaskStatus, Priority } from '../types';
import { KANBAN_COLUMNS } from '../constants';

// --- COLOR SERVICE ---
export const generateRainbowColor = (index: number, total: number, saturation: number, lightness: number): string => {
  const hue = Math.round((index / total) * 360);
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
};

export const assignColors = (tasks: Task[], existingPhaseColors: Record<string, string>, existingSubPhaseColors: Record<string, string>): { phaseColors: Record<string, string>, subPhaseColors: Record<string, string> } => {
  const newPhaseColors = { ...existingPhaseColors };
  const newSubPhaseColors = { ...existingSubPhaseColors };

  const uniquePhases = [...new Set(tasks.map(t => t.phase))];
  const uniqueSubPhases = [...new Set(tasks.map(t => t.subPhase))];

  uniquePhases.forEach((phase) => {
    if (!newPhaseColors[phase]) {
      // Darker, more saturated colors for phases
      newPhaseColors[phase] = generateRainbowColor(Object.keys(newPhaseColors).length, uniquePhases.length + Object.keys(newPhaseColors).length, 90, 45);
    }
  });

  uniqueSubPhases.forEach((subPhase) => {
    if (!newSubPhaseColors[subPhase]) {
      // Lighter, more pastel colors for sub-phases
      newSubPhaseColors[subPhase] = generateRainbowColor(Object.keys(newSubPhaseColors).length, uniqueSubPhases.length + Object.keys(newSubPhaseColors).length, 70, 80);
    }
  });

  return { phaseColors: newPhaseColors, subPhaseColors: newSubPhaseColors };
};


// --- PARSER SERVICE ---

const getStatusFromString = (s: string): TaskStatus => {
  const key = s.replace('-', '').replace(' ', '') as keyof typeof TaskStatus;
  return TaskStatus[key] || TaskStatus.Backlog;
};

const getPriorityFromString = (p: string): Priority => {
  const key = p as keyof typeof Priority;
  return Priority[key] || Priority.None;
};

export const parseImplementationPlan = (text: string): Task[] => {
  const tasks: Task[] = [];
  let currentStatus: TaskStatus = TaskStatus.Backlog;
  let currentPhase: string = 'General';

  text.split('\n').forEach((line, lineIndex) => {
    const trimmedLine = line.trim();
    if (trimmedLine.startsWith('# ')) {
      currentStatus = getStatusFromString(trimmedLine.substring(2).trim());
      currentPhase = 'General'; // Reset phase when status changes
    } else if (trimmedLine.startsWith('## ')) {
      currentPhase = trimmedLine.substring(3).trim();
    } else if (trimmedLine.startsWith('- ')) {
       const parts = trimmedLine.substring(2).split(',').map(p => p.trim());
      
      // Create a task even if it's incomplete for real-time feedback
      const [subPhase, id, description, priority] = parts;
      tasks.push({
        subPhase: subPhase || '',
        // Use the line index to create a stable key for partial tasks
        id: id || `partial-${lineIndex}`, 
        description: description || '...',
        priority: getPriorityFromString(priority || 'None'),
        status: currentStatus,
        phase: currentPhase,
      });
    }
  });
  return tasks;
};

export const generateImplementationPlanText = (tasks: Task[]): string => {
  let text = '';
  const groupedByStatus = tasks.reduce((acc, task) => {
    if (!acc[task.status]) acc[task.status] = [];
    acc[task.status]!.push(task);
    return acc;
  }, {} as Record<TaskStatus, Task[]>);

  for (const status of KANBAN_COLUMNS) {
    const statusTasks = groupedByStatus[status];
    if (statusTasks && statusTasks.length > 0) {
      // Filter out partial tasks from being written back to the plan
      const completeTasks = statusTasks.filter(task => !task.id.startsWith('partial-'));
      if (completeTasks.length === 0) continue;

      text += `# ${status}\n`;
      const groupedByPhase = completeTasks.reduce((acc, task) => {
        if (!acc[task.phase]) acc[task.phase] = [];
        acc[task.phase]!.push(task);
        return acc;
      }, {} as Record<string, Task[]>);

      Object.keys(groupedByPhase).forEach(phase => {
        text += `## ${phase}\n`;
        groupedByPhase[phase]!.forEach(task => {
          text += `- ${task.subPhase}, ${task.id}, ${task.description}, ${task.priority}\n`;
        });
        text += '\n';
      });
    }
  }

  return text.trim() + '\n';
};


// --- TUTORIAL PROJECT ---
const tutorialImplementationPlan = `# To-Do
## 📝 The Basics: Documents
- Edit Plan, TUT-01, Edit the text of this task right here in this document. Notice the card on the right updates instantly!, Medium
- Create Task, TUT-02, Highlight some text in the 'Planning Document' (left panel), right-click, and choose 'Implement Task'., High

## Kanban Power
- Drag & Drop, TUT-03, Drag this card to the 'In Progress' column., Low
- Edit Card, TUT-04, Right-click this card and select 'Edit' to change its details., Low
- Sub-Projects, TUT-05, Double-click this card to create a detailed sub-project for it. Great for complex tasks!, High
`;

const tutorialPlanningDocument = `# Welcome to Zenith!

This is a tutorial project designed to guide you through the core features.

**Our Philosophy:** Your plan is your work. Zenith connects your planning documents directly to a visual Kanban board, ensuring they're always in sync.

## Your First Steps

1.  **Explore the Documents:** Use the tabs on the left to switch between this Planning Document, the structured Implementation Plan, and a free-form Scratchpad.
2.  **Interact with the Board:** The tasks on the right are generated *from* the Implementation Plan. Try dragging and dropping them.
3.  **Create a Task:** You can create tasks by writing in the Implementation Plan, or by highlighting text in *this* document, right-clicking, and selecting "Implement Task". Try it now!
`;

const tutorialScratchpad = `# My First Notes

This is your scratchpad. It's a great place for:
- Quick thoughts
- Meeting notes
- Code snippets

It's private to this project and won't affect your Kanban board. Feel free to experiment!
`;

export const getTutorialProject = (): Project => {
    const initialTasks = parseImplementationPlan(tutorialImplementationPlan);
    const { phaseColors, subPhaseColors } = assignColors(initialTasks, {}, {});

    return {
        id: 'proj-tutorial',
        name: '⭐ Interactive Tutorial',
        planningDocument: tutorialPlanningDocument,
        implementationPlan: tutorialImplementationPlan,
        scratchpad: tutorialScratchpad,
        tasks: initialTasks,
        phaseColors,
        subPhaseColors
    };
};


// --- INITIAL DATA ---

export const getInitialProjects = (): Project[] => {
    return [getTutorialProject()];
}