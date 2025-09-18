import { Project, Folder, Label, AppSettings, FontFamily, FontSize } from '../types';

export interface AppData {
    projects: Project[];
    folders: Folder[];
    labels: Label[];
}

const DATA_COOKIE_KEY = 'zenithAppData';
const SETTINGS_LOCALSTORAGE_KEY = 'zenithAppSettings';


// Helper function to set a cookie
function setCookie(name: string, value: string, days: number) {
    let expires = "";
    if (days) {
        const date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        expires = "; expires=" + date.toUTCString();
    }
    // Add SameSite and Secure attributes for security best practices
    document.cookie = name + "=" + (value || "")  + expires + "; path=/; SameSite=Lax; Secure";
}

// Helper function to get a cookie
function getCookie(name: string): string | null {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for(let i=0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
}


export const saveDataToCookie = (data: AppData) => {
    try {
        const dataJson = JSON.stringify(data);
        // Set cookie to expire in one year
        setCookie(DATA_COOKIE_KEY, dataJson, 365);
    } catch (error) {
        console.error("Failed to save app data to cookie:", error);
        // This might happen if the projects data is too large for a cookie.
        alert("Error: Could not save project data. The data might be too large for browser cookies.");
    }
};


export const loadDataFromCookie = (): AppData | null => {
    try {
        const dataJson = getCookie(DATA_COOKIE_KEY);
        if (dataJson) {
            const data = JSON.parse(dataJson);
            // Perform a basic check to ensure the data is in the expected format
            if (data && Array.isArray(data.projects)) {
                 // --- MIGRATION LOGIC ---
                 const migratedProjects = data.projects.map((p: Project & { fontFamily?: FontFamily, customFont?: string, fontSize?: FontSize }) => {
                     // Check if old properties exist
                     if ('fontFamily' in p || 'customFont' in p || 'fontSize' in p) {
                         const newProject: Project = { ...p };
                         newProject.bodyFontFamily = p.fontFamily || 'sans';
                         newProject.bodyCustomFont = p.customFont || '';
                         newProject.bodyFontSize = p.fontSize || 'base';
                         
                         // Set default header fonts
                         newProject.headerFontFamily = 'sans';
                         newProject.headerCustomFont = '';
                         newProject.headerFontSize = 'base';

                         // Delete old properties
                         delete (newProject as any).fontFamily;
                         delete (newProject as any).customFont;
                         delete (newProject as any).fontSize;
                         
                         return newProject;
                     }
                     return p;
                 });

                 return {
                    projects: migratedProjects,
                    folders: data.folders || [],
                    labels: data.labels || [],
                };
            }
        }
        return null;
    } catch (error) {
        console.error("Failed to load app data from cookie:", error);
        // If there's an error (e.g., corrupted data), return null to load defaults
        return null;
    }
};

// --- Settings Service ---
export const saveSettingsToLocalStorage = (settings: AppSettings) => {
    try {
        localStorage.setItem(SETTINGS_LOCALSTORAGE_KEY, JSON.stringify(settings));
    } catch (error) {
        console.error("Failed to save settings to localStorage:", error);
    }
};

export const loadSettingsFromLocalStorage = (): AppSettings => {
    const defaults: AppSettings = {
        backupFrequency: 'weekly',
        dashboardTheme: 'dark',
        applyThemeToAllProjects: false,
    };
    try {
        const settingsJson = localStorage.getItem(SETTINGS_LOCALSTORAGE_KEY);
        if (settingsJson) {
            const savedSettings = JSON.parse(settingsJson);
            // Merge with defaults to ensure new fields exist for users with old settings
            return { ...defaults, ...savedSettings };
        }
    } catch (error) {
        console.error("Failed to load settings from localStorage:", error);
    }
    // Return default settings if nothing is found or on error
    return defaults;
};