/**
 * Joul — Notebook Theme Logic
 * Handles date initialization, local storage backup,
 * File System Access API for local sync, and habit customization.
 */

// IndexedDB Helper to persist Directory Handle for local computer file sync
const DB_NAME = 'JoulJournalDB';
const DB_VERSION = 1;
const STORE_NAME = 'settings';
const HANDLE_KEY = 'localSyncFolderHandle';

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e.target.error);
  });
}

async function getStoredDirectoryHandle() {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(HANDLE_KEY);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('Failed to access IndexedDB', err);
    return null;
  }
}

async function setStoredDirectoryHandle(handle) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(handle, HANDLE_KEY);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('Failed to write to IndexedDB', err);
  }
}

async function clearStoredDirectoryHandle() {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(HANDLE_KEY);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('Failed to clear IndexedDB', err);
  }
}

// Application State
const state = {
  currentDate: '', // YYYY-MM-DD format
  directoryHandle: null,
  isSaving: false,
  saveTimeout: null,
  useLocalServerSync: false, // Automatically default sync to local dev server folder
  habitTemplates: [
    "8 hrs of sleep",
    "Drink 3L water",
    "Exercise 30 mins",
    "Read 10 pages",
    "Meditate 10 mins"
  ]
};

// DOM Elements
const elements = {
  dateInput: document.getElementById('journal-date'),
  dayInput: document.getElementById('journal-day'),
  wakeTime: document.getElementById('wake-time'),
  sleepTime: document.getElementById('sleep-time'),
  descriptionInput: document.getElementById('description-input'),
  notesInput: document.getElementById('notes-input'),
  winInput: document.getElementById('win-input'),
  failInput: document.getElementById('fail-input'),
  nextInput: document.getElementById('next-input'),
  
  // Habits
  habitNames: [
    document.getElementById('habit-name-1'),
    document.getElementById('habit-name-2'),
    document.getElementById('habit-name-3'),
    document.getElementById('habit-name-4'),
    document.getElementById('habit-name-5')
  ],
  habitChecks: [
    document.getElementById('habit-check-1'),
    document.getElementById('habit-check-2'),
    document.getElementById('habit-check-3'),
    document.getElementById('habit-check-4'),
    document.getElementById('habit-check-5')
  ],

  // Controls
  btnSelectFolder: document.getElementById('btn-select-folder'),
  syncStatus: document.getElementById('sync-status'),
  btnManualDownload: document.getElementById('btn-manual-download'),
  btnClearPage: document.getElementById('btn-clear-page'),
  savedIndicator: document.getElementById('saved-indicator'),
  btnThemeToggle: document.getElementById('btn-theme-toggle'),
  
  // Sidebar
  sidebarToggle: document.getElementById('sidebar-toggle'),
  sidebarPanel: document.querySelector('.sidebar-panel'),
  entriesList: document.getElementById('entries-list'),
  calendarDisplay: document.getElementById('calendar-display'),
  btnPrevDay: document.getElementById('btn-prev-day'),
  btnNextDay: document.getElementById('btn-next-day'),
  fontToggles: document.querySelectorAll('.font-toggle-group .btn-toggle'),
  
  // Toast
  toast: document.getElementById('toast'),
  toastMessage: document.getElementById('toast-message')
};

// Initialize Application
window.addEventListener('DOMContentLoaded', async () => {
  initThemeMode();
  setupEventListeners();
  loadSavedHabitTemplates();
  initDefaultDate();
  await initLocalFolderSync();
  loadJournalEntry(state.currentDate);
  updateEntriesSidebarList();
});

