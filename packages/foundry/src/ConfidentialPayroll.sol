// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {FHE, euint64, externalEuint64} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title ConfidentialPayroll
/// @notice Stores encrypted salaries per employee. Employees request a claim,
///         the KMS decrypts the ciphertext off-chain, and the employer submits
///         the KMS proof on-chain to fulfil the claim and transfer ETH.
contract ConfidentialPayroll is ZamaEthereumConfig {
    address public immutable employer;

    mapping(address => euint64) private _salaries;

    uint256 private _nextRequestId;
    mapping(uint256 => address) private _pendingClaims;
    mapping(uint256 => bool)    private _claimFulfilled;

    mapping(address => bool)    public  isEmployee;
    address[]                   private _employees;
    mapping(address => uint256) private _employeeIndex;

    event SalaryUpdated(address indexed employee);
    event ClaimRequested(address indexed employee, uint256 requestId);
    event ClaimPaid(address indexed employee, uint64 amount);
    event EmployeeAdded(address indexed employee);
    event EmployeeRemoved(address indexed employee);

    error NotEmployer();
    error NoSalarySet();
    error ClaimNotFound();
    error ClaimAlreadyFulfilled();
    error TransferFailed();
    error InsufficientTreasury();

    modifier onlyEmployer() {
        if (msg.sender != employer) revert NotEmployer();
        _;
    }

    constructor() {
        employer = msg.sender;
    }

    /// @notice Accept ETH deposits into the contract treasury.
    receive() external payable {}

    // -------------------------------------------------------------------------
    // Employer actions
    // -------------------------------------------------------------------------

    /// @notice Set or update an employee's encrypted salary.
    function setSalary(
        address employee,
        externalEuint64 inputHandle,
        bytes calldata inputProof
    ) external onlyEmployer {
        euint64 salary = FHE.fromExternal(inputHandle, inputProof);
        _salaries[employee] = salary;
        FHE.allowThis(salary);
        FHE.allow(salary, employee);
        FHE.allow(salary, employer);
        if (!isEmployee[employee]) {
            isEmployee[employee] = true;
            _employeeIndex[employee] = _employees.length;
            _employees.push(employee);
            emit EmployeeAdded(employee);
        }
        emit SalaryUpdated(employee);
    }

    /// @notice Fulfil a pending claim: verify KMS proof, transfer ETH, remove employee.
    /// @dev    Security is provided by FHE.checkSignatures, not msg.sender — any
    ///         relayer holding a valid KMS proof may call this function.
    ///         requestDecryption does not exist in this library version; decryption
    ///         is initiated via FHE.makePubliclyDecryptable inside requestClaim.
    /// @param requestId             ID returned by requestClaim.
    /// @param handlesList           Ciphertext handles that were decrypted.
    /// @param abiEncodedCleartexts  ABI-encoded decrypted values in handle order.
    /// @param decryptionProof       KMS proof (signatures + metadata).
    function fulfillClaim(
        uint256 requestId,
        bytes32[] memory handlesList,
        bytes memory abiEncodedCleartexts,
        bytes memory decryptionProof
    ) external {
        address employee = _pendingClaims[requestId];
        if (employee == address(0)) revert ClaimNotFound();
        if (_claimFulfilled[requestId]) revert ClaimAlreadyFulfilled();

        _claimFulfilled[requestId] = true;

        FHE.checkSignatures(handlesList, abiEncodedCleartexts, decryptionProof);

        uint64 amount = abi.decode(abiEncodedCleartexts, (uint64));

        _removeEmployee(employee);

        (bool ok,) = employee.call{value: amount}("");
        if (!ok) revert TransferFailed();

        emit ClaimPaid(employee, amount);
    }

    /// @notice Remove an employee and clear their encrypted salary record.
    function removeEmployee(address employee) external onlyEmployer {
        _removeEmployee(employee);
    }

    /// @notice Withdraw ETH from the contract treasury to the employer.
    function withdrawTreasury(uint256 amount) external onlyEmployer {
        if (amount > address(this).balance) revert InsufficientTreasury();
        (bool ok,) = employer.call{value: amount}("");
        if (!ok) revert TransferFailed();
    }

    // -------------------------------------------------------------------------
    // Employee actions
    // -------------------------------------------------------------------------

    /// @notice Initiate a salary claim.
    ///         Marks the caller's salary ciphertext as publicly decryptable so
    ///         the KMS can produce a decryption proof for fulfillClaim.
    /// @return requestId  Unique ID the employer passes to fulfillClaim.
    function requestClaim() external returns (uint256 requestId) {
        euint64 salary = _salaries[msg.sender];
        if (!FHE.isInitialized(salary)) revert NoSalarySet();

        requestId = _nextRequestId++;
        _pendingClaims[requestId] = msg.sender;

        FHE.makePubliclyDecryptable(salary);

        emit ClaimRequested(msg.sender, requestId);
    }

    // -------------------------------------------------------------------------
    // Views
    // -------------------------------------------------------------------------

    /// @notice Returns the encrypted salary handle for an employee.
    function getSalary(address employee) external view returns (euint64) {
        return _salaries[employee];
    }

    /// @notice Returns true if a claim has already been fulfilled.
    function isClaimFulfilled(uint256 requestId) external view returns (bool) {
        return _claimFulfilled[requestId];
    }

    /// @notice Returns the contract's current ETH balance.
    function treasuryBalance() external view returns (uint256) {
        return address(this).balance;
    }

    /// @notice Returns the full list of current employees.
    function getEmployees() external view returns (address[] memory) {
        return _employees;
    }

    /// @notice Returns the number of current employees.
    function getEmployeeCount() external view returns (uint256) {
        return _employees.length;
    }

    // -------------------------------------------------------------------------
    // Internal
    // -------------------------------------------------------------------------

    /// @notice Swap-pop the employee out of the enumeration array and clear salary.
    ///         Called from removeEmployee (explicit) and fulfillClaim (post-payment).
    function _removeEmployee(address employee) internal {
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
    }
}
