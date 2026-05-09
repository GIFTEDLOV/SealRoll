"use client";

import { EmployeePanel } from "~~/components/payroll/EmployeePanel";
import { EmployerPanel } from "~~/components/payroll/EmployerPanel";
import { NotOnPayrollPanel } from "~~/components/payroll/NotOnPayrollPanel";
import { RainbowKitCustomConnectButton } from "~~/components/helper/RainbowKitCustomConnectButton";
import { usePayrollRole } from "~~/hooks/payroll/usePayrollRole";

const CONTRACT_ADDRESS = "0x32B413C9F6F274bA13A7978C467cDb3C2C833ead";
const ETHERSCAN_URL = `https://sepolia.etherscan.io/address/${CONTRACT_ADDRESS}`;

export default function Home() {
  const { role, isLoading } = usePayrollRole();

  return (
    <div className="flex flex-col items-center w-full px-3 md:px-0">
      <div className="max-w-2xl w-full mx-auto p-6 space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold">Confidential Payroll</h1>
          <p className="text-base-content/60 text-sm">
            Encrypted salaries on Ethereum. Powered by Zama fhEVM.
          </p>
          <div>
            <a
              href={ETHERSCAN_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-xs badge badge-ghost"
            >
              {CONTRACT_ADDRESS}
            </a>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <span className="loading loading-spinner loading-lg" />
          </div>
        ) : role === "disconnected" ? (
          <div className="space-y-4">
            <div role="alert" className="alert alert-info">
              <span>Connect your wallet to continue.</span>
            </div>
            <div className="flex justify-center">
              <RainbowKitCustomConnectButton />
            </div>
          </div>
        ) : role === "employer" ? (
          <EmployerPanel />
        ) : role === "employee" ? (
          <EmployeePanel />
        ) : (
          <NotOnPayrollPanel />
        )}
      </div>
    </div>
  );
}
