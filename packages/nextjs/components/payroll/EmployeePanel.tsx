"use client";

import { formatEther } from "viem";
import { useEmployeeSalary } from "~~/hooks/payroll/useEmployeeSalary";

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

  return (
    <div className="space-y-6">
      {/* ── Your encrypted salary ──────────────────────────────────────── */}
      <div className="card bg-base-100 shadow-lg">
        <div className="card-body gap-3">
          <h2 className="card-title">Your encrypted salary</h2>

          {isLoadingHandle ? (
            <span className="loading loading-dots loading-sm" />
          ) : !encryptedHandle ? (
            <p className="text-base-content/60">No salary has been set for your address yet.</p>
          ) : (
            <>
              <div>
                <span className="badge badge-outline font-mono text-xs">
                  {truncateHandle(encryptedHandle)}
                </span>
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
                  <p className="text-3xl font-bold font-mono tabular-nums">
                    {parseFloat(formatEther(decryptedAmountWei)).toFixed(4)} ETH
                  </p>
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

      {/* ── Claim your salary ──────────────────────────────────────────── */}
      <div className="card bg-base-100 shadow-lg">
        <div className="card-body gap-3">
          <h2 className="card-title">Claim your salary</h2>

          <p className="text-sm text-base-content/70">
            Initiate a claim. Anyone holding the relayer&apos;s decryption proof can finalize the payment in the next
            step.
          </p>

          {claimStage === "idle" && (
            <button
              className="btn btn-primary w-full"
              onClick={requestClaim}
              disabled={!encryptedHandle}
            >
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
              <button
                className="btn btn-success w-full"
                onClick={finalizeClaim}
                disabled={isFinalizing}
              >
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
            <div role="alert" className="alert alert-success">
              <div>
                <p className="font-bold text-lg">
                  Paid! You received {parseFloat(formatEther(lastPaidAmountWei)).toFixed(4)} ETH.
                </p>
                <p>Your salary has been reset to zero.</p>
                <p className="text-sm opacity-70 mt-1">Your employer can set a new salary at any time.</p>
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
