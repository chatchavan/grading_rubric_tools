// ── §2  Scoring: score calculation, visual selection, criterion validation ────

function getMaxScore() {
    return rubricData.reduce((sum, criterion) => {
        return sum + Math.max(...criterion.options.map(opt => opt.score));
    }, 0);
}

function updateScore() {
    const currentStudent = students[currentStudentIndex];
    let totalScore = 0;
    let selectedCount = 0;

    rubricData.forEach((criterion, criterionIndex) => {
        const selectedOption = document.querySelector(`input[name="criterion_${criterionIndex}"]:checked`);
        if (selectedOption) {
            const score = parseInt(selectedOption.value);
            currentStudent.scores[criterionIndex] = {
                criterionName: criterion.name,
                score: score
            };
            totalScore += score;
            selectedCount++;
        }
    });

    // Save to local storage after each update
    saveToLocalStorage(STORAGE_KEYS.students, students);

    const allSelected = selectedCount === rubricData.length;
    const scoreDisplay = document.getElementById('scoreDisplay');
    if (allSelected) {
        scoreDisplay.innerHTML = `Total Score: ${totalScore} / ${getMaxScore()}`;
        scoreDisplay.className = 'score-display';
    } else {
        scoreDisplay.innerHTML = `Total Score: ${totalScore} / ${getMaxScore()}<br><small style="font-size: 13px; font-weight: 400; opacity: 0.85;">${selectedCount} of ${rubricData.length} criteria scored</small>`;
        scoreDisplay.className = 'score-display incomplete';
    }
}

function selectOption(criterionIndex, optionIndex) {
    const radioButton = document.getElementById(`criterion_${criterionIndex}_${optionIndex}`);
    radioButton.checked = true;
    updateVisualSelection();
    updateScore();
}

function updateVisualSelection() {
    document.querySelectorAll('.option').forEach(option => {
        const radio = option.querySelector('input[type="radio"]');
        if (radio && radio.checked) {
            option.classList.add('selected');
        } else {
            option.classList.remove('selected');
        }
    });
}

function findFirstMissingCriterion() {
    for (let criterionIndex = 0; criterionIndex < rubricData.length; criterionIndex++) {
        const selectedOption = document.querySelector(`input[name="criterion_${criterionIndex}"]:checked`);
        if (!selectedOption) {
            return criterionIndex;
        }
    }
    return -1; // All criteria selected
}

function highlightMissingCriterion(criterionIndex) {
    // Clear any previous highlighting
    clearCriterionHighlighting();

    // Find the criterion element
    const criterionElement = document.querySelector(`#criteriaContainer .criterion:nth-child(${criterionIndex + 1})`);
    const headerElement = criterionElement?.querySelector('.criterion-header');

    if (headerElement) {
        // Add highlighting class
        headerElement.classList.add('missing');

        // Scroll to the criterion with some offset for better visibility
        criterionElement.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
        });

        // Remove highlighting after animation completes
        setTimeout(() => {
            headerElement.classList.remove('missing');
        }, 3000);
    }
}

function clearCriterionHighlighting() {
    document.querySelectorAll('.criterion-header.missing').forEach(header => {
        header.classList.remove('missing');
    });
}

function isAllCriteriaSelected() {
    return findFirstMissingCriterion() === -1;
}
