import React from "react";
import { createRoot } from "react-dom/client";
import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import Layout from "../src/components/Layout.jsx";
import Audit from "../src/pages/Audit.jsx";
import Companies from "../src/pages/Companies.jsx";
import Dashboard from "../src/pages/Dashboard.jsx";
import Files from "../src/pages/Files.jsx";
import Folders from "../src/pages/Folders.jsx";
import Guide from "../src/pages/Guide.jsx";
import SstAudits from "../src/pages/SstAudits.jsx";
import { DemoSession } from "./session.jsx";
import "../src/index.css";
import "./demo.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <HashRouter>
      <DemoSession>
        <div className="demo">
          <p className="demo-notice">
            <strong>Demostración visual</strong> · Datos sintéticos · Los cambios se reinician al recargar
          </p>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="guia" element={<Guide />} />
              <Route path="empresas" element={<Companies />} />
              <Route path="carpetas" element={<Folders />} />
              <Route path="archivos" element={<Files />} />
              <Route path="auditorias-sst" element={<SstAudits />} />
              <Route path="trazabilidad" element={<Audit />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </DemoSession>
    </HashRouter>
  </React.StrictMode>
);