// Setup All Interactive Listeners
function setupEventListeners() {
  // Input tracking for auto-saving (Throttled)
  const inputsToTrack = [
    elements.wakeTime, elements.sleepTime,
    elements.descriptionInput, elements.notesInput,
    elements.winInput, elements.failInput, elements.nextInput
  ];

  inputsToTrack.forEach(input => {
    input.addEventListener('input', queueAutosave);
  });

  // Date picker listener
  elements.dateInput.addEventListener('change', (e) => {
    const selectedDate = e.target.value;
    if (selectedDate) {
      state.currentDate = selectedDate;
      updateDayOfWeek(selectedDate);
      loadJournalEntry(selectedDate);
    }
  });

  // Habit checkbox state changes
  elements.habitChecks.forEach(check => {
    check.addEventListener('change', queueAutosave);
  });

  // Habit name inline edits
  elements.habitNames.forEach((nameInput, index) => {
    nameInput.addEventListener('input', () => {
      // Update our template cache
      state.habitTemplates[index] = nameInput.value;
      localStorage.setItem('journal_habit_templates', JSON.stringify(state.habitTemplates));
      queueAutosave();
    });
  });

  // Local sync directory picker
  elements.btnSelectFolder.addEventListener('click', handleSelectFolder);

  // Manual export/download button
  elements.btnManualDownload.addEventListener('click', downloadEntryFile);

  // Reset/Clear inputs button
  elements.btnClearPage.addEventListener('click', confirmResetPage);

  // Sidebar controls
  elements.sidebarToggle.addEventListener('click', () => {
    elements.sidebarPanel.classList.toggle('open');
  });

  // Close sidebar clicking outside
  document.addEventListener('click', (e) => {
    if (!elements.sidebarPanel.contains(e.target) && e.target !== elements.sidebarToggle && !elements.sidebarToggle.contains(e.target)) {
      elements.sidebarPanel.classList.remove('open');
    }
  });

  // Calendar prev/next buttons
  elements.btnPrevDay.addEventListener('click', navigateDay.bind(null, -1));
  elements.btnNextDay.addEventListener('click', navigateDay.bind(null, 1));

  // Font styling toggles
  elements.fontToggles.forEach(btn => {
    btn.addEventListener('click', (e) => {
      elements.fontToggles.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const fontMode = btn.dataset.font;
      if (fontMode === 'modern') {
        document.body.classList.add('font-theme-modern');
      } else {
        document.body.classList.remove('font-theme-modern');
      }
    });
  });

  // Light/Dark Theme toggle listener
  elements.btnThemeToggle.addEventListener('click', toggleThemeMode);
}

// Load customized habit templates from local storage
function loadSavedHabitTemplates() {
  const saved = localStorage.getItem('journal_habit_templates');
  if (saved) {
    try {
      state.habitTemplates = JSON.parse(saved);
    } catch (e) {
      console.error('Failed to parse habit templates', e);
    }
  }
}

// Set initial date (Pre-filled to today's date)
function initDefaultDate() {
  // Check the metadata date first, or default to current date
  // Since we are writing this in 2026-05-31, let's use that as the primary default
  let today = new Date();
  
  // Format as YYYY-MM-DD
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  
  const dateString = `${year}-${month}-${day}`;
  state.currentDate = dateString;
  elements.dateInput.value = dateString;
  updateDayOfWeek(dateString);
}

// Calculate the weekday name and display it
function updateDayOfWeek(dateString) {
  if (!dateString) return;
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  // Create date object handling timezone offsets correctly
  const parts = dateString.split('-');
  const dateObj = new Date(parts[0], parts[1] - 1, parts[2]);
  const dayName = days[dateObj.getDay()];
  elements.dayInput.value = dayName;

  // Update calendar slider title
  const options = { month: 'short', day: 'numeric', year: 'numeric' };
  elements.calendarDisplay.textContent = dateObj.toLocaleDateString('en-US', options);
}

// Load a journal entry for a given date
async function loadJournalEntry(dateString) {
  // 1. Try loading from local server sync if enabled
  if (state.useLocalServerSync) {
    try {
      const response = await fetch(`/api/load?date=${dateString}`);
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          // Cache in localStorage
          localStorage.setItem(`journal_entry_${dateString}`, JSON.stringify(result.data));
          applyEntryToUI(result.data);
          showToast(`<i class="fa-solid fa-book-open"></i> Loaded entry for ${dateString} from disk`);
          updateEntriesActiveState(dateString);
          return;
        }
      }
    } catch (e) {
      console.warn('Failed to load from local server, falling back to local storage', e);
    }
  }

  // 2. Fallback to localStorage
  const savedData = localStorage.getItem(`journal_entry_${dateString}`);
  
  if (savedData) {
    try {
      const entry = JSON.parse(savedData);
      applyEntryToUI(entry);
      showToast(`<i class="fa-solid fa-book-open"></i> Loaded entry for ${dateString}`);
    } catch (e) {
      console.error('Error parsing journal entry from localStorage', e);
      initializeBlankPage(dateString);
    }
  } else {
    initializeBlankPage(dateString);
  }

  updateEntriesActiveState(dateString);
}

