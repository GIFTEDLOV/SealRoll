"use client";

import { useCallback, useState } from "react";
import { bytesToHex, parseEther } from "viem";
import { useAccount, usePublicClient, useReadContract, useSendTransaction, useWriteContract } from "wagmi";
import { useEncrypt } from "@zama-fhe/react-sdk";
import { ConfidentialPayroll } from "~~/contracts/ConfidentialPayroll";
import { deploymentFor } from "~~/utils/contract";

const PAYROLL = deploymentFor(ConfidentialPayroll, 11155111)!;
const CHAIN_ID = 11155111 as const;

const QUERY_OPTS = {
  enabled: Boolean(PAYROLL?.address),
  refetchInterval: 5_000,
} as const;

export function useConfidentialPayroll() {
  const { address: userAddress } = useAccount();
  const publicClient = usePublicClient({ chainId: CHAIN_ID });
  const encrypt = useEncrypt();
  const { writeContractAsync } = useWriteContract();
  const { sendTransactionAsync } = useSendTransaction();

  const [isFunding, setIsFunding] = useState(false);
  const [isSettingSalary, setIsSettingSalary] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [lastError, setLastError] = useState<Error | null>(null);

  const { data: rawTreasury, isLoading: isLoadingTreasury, refetch: refetchTreasury } = useReadContract({
    address: PAYROLL?.address,
    abi: PAYROLL?.abi,
    functionName: "treasuryBalance" as const,
    chainId: CHAIN_ID,
    query: QUERY_OPTS,
  });

  const { data: rawEmployees, isLoading: isLoadingEmployees, refetch: refetchEmployees } = useReadContract({
    address: PAYROLL?.address,
    abi: PAYROLL?.abi,
    functionName: "getEmployees" as const,
    chainId: CHAIN_ID,
    query: QUERY_OPTS,
  });

  const refetchAll = useCallback(async () => {
    await Promise.all([refetchTreasury(), refetchEmployees()]);
  }, [refetchTreasury, refetchEmployees]);

  const waitForTx = useCallback(
    async (hash: `0x${string}`) => {
      if (!publicClient) throw new Error("Public client unavailable");
      await publicClient.waitForTransactionReceipt({ hash });
    },
    [publicClient],
  );

  const fundTreasury = useCallback(
    async (amountEth: string): Promise<`0x${string}`> => {
      setIsFunding(true);
      setLastError(null);
      try {
        const hash = await sendTransactionAsync({
          to: PAYROLL.address,
          value: parseEther(amountEth),
        });
        await waitForTx(hash);
        await refetchAll();
        return hash;
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        setLastError(err);
        throw err;
      } finally {
        setIsFunding(false);
      }
    },
    [sendTransactionAsync, waitForTx, refetchAll],
  );

  const setSalary = useCallback(
    async (employee: string, amountEth: string): Promise<`0x${string}`> => {
      if (!userAddress) throw new Error("Wallet not connected");
      setIsSettingSalary(true);
      setLastError(null);
      try {
        const salaryWei = parseEther(amountEth);
        const enc = await encrypt.mutateAsync({
          values: [{ value: salaryWei, type: "euint64" as const }],
          contractAddress: PAYROLL.address,
          userAddress,
        });
        const hash = await writeContractAsync({
          address: PAYROLL.address,
          abi: PAYROLL.abi,
          functionName: "setSalary" as const,
          args: [employee as `0x${string}`, bytesToHex(enc.handles[0]!), bytesToHex(enc.inputProof)],
          chainId: CHAIN_ID,
          gas: 15_000_000n,
        });
        await waitForTx(hash);
        await refetchAll();
        return hash;
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        setLastError(err);
        throw err;
      } finally {
        setIsSettingSalary(false);
      }
    },
    [userAddress, encrypt, writeContractAsync, waitForTx, refetchAll],
  );

  const removeEmployee = useCallback(
    async (employee: string): Promise<`0x${string}`> => {
      setIsRemoving(true);
      setLastError(null);
      try {
        const hash = await writeContractAsync({
          address: PAYROLL.address,
          abi: PAYROLL.abi,
          functionName: "removeEmployee" as const,
          args: [employee as `0x${string}`],
          chainId: CHAIN_ID,
        });
        await waitForTx(hash);
        await refetchAll();
        return hash;
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        setLastError(err);
        throw err;
      } finally {
        setIsRemoving(false);
      }
    },
    [writeContractAsync, waitForTx, refetchAll],
  );

  const withdrawTreasury = useCallback(
    async (amountEth: string): Promise<`0x${string}`> => {
      setIsWithdrawing(true);
      setLastError(null);
      try {
        const hash = await writeContractAsync({
          address: PAYROLL.address,
          abi: PAYROLL.abi,
          functionName: "withdrawTreasury" as const,
          args: [parseEther(amountEth)],
          chainId: CHAIN_ID,
        });
        await waitForTx(hash);
        await refetchAll();
        return hash;
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        setLastError(err);
        throw err;
      } finally {
        setIsWithdrawing(false);
      }
    },
    [writeContractAsync, waitForTx, refetchAll],
  );

  const employees = (rawEmployees as `0x${string}`[] | undefined) ?? [];

  return {
    treasuryBalance: (rawTreasury as bigint | undefined) ?? 0n,
    employees,
    employeeCount: employees.length,
    isLoadingReads: isLoadingTreasury || isLoadingEmployees,
    fundTreasury,
    setSalary,
    removeEmployee,
    withdrawTreasury,
    isFunding,
    isSettingSalary,
    isRemoving,
    isWithdrawing,
    lastError,
  };
}
