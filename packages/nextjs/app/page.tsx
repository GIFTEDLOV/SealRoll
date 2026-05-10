"use client";

import { useEffect, useState } from "react";
import { LandingPage } from "~~/components/landing/LandingPage";
import { EmployeePanel } from "~~/components/payroll/EmployeePanel";
import { EmployerPanel } from "~~/components/payroll/EmployerPanel";
import { NotOnPayrollPanel } from "~~/components/payroll/NotOnPayrollPanel";
import { usePayrollRole } from "~~/hooks/payroll/usePayrollRole";

const ROLE_LABELS: Record<string, { badge: string; heading: string }> = {
  employer: { badge: "Connected as Employer", heading: "Employer Dashboard" },
  employee: { badge: "Connected as Employee", heading: "Employee Dashboard" },
  none: { badge: "Wallet connected", heading: "Not on payroll" },
};

export default function Home() {
  const { role, isLoading } = usePayrollRole();
  const [initBannerVisible, setInitBannerVisible] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setInitBannerVisible(false), 12_000);
    return () => clearTimeout(t);
  }, []);

  if (role === "disconnected") {
    return <LandingPage />;
  }

  const meta = role ? ROLE_LABELS[role] : null;

  return (
    <div className="flex flex-col items-center w-full px-3 md:px-0">
      {initBannerVisible && (
        <div className="max-w-2xl w-full mx-auto px-4 pt-4">
          <div role="alert" className="alert alert-warning text-sm">
            <span className="loading loading-spinner loading-xs" />
            <span>Initialising encryption engine — this takes about 10 seconds on first load. Please wait before submitting transactions.</span>
          </div>
        </div>
      )}
      <div className="max-w-2xl w-full mx-auto">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <span className="loading loading-spinner loading-lg" />
          </div>
        ) : (
          <>
            {meta && role !== "none" && (
              <div className="py-8 px-4">
                <span className="badge badge-outline gap-2 mb-3">{meta.badge}</span>
                <h2 className="text-2xl font-bold">{meta.heading}</h2>
              </div>
            )}

            <div className="px-4 pb-12 space-y-6">
              {role === "employer" ? (
                <EmployerPanel />
              ) : role === "employee" ? (
                <EmployeePanel />
              ) : (
                <NotOnPayrollPanel />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
