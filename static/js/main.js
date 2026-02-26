/* ════════════════════════════════════════════════
   PDF Merger — main.js
   ════════════════════════════════════════════════ */

const API = '';

// ── State ─────────────────────────────────────────
let sessionId   = null;
let fileItems   = [];
let isUploading = false;

// ── DOM refs ──────────────────────────────────────
const dropzone       = document.getElementById('dropzone');
const fileInput      = document.getElementById('file-input');
const fileInputMore  = document.getElementById('file-input-more');
const btnPickFile    = document.getElementById('btn-pick-file');
const btnPickMore    = document.getElementById('btn-pick-more');
const uploadProgress = document.getElementById('upload-progress');
const progressFill   = document.getElementById('progress-fill');
const progressText   = document.getElementById('progress-text');
const stepUpload     = document.getElementById('step-upload');
const stepOrder      = document.getElementById('step-order');
const stepMerge      = document.getElementById('step-merge');
const resetRow       = document.getElementById('reset-row');
const fileList       = document.getElementById('file-list');
const outputName     = document.getElementById('output-name');
const btnMerge       = document.getElementById('btn-merge');
const resultBox      = document.getElementById('result-box');
const resultDesc     = document.getElementById('result-desc');
const btnDownload    = document.getElementById('btn-download');
const logBox         = document.getElementById('log-box');
const logList        = document.getElementById('log-list');
const errorBox       = document.getElementById('error-box');
const errorMsg       = document.getElementById('error-msg');

// ── Tombol Pilih File ─────────────────────────────
// Tombol di dalam dropzone langsung trigger input
btnPickFile.addEventListener('click', () => {
  fileInput.value = '';
  fileInput.click();
});

btnPickMore.addEventListener('click', () => {
  fileInputMore.value = '';
  fileInputMore.click();
});

// ── Klik area dropzone (di luar tombol) ───────────
dropzone.addEventListener('click', e => {
  if (e.target === btnPickFile || btnPickFile.contains(e.target)) return;
  fileInput.value = '';
  fileInput.click();
});

// ── Drag & drop ───────────────────────────────────
dropzone.addEventListener('dragover', e => {
  e.preventDefault();
  dropzone.classList.add('dragover');
});
dropzone.addEventListener('dragleave', e => {
  if (!dropzone.contains(e.relatedTarget)) dropzone.classList.remove('dragover');
});
dropzone.addEventListener('drop', e => {
  e.preventDefault();
  dropzone.classList.remove('dragover');
  const files = Array.from(e.dataTransfer.files);
  if (files.length > 0) uploadFiles(files);
});

// ── File input change ─────────────────────────────
fileInput.addEventListener('change', function() {
  const files = Array.from(this.files);
  if (files.length > 0) uploadFiles(files);
});

fileInputMore.addEventListener('change', function() {
  const files = Array.from(this.files);
  if (files.length > 0) uploadFiles(files);
});

// ── Upload ────────────────────────────────────────
async function uploadFiles(fileArr) {
  if (isUploading || fileArr.length === 0) return;
  isUploading = true;

  const formData = new FormData();
  fileArr.forEach(f => formData.append('files', f));
  if (sessionId) formData.append('session_id', sessionId);

  uploadProgress.classList.remove('hidden');
  animateProgress(0, 70, 500);
  progressText.textContent = 'Mengupload ' + fileArr.length + ' file\u2026';

  try {
    const res  = await fetch('/upload', { method: 'POST', body: formData });
    const data = await res.json();

    if (!res.ok || data.error) {
      showError(data.error || 'Upload gagal.');
    } else {
      sessionId = data.session_id;
      animateProgress(70, 100, 300);
      progressText.textContent = '\u2713 ' + data.files.length + ' file berhasil diupload.';
      data.files.forEach(f => fileItems.push(f));
      setTimeout(() => {
        uploadProgress.classList.add('hidden');
        progressFill.style.width = '0%';
        renderFileList();
        showSteps();
      }, 800);
    }
  } catch (err) {
    showError('Koneksi error: ' + err.message);
    uploadProgress.classList.add('hidden');
  } finally {
    isUploading = false;
  }
}

function animateProgress(from, to, dur) {
  const start = performance.now();
  (function step(now) {
    const p = Math.min((now - start) / dur, 1);
    progressFill.style.width = (from + (to - from) * p) + '%';
    if (p < 1) requestAnimationFrame(step);
  })(performance.now());
}

