// ===== CONFIG =====
// Espelham os limites do backend (app/config.py). Manter mais restritivo
// aqui só faz o usuário receber "formato não suportado" por um arquivo que
// a API aceitaria.
const MAX_SIZE_MB = 50;
const ACCEPTED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/bmp",
  "image/tiff",
];
const ACCEPTED_EXTENSIONS = [
  ".jpg", ".jpeg", ".png", ".webp", ".bmp", ".tif", ".tiff",
];

const API_BASE = "http://localhost:8000";
const API_PROCESS = `${API_BASE}/api/process`;

// Quantas linhas a prévia mostra. A planilha traz todas.
const MAX_LINHAS_PREVIA = 50;

// ===== ELEMENTS =====
const dropzone        = document.getElementById("dropzone");
const fileInput       = document.getElementById("file-input");
const dropzoneIdle    = document.getElementById("dropzone-idle");
const dropzonePreview = document.getElementById("dropzone-preview");
const previewImg      = document.getElementById("preview-img");
const fileNameEl      = document.getElementById("file-name");
const fileSizeEl      = document.getElementById("file-size");
const removeFileBtn   = document.getElementById("remove-file");
const errorMsg        = document.getElementById("error-msg");
const processBtn      = document.getElementById("process-btn");
const exportBtn       = document.getElementById("export-btn");
const statusMsg       = document.getElementById("status-msg");
const progress        = document.getElementById("progress");
const resultSection   = document.getElementById("result");
const resultCount     = document.getElementById("result-count");
const resultHint      = document.getElementById("result-hint");
const resultBody      = document.getElementById("result-body");

let currentFile = null;
let isProcessing = false;
// Resultado da última análise: { execucao_id, quantidade, linhas, download }
let ultimoResultado = null;

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
  limparResultado();

  if (!formatoAceito(file)) {
    showError("Formato não suportado. Envie JPG, PNG, WEBP, BMP ou TIFF.");
    return;
  }

  const sizeMB = file.size / (1024 * 1024);
  if (sizeMB > MAX_SIZE_MB) {
    showError(`Arquivo muito grande. O limite é ${MAX_SIZE_MB}MB.`);
    return;
  }

  currentFile = file;
  showPreview(file);
  processBtn.disabled = false;
  statusMsg.textContent = "";
}

