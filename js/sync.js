// ── §5  Multi-window: cross-window sync and concurrent-editing lock ───────────

// §5 — per-tab window ID, not shared across windows
const WINDOW_ID = (() => {
    let id = sessionStorage.getItem('gradingApp_windowId');
    if (!id) {
        id = 'w' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
        sessionStorage.setItem('gradingApp_windowId', id);
    }
    return id;
})();

const LOCK_TTL_MS  = 30000;   // §5.3 — lock expires after 30 s without heartbeat
const HEARTBEAT_MS = 10000;   // §5.3 — heartbeat refresh every 10 s

let lockHeartbeatTimer = null;

function lockKey() {
    return `gradingApp_lock_${activeProject.id}_${currentStudentIndex}`;
}

// ── §5.3  Lock lifecycle ───────────────────────────────────────────────────

function acquireLock() {
    if (!activeProject) return;
    const key      = lockKey();
    const existing = loadFromLocalStorage(key);
    const age      = existing ? Date.now() - new Date(existing.acquiredAt).getTime() : Infinity;
    const stale    = age > LOCK_TTL_MS;

    if (!existing || stale || existing.windowId === WINDOW_ID) {
        writeLock(key);
        startHeartbeat(key);
        setReadOnly(false);
    } else {
        // Another window holds a fresh lock
        setReadOnly(true);
    }
}

function writeLock(key) {
    saveToLocalStorage(key, { windowId: WINDOW_ID, acquiredAt: new Date().toISOString() });
}

function releaseLock() {
    stopHeartbeat();
    if (!activeProject) return;
    const key      = lockKey();
    const existing = loadFromLocalStorage(key);
    if (existing && existing.windowId === WINDOW_ID) {
        localStorage.removeItem(key);
    }
}

function startHeartbeat(key) {
    stopHeartbeat();
    lockHeartbeatTimer = setInterval(() => {
        const existing = loadFromLocalStorage(key);
        if (existing && existing.windowId === WINDOW_ID) {
            writeLock(key);
        } else {
            // Lock was taken over by another window
            stopHeartbeat();
            setReadOnly(true);
        }
    }, HEARTBEAT_MS);
}

function stopHeartbeat() {
    if (lockHeartbeatTimer) {
        clearInterval(lockHeartbeatTimer);
        lockHeartbeatTimer = null;
    }
}

// ── §5.3  Read-only banner ─────────────────────────────────────────────────

function setReadOnly(isReadOnly) {
    const banner = document.getElementById('readonlyBanner');
    if (!banner) return;
    banner.classList.toggle('visible', isReadOnly);
    disableGradingInputs(isReadOnly);
}

function disableGradingInputs(disabled) {
    // Grading form (score selection) + name + notes
    document.querySelectorAll(
        '#gradingForm input, #gradingForm button, #studentName, #studentNotes'
    ).forEach(el => { el.disabled = disabled; });

    // Rubric management buttons in the student-info bar
    ['rubricFile', 'clearStorageBtn', 'useDefaultRubricBtn'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.disabled = disabled;
    });
    document.querySelectorAll('.use-default-rubric-button, .clear-storage-button')
        .forEach(el => { el.disabled = disabled; });
}

// Returns true when this window is read-only for the active project's current student
function isLockedOut() {
    return document.getElementById('readonlyBanner')?.classList.contains('visible') ?? false;
}

function takeOverEditing() {
    if (activeProject) localStorage.removeItem(lockKey());
    acquireLock();
}

// ── §5.2  Cross-window storage sync ───────────────────────────────────────

window.addEventListener('storage', e => {
    if (!activeProject || !e.key) return;

    // Registry changed — refresh sidebar + re-resolve active project name/slug
    if (e.key === GLOBAL_KEYS.projects) {
        loadRegistry();
        renderProjectList();
        const updated = findById(activeProject.id);
        if (updated) {
            activeProject = updated;
            document.title = `${updated.name} — Grading`;
            const h1 = document.getElementById('mainTitle');
            if (h1) h1.textContent = `${updated.name} — Grading`;
        }
        return;
    }

    // Lock key for this project/student changed — check if ours was revoked
    const lockPrefix = `gradingApp_lock_${activeProject.id}_`;
    if (e.key.startsWith(lockPrefix)) {
        const idx  = parseInt(e.key.slice(lockPrefix.length));
        if (idx === currentStudentIndex) {
            const lock = loadFromLocalStorage(e.key);
            if (lock && lock.windowId !== WINDOW_ID) {
                stopHeartbeat();
                setReadOnly(true);
            }
        }
        return;
    }

    // Per-project data for the currently active project
    if (!e.key.startsWith(activeProject.id + '_')) return;

    const field = e.key.slice(activeProject.id.length + 1);

    if (field === 'students') {
        // Only re-render if this window doesn't hold the editing lock
        const lock = loadFromLocalStorage(lockKey());
        if (!lock || lock.windowId !== WINDOW_ID) {
            students = loadFromLocalStorage(e.key, []);
            loadStudentData();
        }
    } else if (field === 'rubricData') {
        rubricData = loadFromLocalStorage(e.key, rubricData);
        initializeRubric();
        loadStudentData();
    }
});

// Release lock cleanly on tab close
window.addEventListener('beforeunload', () => releaseLock());
