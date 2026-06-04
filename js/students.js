// ── §2  Student state: per-student data save/load and navigation ──────────────

let students = [{ name: '', scores: {} }];
let currentStudentIndex = 0;

function resetStudentState() {
    students = [{ name: '', scores: {} }];
    currentStudentIndex = 0;
    saveToLocalStorage(STORAGE_KEYS.students, students);
    saveToLocalStorage(STORAGE_KEYS.currentIndex, currentStudentIndex);
}

function saveCurrentStudentData() {
    const currentStudent = students[currentStudentIndex];
    currentStudent.name = document.getElementById('studentName').value;
    currentStudent.notes = document.getElementById('studentNotes').value;

    // Save to local storage
    saveToLocalStorage(STORAGE_KEYS.students, students);
}

function loadStudentData() {
    const currentStudent = students[currentStudentIndex];

    // Clear any previous highlighting when loading new student
    clearCriterionHighlighting();

    // Set default name if empty, using the project's name template
    if (!currentStudent.name) {
        const template     = (activeProject && activeProject.nameTemplate) || 'Author{n}';
        const studentNumber = String(currentStudentIndex + 1).padStart(2, '0');
        currentStudent.name = template.replace('{n}', studentNumber);
        saveToLocalStorage(STORAGE_KEYS.students, students);
    }

    document.getElementById('studentName').value = currentStudent.name;
    document.getElementById('studentNotes').value = currentStudent.notes || '';

    // Clear all radio buttons first
    document.querySelectorAll('input[type="radio"]').forEach(radio => {
        radio.checked = false;
    });

    // Load saved scores
    rubricData.forEach((criterion, criterionIndex) => {
        const savedScore = currentStudent.scores[criterionIndex];
        if (savedScore) {
            const radioButton = document.querySelector(`input[name="criterion_${criterionIndex}"][value="${savedScore.score}"]`);
            if (radioButton) {
                radioButton.checked = true;
            }
        }
    });

    updateScore();
    updateVisualSelection();
    document.getElementById('studentCounter').textContent = `Student ${currentStudentIndex + 1}`;
    document.getElementById('backButton').disabled = currentStudentIndex === 0;

    // §5.3 — acquire editing lock for this student
    if (typeof acquireLock === 'function') acquireLock();
}

function navigateStudent(direction) {
    // §5.3 — release lock before moving to a different student
    if (typeof releaseLock === 'function') releaseLock();

    // Clear any previous highlighting
    clearCriterionHighlighting();

    saveCurrentStudentData();

    if (direction === 1) {
        // Moving forward
        if (currentStudentIndex === students.length - 1) {
            // Add new student
            students.push({ name: '', scores: {} });
        }
        currentStudentIndex++;
    } else if (direction === -1 && currentStudentIndex > 0) {
        // Moving backward
        currentStudentIndex--;
    }

    // Save current index to local storage
    saveToLocalStorage(STORAGE_KEYS.currentIndex, currentStudentIndex);
    saveToLocalStorage(STORAGE_KEYS.students, students);

    loadStudentData();
}
