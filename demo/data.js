const dayMs = 86_400_000;
export const timestamp = () => new Date().toISOString();
export const dateOffset = (days) => new Date(Date.now() + days * dayMs).toISOString().slice(0, 10);

export function fileStatus(expiration) {
  if (!expiration) return "Sin Vencimiento";
  if (expiration < dateOffset(0)) return "Vencido";
  return expiration <= dateOffset(30) ? "Por Vencer" : "Vigente";
}

function makeCompany(id, name, nit, prefix, documents) {
  const folderId = `${id}-plan`;
  const auditId = `${id}-audit`;
  return {
    company: { id, name, nit, created_at: timestamp() },
    folders: [
      { id: folderId, name: "01 · Planificar", parent_id: null, notes: "Revisar el plan anual y la matriz de riesgos en la próxima reunión de muestra." },
      { id: `${id}-evidence`, name: "Evidencias (muestra)", parent_id: folderId, notes: "Consolidar los soportes de inducción del ejercicio ficticio." },
      { id: `${id}-verify`, name: "03 · Verificar", parent_id: null },
    ],
    files: documents.map(([label, days], index) => ({
      id: `${id}-file-${index}`,
      name: `${label} (muestra).txt`,
      folder_id: index === 0 ? `${id}-evidence` : folderId,
      is_critical: index < 2,
      expiration_date: days === null ? null : dateOffset(days),
      uploaded_at: timestamp(),
    })),
    audits: [{
      id: auditId,
      title: `Auditoría interna · ${prefix}`,
      scope: "Revisión documental de ejemplo",
      auditor: "Equipo auditor ficticio",
      scheduled_date: dateOffset(14),
      status: "En Proceso",
      findings: [{
        id: `${auditId}-finding`,
        description: "Actualizar el registro de inducción de muestra",
        finding_type: "Observación",
        action_plan: "Revisar los soportes simulados",
        responsible: "Equipo SST ficticio",
        due_date: dateOffset(21),
        status: "Abierto",
      }],
    }],
    logs: [{
      id: `${id}-log`,
      action: "SUBIR",
      details: `Carga simulada de ${documents[0][0]}`,
      ip_address: "192.0.2.10",
      timestamp: timestamp(),
    }],
  };
}

export function initialPortfolios() {
  return [
    makeCompany("arce", "Operaciones Arce · Demo", "DEMO-001", "Operaciones Arce", [
      ["Matriz de riesgos", 12],
      ["Plan anual SST", 90],
      ["Registro de inducción", -8],
      ["Acta del comité SST", null],
    ]),
    makeCompany("alba", "Servicios Alba · Demo", "DEMO-002", "Servicios Alba", [
      ["Plan de emergencias", 70],
      ["Cronograma de capacitación", 24],
    ]),
  ];
}
