import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const VisaCrowdfundingModule = buildModule("VisaCrowdfundingModule", (m) => {
  const visat = m.contract("VISAT");

  const crowdfunding = m.contract("VisaCrowdfunding", [visat]);

  m.call(visat, "setCrowdfundingContract", [crowdfunding]);

  return { visat, crowdfunding };
});

export default VisaCrowdfundingModule;
