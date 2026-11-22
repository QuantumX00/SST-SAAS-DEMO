import { useEffect, useRef, useState } from "react";
import { BarChart3, ChevronDown, ChevronRight, Download, FileText, Folder, FolderPlus, Lock, Pencil, Plus, Sparkles, Trash2, Upload } from "lucide-react";
import { Link } from "react-router-dom";
import { Button, Card, ErrorBanner, Input, Spinner, StatusBadge, parseApiError } from "../src/components/ui.jsx";
import { countTemplateFolders } from "../src/data/sstTemplate.js";
import client from "./client.js";

const root = { id: "", name: "Raíz del portafolio" };
const statuses = ["Vigente", "Por Vencer", "Vencido", "Sin Vencimiento"];

function findPath(tree, id) {
  for (const folder of tree) {
    if (folder.id === id) return [folder];
    const path = findPath(folder.children, id);
    if (path.length) return [folder, ...path];
  }
  return [];
}

function FolderTree({ nodes, selectedId, onSelect, depth = 0 }) {
  return <ul className="space-y-1">
    {nodes.map((folder) => <FolderNode
      key={folder.id} folder={folder} selectedId={selectedId} onSelect={onSelect} depth={depth}
    />)}
  </ul>;
}

function FolderNode({ folder, selectedId, onSelect, depth }) {
  const [open, setOpen] = useState(true);
  return <li>
    <div className="folder-row" style={{ paddingInlineStart: Math.min(depth, 4) * 10 }}>
      {folder.children.length > 0 ? (
        <button className="tree-action" type="button" aria-label={`Subcarpetas de ${folder.name}`}
          aria-expanded={open} onClick={() => setOpen(!open)}>
          {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>
      ) : <span className="folder-indent" />}
      <button className="folder-choice" type="button" aria-pressed={selectedId === folder.id}
        onClick={() => onSelect(folder.id)}>
        <Folder size={17} className="shrink-0 text-brand-600" aria-hidden="true" />
        {folder.name}
      </button>
    </div>
    {open && folder.children.length > 0 && <FolderTree nodes={folder.children} selectedId={selectedId}
      onSelect={onSelect} depth={depth + 1} />}
  </li>;
}

function TextForm({ heading, label, initial = "", multiline = false, submit, onSave, onCancel }) {
  const [value, setValue] = useState(initial);
  return <form className="explorer-form space-y-3" onSubmit={async (event) => {
    event.preventDefault();
    if (value.trim()) await onSave(value.trim());
  }}>
    <h3 className="font-semibold text-slate-800">{heading}</h3>
    {multiline ? <label className="block text-sm font-medium text-slate-600">
      {label}
      <textarea className="explorer-field mt-1" rows={3} required value={value}
        onChange={(event) => setValue(event.target.value)} />
    </label> : <Input label={label} required value={value} onChange={(event) => setValue(event.target.value)} />}
    <div className="flex flex-wrap gap-2">
      <Button type="submit" disabled={!value.trim()}>{submit}</Button>
      <Button variant="ghost" onClick={onCancel}>Cancelar</Button>
    </div>
  </form>;
}

function FolderNotes({ folder, mutate }) {
  const [writing, setWriting] = useState(false);
  return <div className="explorer-notes">
    <Card title="Nota del proveedor">
      <p className="mb-2 flex items-center gap-2 text-xs font-medium text-slate-500"><Lock size={13} /> Solo lectura</p>
      <p className="whitespace-pre-wrap text-sm text-slate-700">{folder.providerNote ?? "El proveedor no dejó una nota en esta carpeta."}</p>
    </Card>
    <Card title="Mis notas">
      <div className="space-y-3">
        {folder.personalNotes?.length ? <ul className="space-y-2">
          {folder.personalNotes.map((note) => <li key={note.id} className="rounded-lg bg-slate-50 p-3">
            <p className="whitespace-pre-wrap text-sm text-slate-700">{note.text}</p>
          </li>)}
        </ul> : <p className="text-sm text-slate-500">Todavía no tienes notas personales.</p>}
        {writing ? <TextForm heading="Nueva nota personal" label="Observación de ejemplo" multiline
          submit="Guardar nota" onCancel={() => setWriting(false)} onSave={async (text) => {
            if (await mutate(() => client.post(`/explorer/folders/${folder.id}/notes`, { text }), "Nota guardada.")) setWriting(false);
          }} /> : <Button variant="secondary" onClick={() => setWriting(true)}><Plus size={16} /> Nota nueva</Button>}
      </div>
    </Card>
  </div>;
}

function Documents({ folder, files, mutate, reportError }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("");
  const [upload, setUpload] = useState(false);
  const [previewId, setPreviewId] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const preview = files.find((file) => file.id === previewId);
  const visible = files.filter((file) => file.name.toLowerCase().includes(query.trim().toLowerCase()) &&
    (!filter || (filter === "legal" ? file.is_critical : file.status === filter)));

  async function download(file) {
    try {
      const { data } = await client.get(`/explorer/files/${file.id}/download`);
      const url = URL.createObjectURL(data);
      const link = document.createElement("a");
      link.href = url;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      reportError(parseApiError(error));
    }
  }

  return <section className="explorer-card space-y-4" aria-labelledby="folder-documents">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h3 id="folder-documents" className="text-base font-semibold text-slate-800">Documentos ({files.length})</h3>
      {folder && !upload && <Button onClick={() => setUpload(true)}><Upload size={16} /> Subir documento</Button>}
    </div>
    {upload && <form className="explorer-form space-y-3" onSubmit={async (event) => {
      event.preventDefault();
      const data = new FormData(event.currentTarget);
      data.delete("sample");
      data.set("folder_id", folder.id);
      data.set("is_critical", String(data.has("is_critical")));
      if (await mutate(() => client.post("/explorer/files/upload", data), "Documento simulado cargado.")) setUpload(false);
    }}>
      <p className="text-sm text-slate-600">Selecciona un archivo de prueba. La demo genera un documento sintético para esta carpeta.</p>
      <label className="block text-sm font-medium text-slate-700">
        Archivo de prueba
        <input className="mt-1 block w-full" type="file" name="sample" required />
      </label>
      <Input type="date" label="Fecha de vencimiento (opcional)" name="expiration_date" />
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" name="is_critical" /> Marcar como exigido por ley en el ejemplo
      </label>
      <div className="flex flex-wrap gap-2">
        <Button type="submit">Confirmar carga simulada</Button>
        <Button variant="ghost" onClick={() => setUpload(false)}>Cancelar</Button>
      </div>
    </form>}
    <div className="document-filters">
      <Input label="Buscar documento" type="search" placeholder="Nombre del documento" value={query}
        onChange={(event) => setQuery(event.target.value)} />
      <label className="block text-sm font-medium text-slate-600">
        Filtrar documentos
        <select className="explorer-field mt-1" value={filter} onChange={(event) => setFilter(event.target.value)}>
          <option value="">Todos los estados</option>
          {statuses.map((status) => <option key={status}>{status}</option>)}
          <option value="legal">Exigidos por ley</option>
        </select>
      </label>
    </div>
    {preview && <div className="explorer-form space-y-2" aria-label="Vista previa">
      <h4 className="font-semibold text-slate-800">{preview.name}</h4>
      <p className="text-sm text-slate-600">SST SaaS · Demostración visual. Contenido sintético.</p>
      <p className="text-sm text-slate-600">{preview.expiration_date ? `Vencimiento ${preview.expiration_date}` : "Sin fecha de vencimiento"}</p>
      <Button variant="secondary" onClick={() => setPreviewId(null)}>Cerrar vista previa</Button>
    </div>}
    {pendingDelete && <div className="explorer-form space-y-2">
      <p className="text-sm text-slate-700">¿Eliminar «{pendingDelete.name}»?</p>
      <div className="flex flex-wrap gap-2">
        <Button variant="danger" onClick={async () => {
          if (await mutate(() => client.delete(`/explorer/files/${pendingDelete.id}`), "Documento eliminado.")) setPendingDelete(null);
        }}>Confirmar eliminación</Button>
        <Button variant="ghost" onClick={() => setPendingDelete(null)}>Cancelar</Button>
      </div>
    </div>}
    {visible.length ? <ul className="divide-y divide-slate-100">
      {visible.map((file) => <li className="document-row" key={file.id}>
        <div className="flex min-w-0 items-start gap-3">
          <FileText size={18} className="mt-0.5 shrink-0 text-brand-600" aria-hidden="true" />
          <div className="min-w-0 space-y-1">
            <p className="text-sm font-medium text-slate-800">{file.name}</p>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <StatusBadge status={file.status} />
              {file.expiration_date && <span>{file.expiration_date}</span>}
              {file.is_critical && <span className="font-medium text-amber-700">Exigido por ley</span>}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1">
          <Button variant="ghost" className="!px-2" onClick={() => setPreviewId(file.id)}>Consultar</Button>
          <button className="document-icon" title="Descargar" aria-label={`Descargar ${file.name}`} onClick={() => download(file)}><Download size={17} /></button>
          <button className="document-icon hover:text-red-700" title="Eliminar" aria-label={`Eliminar ${file.name}`} onClick={() => setPendingDelete(file)}><Trash2 size={17} /></button>
        </div>
      </li>)}
    </ul> : <p className="explorer-placeholder text-sm text-slate-500">
      {files.length ? "Ningún documento coincide con la búsqueda." : "Aún no hay documentos en esta ubicación."}
    </p>}
  </section>;
}

export default function Explorer() {
  const [data, setData] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [action, setAction] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [treeOpen, setTreeOpen] = useState(true);
  const location = useRef(null);

  async function load() {
    const [tree, files] = await Promise.all([client.get("/explorer/folders"), client.get("/explorer/files")]);
    return { tree: tree.data, files: files.data };
  }

  useEffect(() => {
    let active = true;
    load().then((result) => { if (active) setData(result); })
      .catch((failure) => { if (active) setError(parseApiError(failure)); });
    return () => { active = false; };
  }, []);

  async function mutate(operation, success) {
    setError("");
    setMessage("");
    try {
      const { data: result } = await operation();
      setData(await load());
      setMessage(success);
      return result ?? true;
    } catch (failure) {
      setError(parseApiError(failure));
      return false;
    }
  }

  function select(id, moveFocus = false) {
    setAction(null);
    setSelectedId(id);
    if (moveFocus) requestAnimationFrame(() => location.current?.focus());
  }

  if (!data) return error ? <ErrorBanner message={error} /> : <Spinner label="Cargando explorador..." />;
  const { tree, files } = data;
  const path = findPath(tree, selectedId);
  const folder = path.at(-1) ?? (selectedId === root.id ? root : null);
  const all = selectedId === "all";
  const guideExists = tree.some((item) => item.fromGuide);
  const isFolder = Boolean(folder?.id);
  const creating = action === "create" || action === "child";

  async function saveName(name) {
    const result = await mutate(() => creating
      ? client.post("/explorer/folders", { name, parent_id: action === "child" ? folder.id : null })
      : client.patch(`/explorer/folders/${folder.id}`, { name }), creating ? "Carpeta creada." : "Nombre guardado.");
    if (result) select(result.id, true);
  }

  async function createGuide() {
    if (await mutate(() => client.post("/explorer/guide"), "Estructura guía creada.")) setTreeOpen(true);
  }

  return <div className="buyer-explorer space-y-5">
    <div className="explorer-heading">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Explorador documental</h1>
        <p className="mt-1 text-sm text-slate-500">Organiza tus carpetas, documentos y notas personales.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => { setSelectedId(null); setAction("create"); }}><FolderPlus size={17} /> Crear carpeta</Button>
        {!guideExists && <Button variant="secondary" onClick={createGuide}><Sparkles size={17} /> Crear estructura guía SST</Button>}
      </div>
    </div>
    <ErrorBanner message={error} />
    <div className="sr-only" role="status">{message}</div>
    <div className="buyer-explorer-grid">
      <section className="explorer-card explorer-sidebar" aria-label="Árbol de carpetas">
        <button className="explorer-tree-toggle" type="button" aria-expanded={treeOpen} aria-controls="buyer-folder-tree" onClick={() => setTreeOpen(!treeOpen)}>
          <Folder size={17} className="text-brand-600" /> Carpetas
          {treeOpen ? <ChevronDown size={16} className="ml-auto" /> : <ChevronRight size={16} className="ml-auto" />}
        </button>
        {treeOpen && <div id="buyer-folder-tree" className="explorer-tree-body">
          <div className="mb-3 flex flex-wrap gap-1 border-b border-slate-100 pb-3">
            <Button variant="ghost" aria-pressed={all} onClick={() => select("all", true)}>Todo el portafolio</Button>
            <Button variant="ghost" aria-pressed={selectedId === root.id} onClick={() => select(root.id, true)}>Raíz</Button>
          </div>
          {tree.length ? <div className="buyer-folder-list">
            <FolderTree nodes={tree} selectedId={selectedId} onSelect={(id) => select(id, true)} />
          </div> : <p className="text-sm text-slate-500">Aún no hay carpetas.</p>}
        </div>}
      </section>
      <section className="min-w-0 space-y-4" aria-labelledby="buyer-folder-title">
        {!folder && !all && !action && <div className="explorer-card explorer-empty">
          <Folder size={32} className="text-brand-600" aria-hidden="true" />
          <h2 id="buyer-folder-title" className="text-lg font-semibold text-slate-800">{tree.length ? "Selecciona una carpeta" : "Tu explorador está vacío"}</h2>
          <p className="text-sm text-slate-500">{tree.length ? "Abre una carpeta para ver sus notas y documentos." : `Crea tu primera carpeta o empieza con las ${countTemplateFolders()} carpetas de la guía SST.`}</p>
        </div>}
        {folder || all ? <div className="explorer-card space-y-3">
          {path.length > 1 && <p className="text-xs text-slate-500">{path.slice(0, -1).map((item) => item.name).join(" / ")}</p>}
          <h2 id="buyer-folder-title" tabIndex={-1} ref={location} className="text-xl font-semibold text-slate-800">{folder?.name ?? "Todo el portafolio"}</h2>
          {isFolder && <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => setAction("child")}><FolderPlus size={16} /> Crear subcarpeta</Button>
            {!folder.fromGuide && <Button variant="ghost" onClick={() => setAction("rename")}><Pencil size={16} /> Renombrar</Button>}
            <Button variant="ghost" onClick={() => setAction("delete")}><Trash2 size={16} /> Eliminar carpeta</Button>
          </div>}
        </div> : null}
        {action && (action === "create" || isFolder) && <div className="explorer-card">
          {action === "delete" ? <div className="space-y-3">
            <h3 className="font-semibold text-slate-800">¿Eliminar «{folder.name}»?</h3>
            <p className="text-sm text-slate-600">También se eliminarán sus notas, subcarpetas y documentos simulados.</p>
            <div className="flex flex-wrap gap-2">
              <Button variant="danger" onClick={async () => {
                if (await mutate(() => client.delete(`/explorer/folders/${folder.id}`), "Carpeta eliminada.")) select(null);
              }}>Eliminar carpeta y contenido</Button>
              <Button variant="ghost" onClick={() => setAction(null)}>Cancelar</Button>
            </div>
          </div> : <TextForm key={`${action}:${selectedId}`}
            heading={action === "child" ? `Nueva subcarpeta en ${folder.name}` : creating ? "Nueva carpeta" : "Renombrar carpeta"}
            label="Nombre de la carpeta" initial={creating ? "" : folder.name}
            submit={creating ? "Guardar carpeta" : "Guardar nombre"} onSave={saveName} onCancel={() => setAction(null)} />}
        </div>}
        {isFolder && <FolderNotes key={`notes:${folder.id}`} folder={folder} mutate={mutate} />}
        {(folder || all) && <Documents key={`documents:${selectedId}`} folder={folder} mutate={mutate} reportError={setError}
          files={all ? files : files.filter((file) => (file.folder_id ?? "") === folder.id)} />}
        {all && <Link className="inline-flex items-center gap-2 text-sm font-medium text-brand-700" to="/actividad"><BarChart3 size={17} /> Ver informe de actividad</Link>}
      </section>
    </div>
  </div>;
}
