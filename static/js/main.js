/* ════════════════════════════════════════════════
   PDF Merger — main.js
   ════════════════════════════════════════════════ */

const API = '';   // same origin

// ── State ────────────────────────────────────────
let sessionId   = null;
let fileItems   = [];   // [{file_id, filename, is_image}]
let isUploading = false;

// ── DOM refs ─────────────────────────────────────
const dropzone        = document.getElementById('dropzone');
const fileInput       = document.getElementById('file-input');
const fileInputMore   = document.getElementById('file-input-more');
const uploadProgress  = document.getElementById('upload-progress');
const progressFill    = document.getElementById('progress-fill');
const progressText    = document.getElementById('progress-text');

const stepUpload  = document.getElementById('step-upload');
const stepOrder   = document.getElementById('step-order');
const stepMerge   = document.getElementById('step-merge');
const resetRow    = document.getElementById('reset-row');

const fileList    = document.getElementById('file-list');
const outputName  = document.getElementById('output-name');
const btnMerge    = document.getElementById('btn-merge');

const resultBox   = document.getElementById('result-box');
const resultDesc  = document.getElementById('result-desc');
const btnDownload = document.getElementById('btn-download');
const logBox      = document.getElementById('log-box');
const logList     = document.getElementById('log-list');
const errorBox    = document.getElementById('error-box');
const errorMsg    = document.getElementById('error-msg');

// ── Topbar donate copy ────────────────────────────
const topbarCopyBtn = document.getElementById('topbar-copy-btn');
const topbarCopied  = document.getElementById('topbar-copied');
if (topbarCopyBtn) {
  topbarCopyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText('082283198216').then(() => {
      topbarCopied.classList.add('show');
      setTimeout(() => topbarCopied.classList.remove('show'), 2000);
    });
  });
}

// ── Donate copy ──────────────────────────────────
const btnCopy     = document.getElementById('btn-copy');
const copyTooltip = document.getElementById('copy-tooltip');
const danaNumber  = document.getElementById('dana-number');

btnCopy.addEventListener('click', () => {
  const num = danaNumber.textContent.replace(/[-\s]/g, '');
  navigator.clipboard.writeText(num).then(() => {
    copyTooltip.classList.add('show');
    setTimeout(() => copyTooltip.classList.remove('show'), 1800);
  });
});

// ── Drag & drop on dropzone ──────────────────────
dropzone.addEventListener('dragover',  e => { e.preventDefault(); dropzone.classList.add('dragover'); });
dropzone.addEventListener('dragleave', e => {
  // Hanya remove jika benar-benar keluar dari dropzone (bukan ke child element)
  if (!dropzone.contains(e.relatedTarget)) dropzone.classList.remove('dragover');
});
dropzone.addEventListener('drop', e => {
  e.preventDefault();
  dropzone.classList.remove('dragover');
  uploadFiles(e.dataTransfer.files);
});

// Klik dropzone → buka file picker
// Guard: jika yang diklik adalah label atau tombol di dalam dropzone, skip
// agar tidak double-trigger bersama `for` attribute milik label
dropzone.addEventListener('click', e => {
  if (e.target.closest('label') || e.target.closest('button')) return;
  fileInput.click();
});

// Stopkan propagasi dari label ke dropzone (cegah dialog muncul 2x)
document.querySelectorAll('label[for="file-input"]').forEach(lbl => {
  lbl.addEventListener('click', e => e.stopPropagation());
});

// Change handler: convert ke Array DULU, baru reset value, baru upload
fileInput.addEventListener('change', e => {
  const files = Array.from(e.target.files);   // ambil referensi File objects
  fileInput.value = '';                        // reset agar file sama bisa dipilih lagi
  if (files.length > 0) uploadFiles(files);
});

fileInputMore.addEventListener('change', e => {
  const files = Array.from(e.target.files);
  fileInputMore.value = '';
  if (files.length > 0) uploadFiles(files);
});

