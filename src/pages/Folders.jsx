import { useCallback, useEffect, useRef, useState } from "react";
import {
  Folder,
  FolderPlus,
  Trash2,
  ChevronRight,
  ChevronDown,
  Sparkles,
  Loader2,
} from "lucide-react";
import {
  createFolder,
  deleteFolder,
  listFolderTree,
} from "../api/endpoints.js";
import { TOKEN_KEY } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import { Card, Button, Input, ErrorBanner, Spinner, parseApiError } from "../components/ui.jsx";
import Files from "./Files.jsx";
import { SST_FOLDER_TEMPLATE, countTemplateFolders } from "../data/sstTemplate.js";

function TreeNode({ node, depth, canManage, onCreateChild, onDelete, onSelect, selectedId }) {
  const [open, setOpen] = useState(true);
  const hasChildren = node.children && node.children.length > 0;

  return (
    <div>
      <div
        className="group flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-slate-50"
        style={{ paddingLeft: `${(onSelect ? Math.min(depth, 4) * 12 : depth * 16) + 8}px` }}
      >
        <div className="flex min-w-0 items-center gap-1.5">
          {hasChildren ? (
            <button
              onClick={() => setOpen(!open)}
              aria-label={onSelect ? `Subcarpetas de ${node.name}` : node.name}
              aria-expanded={open}
              className="tree-action text-slate-500"
            >
              {open ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
          ) : (
            <span className="inline-block w-4" />
          )}
          {onSelect ? (
            <button
              type="button"
              aria-pressed={selectedId === node.id}
              onClick={() => onSelect(node.id)}
              className="folder-choice flex min-w-0 items-center gap-2 rounded px-2 text-left text-sm text-slate-700"
            >
              <Folder aria-hidden="true" className="h-4 w-4 shrink-0 text-brand-600" />
              <span>{node.name}</span>
            </button>
          ) : (
            <>
              <Folder className="h-4 w-4 text-brand-500" />
              <span className="text-sm text-slate-700">{node.name}</span>
            </>
          )}
        </div>
        {canManage && (
          <div className={onSelect ? "flex shrink-0 items-center gap-1" : "flex items-center gap-1 opacity-0 group-hover:opacity-100"}>
            <button
              onClick={() => onCreateChild(node)}
              className="tree-action rounded p-1 text-slate-500 hover:bg-brand-50 hover:text-brand-600"
              title="Crear subcarpeta"
            >
              <FolderPlus className="h-4 w-4" />
            </button>
            <button
              onClick={() => onDelete(node)}
              className="tree-action rounded p-1 text-slate-500 hover:bg-red-50 hover:text-red-600"
              title="Eliminar carpeta"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
      {open &&
        hasChildren &&
        node.children.map((child) => (
          <TreeNode
            key={child.id}
            node={child}
            depth={depth + 1}
            canManage={canManage}
            onCreateChild={onCreateChild}
            onDelete={onDelete}
            onSelect={onSelect}
            selectedId={selectedId}
          />
        ))}
    </div>
  );
}

const TEMPLATE_TOTAL = countTemplateFolders();

function findFolderPath(tree, id) {
  for (const node of tree) {
    if (node.id === id) return [node];
    const path = findFolderPath(node.children ?? [], id);
    if (path.length) return [node, ...path];
  }
  return [];
}

function FolderDetails({ folder, onSave }) {
  const [name, setName] = useState(folder.name);
  const [notes, setNotes] = useState(folder.notes ?? "");
  const [saved, setSaved] = useState(false);

  return (
    <Card title="Nombre y notas de carpeta">
      <form className="space-y-3" onSubmit={async (event) => {
        event.preventDefault();
        if (name.trim() && await onSave(folder.id, { name: name.trim(), notes })) {
          setName(name.trim());
          setSaved(true);
        }
      }}>
        <Input label="Nombre de la carpeta" value={name} required onChange={(event) => {
          setName(event.target.value);
          setSaved(false);
        }} />
        <label className="block text-sm font-medium text-slate-600">
          Notas de demostración
          <textarea
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2"
            rows={3}
            value={notes}
            onChange={(event) => {
              setNotes(event.target.value);
              setSaved(false);
            }}
          />
        </label>
        <Button type="submit" disabled={!name.trim() || (name === folder.name && notes === (folder.notes ?? ""))}>
          Guardar nombre y notas
        </Button>
        {saved && <p role="status" className="text-sm text-emerald-700">Cambios guardados en la demo.</p>}
      </form>
    </Card>
  );
}

export default function Folders({ updateFolder }) {
  const explorer = Boolean(updateFolder);
  const [selectedId, setSelectedId] = useState(undefined);
  const createInput = useRef(null);
  const { companyId, activeCompany, canManage, token } = useAuth();
  const [tree, setTree] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [parent, setParent] = useState(null); // { id, name } o null para raíz
  const [saving, setSaving] = useState(false);

  // Estado de la generación de la plantilla guía.
  const [seeding, setSeeding] = useState(false);
  const [seedProgress, setSeedProgress] = useState(0);

  const load = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    setError("");
    try {
      const data = await listFolderTree();
      setTree(data);
    } catch (err) {
      setError(parseApiError(err));
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreate(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await createFolder({ name, parent_id: parent ? parent.id : null });
      setName("");
      setParent(null);
      await load();
    } catch (err) {
      setError(parseApiError(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(node) {
    if (
      !window.confirm(
        `¿Eliminar la carpeta "${node.name}" y todo su contenido? Esta acción no se puede deshacer.`
      )
    )
      return;
    setError("");
    try {
      await deleteFolder(node.id);
      if (findFolderPath(tree, selectedId).some((folder) => folder.id === node.id)) {
        setSelectedId(undefined);
      }
      if (findFolderPath(tree, parent?.id).some((folder) => folder.id === node.id)) {
        setParent(null);
      }
      await load();
    } catch (err) {
      setError(parseApiError(err));
    }
  }

  // Crea recursivamente el árbol de plantilla respetando la jerarquía:
  // primero el padre (para obtener su id) y luego sus hijos con parent_id.
  async function seedNodes(nodes, parentId, onCreated) {
    for (const node of nodes) {
      if (localStorage.getItem(TOKEN_KEY) !== token) return;
      const created = await createFolder({ name: node.name, parent_id: parentId }, companyId);
      onCreated();
      if (node.children && node.children.length > 0) {
        await seedNodes(node.children, created.id, onCreated);
      }
    }
  }

  async function handleSeedTemplate() {
    if (
      !window.confirm(
        `Se crearán ${TEMPLATE_TOTAL} carpetas con la estructura guía del SG-SST (Res. 0312 de 2019) en "${
          activeCompany?.name || "la empresa activa"
        }". ¿Continuar?`
      )
    )
      return;
    setSeeding(true);
    setSeedProgress(0);
    setError("");
    let count = 0;
    try {
      await seedNodes(SST_FOLDER_TEMPLATE, null, () => {
        count += 1;
        setSeedProgress(count);
      });
      await load();
    } catch (err) {
      setError(parseApiError(err));
    } finally {
      setSeeding(false);
    }
  }

  async function saveFolder(id, changes) {
    setError("");
    try {
      await updateFolder(id, changes);
      await load();
      return true;
    } catch (err) {
      setError(parseApiError(err));
      return false;
    }
  }

  const path = findFolderPath(tree, selectedId);
  const selectedFolder = path.at(-1);
  const scope = selectedFolder ? selectedFolder.id : selectedId === "" ? "" : undefined;
  const isEmpty = !loading && tree.length === 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{explorer ? "Explorador documental" : "Carpetas"}</h1>
          <p className="text-sm text-slate-500">
            {explorer ? "Consulta documentos y gestiona las carpetas de tu portafolio SST." : "Estructura documental jerárquica del portafolio (subcarpetas ilimitadas)."}
          </p>
        </div>
        {canManage && (
          <Button
            variant="secondary"
            onClick={handleSeedTemplate}
            disabled={seeding || !companyId}
          >
            {seeding ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 text-brand-600" />
            )}
            {seeding
              ? `Creando ${seedProgress}/${TEMPLATE_TOTAL}...`
              : "Crear estructura guía SST"}
          </Button>
        )}
      </div>

      {/* Banner promocional de la plantilla cuando no hay carpetas */}
      {canManage && isEmpty && (
        <div className="flex flex-col items-start gap-3 rounded-xl border border-brand-100 bg-brand-50 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-600 text-white">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800">
                ¿Recién empiezas? Usa la estructura guía
              </h3>
              <p className="text-sm text-slate-600">
                Genera de un clic las {TEMPLATE_TOTAL} carpetas estándar del
                SG-SST según la Resolución 0312 de 2019. Luego solo subes tus
                documentos a cada una.
              </p>
            </div>
          </div>
          <Button onClick={handleSeedTemplate} disabled={seeding}>
            <Sparkles className="h-4 w-4" />
            Crear ahora
          </Button>
        </div>
      )}

      {explorer && <ErrorBanner message={error} />}
      <div className={explorer ? "document-explorer" : "grid grid-cols-1 gap-6 lg:grid-cols-3"}>
        <div className={explorer ? "explorer-tree" : canManage ? "lg:col-span-2" : "lg:col-span-3"}>
          <Card title="Árbol de carpetas">
            {!canManage && <ErrorBanner message={error} />}
            {explorer && (
              <div className="mb-2 flex flex-wrap gap-2">
                <Button variant="secondary" aria-pressed={scope === undefined} onClick={() => setSelectedId(undefined)}>Todo el portafolio</Button>
                <Button variant="secondary" aria-pressed={scope === ""} onClick={() => setSelectedId("")}>Raíz</Button>
              </div>
            )}
            {loading && !explorer ? (
              <Spinner label="Cargando carpetas..." />
            ) : tree.length === 0 ? (
              <p className="text-sm text-slate-500">
                No hay carpetas todavía.
                {canManage && " Crea la primera a la izquierda o usa la estructura guía."}
              </p>
            ) : (
              <div className={explorer ? "folder-tree-list space-y-0.5" : "space-y-0.5"}>
                {tree.map((node) => (
                  <TreeNode
                    key={node.id}
                    node={node}
                    depth={0}
                    canManage={canManage}
                    onCreateChild={(n) => {
                      setParent({ id: n.id, name: n.name });
                      if (explorer) createInput.current?.querySelector("input")?.focus();
                    }}
                    onDelete={handleDelete}
                    onSelect={explorer ? setSelectedId : undefined}
                    selectedId={scope}
                  />
                ))}
              </div>
            )}
          </Card>
        </div>
        {explorer && (
          <section className="explorer-files space-y-4" aria-labelledby="document-location">
            <h2 id="document-location" className="text-lg font-semibold text-slate-800">
              {selectedFolder ? path.map((node) => node.name).join(" / ") : scope === "" ? "Raíz del portafolio" : "Todo el portafolio"}
            </h2>
            {selectedFolder && <FolderDetails key={`details:${selectedFolder.id}`} folder={selectedFolder} onSave={saveFolder} />}
            <Files key={`documents:${scope ?? "all"}`} explorer folderScope={scope} folderTree={tree} />
          </section>
        )}
        {canManage && (
          <div className={explorer ? "explorer-create" : "lg:col-span-1"}>
            <Card title="Nueva carpeta">
              {!explorer && <ErrorBanner message={error} />}
              <form ref={createInput} onSubmit={handleCreate} className="space-y-4">
                <Input
                  label="Nombre"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Matriz de riesgos"
                />
                <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
                  Ubicación:{" "}
                  <span className="font-medium text-slate-800">
                    {parent ? parent.name : "Raíz del portafolio"}
                  </span>
                  {parent && (
                    <button
                      type="button"
                      onClick={() => setParent(null)}
                      className="ml-2 text-xs text-brand-600 hover:underline"
                    >
                      (usar raíz)
                    </button>
                  )}
                </div>
                <Button type="submit" disabled={saving} className="w-full">
                  <FolderPlus className="h-4 w-4" />
                  {saving ? "Creando..." : "Crear carpeta"}
                </Button>
              </form>
            </Card>
          </div>
        )}

      </div>
    </div>
  );
}