// Helper to update active list item in sidebar
function updateEntriesActiveState(dateString) {
  const listItems = elements.entriesList.querySelectorAll('li');
  listItems.forEach(li => {
    if (li.dataset.date === dateString) {
      li.classList.add('active');
    } else {
      li.classList.remove('active');
    }
  });
}

// Helper to fill the UI with empty data
function initializeBlankPage(dateString) {
  elements.wakeTime.value = '';
  elements.sleepTime.value = '';
  elements.descriptionInput.value = '';
  elements.notesInput.value = '';
  elements.winInput.value = '';
  elements.failInput.value = '';
  elements.nextInput.value = '';

  // Load the current default templates for habits
  elements.habitNames.forEach((nameInput, index) => {
    nameInput.value = state.habitTemplates[index] || `Habit ${index + 1}`;
  });

  elements.habitChecks.forEach(check => {
    check.checked = false;
  });

  elements.savedIndicator.innerHTML = '<i class="fa-solid fa-feather"></i> Fresh Page';
}

// Map entry fields to inputs
function applyEntryToUI(entry) {
  elements.wakeTime.value = entry.wakeTime || '';
  elements.sleepTime.value = entry.sleepTime || '';
  elements.descriptionInput.value = entry.description || '';
  elements.notesInput.value = entry.notes || '';
  elements.winInput.value = entry.win || '';
  elements.failInput.value = entry.fail || '';
  elements.nextInput.value = entry.next || '';

  // Habits
  if (entry.habits && entry.habits.length === 5) {
    entry.habits.forEach((habit, index) => {
      elements.habitNames[index].value = habit.name;
      elements.habitChecks[index].checked = habit.checked;
    });
  } else {
    // Fallback to defaults
    elements.habitNames.forEach((nameInput, index) => {
      nameInput.value = state.habitTemplates[index] || `Habit ${index + 1}`;
    });
    elements.habitChecks.forEach(check => {
      check.checked = false;
    });
  }

  elements.savedIndicator.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> Auto-saved';
}

// Get structured data from UI
function getEntryDataFromUI() {
  const habits = [];
  for (let i = 0; i < 5; i++) {
    habits.push({
      name: elements.habitNames[i].value,
      checked: elements.habitChecks[i].checked
    });
  }

  return {
    date: state.currentDate,
    day: elements.dayInput.value,
    wakeTime: elements.wakeTime.value,
    sleepTime: elements.sleepTime.value,
    description: elements.descriptionInput.value,
    notes: elements.notesInput.value,
    win: elements.winInput.value,
    fail: elements.failInput.value,
    next: elements.nextInput.value,
    habits: habits,
    lastSaved: new Date().toISOString()
  };
}

// Queue autosave on input changes (Debounced)
function queueAutosave() {
  elements.savedIndicator.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Writing...';
  elements.savedIndicator.classList.add('saving');
  
  if (state.saveTimeout) {
    clearTimeout(state.saveTimeout);
  }
  
  state.saveTimeout = setTimeout(async () => {
    await saveCurrentJournalEntry();
  }, 1000); // 1-second delay after typing stops
}

