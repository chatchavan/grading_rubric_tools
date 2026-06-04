// ── §1.3  localStorage keys & utilities ──────────────────────────────────────

const STORAGE_KEYS = {
    students:       'gradingApp_students',
    currentIndex:   'gradingApp_currentIndex',
    rubricData:     'gradingApp_rubricData',
    layout:         'gradingApp_layout',
    courseName:     'gradingApp_courseName',
    assignmentName: 'gradingApp_assignmentName'
};

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
