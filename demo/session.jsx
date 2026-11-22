import { createContext, useContext, useState } from "react";
import { demoCompanies, selectCompany } from "./client.js";

const DemoContext = createContext(null);
const user = { name: "Laura Méndez", email: "laura@sst.example", role: "Titular individual · Demo" };

export function DemoSession({ children }) {
  const [companies, setCompanies] = useState(demoCompanies);
  const [companyId, setCompanyIdState] = useState(companies[0].id);

  function setCompanyId(id) {
    selectCompany(id);
    setCompanyIdState(id);
  }

  function refreshCompanies(preferredId) {
    const updated = demoCompanies();
    setCompanies(updated);
    setCompanyId(preferredId ?? companyId);
  }

  return (
    <DemoContext.Provider value={{
      user,
      role: user.role,
      canManage: true,
      token: null,
      companies,
      companyId,
      activeCompany: companies.find((company) => company.id === companyId),
      setCompanyId,
      refreshCompanies,
    }}>
      {children}
    </DemoContext.Provider>
  );
}

export function useAuth() {
  return useContext(DemoContext);
}
