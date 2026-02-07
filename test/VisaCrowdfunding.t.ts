import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { network } from "hardhat";

describe("VisaCrowdfunding (viem)", async function () {
  const { viem } = await network.connect();

  const publicClient = await viem.getPublicClient();
  const [deployer, creator, contributor] = await viem.getWalletClients();

  it("should deploy VISAT and VisaCrowdfunding and link them", async function () {
    const visat = await viem.deployContract("VISAT");

    const crowdfunding = await viem.deployContract("VisaCrowdfunding", [
      visat.address,
    ]);

    await visat.write.setCrowdfundingContract([crowdfunding.address]);

    const linked = await visat.read.crowdfundingContract();
    assert.equal(linked, crowdfunding.address);
  });

  it("should create a visa campaign", async function () {
    const visat = await viem.deployContract("VISAT");
    const crowdfunding = await viem.deployContract("VisaCrowdfunding", [
      visat.address,
    ]);

    await visat.write.setCrowdfundingContract([crowdfunding.address]);

    await crowdfunding.write.createCampaign(
      ["Japan", 5n * 10n ** 18n, 7n * 24n * 60n * 60n],
      { account: creator.account },
    );

    const campaign = await crowdfunding.read.getCampaign([0n]);

    assert.equal(campaign[0], "Japan"); // country
    assert.equal(campaign[1], 5n * 10n ** 18n); // goal
    assert.equal(campaign[4], creator.account.address); // creator
  });

  it("should allow buying a visa and mint VISAT tokens", async function () {
    const visat = await viem.deployContract("VISAT");
    const crowdfunding = await viem.deployContract("VisaCrowdfunding", [
      visat.address,
    ]);

    await visat.write.setCrowdfundingContract([crowdfunding.address]);

    await crowdfunding.write.createCampaign(
      ["Germany", 1n * 10n ** 18n, 7n * 24n * 60n * 60n],
      { account: creator.account },
    );

    await crowdfunding.write.buyVisa([0n], {
      account: contributor.account,
      value: 1n * 10n ** 18n,
    });

    const contribution = await crowdfunding.read.contributions([
      0n,
      contributor.account.address,
    ]);

    assert.equal(contribution, 1n * 10n ** 18n);

    const visatBalance = await visat.read.balanceOf([
      contributor.account.address,
    ]);

    // 100 VISAT per ETH
    assert.equal(visatBalance, 100n * 10n ** 18n);
  });

  it("should mark contributor as visa holder", async function () {
    const visat = await viem.deployContract("VISAT");
    const crowdfunding = await viem.deployContract("VisaCrowdfunding", [
      visat.address,
    ]);

    await visat.write.setCrowdfundingContract([crowdfunding.address]);

    await crowdfunding.write.createCampaign(
      ["Canada", 1n * 10n ** 18n, 7n * 24n * 60n * 60n],
      { account: creator.account },
    );

    await crowdfunding.write.buyVisa([0n], {
      account: contributor.account,
      value: 5n * 10n ** 17n,
    });

    const hasVisa = await crowdfunding.read.hasVisa([
      0n,
      contributor.account.address,
    ]);

    assert.equal(hasVisa, true);
  });

  it("should allow creator to finalize campaign and receive ETH", async function () {
    const visat = await viem.deployContract("VISAT");
    const crowdfunding = await viem.deployContract("VisaCrowdfunding", [
      visat.address,
    ]);

    await visat.write.setCrowdfundingContract([crowdfunding.address]);

    await crowdfunding.write.createCampaign(
      ["Australia", 1n * 10n ** 18n, 1n],
      { account: creator.account },
    );

    await crowdfunding.write.buyVisa([0n], {
      account: contributor.account,
      value: 1n * 10n ** 18n,
    });

    // move time forward
    await publicClient.increaseTime({ seconds: 2 });
    await publicClient.mine({ blocks: 1 });

    const balanceBefore = await publicClient.getBalance({
      address: creator.account.address,
    });

    await crowdfunding.write.finalizeCampaign([0n], {
      account: creator.account,
    });

    const balanceAfter = await publicClient.getBalance({
      address: creator.account.address,
    });

    assert.ok(balanceAfter > balanceBefore);
  });

  it("should reject finalize from non-creator", async function () {
    const visat = await viem.deployContract("VISAT");
    const crowdfunding = await viem.deployContract("VisaCrowdfunding", [
      visat.address,
    ]);

    await visat.write.setCrowdfundingContract([crowdfunding.address]);

    await crowdfunding.write.createCampaign(
      ["France", 1n * 10n ** 18n, 1n],
      { account: creator.account },
    );

    await publicClient.increaseTime({ seconds: 2 });
    await publicClient.mine({ blocks: 1 });

    await assert.rejects(
      crowdfunding.write.finalizeCampaign([0n], {
        account: contributor.account,
      }),
    );
  });
});
