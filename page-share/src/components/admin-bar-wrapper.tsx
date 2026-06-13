"use client";

import { useEffect, useState } from "react";
import AdminBar from "./admin-bar";

export default function AdminBarWrapper() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/admin/status")
      .then((r) => r.json())
      .then((d) => { setIsAdmin(d.isAdmin ?? false); setLoaded(true); })
      .catch(() => setLoaded(true));
  }, []);

  if (!loaded) return null;
  return <AdminBar isAdmin={isAdmin} />;
}
