// ===== CONFIG =====
const MAX_SIZE_MB = 10;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const API_URL = "http://localhost:8000/api/process";

// ===== ELEMENTS =====
const dropzone       = document.getElementById("dropzone");
const fileInput      = document.getElementById("file-input");
const dropzoneIdle    = document.getElementById("dropzone-idle");
const dropzonePreview = document.getElementById("dropzone-preview");
const previewImg     = document.getElementById("preview-img");
const fileNameEl     = document.getElementById("file-name");
const fileSizeEl     = document.getElementById("file-size");
const removeFileBtn  = document.getElementById("remove-file");
const errorMsg       = document.getElementById("error-msg");
const exportBtn      = document.getElementById("export-btn");
const statusMsg      = document.getElementById("status-msg");

let currentFile = null;
let isProcessing = false;

// ===== TABS (Converter / Sobre) =====
document.querySelectorAll(".menu-item").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".menu-item").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach(t => t.classList.remove("active"));

    btn.classList.add("active");
    document.getElementById(`tab-${btn.dataset.tab}`).classList.add("active");
  });
});

// ===== FILE SELECTION =====
fileInput.addEventListener("change", (e) => {
  if (e.target.files && e.target.files[0]) {
    handleFile(e.target.files[0]);
  }
});

// Prevent the label's native click-to-open from firing twice when clicking
// the "Remover imagem" button inside it.
removeFileBtn.addEventListener("click", (e) => {
  e.preventDefault();
  e.stopPropagation();
  resetFile();
});

// ===== DRAG & DROP =====
["dragenter", "dragover"].forEach(evt => {
  dropzone.addEventListener(evt, (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropzone.classList.add("dragover");
  });
});

["dragleave", "drop"].forEach(evt => {
  dropzone.addEventListener(evt, (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropzone.classList.remove("dragover");
  });
});

dropzone.addEventListener("drop", (e) => {
  const file = e.dataTransfer.files && e.dataTransfer.files[0];
  if (file) handleFile(file);
});

// ===== CORE LOGIC =====
function handleFile(file) {
  hideError();

  if (!ACCEPTED_TYPES.includes(file.type)) {
    showError("Formato não suportado. Envie um arquivo JPG, PNG ou WEBP.");
    return;
  }

  const sizeMB = file.size / (1024 * 1024);
  if (sizeMB > MAX_SIZE_MB) {
    showError(`Arquivo muito grande. O limite é ${MAX_SIZE_MB}MB.`);
    return;
  }

  currentFile = file;
  showPreview(file);
  exportBtn.disabled = false;
  statusMsg.textContent = "";
}

function showPreview(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    previewImg.src = e.target.result;
  };
  reader.readAsDataURL(file);

  fileNameEl.textContent = file.name;
  fileSizeEl.textContent = formatSize(file.size);

  dropzoneIdle.hidden = true;
  dropzonePreview.hidden = false;
}

function resetFile() {
  currentFile = null;
  fileInput.value = "";
  previewImg.src = "";
  dropzonePreview.hidden = true;
  dropzoneIdle.hidden = false;
  exportBtn.disabled = true;
  statusMsg.textContent = "";
  hideError();
}

function showError(msg) {
  errorMsg.textContent = msg;
  errorMsg.hidden = false;
}

function hideError() {
  errorMsg.hidden = true;
  errorMsg.textContent = "";
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ===== EXPORT BUTTON =====
exportBtn.addEventListener("click", async () => {
  if (!currentFile || isProcessing) return;

  isProcessing = true;
  setLoading(true);
  statusMsg.textContent = "Processando imagem...";

  try {
    const formData = new FormData();
    formData.append("file", currentFile);

    const response = await fetch(API_URL, {
      method: "POST",
      body: formData
    });

    if (!response.ok) {
      let message = "Não foi possível processar a imagem.";
      try {
        const errorData = await response.json();
        message = errorData.detail || message;
      } catch (parseError) {
      }
      throw new Error(message);
    }

    const csvBlob = await response.blob();
    downloadBlob(csvBlob, "resultado.csv");
    statusMsg.textContent = "CSV gerado com sucesso.";

  } catch (err) {
    console.error(err);
    showError(err.message || "Não foi possível converter a imagem. Tente novamente.");
    statusMsg.textContent = "";
  } finally {
    isProcessing = false;
    setLoading(false);
  }
});

function setLoading(isLoading) {
  exportBtn.disabled = isLoading || !currentFile;
  exportBtn.classList.toggle("loading", isLoading);
  exportBtn.querySelector("svg").style.display = isLoading ? "none" : "inline-block";
  const label = isLoading ? "Convertendo..." : "Exportar para XLS";
  exportBtn.childNodes[exportBtn.childNodes.length - 1].textContent = " " + label;
}

// Helper for when the backend returns a real file blob
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}