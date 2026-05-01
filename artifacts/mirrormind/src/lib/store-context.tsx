import React, { createContext, useContext, useState, useEffect } from 'react';
import type { StoreAnalysis } from '@/lib/api-client';

interface StoreState {
  storeDomain: string;
  adminToken: string;
  analysisData: StoreAnalysis | null;
}

interface StoreContextType extends StoreState {
  setStoreDomain: (domain: string) => void;
  setAdminToken: (token: string) => void;
  setAnalysisData: (data: StoreAnalysis | null) => void;
  clearStore: () => void;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [storeDomain, setStoreDomain] = useState<string>(() => {
    return localStorage.getItem('mirrormind_domain') || '';
  });
  const [adminToken, setAdminToken] = useState<string>(() => {
    return localStorage.getItem('mirrormind_token') || '';
  });
  const [analysisData, setAnalysisData] = useState<StoreAnalysis | null>(() => {
    const saved = localStorage.getItem('mirrormind_analysis');
    try {
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    localStorage.setItem('mirrormind_domain', storeDomain);
  }, [storeDomain]);

  useEffect(() => {
    localStorage.setItem('mirrormind_token', adminToken);
  }, [adminToken]);

  useEffect(() => {
    if (analysisData) {
      localStorage.setItem('mirrormind_analysis', JSON.stringify(analysisData));
    } else {
      localStorage.removeItem('mirrormind_analysis');
    }
  }, [analysisData]);

  const clearStore = () => {
    setStoreDomain('');
    setAdminToken('');
    setAnalysisData(null);
  };

  return (
    <StoreContext.Provider
      value={{
        storeDomain,
        adminToken,
        analysisData,
        setStoreDomain,
        setAdminToken,
        setAnalysisData,
        clearStore,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const context = useContext(StoreContext);
  if (context === undefined) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
}
