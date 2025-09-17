import { Project } from '../types';

const PROJECTS_COOKIE_KEY = 'zenithProjectsData';

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

/**
 * Saves the entire list of projects to a browser cookie.
 * @param projects The array of projects to save.
 */
export const saveProjectsToCookie = (projects: Project[]) => {
    try {
        const projectsJson = JSON.stringify(projects);
        // Set cookie to expire in one year
        setCookie(PROJECTS_COOKIE_KEY, projectsJson, 365);
    } catch (error) {
        console.error("Failed to save projects to cookie:", error);
        // This might happen if the projects data is too large for a cookie.
        alert("Error: Could not save project data. The data might be too large for browser cookies.");
    }
};

/**
 * Loads the list of projects from a browser cookie.
 * @returns An array of projects, or null if no valid data is found.
 */
export const loadProjectsFromCookie = (): Project[] | null => {
    try {
        const projectsJson = getCookie(PROJECTS_COOKIE_KEY);
        if (projectsJson) {
            const projects = JSON.parse(projectsJson);
            // Perform a basic check to ensure the data is in the expected format
            if (Array.isArray(projects)) {
                return projects;
            }
        }
        return null;
    } catch (error) {
        console.error("Failed to load projects from cookie:", error);
        // If there's an error (e.g., corrupted data), return null to load defaults
        return null;
    }
};
