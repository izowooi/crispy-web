"use client";

import { useEffect, useState, useCallback } from "react";
import AdminBar from "./admin-bar";

export default function AdminBarWrapper() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const checkStatus = useCallback(() => {
    return fetch("/api/admin/status")
      .then((r) => r.json())
      .then((d) => { setIsAdmin(d.isAdmin ?? false); setLoaded(true); })
      .catch(() => setLoaded(true));
  }, []);

  useEffect(() => { checkStatus(); }, [checkStatus]);

  if (!loaded) return null;
  return <AdminBar isAdmin={isAdmin} onAuthChange={checkStatus} />;
}
