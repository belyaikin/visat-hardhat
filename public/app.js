const COUNTER_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
const VISAT_ADDRESS   = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";

const COUNTER_ABI = [
  "function x() view returns (uint256)",
  "function inc()",
  "function incBy(uint256 by)",
  "event Increment(uint256 by)"
];

const VISAT_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function transfer(address to, uint256 value) returns (bool)",
  "event Transfer(address indexed from, address indexed to, uint256 value)"
];

const $ = (id) => document.getElementById(id);

let provider, signer;
let counter, visat;

function short(addr) {
  return addr ? addr.slice(0, 6) + "…" + addr.slice(-4) : "—";
}
function setStatus(msg) { $("status").textContent = msg; }

async function connect() {
  if (!window.ethereum) {
    setStatus("MetaMask не найден. Установи MetaMask.");
    return;
  }

  provider = new ethers.BrowserProvider(window.ethereum);
  await provider.send("eth_requestAccounts", []);
  signer = await provider.getSigner();

  const addr = await signer.getAddress();
  $("account").textContent = short(addr);

  const net = await provider.getNetwork();
  $("network").textContent = `${net.name} (chainId ${net.chainId})`;

  counter = new ethers.Contract(COUNTER_ADDRESS, COUNTER_ABI, signer);
  visat = new ethers.Contract(VISAT_ADDRESS, VISAT_ABI, signer);

  setStatus("Подключено");
}

async function counterRead() {
  if (!counter) return setStatus("Сначала подключи MetaMask.");
  setStatus("Читаю Counter.x()…");
  try {
    const x = await counter.x();
    $("counterX").textContent = x.toString();
    setStatus("Готово.");
  } catch (e) {
    console.error(e);
    setStatus("Ошибка чтения Counter. Проверь адрес/сеть.");
  }
}

async function counterInc() {
  if (!counter) return setStatus("Сначала подключи MetaMask.");
  setStatus("Отправляю inc()…");
  try {
    const tx = await counter.inc();
    setStatus(`Tx: ${tx.hash.slice(0, 10)}… жду подтверждение…`);
    await tx.wait();
    setStatus("inc() подтверждено");
    await counterRead();
  } catch (e) {
    console.error(e);
    setStatus("inc() отменено или ошибка.");
  }
}

async function counterIncBy() {
  if (!counter) return setStatus("Сначала подключи MetaMask.");
  const n = Number($("counterIncByInput").value || "0");
  if (!Number.isFinite(n) || n <= 0) return setStatus("incBy: введи число > 0");

  setStatus(`Отправляю incBy(${n})…`);
  try {
    const tx = await counter.incBy(BigInt(n));
    setStatus(`Tx: ${tx.hash.slice(0, 10)}… жду подтверждение…`);
    await tx.wait();
    setStatus("incBy() подтверждено");
    await counterRead();
  } catch (e) {
    console.error(e);
    setStatus("incBy() отменено или ошибка (например by=0).");
  }
}

async function visatBalance() {
  if (!visat || !signer) return setStatus("Сначала подключи MetaMask.");
  setStatus("Читаю баланс VISAT…");
  try {
    const addr = await signer.getAddress();
    const bal = await visat.balanceOf(addr);
    $("visatBalance").textContent = bal.toString();
    setStatus("Готово.");
  } catch (e) {
    console.error(e);
    setStatus("Ошибка balanceOf. Проверь адрес/сеть.");
  }
}

async function visatTransfer() {
  if (!visat) return setStatus("Сначала подключи MetaMask.");

  const to = $("visatTo").value.trim();
  const amount = Number($("visatAmount").value || "0");

  if (!ethers.isAddress(to)) return setStatus("Неверный адрес получателя.");
  if (!Number.isFinite(amount) || amount <= 0) return setStatus("Сумма должна быть > 0.");

  setStatus(`transfer(${short(to)}, ${amount})…`);
  try {
    const tx = await visat.transfer(to, BigInt(amount));
    setStatus(`Tx: ${tx.hash.slice(0, 10)}… жду подтверждение…`);
    await tx.wait();
    setStatus("Transfer подтвержден");
    await visatBalance();
  } catch (e) {
    console.error(e);
    setStatus("Transfer отменён или ошибка (баланс/сеть).");
  }
}

$("connectBtn").addEventListener("click", connect);

$("counterReadBtn").addEventListener("click", counterRead);
$("counterIncBtn").addEventListener("click", counterInc);
$("counterIncByBtn").addEventListener("click", counterIncBy);

$("visatBalanceBtn").addEventListener("click", visatBalance);
$("visatTransferBtn").addEventListener('click', visatTransfer);