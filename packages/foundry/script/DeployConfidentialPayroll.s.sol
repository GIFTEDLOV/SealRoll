// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {Script, console} from "forge-std/Script.sol";
import {ConfidentialPayroll} from "../src/ConfidentialPayroll.sol";

contract DeployConfidentialPayroll is Script {
    function run() external {
        vm.startBroadcast();

        ConfidentialPayroll payroll = new ConfidentialPayroll();
        console.log("ConfidentialPayroll deployed at:", address(payroll));

        vm.stopBroadcast();
    }
}
