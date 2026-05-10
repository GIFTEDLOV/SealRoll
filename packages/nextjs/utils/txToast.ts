"use client";

import { toast } from "sonner";

const SEPOLIA_TX_BASE = "https://sepolia.etherscan.io/tx/";

type TxStage = "pending" | "success" | "error";

interface ShowTxToastArgs {
  toastId: string | number;
  stage: TxStage;
  title: string;
  description?: string;
  txHash?: `0x${string}`;
  errorMessage?: string;
}

/** Fire / update a transaction toast. Reuse the same toastId across stages so the toast updates in place. */
export function showTxToast({ toastId, stage, title, description, txHash, errorMessage }: ShowTxToastArgs) {
  const action = txHash
    ? {
        label: "View on Etherscan",
        onClick: () => window.open(`${SEPOLIA_TX_BASE}${txHash}`, "_blank", "noopener"),
      }
    : undefined;

  if (stage === "pending") {
    toast.loading(title, { id: toastId, description, action });
  } else if (stage === "success") {
    toast.success(title, { id: toastId, description, action });
  } else {
    toast.error(title, { id: toastId, description: errorMessage ?? description, action });
  }
}

/** Convenience: full pending → resolve flow. Pass a label and an async function that returns a tx hash. */
export async function withTxToast<T extends `0x${string}` | { txHash: `0x${string}` } | { hash: `0x${string}` }>(
  label: string,
  pendingDescription: string,
  successTitle: string,
  fn: () => Promise<T>,
): Promise<T> {
  const id = crypto.randomUUID();
  showTxToast({ toastId: id, stage: "pending", title: label, description: pendingDescription });
  try {
    const result = await fn();
    let hash: `0x${string}` | undefined;
    if (typeof result === "string") hash = result;
    else if ("txHash" in (result as object)) hash = (result as { txHash: `0x${string}` }).txHash;
    else if ("hash" in (result as object)) hash = (result as { hash: `0x${string}` }).hash;
    showTxToast({ toastId: id, stage: "success", title: successTitle, description: hash ? "Confirmed on Sepolia" : undefined, txHash: hash });
    return result;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    showTxToast({ toastId: id, stage: "error", title: `${label} failed`, errorMessage: msg.slice(0, 160) });
    throw e;
  }
}
