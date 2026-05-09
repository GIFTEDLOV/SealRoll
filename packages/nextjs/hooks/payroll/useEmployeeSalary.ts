"use client";

import { useCallback, useMemo, useState } from "react";
import { decodeEventLog } from "viem";
import { useAccount, usePublicClient, useReadContract, useWriteContract } from "wagmi";
import { useAllow, useIsAllowed, usePublicDecrypt, useUserDecrypt } from "@zama-fhe/react-sdk";
import { ZERO_HANDLE } from "@zama-fhe/sdk";
import { ConfidentialPayroll } from "~~/contracts/ConfidentialPayroll";
import { deploymentFor } from "~~/utils/contract";

const PAYROLL = deploymentFor(ConfidentialPayroll, 11155111)!;
const CHAIN_ID = 11155111 as const;

export function useEmployeeSalary() {
  const { address: connectedAddress } = useAccount();
  const publicClient = usePublicClient({ chainId: CHAIN_ID });
  const { writeContractAsync } = useWriteContract();

  // ── Salary handle ────────────────────────────────────────────────────────
  const { data: rawHandle, isLoading: isLoadingHandle, refetch: refetchHandle } = useReadContract({
    address: PAYROLL?.address,
    abi: PAYROLL?.abi,
    functionName: "getSalary" as const,
    args: [(connectedAddress ?? "0x0000000000000000000000000000000000000000") as `0x${string}`],
    chainId: CHAIN_ID,
    query: {
      enabled: Boolean(PAYROLL?.address) && !!connectedAddress,
      refetchInterval: 5_000,
    },
  });

  const encryptedHandle = rawHandle as `0x${string}` | undefined;
  const hasSalary = Boolean(encryptedHandle && encryptedHandle !== ZERO_HANDLE);

  // ── FHE keypair / ACL ─────────────────────────────────────────────────────
  const { mutateAsync: allowAsync } = useAllow();
  const { data: isAllowedData } = useIsAllowed({
    contractAddresses: [PAYROLL.address as `0x${string}`],
  });
  const isAllowed = isAllowedData === true;

  // ── User decrypt ──────────────────────────────────────────────────────────
  const [decryptEnabled, setDecryptEnabled] = useState(false);

  const handles = useMemo(
    () =>
      hasSalary && encryptedHandle
        ? [{ handle: encryptedHandle, contractAddress: PAYROLL.address as `0x${string}` }]
        : [],
    [hasSalary, encryptedHandle],
  );

  const userDecrypt = useUserDecrypt({ handles }, { enabled: decryptEnabled && isAllowed && handles.length > 0 });

  const decryptedAmountWei = encryptedHandle
    ? (userDecrypt.data?.[encryptedHandle] as bigint | undefined)
    : undefined;

  const decrypt = useCallback(async (): Promise<void> => {
    if (!decryptEnabled) {
      setDecryptEnabled(true);
    } else {
      await userDecrypt.refetch();
    }
  }, [decryptEnabled, userDecrypt]);

  const registerKeypair = useCallback(async (): Promise<void> => {
    await allowAsync([PAYROLL.address as `0x${string}`]);
  }, [allowAsync]);

  // ── Claim flow ────────────────────────────────────────────────────────────
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimError, setClaimError] = useState<Error | null>(null);
  const [lastRequestId, setLastRequestId] = useState<bigint | undefined>();
  const [pendingHandle, setPendingHandle] = useState<`0x${string}` | undefined>();

  const requestClaim = useCallback(async (): Promise<{ requestId: bigint; txHash: `0x${string}` }> => {
    if (!publicClient) throw new Error("Public client unavailable");
    setIsClaiming(true);
    setClaimError(null);
    try {
      const hash = await writeContractAsync({
        address: PAYROLL.address,
        abi: PAYROLL.abi,
        functionName: "requestClaim" as const,
        chainId: CHAIN_ID,
      });
      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      let requestId: bigint | undefined;
      for (const log of receipt.logs) {
        try {
          const decoded = decodeEventLog({
            abi: PAYROLL.abi,
            data: log.data,
            topics: log.topics as [`0x${string}`, ...`0x${string}`[]],
          });
          if (decoded.eventName === "ClaimRequested") {
            requestId = (decoded.args as { requestId: bigint }).requestId;
            break;
          }
        } catch {
          // Not a matching log — try next
        }
      }

      if (requestId === undefined) throw new Error("ClaimRequested event not found in receipt");
      setLastRequestId(requestId);
      setPendingHandle(encryptedHandle);
      await refetchHandle();
      return { requestId, txHash: hash };
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      setClaimError(err);
      throw err;
    } finally {
      setIsClaiming(false);
    }
  }, [writeContractAsync, publicClient, refetchHandle, encryptedHandle]);

  // ── Finalize flow ─────────────────────────────────────────────────────────
  const publicDecrypt = usePublicDecrypt();
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [finalizeError, setFinalizeError] = useState<Error | null>(null);
  const [lastPaidAmountWei, setLastPaidAmountWei] = useState<bigint | undefined>();

  const finalizeClaim = useCallback(async (): Promise<{ txHash: `0x${string}`; amountWei: bigint }> => {
    if (lastRequestId === undefined) throw new Error("No pending request ID");
    if (!pendingHandle) throw new Error("No pending salary handle — requestClaim first");
    if (!publicClient) throw new Error("Public client unavailable");
    setIsFinalizing(true);
    setFinalizeError(null);
    try {
      const result = await publicDecrypt.mutateAsync([pendingHandle]);
      const handlesList: [`0x${string}`] = [pendingHandle];

      const hash = await writeContractAsync({
        address: PAYROLL.address,
        abi: PAYROLL.abi,
        functionName: "fulfillClaim" as const,
        args: [lastRequestId, handlesList, result.abiEncodedClearValues, result.decryptionProof],
        chainId: CHAIN_ID,
      });
      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      let paidAmount: bigint | undefined;
      for (const log of receipt.logs) {
        try {
          const decoded = decodeEventLog({
            abi: PAYROLL.abi,
            data: log.data,
            topics: log.topics as [`0x${string}`, ...`0x${string}`[]],
          });
          if (decoded.eventName === "ClaimPaid") {
            paidAmount = BigInt((decoded.args as { amount: bigint }).amount);
            break;
          }
        } catch {
          // Not a matching log — try next
        }
      }

      if (paidAmount === undefined) throw new Error("ClaimPaid event not found in receipt");
      setLastPaidAmountWei(paidAmount);
      await refetchHandle();
      return { txHash: hash, amountWei: paidAmount };
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      setFinalizeError(err);
      throw err;
    } finally {
      setIsFinalizing(false);
    }
  }, [lastRequestId, pendingHandle, publicClient, publicDecrypt, writeContractAsync, refetchHandle]);

  // ── Derived claim stage ───────────────────────────────────────────────────
  const claimStage: "idle" | "requesting" | "pending" | "finalizing" | "done" = isClaiming
    ? "requesting"
    : isFinalizing
    ? "finalizing"
    : lastPaidAmountWei !== undefined && lastRequestId !== undefined && !hasSalary
    ? "done"
    : lastRequestId !== undefined
    ? "pending"
    : "idle";

  return {
    encryptedHandle: hasSalary ? encryptedHandle : undefined,
    isLoadingHandle,
    decryptedAmountWei,
    isDecrypting: userDecrypt.isFetching,
    decryptError: userDecrypt.error,
    decrypt,
    isAllowed,
    registerKeypair,
    requestClaim,
    isClaiming,
    claimError,
    lastRequestId,
    pendingHandle,
    finalizeClaim,
    isFinalizing,
    finalizeError,
    lastPaidAmountWei,
    claimStage,
  };
}
