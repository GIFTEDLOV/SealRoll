"use client";

import { useEffect, useState } from "react";
import { formatEther, parseEther } from "viem";
import { useConfidentialPayroll } from "~~/hooks/payroll/useConfidentialPayroll";
import { withTxToast } from "~~/utils/txToast";

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;
const MAX_EUINT64_WEI = 18_446_744_073_709_551_615n;

function truncate(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function EmployerPanel() {
  const {
    treasuryBalance,
    employees,
    employeeCount,
    isLoadingReads,
    fundTreasury,
    setSalary,
    removeEmployee,
    withdrawTreasury,
    isFunding,
    isSettingSalary,
    isRemoving,
    isWithdrawing,
    lastError,
  } = useConfidentialPayroll();

  // ── Treasury inline-form state ────────────────────────────────────────────
  const [fundOpen, setFundOpen] = useState(false);
  const [fundAmount, setFundAmount] = useState("");
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");

  // ── Add/update employee state ─────────────────────────────────────────────
  const [empAddress, setEmpAddress] = useState("");
  const [empSalary, setEmpSalary] = useState("");
  const [salaryError, setSalaryError] = useState<string | null>(null);
  const [salarySuccess, setSalarySuccess] = useState<string | null>(null);

  // Auto-dismiss success alert after 5 s
  useEffect(() => {
    if (!salarySuccess) return;
    const t = setTimeout(() => setSalarySuccess(null), 5_000);
    return () => clearTimeout(t);
  }, [salarySuccess]);

  // ── Remove-row tracking ───────────────────────────────────────────────────
  const [removingRow, setRemovingRow] = useState<string | null>(null);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleFund = async () => {
    try {
      await withTxToast("Funding treasury", `Sending ${fundAmount} ETH to the contract`, "Treasury funded", () => fundTreasury(fundAmount));
      setFundAmount("");
      setFundOpen(false);
    } catch {
      /* lastError is set inside the hook */
    }
  };

  const handleWithdraw = async () => {
    try {
      await withTxToast("Withdrawing", `Withdrawing ${withdrawAmount} ETH from treasury`, "Withdrawal complete", () => withdrawTreasury(withdrawAmount));
      setWithdrawAmount("");
      setWithdrawOpen(false);
    } catch {
      /* lastError is set inside the hook */
    }
  };

  const handleSetSalary = async () => {
    setSalaryError(null);
    setSalarySuccess(null);

    if (!ADDRESS_RE.test(empAddress)) {
      setSalaryError("Invalid address — must be 0x followed by 40 hex characters.");
      return;
    }

    let salaryWei: bigint;
    try {
      salaryWei = parseEther(empSalary);
    } catch {
      setSalaryError("Invalid ETH amount.");
      return;
    }
    if (salaryWei <= 0n) {
      setSalaryError("Salary must be greater than zero.");
      return;
    }
    if (salaryWei > MAX_EUINT64_WEI) {
      setSalaryError("Salary exceeds euint64 maximum (~18.446 ETH). Use a smaller value.");
      return;
    }

    try {
      await withTxToast("Setting salary", "Encrypting salary and submitting on-chain", "Salary set", () => setSalary(empAddress, empSalary));
      setSalarySuccess(`Salary set for ${empAddress}`);
      setEmpAddress("");
      setEmpSalary("");
    } catch (e) {
      setSalaryError(e instanceof Error ? e.message : String(e));
    }
  };

  const handleRemove = async (addr: string) => {
    setRemovingRow(addr);
    try {
      await withTxToast("Removing employee", "Submitting removal on-chain", "Employee removed", () => removeEmployee(addr));
    } finally {
      setRemovingRow(null);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4 md:space-y-5">
      {/* ── Treasury card ──────────────────────────────────────────────── */}
      <div className="card bg-base-200 border border-base-300 hover:border-primary/40 transition-colors duration-200">
        <div className="card-body gap-4">
          <div className="flex items-center justify-between">
            <h2 className="card-title text-base font-medium uppercase tracking-wider text-base-content/60 m-0">
              Treasury balance
            </h2>
            <span className="text-xs text-base-content/40">Sepolia ETH</span>
          </div>

          <p className="text-5xl md:text-6xl font-bold font-mono tabular-nums tracking-tight">
            {isLoadingReads ? (
              <span className="loading loading-dots loading-sm" />
            ) : (
              <>
                <span>{parseFloat(formatEther(treasuryBalance)).toFixed(4)}</span>
                <span className="text-2xl ml-2 text-base-content/50 font-normal">ETH</span>
              </>
            )}
          </p>

          {lastError && (
            <div role="alert" className="alert alert-error text-sm">
              <span>{lastError.message}</span>
            </div>
          )}

          <div className="flex gap-2 flex-wrap">
            <button
              className="btn btn-sm btn-primary"
              onClick={() => {
                setFundOpen(o => !o);
                setWithdrawOpen(false);
              }}
            >
              Fund treasury
            </button>
            <button
              className="btn btn-sm btn-ghost border border-base-300"
              onClick={() => {
                setWithdrawOpen(o => !o);
                setFundOpen(false);
              }}
            >
              Withdraw
            </button>
          </div>

          {fundOpen && (
            <div className="bg-base-300/50 rounded-lg p-3 flex gap-2 items-center flex-wrap">
              <input
                className="input input-bordered input-sm w-36"
                placeholder="0.1 ETH"
                value={fundAmount}
                onChange={e => setFundAmount(e.target.value)}
              />
              <button
                className="btn btn-sm btn-primary"
                onClick={handleFund}
                disabled={isFunding || !fundAmount.trim()}
              >
                {isFunding ? <span className="loading loading-spinner loading-xs" /> : "Confirm"}
              </button>
              <button
                className="btn btn-sm btn-ghost"
                onClick={() => {
                  setFundOpen(false);
                  setFundAmount("");
                }}
              >
                Cancel
              </button>
            </div>
          )}

          {withdrawOpen && (
            <div className="bg-base-300/50 rounded-lg p-3 flex gap-2 items-center flex-wrap">
              <input
                className="input input-bordered input-sm w-36"
                placeholder="0.1 ETH"
                value={withdrawAmount}
                onChange={e => setWithdrawAmount(e.target.value)}
              />
              <button
                className="btn btn-sm btn-primary"
                onClick={handleWithdraw}
                disabled={isWithdrawing || !withdrawAmount.trim()}
              >
                {isWithdrawing ? <span className="loading loading-spinner loading-xs" /> : "Confirm"}
              </button>
              <button
                className="btn btn-sm btn-ghost"
                onClick={() => {
                  setWithdrawOpen(false);
                  setWithdrawAmount("");
                }}
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Add / update employee card ─────────────────────────────────── */}
      <div className="card bg-base-200 border border-base-300 hover:border-primary/40 transition-colors duration-200">
        <div className="card-body gap-4">
          <div className="flex items-center justify-between">
            <h2 className="card-title text-base font-medium uppercase tracking-wider text-base-content/60 m-0">
              Add or update employee
            </h2>
            <span className="text-xs text-base-content/40">Salary is encrypted in your browser</span>
          </div>

          {salaryError && (
            <div role="alert" className="alert alert-error text-sm">
              <span>{salaryError}</span>
            </div>
          )}
          {salarySuccess && (
            <div role="alert" className="alert alert-success text-sm">
              <span>{salarySuccess}</span>
            </div>
          )}

          <div className="form-control gap-1">
            <label className="text-xs uppercase tracking-wider text-base-content/50">Employee address</label>
            <input
              className="input input-bordered input-md font-mono w-full"
              placeholder="0x… employee address"
              value={empAddress}
              onChange={e => {
                setEmpAddress(e.target.value);
                setSalaryError(null);
                setSalarySuccess(null);
              }}
            />
          </div>
          <div className="form-control gap-1">
            <label className="text-xs uppercase tracking-wider text-base-content/50">Salary (ETH)</label>
            <input
              type="text"
              className="input input-bordered input-md w-full"
              placeholder="Salary in ETH (e.g. 0.05)"
              value={empSalary}
              onChange={e => {
                setEmpSalary(e.target.value);
                setSalaryError(null);
                setSalarySuccess(null);
              }}
            />
          </div>
          <button
            className="btn btn-primary w-full mt-2"
            onClick={handleSetSalary}
            disabled={isSettingSalary || !empAddress.trim() || !empSalary.trim()}
          >
            {isSettingSalary ? (
              <>
                <span className="loading loading-spinner loading-xs" />
                Encrypting and signing…
              </>
            ) : (
              "Set salary"
            )}
          </button>
        </div>
      </div>

      {/* ── Employees table card ───────────────────────────────────────── */}
      <div className="card bg-base-200 border border-base-300 hover:border-primary/40 transition-colors duration-200">
        <div className="card-body gap-4">
          <div className="flex items-center justify-between">
            <h2 className="card-title text-base font-medium uppercase tracking-wider text-base-content/60 m-0">
              Employees
            </h2>
            <span className="badge badge-primary badge-sm">{employeeCount} active</span>
          </div>

          {employees.length === 0 ? (
            <div className="text-center py-8 text-base-content/50">
              <h3 className="text-base">No employees yet</h3>
              <p className="text-sm mt-1">Add one above to start paying</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th className="text-xs uppercase tracking-wider text-base-content/60">#</th>
                    <th className="text-xs uppercase tracking-wider text-base-content/60">Address</th>
                    <th className="text-xs uppercase tracking-wider text-base-content/60">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((addr, i) => (
                    <tr key={addr}>
                      <td className="tabular-nums">{i + 1}</td>
                      <td>
                        <span
                          className="tooltip cursor-pointer"
                          data-tip={addr}
                          onClick={() => navigator.clipboard.writeText(addr)}
                          title="Click to copy"
                        >
                          <code className="font-mono text-sm">{truncate(addr)}</code>
                          <span className="badge badge-ghost badge-xs ml-2">🔒 Encrypted</span>
                        </span>
                      </td>
                      <td>
                        <button
                          className="btn btn-xs btn-ghost text-error hover:bg-error/10"
                          onClick={() => handleRemove(addr)}
                          disabled={isRemoving && removingRow === addr}
                        >
                          {isRemoving && removingRow === addr ? (
                            <span className="loading loading-spinner loading-xs" />
                          ) : (
                            "Remove"
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
