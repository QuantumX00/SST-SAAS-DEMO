import { fileStatus, initialPortfolios, timestamp } from "./data.js";

// La vista de carpetas consulta esta clave al generar la plantilla.
// La demo nunca guarda valores en el almacenamiento del navegador.
export const TOKEN_KEY = "sst_pages_unused_session";

const portfolios = initialPortfolios();
let activeId = portfolios[0].company.id;

export const demoCompanies = () => portfolios.map(({ company }) => company);
export function selectCompany(id) {
  activeId = id;
}

function byId(records, id) {
  const record = records.find((entry) => entry.id === id);
  if (!record) throw new Error("El elemento ya no está disponible en esta demostración.");
  return record;
}

function add(records, fields) {
  const record = { ...fields, id: crypto.randomUUID(), created_at: timestamp() };
  records.push(record);
  return record;
}

function remove(records, id) {
  records.splice(records.indexOf(byId(records, id)), 1);
}

function folderTree({ folders, files }, parentId = null) {
  return folders.filter((folder) => folder.parent_id === parentId).map((folder) => ({
    ...folder,
    file_count: files.filter((file) => file.folder_id === folder.id).length,
    children: folderTree({ folders, files }, folder.id),
  }));
}

function removeFolder(portfolio, id) {
  for (const child of portfolio.folders.filter((folder) => folder.parent_id === id)) {
    removeFolder(portfolio, child.id);
  }
  portfolio.files = portfolio.files.filter((file) => file.folder_id !== id);
  remove(portfolio.folders, id);
}

function log(portfolio, action, details) {
  const item = { id: crypto.randomUUID(), action, details, timestamp: timestamp() };
  portfolio.logs.unshift(item);
}

async function request(method, path, payload, config) {
  const [, resource, id, subresource, findingId] = path.split("/");
  if (resource === "companies") {
    if (method === "GET") return { data: demoCompanies() };
    if (method === "POST") {
      const company = { ...payload, id: crypto.randomUUID(), created_at: timestamp() };
      portfolios.push({ company, folders: [], files: [], audits: [], logs: [] });
      return { data: company };
    }
  }

  const companyId = config?.headers?.["X-Company-Id"] ?? activeId;
  const portfolio = portfolios.find(({ company }) => company.id === companyId);
  if (!portfolio) throw new Error("Selecciona una empresa de la demostración.");

  const { folders, files, audits, logs } = portfolio;
  if (resource === "folders") {
    if (method === "GET") return { data: folderTree(portfolio) };
    if (method === "POST") return { data: add(folders, payload) };
    if (method === "DELETE") {
      const folder = byId(folders, id);
      removeFolder(portfolio, id);
      log(portfolio, "ELIMINAR_CARPETA", folder.name);
      return { data: null };
    }
  }

  if (resource === "files") {
    if (method === "GET" && !id) {
      return { data: files.map((file) => ({ ...file, status: fileStatus(file.expiration_date) })) };
    }
    if (method === "GET" && subresource === "download") {
      const file = byId(files, id);
      log(portfolio, "DESCARGAR", file.name);
      return { data: new Blob([`SST SaaS · Demostración visual\n${file.name}\nContenido sintético.\n`]) };
    }
    if (method === "POST" && id === "upload") {
      // Se descartan tanto el nombre original como los bytes del archivo.
      const file = add(files, {
        name: "Documento cargado (muestra).txt",
        folder_id: payload.get("folder_id"),
        is_critical: payload.get("is_critical") === "true",
        expiration_date: payload.get("expiration_date"),
        uploaded_at: timestamp(),
      });
      log(portfolio, "SUBIR", file.name);
      return { data: file };
    }
    if (method === "DELETE") {
      const file = byId(files, id);
      remove(files, id);
      log(portfolio, "ELIMINAR_ARCHIVO", file.name);
      return { data: null };
    }
  }

  if (resource === "audit-logs" && method === "GET") return { data: [...logs] };

  if (resource === "sst-audits") {
    if (!id && method === "GET") return { data: structuredClone(audits) };
    if (!id && method === "POST") return { data: add(audits, { ...payload, findings: [] }) };

    const audit = byId(audits, id);
    if (subresource === "findings") {
      if (method === "POST") return { data: add(audit.findings, { status: "Abierto", ...payload }) };
      if (method === "PATCH") return { data: Object.assign(byId(audit.findings, findingId), payload) };
      if (method === "DELETE") return { data: remove(audit.findings, findingId) };
    }
    if (method === "GET") return { data: structuredClone(audit) };
    if (method === "PATCH") return { data: Object.assign(audit, payload) };
    if (method === "DELETE") return { data: remove(audits, id) };
  }

  throw new Error("Operación no disponible en la demostración.");
}

export default {
  get: (path, config) => request("GET", path, undefined, config),
  post: (path, payload, config) => request("POST", path, payload, config),
  patch: (path, payload) => request("PATCH", path, payload),
  delete: (path) => request("DELETE", path),
};