// Primary saving action
async function saveCurrentJournalEntry() {
  const data = getEntryDataFromUI();
  const dateKey = state.currentDate;
  
  // 1. Save to Local Browser Storage (Continuous draft backup)
  localStorage.setItem(`journal_entry_${dateKey}`, JSON.stringify(data));
  
  // 2. Track this date in our overall journal index
  updateJournalIndex(dateKey);

  // 3. Write directly to local sync
  let syncSuccess = false;
  if (state.useLocalServerSync) {
    syncSuccess = await writeToLocalServer(dateKey, data);
  } else if (state.directoryHandle) {
    syncSuccess = await writeEntryToFileSystem(dateKey, data);
  }

  // Update save status visually
  state.isSaving = false;
  elements.savedIndicator.classList.remove('saving');
  
  if (state.useLocalServerSync) {
    if (syncSuccess) {
      elements.savedIndicator.innerHTML = '<i class="fa-solid fa-laptop-code"></i> Auto-synced to JOUL DATA';
    } else {
      elements.savedIndicator.innerHTML = '<i class="fa-solid fa-triangle-exclamation text-amber"></i> Server sync failed, saved locally';
    }
  } else if (state.directoryHandle) {
    if (syncSuccess) {
      elements.savedIndicator.innerHTML = '<i class="fa-solid fa-laptop-code"></i> Synced to local disk';
    } else {
      elements.savedIndicator.innerHTML = '<i class="fa-solid fa-triangle-exclamation text-amber"></i> Saved offline, sync failed';
    }
  } else {
    elements.savedIndicator.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> Auto-saved';
  }

  // Refresh index sidebar list
  updateEntriesSidebarList();
}

// Add date to index lists in localStorage
function updateJournalIndex(dateString) {
  let index = [];
  const savedIndex = localStorage.getItem('journal_index');
  if (savedIndex) {
    try {
      index = JSON.parse(savedIndex);
    } catch (e) {}
  }

  if (!index.includes(dateString)) {
    index.push(dateString);
    index.sort(); // Sort chronologically
    localStorage.setItem('journal_index', JSON.stringify(index));
  }
}

// Helper to check if Vite Dev Server Local Sync is active
async function checkLocalServerSync() {
  try {
    const response = await fetch('/api/list');
    if (response.ok) {
      state.useLocalServerSync = true;
      // Load all dates saved in the JOUL DATA directory and add them to our index!
      const result = await response.json();
      if (result.success && result.dates) {
        result.dates.forEach(dateStr => {
          updateJournalIndex(dateStr);
        });
      }
      return true;
    }
  } catch (e) {
    // API not available, will fallback to original browser storage/picker sync
  }
  return false;
}

// Helper to write entry directly to the Vite Dev Server
async function writeToLocalServer(dateString, data) {
  try {
    const response = await fetch('/api/save', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ date: dateString, data })
    });
    if (response.ok) {
      const result = await response.json();
      return result.success;
    }
  } catch (e) {
    console.error('Failed to save to local dev server API', e);
  }
  return false;
}

// Restore Local Directory Handle from IndexedDB or establish dev server default sync
async function initLocalFolderSync() {
  updateSyncUIStatus('checking');
  
  // First check if the dev server local sync is active
  const hasServerSync = await checkLocalServerSync();
  if (hasServerSync) {
    updateSyncUIStatus('server_active', 'JOUL DATA');
    return;
  }
  
  try {
    const handle = await getStoredDirectoryHandle();
    if (handle) {
      // Check if permission is already granted
      const options = { mode: 'readwrite' };
      if ((await handle.queryPermission(options)) === 'granted') {
        state.directoryHandle = handle;
        updateSyncUIStatus('active', handle.name);
      } else {
        // Show offline sync indicator since we need prompt re-authorization
        updateSyncUIStatus('needs_permission');
      }
    } else {
      updateSyncUIStatus('inactive');
    }
  } catch (e) {
    console.error('Failed to initialize sync folder', e);
    updateSyncUIStatus('inactive');
  }
}

// Handle Select Folder selection trigger
async function handleSelectFolder() {
  try {
    if (state.directoryHandle) {
      // If already connected, clicking it lets them change it or disconnect
      const action = confirm("Folder Sync is active. Do you want to select a new folder? Click 'Cancel' to disconnect sync entirely.");
      if (!action) {
        state.directoryHandle = null;
        await clearStoredDirectoryHandle();
        updateSyncUIStatus('inactive');
        showToast('<i class="fa-solid fa-circle-info"></i> Local sync folder disconnected.');
        return;
      }
    }

    // Call browser folder picker API
    const handle = await window.showDirectoryPicker({
      mode: 'readwrite'
    });

    if (handle) {
      state.directoryHandle = handle;
      // Persist the directory handle to IndexedDB
      await setStoredDirectoryHandle(handle);
      updateSyncUIStatus('active', handle.name);
      showToast(`<i class="fa-solid fa-circle-check"></i> Connected sync folder: ${handle.name}`);
      
      // Perform immediate save of current entry to local folder
      await saveCurrentJournalEntry();
    }
  } catch (err) {
    console.warn('Directory Picker cancelled or failed:', err);
    if (err.name !== 'AbortError') {
      showToast('<i class="fa-solid fa-triangle-exclamation"></i> Browser rejected directory access.');
    }
  }
}

