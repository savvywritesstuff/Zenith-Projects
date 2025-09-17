import { Project, User } from '../types';

const getProjectsCookieKey = (userId: string) => `zenithProjectsData_${userId}`;
const USER_STORAGE_KEY = 'zenithCurrentUser';

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

// --- User Session Management ---
export const saveUserToStorage = (user: User) => {
    try {
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    } catch (error) {
        console.error("Failed to save user session:", error);
    }
};

export const loadUserFromStorage = (): User | null => {
    try {
        const userJson = localStorage.getItem(USER_STORAGE_KEY);
        return userJson ? JSON.parse(userJson) : null;
    } catch (error) {
        console.error("Failed to load user session:", error);
        return null;
    }
};

export const clearUserFromStorage = () => {
    localStorage.removeItem(USER_STORAGE_KEY);
};

// --- Project Data Management ---
/**
 * Saves the list of projects for a specific user to a browser cookie.
 * @param userId The ID of the user.
 * @param projects The array of projects to save.
 */
export const saveProjectsForUser = (userId: string, projects: Project[]) => {
    try {
        const projectsJson = JSON.stringify(projects);
        setCookie(getProjectsCookieKey(userId), projectsJson, 365);
    } catch (error) {
        console.error("Failed to save projects to cookie:", error);
        alert("Error: Could not save project data. The data might be too large for browser cookies.");
    }
};

/**
 * Loads the list of projects for a specific user from a browser cookie.
 * @param userId The ID of the user.
 * @returns An array of projects, or null if no valid data is found.
 */
export const loadProjectsForUser = (userId: string): Project[] | null => {
    try {
        const projectsJson = getCookie(getProjectsCookieKey(userId));
        if (projectsJson) {
            const projects = JSON.parse(projectsJson);
            if (Array.isArray(projects)) {
                return projects;
            }
        }
        return null;
    } catch (error) {
        console.error("Failed to load projects from cookie:", error);
        return null;
    }
};