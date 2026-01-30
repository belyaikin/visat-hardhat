import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("VISATModule", (m) => {
  const visat = m.contract("VISAT", [1_000_000n]);

  return { visat };
});
