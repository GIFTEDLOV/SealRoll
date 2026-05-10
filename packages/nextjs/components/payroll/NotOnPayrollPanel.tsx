export function NotOnPayrollPanel() {
  return (
    <div className="card bg-base-200 border border-base-300 hover:border-primary/40 transition-colors duration-200">
      <div className="card-body">
        <h2 className="card-title text-primary">Not on this payroll</h2>
        <p className="text-base-content/70">
          Connect an Employee wallet, or ask the Employer to enrol this wallet on the payroll.
        </p>
      </div>
    </div>
  );
}
