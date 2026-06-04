// ── App entry point: initialization, event listeners, JSON import, data clear ─

function setEqual(a, b) {
    const setA = new Set(a);
    const setB = new Set(b);

    if (setA.size !== setB.size) return false;

    for (const v of setA) {
        if (!setB.has(v)) return false;
    }
    return true;
}

function clearLocalStorage() {
    const confirmed = confirm('Are you sure you want to clear all saved data? This action cannot be undone.\n\nThis will remove:\n- All student names and scores\n- Current rubric data\n- Navigation position');

    if (confirmed) {
        try {
            doClearLocalStorage();

            alert('All data has been cleared successfully.');
        } catch (error) {
            alert('Error clearing data: ' + error.message);
        }
    }
}

function doClearLocalStorage() {
    localStorage.removeItem(STORAGE_KEYS.students);
    localStorage.removeItem(STORAGE_KEYS.currentIndex);
    localStorage.removeItem(STORAGE_KEYS.rubricData);

    // Reset application state
    rubricData = parseMarkdownRubric(defaultRubricMd);
    resetStudentState();

    // Clear file input
    document.getElementById('rubricFile').value = '';

    // Reinitialize
    initializeRubric();
    loadStudentData();
}

// ── §7.2  JSON import ─────────────────────────────────────────────────────────

function uploadJSON() {
    const fileInput = document.getElementById('jsonFileInput');
    const file = fileInput.files[0];

    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const uploadedData = JSON.parse(e.target.result);

                if (!setEqual(Object.keys(uploadedData), Object.values(STORAGE_KEYS))) {
                    throw new Error("The uploaded JSON doesn't have required keys.");
                }

                doClearLocalStorage();

                // Restore from uploaded JSON
                Object.keys(uploadedData).forEach(key => {
                    saveToLocalStorage(key, uploadedData[key]);
                });

                // Refresh the app state
                location.reload();
            } catch (error) {
                alert('Invalid JSON file. Please upload a valid file.');
            }
        };
        reader.readAsText(file);
    }
}

// ── Initialization ────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', function() {
    initializeFromLocalStorage();
    initializeRubric();
    loadStudentData();
});

// Save data when student name changes
document.getElementById('studentName').addEventListener('input', function() {
    saveCurrentStudentData();
});
