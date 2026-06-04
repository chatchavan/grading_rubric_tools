// ── §7 + §2.2  Modals: export, import, edit-project; toasts ──────────────────

// ── Generic modal open/close ───────────────────────────────────────────────

function openModal(id) {
    if (id === 'exportModal') populateExportList();
    document.getElementById(id).classList.add('open');
}

function closeModal(id) {
    document.getElementById(id).classList.remove('open');
}

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.modal-bg').forEach(bg => {
        bg.addEventListener('click', e => { if (e.target === bg) closeModal(bg.id); });
    });
});

function modalSelAll(listId) {
    // Only toggle checkboxes (not radio buttons used in conflict rows)
    const cbs = Array.from(document.querySelectorAll(`#${listId} input[type=checkbox]`));
    const allOn = cbs.every(c => c.checked);
    cbs.forEach(c => c.checked = !allOn);
}

// ── §7.1  Export ───────────────────────────────────────────────────────────

function openExportModalForProject(id) {
    populateExportList(id);
    document.getElementById('exportModal').classList.add('open');
}

function populateExportList(preselectedId = null) {
    const list = document.getElementById('exportList');
    if (!list) return;
    list.innerHTML = '';
    projectRegistry.forEach(p => {
        const n   = countStudents(p.id);
        const row = document.createElement('div');
        row.className      = 'check-row';
        row.dataset.projId = p.id;
        row.innerHTML = `
            <input type="checkbox" ${!preselectedId || p.id === preselectedId ? 'checked' : ''}>
            <div class="chk-swatch" style="background:${esc(p.color)}"></div>
            <div class="chk-info">
                <div class="chk-name">${esc(p.name)}</div>
                <div class="chk-meta">${esc(p.slug)} · ${n} student${n !== 1 ? 's' : ''}</div>
            </div>`;
        list.appendChild(row);
    });
}

function doExport() {
    const rows = Array.from(document.querySelectorAll('#exportList .check-row'))
        .filter(r => r.querySelector('input[type=checkbox]').checked);
    if (!rows.length) { alert('Select at least one project to export.'); return; }

    const projects = rows.map(r => {
        const id   = r.dataset.projId;
        const meta = findById(id);
        const data = {};
        ['students','currentIndex','rubricData','rubricMarkdown','layout','courseName','assignmentName']
            .forEach(f => { data[`${id}_${f}`] = loadFromLocalStorage(`${id}_${f}`); });
        return { meta, data };
    });

    const payload = {
        exportVersion: 1,
        exportedAt:    new Date().toISOString(),
        projects,
    };

    saveBlob(
        new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }),
        `rubric_grader_export_${new Date().toISOString().split('T')[0]}.json`
    );
    closeModal('exportModal');
}

// ── §7.2  Import ───────────────────────────────────────────────────────────

let importPayload = null;

function onImportFileChange() {
    const file = document.getElementById('importFileInput').files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
        try {
            const data = JSON.parse(e.target.result);
            if (!data.exportVersion || !Array.isArray(data.projects)) {
                throw new Error('Not a valid export file.');
            }
            importPayload = data;
            populateImportList(data.projects);
        } catch (err) {
            alert('Invalid export file: ' + err.message);
        }
    };
    reader.readAsText(file);
}

function populateImportList(projects) {
    const list = document.getElementById('importList');
    list.innerHTML = '';
    projects.forEach(entry => {
        const meta     = entry.meta;
        const n        = (entry.data[`${meta.id}_students`] || [])
            .filter(s => s.name || Object.keys(s.scores || {}).length > 0).length;
        const conflict = !!findById(meta.id);
        const uid      = 'ia-' + meta.id;   // unique name for radio group

        const row = document.createElement('div');
        row.className      = 'check-row import-row';
        row.dataset.projId = meta.id;

        if (!conflict) {
            // No conflict — simple checkbox
            row.innerHTML = `
                <input type="checkbox" checked>
                <div class="chk-swatch" style="background:${esc(meta.color)}"></div>
                <div class="chk-info">
                    <div class="chk-name">${esc(meta.name)}</div>
                    <div class="chk-meta">${esc(meta.slug)} · ${n} student${n !== 1 ? 's' : ''}</div>
                </div>`;
        } else {
            // ID conflict — radio group replaces checkbox
            row.innerHTML = `
                <div class="chk-swatch" style="background:${esc(meta.color)}"></div>
                <div class="chk-info">
                    <div class="chk-name">${esc(meta.name)}</div>
                    <div class="chk-meta">${esc(meta.slug)} · ${n} student${n !== 1 ? 's' : ''}</div>
                    <div class="import-conflict-actions">
                        <span class="conflict-tag" style="margin-bottom:6px">⚠ ID already exists</span>
                        <label class="import-radio-label">
                            <input type="radio" name="${uid}" value="overwrite" checked> Overwrite
                        </label>
                        <label class="import-radio-label">
                            <input type="radio" name="${uid}" value="new"> Import as new project
                        </label>
                        <label class="import-radio-label">
                            <input type="radio" name="${uid}" value="skip"> Skip
                        </label>
                    </div>
                </div>`;
        }
        list.appendChild(row);
    });
}