// ── Render daftar file ────────────────────────────
function renderFileList() {
  fileList.innerHTML = '';
  fileItems.forEach(function(item, idx) {
    const ext   = item.filename.split('.').pop().toLowerCase();
    const isPdf = !item.is_image;
    const li    = document.createElement('li');
    li.className   = 'file-item';
    li.dataset.idx = idx;
    li.innerHTML =
      '<span class="drag-handle"><i class="fa-solid fa-grip-vertical"></i></span>' +
      '<span class="file-icon ' + (isPdf ? 'pdf' : 'image') + '">' +
        '<i class="fa-solid ' + (isPdf ? 'fa-file-pdf' : 'fa-file-image') + '"></i>' +
      '</span>' +
      '<span class="file-info">' +
        '<span class="file-name" title="' + escHtml(item.filename) + '">' + escHtml(item.filename) + '</span>' +
        '<span class="file-type">' + (isPdf ? 'PDF' : 'Gambar \u00b7 ' + ext.toUpperCase()) + '</span>' +
      '</span>' +
      '<span class="file-num">#' + (idx + 1) + '</span>' +
      '<button class="btn-remove" data-idx="' + idx + '" title="Hapus">' +
        '<i class="fa-solid fa-trash-can"></i>' +
      '</button>';
    fileList.appendChild(li);
  });

  fileList.querySelectorAll('.btn-remove').forEach(function(btn) {
    btn.addEventListener('click', function() {
      fileItems.splice(parseInt(this.dataset.idx), 1);
      renderFileList();
      if (fileItems.length === 0) {
        stepOrder.classList.add('hidden');
        stepMerge.classList.add('hidden');
        resetRow.classList.add('hidden');
      }
    });
  });

  initSortable();
}

// ── Sortable ──────────────────────────────────────
let sortable;
function initSortable() {
  if (sortable) sortable.destroy();
  sortable = Sortable.create(fileList, {
    animation: 150,
    handle: '.drag-handle',
    ghostClass: 'sortable-ghost',
    chosenClass: 'sortable-chosen',
    onEnd: function() {
      const newOrder = [];
      fileList.querySelectorAll('.file-item').forEach(function(li) {
        newOrder.push(fileItems[parseInt(li.dataset.idx)]);
      });
      fileItems = newOrder;
      renderFileList();
    }
  });
}

// ── Show steps ────────────────────────────────────
function showSteps() {
  stepOrder.classList.remove('hidden');
  stepMerge.classList.remove('hidden');
  resetRow.classList.remove('hidden');
  hideError();
  resultBox.classList.add('hidden');
  logBox.classList.add('hidden');
}

// ── Merge ─────────────────────────────────────────
btnMerge.addEventListener('click', async function() {
  if (fileItems.length === 0) { showError('Tambahkan file terlebih dahulu.'); return; }
  if (!sessionId) { showError('Sesi tidak valid. Silakan upload ulang.'); return; }

  btnMerge.disabled = true;
  btnMerge.innerHTML = '<span class="spin"><i class="fa-solid fa-gear"></i></span> Memproses\u2026';
  hideError();
  resultBox.classList.add('hidden');
  logBox.classList.add('hidden');

  try {
    const res  = await fetch('/merge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id:  sessionId,
        output_name: outputName.value.trim() || 'HASIL_MERGE',
        order: fileItems.map(f => ({ file_id: f.file_id, filename: f.filename }))
      })
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
  resultDesc.textContent = data.total_pages + ' halaman berhasil digabungkan \u2192 ' + fname;
  btnDownload.href = '/download/' + data.result_id + '?name=' + encodeURIComponent(fname);
  btnDownload.download = fname;
  resultBox.classList.remove('hidden');
  resultBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function renderLog(log) {
  if (!log || log.length === 0) return;
  logList.innerHTML = '';
  log.forEach(function(item) {
    const li = document.createElement('li');
    const ok = item.status === 'ok';
    li.innerHTML =
      '<span class="' + (ok ? 'log-ok' : 'log-err') + '">' +
        '<i class="fa-solid ' + (ok ? 'fa-circle-check' : 'fa-circle-xmark') + '"></i>' +
      '</span>' +
      '<span class="log-name">' + escHtml(item.name) + '</span>' +
      '<span class="log-pages">' + (ok ? item.pages + ' hal.' : item.msg || 'error') + '</span>';
    logList.appendChild(li);
  });
  logBox.classList.remove('hidden');
}

// ── Error ─────────────────────────────────────────
function showError(msg) {
  errorMsg.textContent = msg;
  errorBox.classList.remove('hidden');
  errorBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
function hideError() { errorBox.classList.add('hidden'); }

// ── Reset ─────────────────────────────────────────
document.getElementById('btn-reset').addEventListener('click', function() {
  sessionId  = null;
  fileItems  = [];
  fileList.innerHTML = '';
  outputName.value   = 'HASIL_MERGE';
  stepOrder.classList.add('hidden');
  stepMerge.classList.add('hidden');
  resetRow.classList.add('hidden');
  resultBox.classList.add('hidden');
  logBox.classList.add('hidden');
  hideError();
  stepUpload.scrollIntoView({ behavior: 'smooth' });
});

// ── Donate copy ───────────────────────────────────
const btnCopy     = document.getElementById('btn-copy');
const copyTooltip = document.getElementById('copy-tooltip');
if (btnCopy) {
  btnCopy.addEventListener('click', function() {
    navigator.clipboard.writeText('082283198216').then(function() {
      copyTooltip.classList.add('show');
      setTimeout(function() { copyTooltip.classList.remove('show'); }, 1800);
    });
  });
}

const topbarCopyBtn = document.getElementById('topbar-copy-btn');
const topbarCopied  = document.getElementById('topbar-copied');
if (topbarCopyBtn) {
  topbarCopyBtn.addEventListener('click', function() {
    navigator.clipboard.writeText('082283198216').then(function() {
      topbarCopied.classList.add('show');
      setTimeout(function() { topbarCopied.classList.remove('show'); }, 2000);
    });
  });
}

// ── Util ──────────────────────────────────────────
function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
