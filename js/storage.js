// ── §1.3  localStorage keys & utilities ──────────────────────────────────────

// Global keys — no per-project prefix
const GLOBAL_KEYS = {
    version:     'gradingApp_version',
    projects:    'gradingApp_projects',
    lastProject: 'gradingApp_lastProject',
};

// Per-project keys — rebuilt by updateStorageKeys() on every project switch
let STORAGE_KEYS = {
    students:       '',
    currentIndex:   '',
    rubricData:     '',
    layout:         '',
    courseName:     '',
    assignmentName: '',
};

function updateStorageKeys(projectId) {
    STORAGE_KEYS = {
        students:       `${projectId}_students`,
        currentIndex:   `${projectId}_currentIndex`,
        rubricData:     `${projectId}_rubricData`,
        layout:         `${projectId}_layout`,
        courseName:     `${projectId}_courseName`,
        assignmentName: `${projectId}_assignmentName`,
    };
}

function saveToLocalStorage(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
        console.warn('Could not save to localStorage:', error);
    }
}

function loadFromLocalStorage(key, defaultValue = null) {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
        console.warn('Could not load from localStorage:', error);
        return defaultValue;
    }
}

// §5.2 — debounce utility for name/notes saves
function debounce(fn, ms) {
    let timer;
    return function(...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), ms);
    };
}