// Write the file to local computer disk using File System Access API
async function writeEntryToFileSystem(dateString, data) {
  if (!state.directoryHandle) return false;
  
  try {
    // Request permission if not already granted (e.g. fresh browser session)
    const options = { mode: 'readwrite' };
    if ((await state.directoryHandle.queryPermission(options)) !== 'granted') {
      const permission = await state.directoryHandle.requestPermission(options);
      if (permission !== 'granted') {
        updateSyncUIStatus('needs_permission');
        return false;
      }
    }
    
    updateSyncUIStatus('active', state.directoryHandle.name);

    // Create or locate the YYYY-MM-DD.json file inside the folder
    const fileName = `${dateString}.json`;
    const fileHandle = await state.directoryHandle.getFileHandle(fileName, { create: true });
    
    // Write data to the file
    const writable = await fileHandle.createWritable();
    await writable.write(JSON.stringify(data, null, 2));
    await writable.close();
    
    console.log(`Successfully saved file directly to disk: ${fileName}`);
    return true;
  } catch (err) {
    console.error('Failed to write file to local folder', err);
    return false;
  }
}

// Update the sync status elements dynamically
function updateSyncUIStatus(status, folderName = '') {
  const statusEl = elements.syncStatus;
  const btnEl = elements.btnSelectFolder;
  
  if (status === 'checking') {
    statusEl.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Checking sync...';
    btnEl.className = 'btn btn-sync';
  } else if (status === 'server_active') {
    statusEl.innerHTML = `<i class="fa-solid fa-circle text-success"></i> Default Sync: <strong>${folderName}</strong>`;
    btnEl.className = 'btn btn-sync active';
    btnEl.innerHTML = '<i class="fa-solid fa-folder-closed"></i> Default Sync Active';
    btnEl.disabled = true; // Lock in the default path
    btnEl.title = 'Syncing to: C:\\Code_By_Rudra\\Joul\\JOUL DATA';
  } else if (status === 'active') {
    statusEl.innerHTML = `<i class="fa-solid fa-circle text-success"></i> Syncing to: <strong>${folderName}</strong>`;
    btnEl.className = 'btn btn-sync active';
    btnEl.innerHTML = '<i class="fa-solid fa-folder-closed"></i> Change Sync Folder';
  } else if (status === 'needs_permission') {
    statusEl.innerHTML = `<i class="fa-solid fa-triangle-exclamation text-amber"></i> Sync offline (Click to unlock folder)`;
    btnEl.className = 'btn btn-sync';
    btnEl.innerHTML = '<i class="fa-solid fa-lock-open"></i> Unlock Sync Folder';
  } else {
    // inactive
    statusEl.innerHTML = '<i class="fa-solid fa-circle-info text-indigo"></i> Saving to browser storage';
    btnEl.className = 'btn btn-sync';
    btnEl.innerHTML = '<i class="fa-solid fa-folder-open"></i> Connect Folder Sync';
  }
}

// Download formatted JSON file manually via browser download trigger
function downloadEntryFile() {
  const data = getEntryDataFromUI();
  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `${state.currentDate}.json`;
  document.body.appendChild(a);
  a.click();
  
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  showToast(`<i class="fa-solid fa-download"></i> Saved file ${state.currentDate}.json!`);
}

// Confirm and Reset fields on the page
function confirmResetPage() {
  if (confirm("Are you sure you want to reset this page? All unsaved edits will be cleared, reverting back to a blank draft.")) {
    initializeBlankPage(state.currentDate);
    // Overwrite the saved entry in local storage
    saveCurrentJournalEntry();
    showToast('<i class="fa-solid fa-rotate-left"></i> Page reset completed.');
  }
}