// ── Upload ───────────────────────────────────────
async function uploadFiles(fileArr) {
  if (!fileArr || fileArr.length === 0) return;
  if (isUploading) return;
  isUploading = true;

  const formData = new FormData();
  fileArr.forEach(f => formData.append('files', f));
  if (sessionId) formData.append('session_id', sessionId);

  // Show progress
  uploadProgress.classList.remove('hidden');
  animateProgress(0, 60, 400);
  progressText.textContent = `Mengupload ${fileArr.length} file…`;

  try {
    const res  = await fetch(`${API}/upload`, { method: 'POST', body: formData });
    const data = await res.json();

    if (!res.ok || data.error) {
      showError(data.error || 'Upload gagal.');
      resetProgress();
      return;
    }

    sessionId = data.session_id;
    animateProgress(60, 100, 300);
    progressText.textContent = `✓ ${data.files.length} file berhasil diupload.`;

    setTimeout(() => {
      resetProgress();
      data.files.forEach(f => fileItems.push(f));      renderFileList();
      showSteps();
    }, 700);

  } catch (err) {
    showError('Koneksi error: ' + err.message);
    resetProgress();
  } finally {
    isUploading = false;
  }
}

function animateProgress(from, to, dur) {
  const start = performance.now();
  function step(now) {
    const p = Math.min((now - start) / dur, 1);
    progressFill.style.width = (from + (to - from) * p) + '%';
    if (p < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

function resetProgress() {
  setTimeout(() => {
    uploadProgress.classList.add('hidden');
    progressFill.style.width = '0%';
    dropzone.classList.remove('uploading');
  }, 600);
}

// ── Render file list ─────────────────────────────
function renderFileList() {
  fileList.innerHTML = '';

  fileItems.forEach((item, idx) => {
    const ext   = item.filename.split('.').pop().toLowerCase();
    const isPdf = !item.is_image;
    const li    = document.createElement('li');
    li.className   = 'file-item';
    li.dataset.idx = idx;

    li.innerHTML = `
      <span class="drag-handle"><i class="fa-solid fa-grip-vertical"></i></span>
      <span class="file-icon ${isPdf ? 'pdf' : 'image'}">
        <i class="fa-solid ${isPdf ? 'fa-file-pdf' : 'fa-file-image'}"></i>
      </span>
      <span class="file-info">
        <span class="file-name" title="${escHtml(item.filename)}">${escHtml(item.filename)}</span>
        <span class="file-type">${isPdf ? 'PDF' : 'Gambar · ' + ext.toUpperCase()}</span>
      </span>
      <span class="file-num">#${idx + 1}</span>
      <button class="btn-remove" data-idx="${idx}" title="Hapus">
        <i class="fa-solid fa-trash-can"></i>
      </button>`;
    fileList.appendChild(li);
  });

  fileList.querySelectorAll('.btn-remove').forEach(btn => {
    btn.addEventListener('click', () => {
      fileItems.splice(parseInt(btn.dataset.idx), 1);
      renderFileList();
      if (fileItems.length === 0) {
        stepOrder.classList.add('hidden');
        stepMerge.classList.add('hidden');
        resetRow.classList.add('hidden');
      }
    });
  });

  refreshNums();
  if (sortable) initSortable();
}

function refreshNums() {
  fileList.querySelectorAll('.file-num').forEach((el, i) => el.textContent = '#' + (i + 1));
  fileList.querySelectorAll('.btn-remove').forEach((btn, i) => btn.dataset.idx = i);
}

// ── SortableJS ───────────────────────────────────
let sortable;
function initSortable() {
  if (sortable) sortable.destroy();
  sortable = Sortable.create(fileList, {
    animation: 160,
    handle: '.drag-handle',
    ghostClass: 'sortable-ghost',
    chosenClass: 'sortable-chosen',
    onEnd() {
      const newOrder = [];
      fileList.querySelectorAll('.file-item').forEach(li => {
        newOrder.push(fileItems[parseInt(li.dataset.idx)]);
      });
      fileItems = newOrder;
      renderFileList();
    },
  });
}

// ── Show/hide steps ──────────────────────────────
function showSteps() {
  stepOrder.classList.remove('hidden');
  stepMerge.classList.remove('hidden');
  resetRow.classList.remove('hidden');
  initSortable();
  hideError();
  resultBox.classList.add('hidden');
  logBox.classList.add('hidden');
}

// ── Merge ─────────────────────────────────────────
btnMerge.addEventListener('click', async () => {
  if (fileItems.length === 0) { showError('Tambahkan file terlebih dahulu.'); return; }
  if (!sessionId) { showError('Sesi tidak valid. Silakan upload ulang.'); return; }

  btnMerge.disabled = true;
  btnMerge.innerHTML = '<span class="spin"><i class="fa-solid fa-gear"></i></span> Memproses…';
  hideError();
  resultBox.classList.add('hidden');
  logBox.classList.add('hidden');

  const payload = {
    session_id:  sessionId,
    output_name: (outputName.value.trim() || 'HASIL_MERGE'),
    order: fileItems.map(f => ({ file_id: f.file_id, filename: f.filename })),
  };

  try {
    const res  = await fetch(`${API}/merge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();

    if (!res.ok || data.error) {
      showError(data.error || 'Proses merge gagal.');
      renderLog(data.log);
    } else {
      showResult(data);
      renderLog(data.log);
    }
  } catch (err) {
    showError('Koneksi error: ' + err.message);
  } finally {
    btnMerge.disabled = false;
    btnMerge.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Mulai Merge';
  }
});

function showResult(data) {
  const fname = data.output_name.endsWith('.pdf') ? data.output_name : data.output_name + '.pdf';
  resultDesc.textContent = `${data.total_pages} halaman berhasil digabungkan → ${fname}`;
  btnDownload.href = `${API}/download/${data.result_id}?name=${encodeURIComponent(fname)}`;
  btnDownload.download = fname;
  resultBox.classList.remove('hidden');
  resultBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function renderLog(log) {
  if (!log || log.length === 0) return;
  logList.innerHTML = '';
  log.forEach(item => {
    const li = document.createElement('li');
    const ok = item.status === 'ok';
    li.innerHTML = `
      <span class="${ok ? 'log-ok' : 'log-err'}">
        <i class="fa-solid ${ok ? 'fa-circle-check' : 'fa-circle-xmark'}"></i>
      </span>
      <span class="log-name">${escHtml(item.name)}</span>
      <span class="log-pages">${ok ? item.pages + ' hal.' : item.msg || 'error'}</span>`;
    logList.appendChild(li);
  });
  logBox.classList.remove('hidden');
}

// ── Error helpers ─────────────────────────────────
function showError(msg) {
  errorMsg.textContent = msg;
  errorBox.classList.remove('hidden');
  errorBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
function hideError() { errorBox.classList.add('hidden'); }

// ── Reset ─────────────────────────────────────────
document.getElementById('btn-reset').addEventListener('click', () => {
  sessionId   = null;
  fileItems   = [];
  fileList.innerHTML = '';
  outputName.value = 'HASIL_MERGE';
  stepOrder.classList.add('hidden');
  stepMerge.classList.add('hidden');
  resetRow.classList.add('hidden');
  resultBox.classList.add('hidden');
  logBox.classList.add('hidden');
  hideError();
  stepUpload.scrollIntoView({ behavior: 'smooth' });
});

// ── Util ──────────────────────────────────────────
function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

const API = '';   // same origin

// ── State ────────────────────────────────────────
let sessionId   = null;
let fileItems   = [];   // [{file_id, filename, is_image}]

// ── DOM refs ─────────────────────────────────────
const dropzone        = document.getElementById('dropzone');
const fileInput       = document.getElementById('file-input');
const fileInputMore   = document.getElementById('file-input-more');
const uploadProgress  = document.getElementById('upload-progress');
const progressFill    = document.getElementById('progress-fill');
const progressText    = document.getElementById('progress-text');

const stepUpload  = document.getElementById('step-upload');
const stepOrder   = document.getElementById('step-order');
const stepMerge   = document.getElementById('step-merge');
const resetRow    = document.getElementById('reset-row');

const fileList    = document.getElementById('file-list');
const outputName  = document.getElementById('output-name');
const btnMerge    = document.getElementById('btn-merge');

const resultBox   = document.getElementById('result-box');
const resultDesc  = document.getElementById('result-desc');
const btnDownload = document.getElementById('btn-download');
const logBox      = document.getElementById('log-box');
const logList     = document.getElementById('log-list');
const errorBox    = document.getElementById('error-box');
const errorMsg    = document.getElementById('error-msg');

// ── Topbar donate copy ────────────────────────────
const topbarCopyBtn = document.getElementById('topbar-copy-btn');
const topbarCopied  = document.getElementById('topbar-copied');
if (topbarCopyBtn) {
  topbarCopyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText('082283198216').then(() => {
      topbarCopied.classList.add('show');
      setTimeout(() => topbarCopied.classList.remove('show'), 2000);
    });
  });
}

// ── Donate copy ──────────────────────────────────
const btnCopy     = document.getElementById('btn-copy');
const copyTooltip = document.getElementById('copy-tooltip');
const danaNumber  = document.getElementById('dana-number');

btnCopy.addEventListener('click', () => {
  const num = danaNumber.textContent.replace(/[-\s]/g, '');
  navigator.clipboard.writeText(num).then(() => {
    copyTooltip.classList.add('show');
    setTimeout(() => copyTooltip.classList.remove('show'), 1800);
  });
});

// ── Drag & drop on dropzone ──────────────────────
dropzone.addEventListener('dragover',  e => { e.preventDefault(); dropzone.classList.add('dragover'); });
dropzone.addEventListener('dragleave', ()=> dropzone.classList.remove('dragover'));
dropzone.addEventListener('drop', e => {
  e.preventDefault();
  dropzone.classList.remove('dragover');
  uploadFiles(e.dataTransfer.files);
});
dropzone.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', e => uploadFiles(e.target.files));
fileInputMore.addEventListener('change', e => uploadFiles(e.target.files));

// ── Upload ───────────────────────────────────────
async function uploadFiles(files) {
  if (!files || files.length === 0) return;

  const formData = new FormData();
  for (const f of files) formData.append('files', f);
  if (sessionId) formData.append('session_id', sessionId);

  // Show progress
  uploadProgress.classList.remove('hidden');
  animateProgress(0, 60, 400);
  progressText.textContent = `Mengupload ${files.length} file…`;

  try {
    const res  = await fetch(`${API}/upload`, { method: 'POST', body: formData });
    const data = await res.json();

    if (!res.ok || data.error) {
      showError(data.error || 'Upload gagal.');
      hideProgress();
      return;
    }

    sessionId = data.session_id;
    animateProgress(60, 100, 300);
    progressText.textContent = `${data.files.length} file berhasil diupload.`;

    setTimeout(() => {
      hideProgress();
      data.files.forEach(f => fileItems.push(f));
      renderFileList();
      showSteps();
    }, 600);

  } catch (err) {
    showError('Koneksi error: ' + err.message);
    hideProgress();
  }
}

function animateProgress(from, to, dur) {
  const start = performance.now();
  function step(now) {
    const p = Math.min((now - start) / dur, 1);
    progressFill.style.width = (from + (to - from) * p) + '%';
    if (p < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

function hideProgress() {
  setTimeout(() => {
    uploadProgress.classList.add('hidden');
    progressFill.style.width = '0%';
    fileInput.value = '';
  }, 800);
}

// ── Render file list ─────────────────────────────
function renderFileList() {
  fileList.innerHTML = '';

  fileItems.forEach((item, idx) => {
    const ext  = item.filename.split('.').pop().toLowerCase();
    const isPdf = !item.is_image;
    const li = document.createElement('li');
    li.className   = 'file-item';
    li.dataset.idx = idx;

    li.innerHTML = `
      <span class="drag-handle"><i class="fa-solid fa-grip-vertical"></i></span>
      <span class="file-icon ${isPdf ? 'pdf' : 'image'}">
        <i class="fa-solid ${isPdf ? 'fa-file-pdf' : 'fa-file-image'}"></i>
      </span>
      <span class="file-info">
        <span class="file-name" title="${escHtml(item.filename)}">${escHtml(item.filename)}</span>
        <span class="file-type">${isPdf ? 'PDF' : 'Gambar · ' + ext.toUpperCase()}</span>
      </span>
      <span class="file-num">#${idx + 1}</span>
      <button class="btn-remove" data-idx="${idx}" title="Hapus">
        <i class="fa-solid fa-trash-can"></i>
      </button>`;
    fileList.appendChild(li);
  });

  // Re-attach remove handlers
  fileList.querySelectorAll('.btn-remove').forEach(btn => {
    btn.addEventListener('click', () => {
      const i = parseInt(btn.dataset.idx);
      fileItems.splice(i, 1);
      renderFileList();
      if (fileItems.length === 0) {
        stepOrder.classList.add('hidden');
        stepMerge.classList.add('hidden');
        resetRow.classList.add('hidden');
      }
    });
  });

  // Update #num badges
  refreshNums();
}

function refreshNums() {
  fileList.querySelectorAll('.file-num').forEach((el, i) => {
    el.textContent = '#' + (i + 1);
  });
  fileList.querySelectorAll('.btn-remove').forEach((btn, i) => {
    btn.dataset.idx = i;
  });
}

// ── SortableJS ───────────────────────────────────
let sortable;
function initSortable() {
  if (sortable) sortable.destroy();
  sortable = Sortable.create(fileList, {
    animation: 160,
    handle: '.drag-handle',
    ghostClass: 'sortable-ghost',
    chosenClass: 'sortable-chosen',
    onEnd(evt) {
      // Sync fileItems order with DOM
      const newOrder = [];
      fileList.querySelectorAll('.file-item').forEach(li => {
        newOrder.push(fileItems[parseInt(li.dataset.idx)]);
      });
      fileItems = newOrder;
      renderFileList();
    },
  });
}

// ── Show/hide steps ──────────────────────────────
function showSteps() {
  stepOrder.classList.remove('hidden');
  stepMerge.classList.remove('hidden');
  resetRow.classList.remove('hidden');
  initSortable();
  hideError();
  resultBox.classList.add('hidden');
  logBox.classList.add('hidden');
}

// ── Merge ─────────────────────────────────────────
btnMerge.addEventListener('click', async () => {
  if (fileItems.length === 0) { showError('Tambahkan file terlebih dahulu.'); return; }
  if (!sessionId) { showError('Sesi tidak valid. Silakan upload ulang.'); return; }

  // Button loading state
  btnMerge.disabled = true;
  btnMerge.innerHTML = '<span class="spin"><i class="fa-solid fa-gear"></i></span> Memproses…';
  hideError();
  resultBox.classList.add('hidden');
  logBox.classList.add('hidden');

  const payload = {
    session_id:  sessionId,
    output_name: (outputName.value.trim() || 'HASIL_MERGE'),
    order: fileItems.map(f => ({ file_id: f.file_id, filename: f.filename })),
  };

  try {
    const res  = await fetch(`${API}/merge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();

    if (!res.ok || data.error) {
      showError(data.error || 'Proses merge gagal.');
      renderLog(data.log);
    } else {
      showResult(data);
      renderLog(data.log);
    }
  } catch (err) {
    showError('Koneksi error: ' + err.message);
  } finally {
    btnMerge.disabled = false;
    btnMerge.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Mulai Merge';
  }
});

function showResult(data) {
  const fname = data.output_name.endsWith('.pdf') ? data.output_name : data.output_name + '.pdf';
  resultDesc.textContent = `${data.total_pages} halaman berhasil digabungkan → ${fname}`;
  btnDownload.href = `${API}/download/${data.result_id}?name=${encodeURIComponent(fname)}`;
  btnDownload.download = fname;
  resultBox.classList.remove('hidden');
  resultBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function renderLog(log) {
  if (!log || log.length === 0) return;
  logList.innerHTML = '';
  log.forEach(item => {
    const li = document.createElement('li');
    const ok = item.status === 'ok';
    li.innerHTML = `
      <span class="${ok ? 'log-ok' : 'log-err'}">
        <i class="fa-solid ${ok ? 'fa-circle-check' : 'fa-circle-xmark'}"></i>
      </span>
      <span class="log-name">${escHtml(item.name)}</span>
      <span class="log-pages">${ok ? item.pages + ' hal.' : item.msg || 'error'}</span>`;
    logList.appendChild(li);
  });
  logBox.classList.remove('hidden');
}

// ── Error helpers ─────────────────────────────────
function showError(msg) {
  errorMsg.textContent = msg;
  errorBox.classList.remove('hidden');
  errorBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
function hideError() { errorBox.classList.add('hidden'); }

// ── Reset ─────────────────────────────────────────
document.getElementById('btn-reset').addEventListener('click', () => {
  sessionId   = null;
  fileItems   = [];
  fileList.innerHTML = '';
  outputName.value = 'HASIL_MERGE';
  stepOrder.classList.add('hidden');
  stepMerge.classList.add('hidden');
  resetRow.classList.add('hidden');
  resultBox.classList.add('hidden');
  logBox.classList.add('hidden');
  hideError();
  stepUpload.scrollIntoView({ behavior: 'smooth' });
});

// ── Util ──────────────────────────────────────────
function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
