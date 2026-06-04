// ── §4 / §8  UI state: layout toggle, PDF meta, localStorage restore ─────────

// Layout toggle state (declared here so initializeFromLocalStorage can set it)
let isColumnLayout = true;

function toggleLayout() {
    isColumnLayout = !isColumnLayout;
    saveToLocalStorage(STORAGE_KEYS.layout, isColumnLayout);

    const container = document.getElementById('criteriaContainer');
    const btn = document.getElementById('layoutToggleBtn');
    const icon = document.getElementById('layoutToggleIcon');

    if (isColumnLayout) {
        container.classList.add('column-layout');
        btn.classList.add('active');
        icon.textContent = '⊞';
        btn.childNodes[btn.childNodes.length - 1].textContent = ' Row View';
    } else {
        container.classList.remove('column-layout');
        btn.classList.remove('active');
        icon.textContent = '⊟';
        btn.childNodes[btn.childNodes.length - 1].textContent = ' Column View';
    }
}

function savePdfMeta() {
    saveToLocalStorage(STORAGE_KEYS.courseName, document.getElementById('courseName').value);
    saveToLocalStorage(STORAGE_KEYS.assignmentName, document.getElementById('assignmentName').value);
}

function initializeFromLocalStorage() {
    // Always reset in-memory state first so a project with no saved data
    // never inherits values from the previously active project.

    // Rubric — fall back to built-in default when key is absent
    const savedRubric = loadFromLocalStorage(STORAGE_KEYS.rubricData);
    rubricData = (savedRubric && savedRubric.length > 0)
        ? savedRubric
        : parseMarkdownRubric(defaultRubricMd);

    // Students — reset to one blank slot when key is absent
    const savedStudents = loadFromLocalStorage(STORAGE_KEYS.students);
    students = (savedStudents && savedStudents.length > 0)
        ? savedStudents
        : [{ name: '', scores: {} }];

    // Current index — reset to 0 when absent or out of range
    const savedIndex = loadFromLocalStorage(STORAGE_KEYS.currentIndex);
    currentStudentIndex = (savedIndex !== null && savedIndex >= 0 && savedIndex < students.length)
        ? savedIndex
        : 0;

    // Column layout — default to column view when no preference saved
    const savedLayout = loadFromLocalStorage(STORAGE_KEYS.layout);
    isColumnLayout = savedLayout === null ? true : savedLayout === true;
    const container = document.getElementById('criteriaContainer');
    const btn  = document.getElementById('layoutToggleBtn');
    const icon = document.getElementById('layoutToggleIcon');
    container.classList.toggle('column-layout', isColumnLayout);
    btn.classList.toggle('active', isColumnLayout);
    icon.textContent = isColumnLayout ? '⊞' : '⊟';
    btn.childNodes[btn.childNodes.length - 1].textContent = isColumnLayout ? ' Row View' : ' Column View';

    // PDF header fields — always write (empty string clears stale values)
    document.getElementById('courseName').value     = loadFromLocalStorage(STORAGE_KEYS.courseName)     ?? '';
    document.getElementById('assignmentName').value = loadFromLocalStorage(STORAGE_KEYS.assignmentName) ?? '';
}
