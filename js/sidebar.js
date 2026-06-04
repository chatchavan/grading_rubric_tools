// ── §4  Project list sidebar ──────────────────────────────────────────────────

// §4.1 — collapsed by default; state not persisted
let sbOpen = false;

function toggleSidebar() { sbOpen ? closeSidebar() : openSidebar(); }

function openSidebar() {
    sbOpen = true;
    renderProjectList();
    document.getElementById('sidebar').classList.add('open');
    document.getElementById('sidebarOverlay').classList.add('open');
}

function closeSidebar() {
    sbOpen = false;
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebarOverlay').classList.remove('open');
    closeAllDropdowns();
}

// ── Dropdowns ─────────────────────────────────────────────────────────────

function toggleDropdown(id, e) {
    if (e) e.stopPropagation();
    const dd = document.getElementById(id);
    const wasOpen = dd.classList.contains('open');
    closeAllDropdowns();
    if (!wasOpen) dd.classList.add('open');
}

function closeAllDropdowns() {
    document.querySelectorAll('.dropdown').forEach(d => d.classList.remove('open'));
}

document.addEventListener('click', closeAllDropdowns);

// ── §4.2  Render project list ──────────────────────────────────────────────

function renderProjectList() {
    const list = document.getElementById('projectList');
    if (!list) return;
    list.innerHTML = '';

    // §4.2 — sorted by lastViewedAt descending
    const sorted = [...projectRegistry].sort(
        (a, b) => new Date(b.lastViewedAt) - new Date(a.lastViewedAt)
    );

    sorted.forEach(p => {
        const isActive = activeProject && p.id === activeProject.id;
        const row = document.createElement('div');
        row.className = 'proj-row' + (isActive ? ' active' : '');
        row.style.setProperty('--proj-color', p.color);

        row.innerHTML = `
            <div class="proj-top">
                <div class="color-swatch" style="background:${esc(p.color)}" title="Click to change colour">
                    <input type="color" value="${esc(p.color)}"
                           oninput="onColorChange('${p.id}', this.value)">
                </div>
                <span class="proj-name" id="pn-${p.id}"
                      onclick="onSwitchProject('${p.id}')"
                      ondblclick="startNameEdit('${p.id}')"
                      title="Click to open · Double-click to rename">${esc(p.name)}</span>
                <span class="proj-badge">${countStudents(p.id)}</span>
                <div class="proj-menu-wrap">
                    <button class="proj-menu-btn" onclick="toggleDropdown('pdd-${p.id}', event)"
                            title="More actions">…</button>
                    <div class="dropdown proj-dropdown" id="pdd-${p.id}">
                        <div class="dd-item" onclick="openEditProjectModal('${p.id}')">✎ Edit</div>
                        <div class="dd-item" onclick="closeSidebar(); openExportModalForProject('${p.id}')">📤 Export</div>
                        <div class="dd-item" onclick="onDuplicateProject('${p.id}')">⧉ Duplicate</div>
                        <div class="dd-item dd-danger" onclick="onClearProject('${p.id}')">🗑 Clear grading data</div>
                        <div class="dd-item dd-danger" onclick="onDeleteProject('${p.id}')">✕ Delete</div>
                    </div>
                </div>
            </div>
            <div class="proj-slug-row">
                <a class="proj-slug proj-slug-link" href="rubric_grader.html#${esc(p.slug)}"
                   title="Cmd+click to open in new window">#${esc(p.slug)}</a>
            </div>`;
        list.appendChild(row);
    });
}

// HTML-escape helper (used by sidebar and modals)
function esc(s) {
    return String(s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function countStudents(id) {
    const data = loadFromLocalStorage(`${id}_students`, []);
    return data.filter(s => s.name || Object.keys(s.scores || {}).length > 0).length;
}

// ── §4.3  Sidebar action handlers ─────────────────────────────────────────

function onSwitchProject(id) {
    switchProject(id);
    closeSidebar();
}

function onNewProject() {
    const entry = createProject();
    switchProject(entry.id);
    closeSidebar();
}

function onDuplicateCurrent() {
    if (!activeProject) return;
    const entry = duplicateProject(activeProject.id);
    switchProject(entry.id);
    closeSidebar();
}

function onDuplicateProject(id) {
    const entry = duplicateProject(id);
    switchProject(entry.id);
    closeSidebar();
}

function onClearProject(id) {
    if (activeProject && id === activeProject.id && typeof isLockedOut === 'function' && isLockedOut()) {
        showToast('Cannot clear data — another window is editing this project.', 'warn');
        return;
    }
    const p = findById(id);
    if (!confirm(`Clear all student grading data for "${p ? p.name : 'this project'}"?\n\nThe rubric, display name, and colour are kept.\nThis cannot be undone.`)) return;
    clearProjectGradingData(id);
    if (activeProject && id === activeProject.id) {
        resetStudentState();
        loadStudentData();
    }
    renderProjectList();
    showToast('Grading data cleared.');
}

function onDeleteProject(id) {
    if (activeProject && id === activeProject.id && typeof isLockedOut === 'function' && isLockedOut()) {
        showToast('Cannot delete — another window is editing this project.', 'warn');
        return;
    }
    const p = findById(id);
    if (!confirm(`Delete "${p ? p.name : 'this project'}" and ALL its data?\n\nThis removes the rubric, all students, and all grades.\nThis cannot be undone.`)) return;
    deleteProject(id);
    if (activeProject && id === activeProject.id) {
        if (projectRegistry.length > 0) {
            switchProject(projectRegistry[0].id);
        } else {
            const fresh = createProject();
            switchProject(fresh.id);
        }
    } else {
        renderProjectList();
    }
    showToast('Project deleted.');
}

function onColorChange(id, val) {
    const p = findById(id);
    if (!p) return;
    p.color = val;
    saveRegistry();
    renderProjectList();
}

// ── §2.2  Inline display-name rename (double-click) ───────────────────────

function startNameEdit(id) {
    const span = document.getElementById('pn-' + id);
    if (!span) return;
    const p = findById(id);
    const inp = document.createElement('input');
    inp.className = 'proj-name-input';
    inp.value = p.name;
    inp.onclick = e => e.stopPropagation();
    span.replaceWith(inp);
    inp.focus(); inp.select();

    const done = () => {
        const v = inp.value.trim() || p.name;
        p.name = v;
        saveRegistry();
        if (activeProject && p.id === activeProject.id) {
            document.title = `${v} — Grading`;
            const h1 = document.getElementById('mainTitle');
            if (h1) h1.textContent = `${v} — Grading`;
        }
        renderProjectList();
    };
    inp.addEventListener('blur', done);
    inp.addEventListener('keydown', e => {
        if (e.key === 'Enter')  inp.blur();
        if (e.key === 'Escape') { inp.value = p.name; inp.blur(); }
    });
}
