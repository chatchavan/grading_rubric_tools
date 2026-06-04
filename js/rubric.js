// ── §1  Rubric data: default content, markdown parser, file loading, DOM rendering ─

// Splits a criterion name into { head, description } when the author used the
// "**Bold head**: description" format.  The markdown parser strips the first
// colon, so the stored name arrives as "**Head** Description" (no colon).
// Returns { head: fullName, description: '' } for plain names.
function parseCriterionName(name) {
    const m = name.match(/^\*\*(.+?)\*\*:?\s*(.*)$/);
    if (m) return { head: m[1].trim(), description: m[2].trim() };
    return { head: name, description: '' };
}

// the following default is not used, but kept to show the structure
/*
const defaultRubricData = [
    {
        name: "Central claim",
        options: [
            { score: 2, text: "Clearly stated at the beginning of the text gives a clear direction toward the central claim." },
            { score: 1, text: "Clearly stated, but buried too far into the text." },
            { score: 0, text: "Implicit, ambiguous, or absent" }
        ]
    },
    {
        name: "Premises - Relevant: Are the premises relevant to the claim?",
        options: [
            { score: 2, text: "Most/all" },
            { score: 1, text: "About half" }
        ]
    }
];
*/

// Default rubric data
const defaultRubricMd =
`- **Central claim**: Is it clearly and prominently stated?
\t- (2) Clearly stated at the beginning; gives a clear direction toward the argument.
\t- (1) Clearly stated, but buried too far into the text.
\t- (0) Implicit, ambiguous, or absent.
- **Premises**: Are the premises relevant to the claim?
\t- (2) Most or all premises are clearly relevant.
\t- (1) About half of the premises are relevant.`;  // important: the second level begins with a tab


function parseMarkdownRubric(markdownText) {
    const lines = markdownText.split('\n');
    const rubric = [];
    let currentCriterion = null;

    lines.forEach(line => {

        // Skip empty lines
        if (!line) return;

        // First-level bullet (criterion)
        if (line.startsWith('- ') && !line.startsWith('\t') && !line.startsWith('  ')) {
            // Save previous criterion if exists
            if (currentCriterion) {
                rubric.push(currentCriterion);
            }

            // Start new criterion
            currentCriterion = {
                name: line.substring(2).replace(':', '').trim(),
                options: []
            };
        }
        // Second-level bullet (options with scores)
        else if ((line.startsWith('\t- ') || line.startsWith('  - ')) && currentCriterion) {
            const optionText = line.replace(/^\s*- /, '');
            const scoreMatch = optionText.match(/^\((\d+)\)\s*(.*)$/);

            if (scoreMatch) {
                const score = parseInt(scoreMatch[1]);
                const text = scoreMatch[2].trim();

                currentCriterion.options.push({
                    score: score,
                    text: text
                });
            }
        }
    });

    // Add the last criterion
    if (currentCriterion) {
        rubric.push(currentCriterion);
    }

    return rubric;
}

// Current rubric data (can be default or loaded from file)
let rubricData = parseMarkdownRubric(defaultRubricMd);

function loadRubricFile() {
    const fileInput = document.getElementById('rubricFile');
    const file = fileInput.files[0];

    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const markdownText = e.target.result;
            try {
                const parsedRubric = parseMarkdownRubric(markdownText);

                if (parsedRubric.length === 0) {
                    alert('No valid rubric criteria found in the markdown file. Please check the format.');
                    return;
                }

                rubricData = parsedRubric;
                saveToLocalStorage(STORAGE_KEYS.rubricData, rubricData);

                // Reset students data when new rubric is loaded
                resetStudentState();

                initializeRubric();
                loadStudentData();

                alert(`Rubric loaded successfully! Found ${parsedRubric.length} criteria.`);
            } catch (error) {
                alert('Error parsing markdown file: ' + error.message);
            }
        };
        reader.readAsText(file);
    }
}


function initializeRubric() {
    const container = document.getElementById('criteriaContainer');
    container.innerHTML = '';

    rubricData.forEach((criterion, criterionIndex) => {
        const criterionDiv = document.createElement('div');
        criterionDiv.className = 'criterion';

        criterionDiv.innerHTML = `
            <div class="criterion-header">${(({ head, description }) =>
                description
                    ? `<span class="criterion-head">${head}</span><span class="criterion-desc">${description}</span>`
                    : head
            )(parseCriterionName(criterion.name))}</div>
            <div class="criterion-options">
                ${criterion.options.map((option, optionIndex) => `
                    <div class="option" onclick="selectOption(${criterionIndex}, ${optionIndex})">
                        <input type="radio"
                               id="criterion_${criterionIndex}_${optionIndex}"
                               name="criterion_${criterionIndex}"
                               value="${option.score}"
                               onchange="updateScore()">
                        <div class="score-badge">${option.score}</div>
                        <label for="criterion_${criterionIndex}_${optionIndex}">
                            ${option.text}
                        </label>
                    </div>
                `).join('')}
            </div>
        `;

        container.appendChild(criterionDiv);
    });
}
