// ── §4 / §8  UI state: layout toggle, PDF meta, localStorage restore ─────────

// Layout toggle state (declared here so initializeFromLocalStorage can set it)
let isColumnLayout = false;

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
    // Load rubric data
    const savedRubric = loadFromLocalStorage(STORAGE_KEYS.rubricData);
    if (savedRubric && savedRubric.length > 0) {
        rubricData = savedRubric;
    }

    // Load students data
    const savedStudents = loadFromLocalStorage(STORAGE_KEYS.students);
    if (savedStudents && savedStudents.length > 0) {
        students = savedStudents;
    }

    // Load current index
    const savedIndex = loadFromLocalStorage(STORAGE_KEYS.currentIndex);
    if (savedIndex !== null && savedIndex >= 0 && savedIndex < students.length) {
        currentStudentIndex = savedIndex;
    }

    // Restore column layout state
    const savedLayout = loadFromLocalStorage(STORAGE_KEYS.layout);
    if (savedLayout === true) {
        isColumnLayout = true;
        document.getElementById('criteriaContainer').classList.add('column-layout');
        const btn  = document.getElementById('layoutToggleBtn');
        const icon = document.getElementById('layoutToggleIcon');
        btn.classList.add('active');
        icon.textContent = '⊞';
        btn.childNodes[btn.childNodes.length - 1].textContent = ' Row View';
    }

    // Restore PDF header fields
    const savedCourse = loadFromLocalStorage(STORAGE_KEYS.courseName);
    if (savedCourse !== null) document.getElementById('courseName').value = savedCourse;

    const savedAssignment = loadFromLocalStorage(STORAGE_KEYS.assignmentName);
    if (savedAssignment !== null) document.getElementById('assignmentName').value = savedAssignment;
}
