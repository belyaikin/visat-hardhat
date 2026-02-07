// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract VISAT is ERC20, Ownable {
    address public crowdfundingContract;

    constructor() ERC20("Visa Token", "VISAT") Ownable(msg.sender) {}

    function setCrowdfundingContract(address _cf) external onlyOwner {
        require(crowdfundingContract == address(0), "Already set");
        crowdfundingContract = _cf;
    }

    function mint(address to, uint256 amount) external onlyOwner {
        require(msg.sender == crowdfundingContract, "Not allowed");
        _mint(to, amount);
    }
}

contract VisaCrowdfunding {
    struct Campaign {
        string country;
        uint256 goal;
        uint256 deadline;
        uint256 raised;
        address creator;
        bool finalized;
    }

    VISAT public visatToken;
    uint256 visatPerETH = msg.value * 10;

    uint256 public campaignCount;

    mapping(uint256 => Campaign) public campaigns;
    mapping(uint256 => mapping(address => uint256)) public contributions;

    event CampaignCreated(
        uint256 indexed campaignId,
        string country,
        uint256 goal,
        uint256 deadline,
        address creator
    );

    event VisaPurchased(
        uint256 indexed campaignId,
        address indexed contributor,
        uint256 ethAmount,
        uint256 visatReward
    );

    event CampaignFinalized(uint256 indexed campaignId);

    constructor(address _visatToken) {
        visatToken = VISAT(_visatToken);
    }

    function createCampaign(
        string calldata country,
        uint256 goal,
        uint256 duration
    ) external {
        require(goal > 0, "Goal must be > 0");
        require(duration > 0, "Duration must be > 0");

        campaigns[campaignCount] = Campaign({
            country: country,
            goal: goal,
            deadline: block.timestamp + duration,
            raised: 0,
            creator: msg.sender,
            finalized: false
        });

        emit CampaignCreated(
            campaignCount,
            country,
            goal,
            block.timestamp + duration,
            msg.sender
        );

        campaignCount++;
    }

    function buyVisa(uint256 campaignId) external payable {
        Campaign storage campaign = campaigns[campaignId];

        require(block.timestamp < campaign.deadline, "Campaign ended");
        require(msg.value > 0, "Send ETH");
        require(!campaign.finalized, "Campaign finalized");

        campaign.raised += msg.value;
        contributions[campaignId][msg.sender] += msg.value;

        visatToken.mint(msg.sender, visatPerETH);

        emit VisaPurchased(campaignId, msg.sender, msg.value, visatPerETH);
    }

    function finalizeCampaign(uint256 campaignId) external {
        Campaign storage campaign = campaigns[campaignId];

        require(msg.sender == campaign.creator, "Not creator");
        require(block.timestamp >= campaign.deadline, "Not ended");
        require(!campaign.finalized, "Already finalized");

        campaign.finalized = true;

        (bool success, ) = campaign.creator.call{value: campaign.raised}("");
        require(success, "ETH transfer failed");

        emit CampaignFinalized(campaignId);
    }

    function hasVisa(
        uint256 campaignId,
        address user
    ) external view returns (bool) {
        return contributions[campaignId][user] > 0;
    }

    function getCampaign(
        uint256 campaignId
    )
        external
        view
        returns (
            string memory country,
            uint256 goal,
            uint256 deadline,
            uint256 raised,
            address creator,
            bool finalized
        )
    {
        Campaign memory c = campaigns[campaignId];
        return (
            c.country,
            c.goal,
            c.deadline,
            c.raised,
            c.creator,
            c.finalized
        );
    }
}
