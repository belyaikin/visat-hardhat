const VISAT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
const CROWDFUNDING_ADDRESS = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";

const VISAT_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function transfer(address to, uint256 value) returns (bool)",
  "function crowdfundingContract() view returns (address)",
  "function setCrowdfundingContract(address _cf)",
  "function mint(address to, uint256 amount)",
  "event Transfer(address indexed from, address indexed to, uint256 value)"
];

const CROWDFUNDING_ABI = [
  "function campaignCount() view returns (uint256)",
  "function getCampaign(uint256 campaignId) view returns (string country,uint256 goal,uint256 deadline,uint256 raised,address creator,bool finalized)",
  "function contributions(uint256,address) view returns (uint256)",
  "function createCampaign(string country,uint256 goal,uint256 duration)",
  "function buyVisa(uint256 campaignId) payable",
  "function finalizeCampaign(uint256 campaignId)",
  "function hasVisa(uint256 campaignId,address user) view returns (bool)",
  "event CampaignCreated(uint256 indexed campaignId,string country,uint256 goal,uint256 deadline,address creator)",
  "event VisaPurchased(uint256 indexed campaignId,address indexed contributor,uint256 ethAmount,uint256 visatReward)",
  "event CampaignFinalized(uint256 indexed campaignId)"
];


const $ = (id) => document.getElementById(id);

let provider, signer;
let visat, crowdfunding;

function short(addr) {
  return addr ? addr.slice(0, 6) + "…" + addr.slice(-4) : "—";
}

function setStatus(msg) {
  $("status").textContent = msg;
}

async function connect() {
  if (!window.ethereum) return setStatus("MetaMask not found");

  provider = new ethers.BrowserProvider(window.ethereum);
  await provider.send("eth_requestAccounts", []);
  signer = await provider.getSigner();

  const addr = await signer.getAddress();
  $("account").textContent = short(addr);

  const net = await provider.getNetwork();
  $("network").textContent = `${net.name} (chainId ${net.chainId})`;

  visat = new ethers.Contract(VISAT_ADDRESS, VISAT_ABI, signer);
  crowdfunding = new ethers.Contract(CROWDFUNDING_ADDRESS, CROWDFUNDING_ABI, signer);

  setStatus("Connected");

  setupOnEvents();
}

async function setupOnEvents() {
  crowdfunding.on("CampaignCreated", (campaignId, country, goal, deadline, creator) => {
    console.log(`New campaign: campaignId=${campaignId.toString()}, country=${country}, goal=${goal}, deadline=${deadline}, creator=${creator}`);
    setStatus(`Кампания создана! ID = ${campaignId.toString()}`);
  });

  crowdfunding.on("VisaPurchased", (campaignId, contributor, ethAmount, visatReward) => {
    console.log(`Visa purchased: campaignId=${campaignId.toString()}, contributor=${contributor.toString()}, ethAmount=${ethAmount.toString()}, visatReward=${visatReward.toString()}`);
    setStatus(`Успешно куплено! ID кампании = ${campaignId.toString()}, цель: ${ethAmount.toString()}, за каждый ETH дается ${visatReward.toString()} VISAT`);
  });

  crowdfunding.on("CampaignFinalized", (campaignId) => {
    console.log(`Campaign Finalized: ${campaignId.toString()}`);
    setStatus(`Успешно куплено! ID кампании = ${campaignId.toString()}, цель: ${ethAmount.toString()}, за каждый ETH дается ${visatReward.toString()} VISAT`);
  });
}


async function visatBalance() {
  if (!visat || !signer) return setStatus("Сначала подключи MetaMask.");
  setStatus("Читаю баланс VISAT…");
  try {
    const addr = await signer.getAddress();
    const bal = await visat.balanceOf(addr);
    $("visatBalance").textContent = ethers.formatUnits(bal, 18);
    setStatus(`Ваш баланс: ${bal}`);
  } catch (e) {
    console.error(e);
    setStatus("Не удалось получить баланс.");
  }
}

