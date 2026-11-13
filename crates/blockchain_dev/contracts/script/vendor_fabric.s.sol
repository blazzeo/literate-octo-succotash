// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";
import {VendorFabric} from "../src/vendor_fabric.sol";

contract Deploy is Script {
    function run() public returns (address) {
        vm.startBroadcast();

        VendorFabric fabric = new VendorFabric();

        vm.stopBroadcast();

        return address(fabric);
    }
}
