"use client";

import { formatEther } from "viem";
import { useEmployeeSalary } from "~~/hooks/payroll/useEmployeeSalary";
import { withTxToast } from "~~/utils/txToast";

function truncateHandle(handle: string) {
  return `${handle.slice(0, 6)}…${handle.slice(-4)}`;
}

export function EmployeePanel() {
  const {
    encryptedHandle,
    isLoadingHandle,
    decryptedAmountWei,
    isDecrypting,
    decryptError,
    decrypt,
    isAllowed,
    registerKeypair,
    requestClaim,
    claimError,
    lastRequestId,
    finalizeClaim,
    isFinalizing,
    finalizeError,
    lastPaidAmountWei,
    claimStage,
  } = useEmployeeSalary();

  const onRequestClaim = async () => {
    try {
      await withTxToast("Requesting claim", "Submitting requestClaim transaction", "Claim requested", () => requestClaim());
    } catch { /* hook surfaces claimError */ }
  };
  const onFinalizeClaim = async () => {
    try {
      await withTxToast("Finalizing payment", "Fetching KMS proof and submitting fulfillClaim", "Payment received", () => finalizeClaim());
    } catch { /* hook surfaces finalizeError */ }
  };

  return (
    <div className="space-y-4 md:space-y-5">
      {/* ── Your encrypted salary ──────────────────────────────────────── */}
      <div className="card bg-base-200 border border-base-300 hover:border-primary/40 transition-colors duration-200">
        <div className="card-body gap-3">
          <div className="flex items-center justify-between">
            <h2 className="card-title text-base font-semibold uppercase tracking-wider text-base-content/60 m-0">
              Your encrypted salary
            </h2>
            {!encryptedHandle ? (
              <span className="badge badge-ghost badge-sm">Inactive</span>
            ) : decryptedAmountWei !== undefined ? (
              <span className="badge badge-success badge-sm">Decrypted</span>
            ) : (
              <span className="badge badge-warning badge-sm gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-warning-content animate-pulse" />
                Encrypted
              </span>
            )}
          </div>

          {isLoadingHandle ? (
            <span className="loading loading-dots loading-sm" />
          ) : !encryptedHandle ? (
            <p className="text-base text-base-content/70">No salary has been set for your address yet.</p>
          ) : (
            <>
              <div className="bg-base-300/50 rounded-lg p-3">
                <div className="text-xs uppercase tracking-wider text-base-content/50 mb-1">
                  🔒 Encrypted handle (only you can decrypt)
                </div>
                <code className="font-mono text-base font-semibold">{truncateHandle(encryptedHandle)}</code>
              </div>

              {!isAllowed ? (
                <div className="space-y-2">
                  <button className="btn btn-primary btn-sm" onClick={registerKeypair}>
                    Register encryption keypair
                  </button>
                  <p className="text-xs text-base-content/60">
                    Sign once to allow your wallet to decrypt salaries assigned to you. This is free and takes a few
                    seconds.
                  </p>
                </div>
              ) : decryptedAmountWei === undefined ? (
                <button className="btn btn-primary btn-sm" onClick={decrypt} disabled={isDecrypting}>
                  {isDecrypting ? (
                    <>
                      <span className="loading loading-spinner loading-xs" />
                      Decrypting…
                    </>
                  ) : (
                    "Decrypt my salary"
                  )}
                </button>
              ) : (
                <div className="space-y-2">
                  <p className="text-5xl md:text-6xl font-bold font-mono tabular-nums text-primary tracking-tight">
                    {parseFloat(formatEther(decryptedAmountWei)).toFixed(4)}
                    <span className="text-xl ml-2 text-base-content/50 font-normal">ETH</span>
                  </p>
                  <p className="text-xs text-base-content/50 mt-1">✓ Decrypted in your browser</p>
                  <button className="btn btn-sm btn-outline" onClick={decrypt} disabled={isDecrypting}>
                    {isDecrypting ? (
                      <>
                        <span className="loading loading-spinner loading-xs" />
                        Refreshing…
                      </>
                    ) : (
                      "Refresh"
                    )}
                  </button>
                </div>
              )}
            </>
          )}

          {decryptError && (
            <div role="alert" className="alert alert-error text-sm">
              <span>{decryptError.message}</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Claim your payment ─────────────────────────────────────────── */}
      <div className="card bg-base-200 border border-base-300 hover:border-primary/40 transition-colors duration-200">
        <div className="card-body gap-3">
          <div className="flex items-center justify-between">
            <h2 className="card-title text-base font-semibold uppercase tracking-wider text-base-content/60 m-0">
              Claim your payment
            </h2>
            {claimStage === "idle" && <span className="badge badge-ghost badge-sm">Ready</span>}
            {claimStage === "requesting" && <span className="badge badge-info badge-sm">Step 1/2</span>}
            {claimStage === "pending" && <span className="badge badge-warning badge-sm">Awaiting finalize</span>}
            {claimStage === "finalizing" && <span className="badge badge-info badge-sm">Step 2/2</span>}
            {claimStage === "done" && <span className="badge badge-success badge-sm">Paid</span>}
          </div>

          <p className="text-sm text-base-content/70">
            Start a claim to begin the payment. The decryption proof is fetched in the next step, and your ETH
            transfers automatically once the contract verifies it.
          </p>

          {claimStage === "idle" && (
            <button className="btn btn-primary w-full" onClick={onRequestClaim} disabled={!encryptedHandle}>
              Request claim
            </button>
          )}

          {claimStage === "requesting" && (
            <button className="btn btn-primary w-full" disabled>
              <span className="loading loading-spinner loading-xs" />
              Requesting…
            </button>
          )}

          {claimStage === "pending" && (
            <div className="space-y-3">
              <div role="alert" className="alert alert-info text-sm">
                <span>
                  Claim requested (ID: {lastRequestId?.toString()}). Click below to fetch the decryption proof and
                  finalize payment. This contacts Zama&apos;s KMS relayer and may take 30–60 seconds.
                </span>
              </div>
              <button className="btn btn-success w-full" onClick={onFinalizeClaim} disabled={isFinalizing}>
                Finalize claim &amp; receive payment
              </button>
            </div>
          )}

          {claimStage === "finalizing" && (
            <button className="btn btn-success w-full" disabled>
              <span className="loading loading-spinner loading-xs" />
              Fetching decryption proof and finalizing… (may take up to 60 seconds)
            </button>
          )}

          {claimStage === "done" && lastPaidAmountWei !== undefined && (
            <div className="rounded-lg bg-success/10 border border-success/30 p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-success/20 flex items-center justify-center text-success text-2xl shrink-0">
                  ✓
                </div>
                <div>
                  <p className="font-bold text-xl m-0">Payment received</p>
                  <p className="m-0 mt-1">
                    <span className="text-3xl font-bold font-mono tabular-nums text-success">
                      {parseFloat(formatEther(lastPaidAmountWei)).toFixed(4)}
                    </span>{" "}
                    <span className="text-base text-base-content/50">ETH</span>
                  </p>
                  <p className="text-sm text-base-content/60 mt-2 m-0">
                    Your salary handle has been reset. Your employer can set a new amount any time.
                  </p>
                </div>
              </div>
            </div>
          )}

          {claimError && (
            <div role="alert" className="alert alert-error text-sm">
              <span>{claimError.message}</span>
            </div>
          )}

          {finalizeError && (
            <div role="alert" className="alert alert-error text-sm">
              <span>{finalizeError.message}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
