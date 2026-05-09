"use client";

import { useAccount, useReadContract } from "wagmi";
import { ConfidentialPayroll } from "~~/contracts/ConfidentialPayroll";
import { deploymentFor } from "~~/utils/contract";

const PAYROLL = deploymentFor(ConfidentialPayroll, 11155111);

export type PayrollRole = "employer" | "employee" | "none" | "disconnected";

export interface UsePayrollRoleResult {
  role: PayrollRole;
  connectedAddress: `0x${string}` | undefined;
  employerAddress: `0x${string}` | undefined;
  isLoading: boolean;
}

export function usePayrollRole(): UsePayrollRoleResult {
  const { address: connectedAddress, isConnected } = useAccount();
  const hasDeployment = Boolean(PAYROLL?.address);
  const canQuery = isConnected && hasDeployment;

  const { data: employerAddress, isLoading: isLoadingEmployer } = useReadContract({
    address: hasDeployment ? PAYROLL!.address : undefined,
    abi: hasDeployment ? PAYROLL!.abi : undefined,
    functionName: "employer" as const,
    chainId: 11155111,
    query: { enabled: canQuery },
  });

  const { data: isEmployeeOnChain, isLoading: isLoadingEmployee } = useReadContract({
    address: hasDeployment ? PAYROLL!.address : undefined,
    abi: hasDeployment ? PAYROLL!.abi : undefined,
    functionName: "isEmployee" as const,
    args: [(connectedAddress ?? "0x0000000000000000000000000000000000000000") as `0x${string}`],
    chainId: 11155111,
    query: { enabled: canQuery && !!connectedAddress },
  });

  const isLoading = canQuery && (isLoadingEmployer || isLoadingEmployee);

  let role: PayrollRole;
  if (!isConnected || !connectedAddress) {
    role = "disconnected";
  } else if (employerAddress && connectedAddress.toLowerCase() === (employerAddress as string).toLowerCase()) {
    role = "employer";
  } else if (isEmployeeOnChain === true) {
    role = "employee";
  } else {
    role = "none";
  }

  return {
    role,
    connectedAddress,
    employerAddress: employerAddress as `0x${string}` | undefined,
    isLoading,
  };
}