// Resolve slug collisions against the current registry state (ignoring `excludeId`)
function resolveSlug(slug, excludeId) {
    const taken = s => projectRegistry.some(p => p.slug === s && p.id !== excludeId);
    if (!taken(slug)) return slug;
    const base = slug.replace(/-\d+$/, '');
    let n = 2;
    while (taken(`${base}-${n}`)) n++;
    return `${base}-${n}`;
}

function doImport() {
    if (!importPayload) { alert('Please select a file first.'); return; }

    const rows = Array.from(document.querySelectorAll('#importList .import-row'));

    // Determine the action for each row
    const actions = rows.map(row => {
        const id       = row.dataset.projId;
        const radioEl  = row.querySelector(`input[type=radio]:checked`);
        const checkEl  = row.querySelector(`input[type=checkbox]`);
        const conflict = !!radioEl; // conflict rows use radios, non-conflict use checkbox

        if (conflict) {
            return { id, action: radioEl.value }; // 'overwrite' | 'new' | 'skip'
        } else {
            return { id, action: checkEl && checkEl.checked ? 'overwrite' : 'skip' };
        }
    }).filter(a => a.action !== 'skip');

    if (!actions.length) { alert('Select at least one project to import.'); return; }

    const actionMap = new Map(actions.map(a => [a.id, a.action]));
    let lastImportedId = null;

    importPayload.projects
        .filter(e => actionMap.has(e.meta.id))
        .forEach(entry => {
            const action = actionMap.get(entry.meta.id);
            let meta = { ...entry.meta };
            let data = entry.data;

            if (action === 'new') {
                // Re-key everything under a fresh ID
                const newId  = genId();
                const newData = {};
                Object.entries(data).forEach(([k, v]) => {
                    newData[k.replace(meta.id, newId)] = v;
                });
                meta = { ...meta, id: newId };
                data = newData;
            }

            // Resolve any slug collision (for both 'overwrite' and 'new')
            meta.slug = resolveSlug(meta.slug, meta.id);

            Object.entries(data).forEach(([k, v]) => saveToLocalStorage(k, v));
            const idx = projectRegistry.findIndex(p => p.id === meta.id);
            if (idx >= 0) projectRegistry[idx] = meta;
            else          projectRegistry.push(meta);

            lastImportedId = meta.id;
        });

    saveRegistry();
    closeModal('importModal');
    document.getElementById('importFileInput').value = '';
    importPayload = null;

    const count = actions.length;
    showToast(`Imported ${count} project${count !== 1 ? 's' : ''}.`);

    // Fix 3 — switch to the last imported project and open the sidebar
    if (lastImportedId) {
        switchProject(lastImportedId);
        openSidebar();
    }
}

// ── §2.2  Edit-project modal ───────────────────────────────────────────────

let editingProjectId = null;

function openEditProjectModal(id) {
    if (activeProject && id === activeProject.id && typeof isLockedOut === 'function' && isLockedOut()) {
        showToast('Cannot edit — another window is editing this project.', 'warn');
        return;
    }
    const p = findById(id);
    if (!p) return;
    editingProjectId = id;
    document.getElementById('editProjectName').value         = p.name;
    document.getElementById('editProjectSlug').value         = p.slug;
    document.getElementById('editProjectColor').value        = p.color;
    document.getElementById('editProjectNameTemplate').value = p.nameTemplate || 'Author{n}';
    openModal('editProjectModal');
}

function saveProjectEdit() {
    const p = findById(editingProjectId);
    if (!p) return;

    const newName         = document.getElementById('editProjectName').value.trim() || p.name;
    const rawSlug         = document.getElementById('editProjectSlug').value;
    const newSlug         = rawSlug.toLowerCase()
        .replace(/[^a-z0-9-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || p.slug;
    const newColor        = document.getElementById('editProjectColor').value;
    const newNameTemplate = document.getElementById('editProjectNameTemplate').value.trim() || 'Author{n}';

    const slugChanged = newSlug !== p.slug;
    p.name         = newName;
    p.slug         = newSlug;
    p.color        = newColor;
    p.nameTemplate = newNameTemplate;
    saveRegistry();

    if (activeProject && p.id === activeProject.id) {
        activeProject = p;
        document.title = `${newName} — Grading`;
        const h1 = document.getElementById('mainTitle');
        if (h1) h1.textContent = `${newName} — Grading`;
        if (slugChanged) {
            history.replaceState(null, '', '#' + encodeURIComponent(newSlug));
            showToast('Old URL is no longer valid.', 'warn');
        }
    }

    renderProjectList();
    closeModal('editProjectModal');
}

// ── Toasts ─────────────────────────────────────────────────────────────────

function showToast(msg, type = '') {
    const area = document.getElementById('toastArea');
    if (!area) return;
    const t = document.createElement('div');
    t.className = 'toast' + (type ? ' ' + type : '');
    t.textContent = msg;
    t.onclick = () => t.remove();
    area.appendChild(t);
    setTimeout(() => { t.style.transition = 'opacity .3s'; t.style.opacity = '0'; }, 3200);
    setTimeout(() => t.remove(), 3500);
}