// Day navigator
function navigateDay(offset) {
  if (!state.currentDate) return;
  
  const parts = state.currentDate.split('-');
  const currentDateObj = new Date(parts[0], parts[1] - 1, parts[2]);
  
  currentDateObj.setDate(currentDateObj.getDate() + offset);
  
  const year = currentDateObj.getFullYear();
  const month = String(currentDateObj.getMonth() + 1).padStart(2, '0');
  const day = String(currentDateObj.getDate()).padStart(2, '0');
  
  const newDateString = `${year}-${month}-${day}`;
  state.currentDate = newDateString;
  elements.dateInput.value = newDateString;
  updateDayOfWeek(newDateString);
  loadJournalEntry(newDateString);
}

// Render the past entries list in the sidebar panel
function updateEntriesSidebarList() {
  const savedIndex = localStorage.getItem('journal_index');
  let index = [];
  
  if (savedIndex) {
    try {
      index = JSON.parse(savedIndex);
    } catch (e) {}
  }
  
  // Sort chronologically descending for easier viewing of recent days
  const sortedIndex = [...index].sort().reverse();
  
  elements.entriesList.innerHTML = '';
  
  if (sortedIndex.length === 0) {
    elements.entriesList.innerHTML = '<li class="empty-list-message">No entries created yet</li>';
    return;
  }
  
  sortedIndex.forEach(dateStr => {
    // Try to get day name or some content snippet from local storage
    let dayName = '';
    let preview = 'Empty entry';
    
    const rawData = localStorage.getItem(`journal_entry_${dateStr}`);
    if (rawData) {
      try {
        const data = JSON.parse(rawData);
        dayName = data.day || '';
        if (data.description) {
          preview = data.description.substring(0, 30) + (data.description.length > 30 ? '...' : '');
        }
      } catch (e) {}
    }
    
    const li = document.createElement('li');
    li.dataset.date = dateStr;
    if (dateStr === state.currentDate) {
      li.className = 'active';
    }
    
    // Format nice date output
    const parts = dateStr.split('-');
    const dateObj = new Date(parts[0], parts[1] - 1, parts[2]);
    const formattedDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    
    li.innerHTML = `
      <div class="entry-date-container">
        <span class="entry-date"><strong>${formattedDate}</strong> <span class="entry-meta">(${dayName})</span></span>
        <div style="font-size: 0.7rem; color: rgba(255,255,255,0.4); margin-top: 0.2rem; font-family: var(--font-sans)">${preview}</div>
      </div>
      <i class="fa-solid fa-chevron-right" style="font-size: 0.7rem; color: rgba(255,255,255,0.3)"></i>
    `;
    
    li.addEventListener('click', () => {
      state.currentDate = dateStr;
      elements.dateInput.value = dateStr;
      updateDayOfWeek(dateStr);
      loadJournalEntry(dateStr);
    });
    
    elements.entriesList.appendChild(li);
  });
}

// Show short notification toasts
function showToast(message) {
  elements.toastMessage.innerHTML = message;
  elements.toast.classList.add('show');
  
  setTimeout(() => {
    elements.toast.classList.remove('show');
  }, 3500);
}

// Light / Dark Theme Management
function initThemeMode() {
  const savedTheme = localStorage.getItem('journal_theme') || 'light';
  if (savedTheme === 'dark') {
    document.body.classList.add('dark-theme');
    if (elements.btnThemeToggle) {
      elements.btnThemeToggle.innerHTML = '<i class="fa-solid fa-sun"></i>';
    }
  } else {
    document.body.classList.remove('dark-theme');
    if (elements.btnThemeToggle) {
      elements.btnThemeToggle.innerHTML = '<i class="fa-solid fa-moon"></i>';
    }
  }
}

function toggleThemeMode() {
  const isDark = document.body.classList.toggle('dark-theme');
  if (isDark) {
    localStorage.setItem('journal_theme', 'dark');
    elements.btnThemeToggle.innerHTML = '<i class="fa-solid fa-sun"></i>';
    showToast('<i class="fa-solid fa-moon"></i> Dark theme activated.');
  } else {
    localStorage.setItem('journal_theme', 'light');
    elements.btnThemeToggle.innerHTML = '<i class="fa-solid fa-moon"></i>';
    showToast('<i class="fa-solid fa-sun"></i> Light theme activated.');
  }
}
