import client from "./client.js";

// --- Empresas (tenants) ---
export async function listCompanies() {
  const { data } = await client.get("/companies");
  return data;
}

export async function createCompany(payload) {
  const { data } = await client.post("/companies", payload);
  return data;
}

// --- Carpetas ---
export async function listFolderTree() {
  const { data } = await client.get("/folders");
  return data;
}

export async function createFolder(payload, companyId) {
  const { data } = await client.post("/folders", payload, {
    headers: { "X-Company-Id": companyId },
  });
  return data;
}

export async function deleteFolder(folderId) {
  await client.delete(`/folders/${folderId}`);
}

// --- Archivos ---
export async function listFiles() {
  const { data } = await client.get("/files");
  return data;
}

export async function uploadFile({ file, folderId, isCritical, expirationDate }) {
  const form = new FormData();
  form.append("file", file);
  if (folderId) form.append("folder_id", folderId);
  form.append("is_critical", isCritical ? "true" : "false");
  if (expirationDate) form.append("expiration_date", expirationDate);
  const { data } = await client.post("/files/upload", form);
  return data;
}

export function downloadFileUrl(fileId) {
  return `/files/${fileId}/download`;
}

export async function deleteFile(fileId) {
  await client.delete(`/files/${fileId}`);
}

// --- Trazabilidad (log técnico) ---
export async function listAuditLogs() {
  const { data } = await client.get("/audit-logs");
  return data;
}

// --- Auditorías internas del SG-SST (negocio de SST) ---
export async function listSstAudits() {
  const { data } = await client.get("/sst-audits");
  return data;
}

export async function getSstAudit(auditId) {
  const { data } = await client.get(`/sst-audits/${auditId}`);
  return data;
}

export async function createSstAudit(payload) {
  const { data } = await client.post("/sst-audits", payload);
  return data;
}

export async function updateSstAudit(auditId, payload) {
  const { data } = await client.patch(`/sst-audits/${auditId}`, payload);
  return data;
}

export async function deleteSstAudit(auditId) {
  await client.delete(`/sst-audits/${auditId}`);
}

export async function createFinding(auditId, payload) {
  const { data } = await client.post(
    `/sst-audits/${auditId}/findings`,
    payload
  );
  return data;
}

export async function updateFinding(auditId, findingId, payload) {
  const { data } = await client.patch(
    `/sst-audits/${auditId}/findings/${findingId}`,
    payload
  );
  return data;
}

export async function deleteFinding(auditId, findingId) {
  await client.delete(`/sst-audits/${auditId}/findings/${findingId}`);
}
