// ── App entry point: initialization, event listeners, data clear ──────────────

// §2.3 — "Clear Grading Data": resets students only, keeps rubric + settings
function clearGradingData() {
    const confirmed = confirm(
        'Are you sure you want to clear all grading data for this project?\n\n' +
        'This will remove:\n- All student names and scores\n\n' +
        'The rubric, layout, and PDF header fields are kept.'
    );
    if (!confirmed) return;
    try {
        doClearGradingData();
        showToast('Grading data cleared.');
    } catch (error) {
        alert('Error clearing data: ' + error.message);
    }
}

function doClearGradingData() {
    clearProjectGradingData(activeProject.id);
    resetStudentState();
    initializeRubric();
    loadStudentData();
}

// ── Initialization ────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', function() {
    initProjects();              // §1.2: resolve hash → activeProject, set STORAGE_KEYS
    initializeFromLocalStorage(); // restore per-project data into memory + UI
    initializeRubric();
    loadStudentData();
    if (typeof acquireLock === 'function') acquireLock(); // §5.3
    renderProjectList();         // populate sidebar (hidden until toggled)
});

// ── Event listeners ───────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', function() {
    // §5.2 — debounce name and notes saves to reduce cross-window thrash
    const debouncedSave = debounce(saveCurrentStudentData, 400);
    document.getElementById('studentName').addEventListener('input', debouncedSave);
    document.getElementById('studentNotes').addEventListener('input', debouncedSave);
});
