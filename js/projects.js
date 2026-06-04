// ── §1–§3  Project registry, URL-hash routing, project lifecycle ──────────────

// §3.2 — fixed colour palette, cycled round-robin on creation
const PALETTE = ['#4A90D9','#E67E22','#27AE60','#9B59B6','#E74C3C',
                 '#1ABC9C','#F39C12','#2980B9','#8E44AD','#16A085'];

let activeProject = null;   // current registry entry
let projectRegistry = [];   // in-memory mirror of GLOBAL_KEYS.projects

// ── Registry persistence ───────────────────────────────────────────────────

function loadRegistry() {
    projectRegistry = loadFromLocalStorage(GLOBAL_KEYS.projects, []);
}

function saveRegistry() {
    saveToLocalStorage(GLOBAL_KEYS.projects, projectRegistry);
}

function findBySlug(slug) {
    return projectRegistry.find(p => p.slug === slug) || null;
}

function findById(id) {
    return projectRegistry.find(p => p.id === id) || null;
}

// ── §1.1  Internal ID & slug helpers ──────────────────────────────────────

function genId() {
    return Math.random().toString(36).slice(2, 8);
}

function nextUntitledSlug() {
    const used = new Set(projectRegistry.map(p => p.slug));
    let n = 1;
    while (used.has(`untitled-${n}`)) n++;
    return `untitled-${n}`;
}

// §3.2 — next colour from palette, cycling by registry length
function nextColor() {
    return PALETTE[projectRegistry.length % PALETTE.length];
}

// Applies a very light desaturated tint of `hex` to the page background.
// Converts the hue to HSL, drops saturation to ~25%, raises lightness to ~96%.
function applyProjectBackground(hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);

    const max = Math.max(r, g, b) / 255;
    const min = Math.min(r, g, b) / 255;
    let h = 0;
    const d = max - min;
    if (d) {
        if (max === r / 255) h = ((g / 255 - b / 255) / d + 6) % 6;
        else if (max === g / 255) h = (b / 255 - r / 255) / d + 2;
        else                      h = (r / 255 - g / 255) / d + 4;
        h = Math.round(h * 60);
    }

    document.body.setAttribute('style',`background-color:hsl(${h}, 50%, 70%);`);
}

// ── §1.2  URL hash helpers ─────────────────────────────────────────────────

function getHashSlug() {
    return decodeURIComponent(location.hash.replace(/^#/, '')) || null;
}

function pushHash(slug) {
    history.pushState(null, '', '#' + encodeURIComponent(slug));
}

// ── §2.1  Create project ───────────────────────────────────────────────────

function createProject(opts = {}) {
    const id   = genId();
    const slug = opts.slug || nextUntitledSlug();
    const name = opts.name || slug;
    const entry = {
        id,
        slug,
        name,
        color:            opts.color        || nextColor(),
        nameTemplate:     opts.nameTemplate || 'Author{n}',
        createdAt:        new Date().toISOString(),
        lastViewedAt:     new Date().toISOString(),
    };
    projectRegistry.push(entry);
    saveRegistry();
    // Seed rubric: use provided data, or fall back to the built-in default
    const rubric = opts.rubricData ||
        (typeof parseMarkdownRubric === 'function' ? parseMarkdownRubric(defaultRubricMd) : null);
    if (rubric) saveToLocalStorage(`${id}_rubricData`, rubric);
    return entry;
}

// §2.1 — duplicate: copies rubric only, no students/grades
function duplicateProject(sourceId) {
    const src = findById(sourceId);
    if (!src) return null;
    return createProject({
        slug:         src.slug + '-copy',
        name:         src.name + ' (copy)',
        nameTemplate: src.nameTemplate,
        rubricData:   loadFromLocalStorage(`${src.id}_rubricData`),
    });
}

// ── §2.3  Clear grading data — keeps rubric, name, colour ─────────────────

function clearProjectGradingData(id) {
    localStorage.removeItem(`${id}_students`);
    localStorage.removeItem(`${id}_currentIndex`);
}

// ── §2.4  Delete project — removes all associated keys ────────────────────

function deleteProject(id) {
    ['students','currentIndex','rubricData','layout','courseName','assignmentName']
        .forEach(f => localStorage.removeItem(`${id}_${f}`));
    projectRegistry = projectRegistry.filter(p => p.id !== id);
    saveRegistry();
}

// ── §4.3 / §1.2  Switch active project ────────────────────────────────────

function switchProject(id) {
    const entry = findById(id);
    if (!entry) return;

    if (typeof releaseLock === 'function') releaseLock();

    activeProject = entry;
    entry.lastViewedAt = new Date().toISOString();
    saveRegistry();
    saveToLocalStorage(GLOBAL_KEYS.lastProject, entry.slug);

    updateStorageKeys(id);
    pushHash(entry.slug);
    applyProjectBackground(entry.color);

    // §6 — dynamic title
    document.title = `${entry.name} — Grading`;
    const h1 = document.getElementById('mainTitle');
    if (h1) h1.textContent = `${entry.name} — Grading`;

    initializeFromLocalStorage();
    initializeRubric();
    loadStudentData();
    if (typeof acquireLock === 'function') acquireLock();
    renderProjectList();
}

// ── §1.2  Startup: resolve URL hash → active project ──────────────────────

function initProjects() {
    loadRegistry();

    let entry = null;

    // 1. URL hash slug
    const hashSlug = getHashSlug();
    if (hashSlug) entry = findBySlug(hashSlug);

    // 2. Last viewed
    if (!entry) {
        const lastSlug = loadFromLocalStorage(GLOBAL_KEYS.lastProject);
        if (lastSlug) entry = findBySlug(lastSlug);
    }

    // 3. First in registry
    if (!entry && projectRegistry.length > 0) {
        entry = [...projectRegistry].sort(
            (a, b) => new Date(b.lastViewedAt) - new Date(a.lastViewedAt)
        )[0];
    }

    // 4. First-ever launch — create default project
    if (!entry) {
        entry = createProject({ slug: 'untitled-1', name: 'untitled-1' });
    }

    activeProject = entry;
    entry.lastViewedAt = new Date().toISOString();
    saveRegistry();
    saveToLocalStorage(GLOBAL_KEYS.lastProject, entry.slug);
    updateStorageKeys(entry.id);

    if (getHashSlug() !== entry.slug) {
        history.replaceState(null, '', '#' + encodeURIComponent(entry.slug));
    }

    applyProjectBackground(entry.color);

    // §6
    document.title = `${entry.name} — Grading`;
    const h1 = document.getElementById('mainTitle');
    if (h1) h1.textContent = `${entry.name} — Grading`;
}

// §1.2 — browser back/forward navigates project history
window.addEventListener('popstate', () => {
    const slug = getHashSlug();
    if (!slug) return;
    const entry = findBySlug(slug);
    if (entry && (!activeProject || entry.id !== activeProject.id)) {
        // Switch without pushing another history entry
        if (typeof releaseLock === 'function') releaseLock();
        activeProject = entry;
        entry.lastViewedAt = new Date().toISOString();
        saveRegistry();
        saveToLocalStorage(GLOBAL_KEYS.lastProject, entry.slug);
        updateStorageKeys(entry.id);
        applyProjectBackground(entry.color);
        document.title = `${entry.name} — Grading`;
        const h1 = document.getElementById('mainTitle');
        if (h1) h1.textContent = `${entry.name} — Grading`;
        initializeFromLocalStorage();
        initializeRubric();
        loadStudentData();
        if (typeof acquireLock === 'function') acquireLock();
        renderProjectList();
    }
});
