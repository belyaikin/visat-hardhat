// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract RewardToken is ERC20 {
    address public minter;

    constructor() ERC20("CrowdReward", "RWD") {
        minter = msg.sender;
    }

    
    function mint(address to, uint256 amount) external {
        require(msg.sender == minter, "Only crowdfunding contract can mint");
        _mint(to, amount);
    }
}