async function visatTransfer() {
  if (!visat || !signer) return setStatus("Сначала подключи MetaMask.");

  const to = $("visatTo").value.trim();
  const amount = Number($("visatAmount").value || "0");

  if (!ethers.isAddress(to)) return setStatus("Неверный адрес получателя.");
  if (!Number.isFinite(amount) || amount <= 0)
    return setStatus("Сумма должна быть > 0.");

  setStatus(`transfer(${short(to)}, ${amount})…`);
  try {
    const tx = await visat.transfer(to, ethers.parseUnits(amount.toString(), 18));
    setStatus(`Tx: ${tx.hash.slice(0, 10)}… жду подтверждение…`);
    await tx.wait();
    setStatus("Transfer подтвержден");
    await visatBalance();
  } catch (e) {
    console.error(e);
    setStatus("Transfer отменён или ошибка (баланс/сеть).");
  }
}

async function createCampaign() {
  if (!visat || !signer) return setStatus("Сначала подключи MetaMask.");
  if (!crowdfunding) return setStatus("Crowdfunding контракт не подключен.");
  const country = $("campaignCountry").value.trim();
  const goal = ethers.parseUnits($("campaignGoal").value || "0", 18);
  const duration = Number($("campaignDuration").value || "0");

  if (!country || goal <= 0n || duration <= 0)
    return setStatus("Неверные данные кампании.");

  setStatus("Создаю кампанию…");
  try {
    const tx = await crowdfunding.createCampaign(country, goal, duration);
    await tx.wait();
  } catch (e) {
    console.error(e);
    setStatus("Ошибка создания кампании.");
  }
}

async function buyVisa() {
  if (!visat || !signer) return setStatus("Сначала подключи MetaMask.");
  const campaignId = Number($("buyCampaignId").value || "0");
  const amountETH = Number($("buyAmount").value || "0");

  if (amountETH <= 0) return setStatus("Amount must be > 0");

  setStatus(`Buying Visa for ${amountETH} ETH...`);

  try {
    const tx = await crowdfunding.buyVisa(campaignId, {
      value: ethers.parseEther(amountETH.toString())
    });
    await tx.wait();
  } catch (e) {
    console.error(e);
    setStatus("Не удалось купить визу.");
  }
}


async function checkVisa() {
  if (!visat || !signer) return setStatus("Сначала подключи MetaMask.");
  if (!crowdfunding) return setStatus("VisaCrowdfunding контракт не подключен.");
  const campaignId = Number($("checkCampaignId").value || "0");
  const addr = $("checkVisaAddr").value.trim() || (await signer.getAddress());

  if (!ethers.isAddress(addr)) return setStatus("Неверный адрес.");

  const hasVisa = await crowdfunding.hasVisa(campaignId, addr);
  setStatus(hasVisa ? "У пользователя есть виза" : "Визы нет");
}

async function finalizeCampaign() {
  if (!visat || !signer) return setStatus("Сначала подключи MetaMask.");
  if (!crowdfunding) return setStatus("Crowdfunding контракт не подключен.");
  const campaignId = Number($("finalizeCampaignId").value || "0");

  setStatus("Финализирую кампанию…");
  try {
    const tx = await crowdfunding.finalizeCampaign(campaignId);
    await tx.wait();
    setStatus("Кампания финализирована!");
  } catch (e) {
    console.error(e);
    setStatus("Ошибка финализации (только создатель может).");
  }
}

$("connectBtn").addEventListener("click", connect);
$("visatBalanceBtn").addEventListener("click", visatBalance);
$("visatTransferBtn").addEventListener("click", visatTransfer);
$("createCampaignBtn").addEventListener("click", createCampaign);
$("buyVisaBtn").addEventListener("click", buyVisa);
$("checkVisaBtn").addEventListener("click", checkVisa);
$("finalizeCampaignBtn").addEventListener("click", finalizeCampaign);
