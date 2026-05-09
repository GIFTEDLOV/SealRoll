"use client";

import { useEffect, useState } from "react";
import { formatEther, parseEther } from "viem";
import { useConfidentialPayroll } from "~~/hooks/payroll/useConfidentialPayroll";

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
      await fundTreasury(fundAmount);
      setFundAmount("");
      setFundOpen(false);
    } catch {
      /* lastError is set inside the hook */
    }
  };

  const handleWithdraw = async () => {
    try {
      await withdrawTreasury(withdrawAmount);
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
      await setSalary(empAddress, empSalary);
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
      await removeEmployee(addr);
    } finally {
      setRemovingRow(null);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* ── Treasury card ──────────────────────────────────────────────── */}
      <div className="card bg-base-100 shadow-lg">
        <div className="card-body gap-3">
          <h2 className="card-title">Treasury</h2>

          <p className="text-4xl font-bold font-mono tabular-nums">
            {isLoadingReads ? (
              <span className="loading loading-dots loading-sm" />
            ) : (
              `${parseFloat(formatEther(treasuryBalance)).toFixed(4)} ETH`
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
              className="btn btn-sm btn-outline"
              onClick={() => {
                setWithdrawOpen(o => !o);
                setFundOpen(false);
              }}
            >
              Withdraw
            </button>
          </div>

          {fundOpen && (
            <div className="flex gap-2 items-center flex-wrap">
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
            <div className="flex gap-2 items-center flex-wrap">
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
      <div className="card bg-base-100 shadow-lg">
        <div className="card-body gap-3">
          <h2 className="card-title">Add or update employee</h2>

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

          <input
            className="input input-bordered font-mono w-full"
            placeholder="0x… employee address"
            value={empAddress}
            onChange={e => {
              setEmpAddress(e.target.value);
              setSalaryError(null);
              setSalarySuccess(null);
            }}
          />
          <input
            type="text"
            className="input input-bordered w-full"
            placeholder="Salary in ETH (e.g. 0.05)"
            value={empSalary}
            onChange={e => {
              setEmpSalary(e.target.value);
              setSalaryError(null);
              setSalarySuccess(null);
            }}
          />
          <button
            className="btn btn-primary w-full"
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
      <div className="card bg-base-100 shadow-lg">
        <div className="card-body gap-3">
          <h2 className="card-title">Employees ({employeeCount})</h2>

          {employees.length === 0 ? (
            <p className="text-base-content/60">No employees yet. Add one above.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="table table-zebra">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Address</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((addr, i) => (
                    <tr key={addr}>
                      <td className="tabular-nums">{i + 1}</td>
                      <td>
                        <span
                          className="tooltip cursor-pointer font-mono text-sm"
                          data-tip={addr}
                          onClick={() => navigator.clipboard.writeText(addr)}
                          title="Click to copy"
                        >
                          {truncate(addr)}
                        </span>
                      </td>
                      <td>
                        <button
                          className="btn btn-xs btn-error btn-outline"
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