// O navegador nem sempre preenche file.type — em alguns sistemas o TIFF
// chega com type vazio. Recusar só pelo MIME barraria arquivo válido, então
// a extensão serve de segunda chance. Quem decide de verdade é o backend,
// que olha o conteúdo do arquivo.
function formatoAceito(file) {
  if (ACCEPTED_TYPES.includes(file.type)) return true;

  const nome = (file.name || "").toLowerCase();
  return ACCEPTED_EXTENSIONS.some(ext => nome.endsWith(ext));
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
  processBtn.disabled = true;
  statusMsg.textContent = "";
  hideError();
  limparResultado();
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

// ===== PROCESSAR =====
processBtn.addEventListener("click", async () => {
  if (!currentFile || isProcessing) return;

  isProcessing = true;
  hideError();
  limparResultado();
  setLoading(true);
  statusMsg.textContent = "Processando imagem...";

  try {
    const formData = new FormData();
    formData.append("file", currentFile);

    // formato=json devolve as linhas para a prévia e os links de download,
    // em vez do arquivo binário: é o que permite mostrar o resultado antes
    // de o usuário decidir exportar.
    const response = await enviar(`${API_PROCESS}?formato=json`, formData);

    if (!response.ok) {
      throw new Error(await mensagemDeErro(response));
    }

    ultimoResultado = await response.json();
    renderizarResultado(ultimoResultado);

    statusMsg.textContent = `${ultimoResultado.quantidade} equipamentos encontrados.`;
    exportBtn.hidden = false;

  } catch (err) {
    console.error(err);
    showError(err.message);
    statusMsg.textContent = "";
  } finally {
    isProcessing = false;
    setLoading(false);
  }
});

// ===== EXPORTAR =====
exportBtn.addEventListener("click", async () => {
  if (!ultimoResultado || isProcessing) return;

  isProcessing = true;
  hideError();
  statusMsg.textContent = "Gerando planilha...";

  try {
    const blob = await baixarPlanilha();
    downloadBlob(blob.dados, blob.nome);
    statusMsg.textContent = "Planilha baixada.";
  } catch (err) {
    console.error(err);
    showError(err.message);
    statusMsg.textContent = "";
  } finally {
    isProcessing = false;
  }
});

async function baixarPlanilha() {
  // Caminho normal: a execução foi gravada e a API devolveu o link, então
  // basta buscá-lo — sem repetir os segundos de CPU da inferência.
  if (ultimoResultado.download && ultimoResultado.download.xlsx) {
    const resposta = await enviar(`${API_BASE}${ultimoResultado.download.xlsx}`);

    if (!resposta.ok) {
      throw new Error(await mensagemDeErro(resposta));
    }

    return {
      dados: await resposta.blob(),
      nome: nomeDoArquivo(resposta, "resultado.xlsx"),
    };
  }

  // A gravação da execução no backend é best-effort. Se ela falhou, não há
  // link; reprocessa a imagem pedindo o arquivo direto.
  const formData = new FormData();
  formData.append("file", currentFile);

  const resposta = await enviar(`${API_PROCESS}?formato=xlsx`, formData);

  if (!resposta.ok) {
    throw new Error(await mensagemDeErro(resposta));
  }

  return {
    dados: await resposta.blob(),
    nome: nomeDoArquivo(resposta, "resultado.xlsx"),
  };
}

// ===== COMUNICAÇÃO COM A API =====

// Separa "não consegui falar com o servidor" de "o servidor recusou".
// Sem isso, um backend fora do ar aparece para o usuário como
// "Failed to fetch", que não diz o que fazer.
async function enviar(url, formData) {
  try {
    return await fetch(url, formData ? { method: "POST", body: formData } : {});
  } catch (err) {
    throw new Error(
      `Não foi possível falar com o servidor em ${API_BASE}. ` +
      `Verifique se o backend está no ar (docker compose up).`
    );
  }
}

// O backend manda a razão em `detail` (padrão do FastAPI): 400 para arquivo
// inválido, 503 quando o modelo não está instalado, 500 para falha no meio
// do processamento.
async function mensagemDeErro(response) {
  try {
    const corpo = await response.json();
    if (corpo && corpo.detail) return corpo.detail;
  } catch (parseError) {
    // resposta sem corpo JSON — cai no texto genérico abaixo
  }

  return `O servidor respondeu ${response.status}. Não foi possível processar a imagem.`;
}

// O backend informa o nome no Content-Disposition, e o expõe via
// Access-Control-Expose-Headers justamente para o JavaScript poder lê-lo.
// Fixar o nome aqui foi o que já produziu um .xlsx salvo como .csv.
function nomeDoArquivo(response, padrao) {
  const cabecalho = response.headers.get("Content-Disposition") || "";
  const match = cabecalho.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i);

  return match ? decodeURIComponent(match[1]) : padrao;
}

// ===== RESULTADO =====
function renderizarResultado({ quantidade, linhas }) {
  resultBody.innerHTML = "";

  const visiveis = (linhas || []).slice(0, MAX_LINHAS_PREVIA);

  for (const linha of visiveis) {
    const tr = document.createElement("tr");

    for (const coluna of ["TAG", "Tipo", "Descrição", "Coordenada X", "Coordenada Y", "Grupo"]) {
      const td = document.createElement("td");
      const valor = linha[coluna];

      // textContent, e não innerHTML: o conteúdo vem do OCR de uma imagem
      // enviada pelo usuário e não pode ser interpretado como marcação.
      td.textContent = (valor === null || valor === undefined || valor === "") ? "—" : valor;

      if (!td.textContent.trim() || td.textContent === "—") td.classList.add("vazio");
      tr.appendChild(td);
    }

    resultBody.appendChild(tr);
  }

  resultCount.textContent = quantidade;

  if (quantidade === 0) {
    resultHint.textContent = "Nenhum equipamento reconhecido nesta imagem.";
  } else if (quantidade > visiveis.length) {
    resultHint.textContent =
      `mostrando as ${visiveis.length} primeiras — a planilha traz todas`;
  } else {
    resultHint.textContent = "";
  }

  resultSection.hidden = false;
}

function limparResultado() {
  ultimoResultado = null;
  resultBody.innerHTML = "";
  resultSection.hidden = true;
  exportBtn.hidden = true;
}

function setLoading(isLoading) {
  processBtn.disabled = isLoading || !currentFile;
  processBtn.classList.toggle("loading", isLoading);
  processBtn.querySelector("svg").style.display = isLoading ? "none" : "inline-block";
  processBtn.childNodes[processBtn.childNodes.length - 1].textContent =
    " " + (isLoading ? "Processando..." : "Processar");

  progress.hidden = !isLoading;
}

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
