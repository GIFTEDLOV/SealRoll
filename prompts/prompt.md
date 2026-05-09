Two small edits to packages/foundry/src/ConfidentialPayroll.sol:

1. Remove the onlyEmployer modifier from fulfillClaim. Security is FHE.checkSignatures, not msg.sender. Anyone with a valid relayer proof must be able to call it.

2. Add employee enumeration so the frontend can list employees on-chain.

State to add:
- mapping(address => bool) public isEmployee
- address[] private _employees
- mapping(address => uint256) private _employeeIndex  (for O(1) swap-pop)

Events to add:
- EmployeeAdded(address indexed employee)
- EmployeeRemoved(address indexed employee)

Inside setSalary, AFTER the FHE.allow lines, before emit SalaryUpdated:
  if (!isEmployee[employee]) {
      isEmployee[employee] = true;
      _employeeIndex[employee] = _employees.length;
      _employees.push(employee);
      emit EmployeeAdded(employee);
  }

Replace _removeEmployee body with:
  if (isEmployee[employee]) {
      isEmployee[employee] = false;
      uint256 idx = _employeeIndex[employee];
      uint256 last = _employees.length - 1;
      if (idx != last) {
          address moved = _employees[last];
          _employees[idx] = moved;
          _employeeIndex[moved] = idx;
      }
      _employees.pop();
      delete _employeeIndex[employee];
      emit EmployeeRemoved(employee);
  }
  _salaries[employee] = euint64.wrap(bytes32(0));

Views to add:
- getEmployees() external view returns (address[] memory) { return _employees; }
- getEmployeeCount() external view returns (uint256) { return _employees.length; }

Then run pnpm contracts:build and report:
- The new full signature line of fulfillClaim (one line, to confirm onlyEmployer is gone)
- The build result
- A diff of what changed

Do not deploy. Stop after build.