#!/usr/bin/env node
/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  MeeChain Contract Deployment Script                            ║
 * ║  Deploys: MeeChainToken (ERC20), MeeBotNFT (ERC721),           ║
 * ║           NeonovaPortal (Custom)                                ║
 * ║  Target:  Hardhat local node  http://127.0.0.1:8080            ║
 * ║           OR Ritual Chain     http://rpc.meechain.run.place    ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

import { ethers } from 'ethers';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

// ── Config ──────────────────────────────────────────────────────────
const RPC_URL    = process.env.DRPC_RPC_URL || 'http://127.0.0.1:8080';
const PRIVATE_KEY = process.env.PRIVATE_KEY;
if (!PRIVATE_KEY) {
  throw new Error('Missing PRIVATE_KEY in environment');
}
const CHAIN_ID   = parseInt(process.env.CHAIN_ID || '13390', 10);

// ── Load compiled artifacts ─────────────────────────────────────────
const artifactsPath = join(__dirname, '..', 'compiled', 'combined.json');
if (!existsSync(artifactsPath)) {
  console.error('❌ compiled/combined.json not found. Run: solc --combined-json abi,bin ...');
  process.exit(1);
}
const raw       = JSON.parse(readFileSync(artifactsPath, 'utf8'));
const compiled  = raw.contracts || {};

/**
 * ดึง ABI และ bytecode ของคอนแทรกต์ที่คอมไพล์ไว้ตามชื่อที่ระบุ
 *
 * @param {string} name - ชื่อคอนแทรกต์ (เช่น 'MeeChainToken')
 * @returns {{abi: any[], bytecode: string}} วัตถุที่มีฟิลด์ `abi` เป็น ABI ของคอนแทรกต์ และ `bytecode` เป็นสตริงไบนารีเริ่มต้นด้วย `0x`
 * @throws {Error} ถ้าไม่พบคอนแทรกต์ที่ระบุในไฟล์ compiled artifacts
 */
function getArtifact(name) {
  const key = Object.keys(compiled).find(k => k.endsWith(`:${name}`));
  if (!key) throw new Error(`Contract "${name}" not found in compiled artifacts`);
  return {
    abi:      compiled[key].abi,
    bytecode: '0x' + compiled[key].bin,
  };
}

// ── Deploy helper ───────────────────────────────────────────────────
/**
 * ดำเนินการปรับใช้ (deploy) สัญญาอัจฉริยะโดยชื่อและอ็อพชันของอาร์กิวเมนต์คอนสตรัคเตอร์ที่ระบุ
 *
 * @param {import("ethers").Signer} deployer - ผู้ส่งธุรกรรม/ผู้ถือคีย์ที่ใช้ปรับใช้สัญญา
 * @param {string} name - ชื่อสัญญาในไฟล์ artifacts (ตรงกับชื่อที่ใช้ใน combined.json)
 * @param {Array<any>} [constructorArgs=[]] - อาร์กิวเมนต์สำหรับคอนสตรัคเตอร์ของสัญญา
 * @returns {{contract: import("ethers").Contract, address: string, abi: any}} วัตถุที่มีอินสแตนซ์สัญญาที่ปรับใช้แล้ว ที่อยู่ของสัญญา และ ABI ของสัญญา
 * @throws {Error} เมื่อไม่พบหรือมี bytecode ว่างสำหรับสัญญาที่ระบุ
 */
async function deployContract(deployer, name, constructorArgs = []) {
  console.log(`\n🚀 Deploying ${name}...`);
  const { abi, bytecode } = getArtifact(name);

  if (!bytecode || bytecode === '0x') {
    throw new Error(`Empty bytecode for ${name} – check compilation`);
  }

  const factory  = new ethers.ContractFactory(abi, bytecode, deployer);
  const contract = await factory.deploy(...constructorArgs);

  console.log(`   📡 TX Hash: ${contract.deploymentTransaction()?.hash}`);
  console.log(`   ⏳ Waiting for confirmation...`);

  await contract.waitForDeployment();
  const address = await contract.getAddress();

  console.log(`   ✅ ${name} deployed at: ${address}`);
  return { contract, address, abi };
}

// ── Verify on-chain ─────────────────────────────────────────────────
/**
 * ดำเนินการตรวจสอบสถานะบนเครือข่ายสำหรับสัญญาที่ระบุและพิมพ์สรุปข้อมูลที่เกี่ยวข้อง
 *
 * ฟังก์ชันจะอ่านข้อมูลสถานะจากสัญญา (เช่น name, symbol, totalSupply หรือ portal stats ขึ้นกับประเภทสัญญา)
 * แล้วพิมพ์ผลสรุปไปยังคอนโซล; ความผิดพลาดระหว่างการตรวจสอบจะถูกจับและพิมพ์เป็นคำเตือนโดยไม่โยนข้อยกเว้นต่อไป.
 *
 * @param {*} provider - Provider หรือ RPC client ที่ใช้เชื่อมต่อกับเครือข่าย
 * @param {string} name - ชื่อของสัญญา (เช่น 'MeeChainToken', 'MeeBotNFT', 'NeonovaPortal') เพื่อเลือกการตรวจสอบที่เหมาะสม
 * @param {string} address - ที่อยู่ของสัญญาที่จะตรวจสอบ
 * @param {*} abi - ABI ของสัญญา เพื่อเรียกฟังก์ชันสาธารณะบนสัญญานั้น
 * @param {...*} callArgs - อาร์กิวเมนต์เพิ่มเติม (ไม่ได้ใช้โดยปัจจุบัน แต่สงวนไว้สำหรับการเรียกตรวจสอบเพิ่มเติม)
 */
async function verifyDeployment(provider, name, address, abi, ...callArgs) {
  try {
    const c = new ethers.Contract(address, abi, provider);
    if (name === 'MeeChainToken') {
      const [n, sym, supply] = await Promise.all([c.name(), c.symbol(), c.totalSupply()]);
      console.log(`   ✔  Token: ${n} (${sym}), total supply: ${ethers.formatUnits(supply,18)} MEE`);
    } else if (name === 'MeeBotNFT') {
      const [n, sym] = await Promise.all([c.name(), c.symbol()]);
      console.log(`   ✔  NFT: ${n} (${sym})`);
    } else if (name === 'NeonovaPortal') {
      const stats = await c.getPortalStats();
      console.log(`   ✔  Portal stats: entries=${stats[0]}, offerings=${stats[1]}, ceremonies=${stats[2]}`);
    }
  } catch (e) {
    console.warn(`   ⚠  Verification error for ${name}: ${e.message}`);
  }
}

// ── Main ────────────────────────────────────────────────────────────
/**
 * ดำเนินกระบวนการปรับใช้สัญญา MeeChain ทั้งหมดไปยัง RPC ที่กำหนด และบันทึกผลการปรับใช้
 *
 * ปรับใช้ MeeChainToken, MeeBotNFT และ NeonovaPortal (ส่งที่อยู่โทเค็นเป็น constructor ของ Portal),
 * ตรวจสอบสถานะพื้นฐานบน chain แต่ละสัญญา, พยายามเรียก NeonovaPortal.setTokenAddress(tokenAddr) แบบ best-effort,
 * บันทึก deployment-log.json ในรากโปรเจค และอัปเดตไฟล์ .env ด้วยที่อยู่สัญญาที่ปรับใช้
 */
async function main() {
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║       MeeChain Contract Deployment                   ║');
  console.log('╚══════════════════════════════════════════════════════╝');
  console.log(`\n📡 RPC URL  : ${RPC_URL}`);
  console.log(`🔗 Chain ID : ${CHAIN_ID}`);

  // Connect
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  let network;
  try {
    network = await Promise.race([
      provider.getNetwork(),
      new Promise((_, rej) => setTimeout(() => rej(new Error('Connection timeout after 10s')), 10000)),
    ]);
    console.log(`✅ Connected  : chain ${network.chainId}`);
  } catch (e) {
    console.error(`❌ Cannot connect to RPC: ${e.message}`);
    console.error('   Make sure Hardhat node is running on http://127.0.0.1:8080');
    console.error('   or update DRPC_RPC_URL in .env');
    process.exit(1);
  }

  const deployer = new ethers.Wallet(PRIVATE_KEY, provider);
  const balance  = await provider.getBalance(deployer.address);
  console.log(`👛 Deployer  : ${deployer.address}`);
  console.log(`💰 Balance   : ${ethers.formatEther(balance)} MEE`);

  if (balance === 0n) {
    console.error('❌ Deployer has 0 balance – cannot pay gas');
    process.exit(1);
  }

  const deployedAddresses = {};

  // ── 1. Deploy MeeChainToken ────────────────────────────────────
  const { contract: token, address: tokenAddr, abi: tokenAbi } =
    await deployContract(deployer, 'MeeChainToken', []);
  deployedAddresses.MeeChainToken = tokenAddr;
  await verifyDeployment(provider, 'MeeChainToken', tokenAddr, tokenAbi);

  // ── 2. Deploy MeeBotNFT ────────────────────────────────────────
  const { contract: nft, address: nftAddr, abi: nftAbi } =
    await deployContract(deployer, 'MeeBotNFT', []);
  deployedAddresses.MeeBotNFT = nftAddr;
  await verifyDeployment(provider, 'MeeBotNFT', nftAddr, nftAbi);

  // ── 3. Deploy NeonovaPortal ────────────────────────────────────
  //    NeonovaPortal needs the MEE token address in constructor
  const { contract: portal, address: portalAddr, abi: portalAbi } =
    await deployContract(deployer, 'NeonovaPortal', [tokenAddr]);
  deployedAddresses.NeonovaPortal = portalAddr;
  await verifyDeployment(provider, 'NeonovaPortal', portalAddr, portalAbi);

  // ── Post-deployment: set token address in portal if needed ─────
  try {
    const portalWithSigner = new ethers.Contract(portalAddr, portalAbi, deployer);
    const tx = await portalWithSigner.setTokenAddress(tokenAddr);
    await tx.wait();
    console.log('\n🔗 Portal.setTokenAddress() ✅');
  } catch (e) {
    console.warn(`\n⚠  setTokenAddress skip: ${e.message}`);
  }

  // ── Summary ────────────────────────────────────────────────────
  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║   Deployment Summary                                 ║');
  console.log('╚══════════════════════════════════════════════════════╝');
  console.log(`\n📋 Contract Addresses:`);
  for (const [name, addr] of Object.entries(deployedAddresses)) {
    console.log(`   ${name.padEnd(20)}: ${addr}`);
  }

  // ── Save deployment log ────────────────────────────────────────
  const deployLog = {
    timestamp:   new Date().toISOString(),
    network:     { chainId: Number(network.chainId), rpc: RPC_URL },
    deployer:    deployer.address,
    contracts:   deployedAddresses,
  };
  const logPath = join(__dirname, '..', 'deployment-log.json');
  writeFileSync(logPath, JSON.stringify(deployLog, null, 2));
  console.log(`\n💾 Deployment log saved to: deployment-log.json`);

  // ── Update .env with new addresses ────────────────────────────
  console.log('\n📝 Updating .env with deployed addresses...');
  const envPath  = join(__dirname, '..', '.env');
  let envContent = existsSync(envPath) ? readFileSync(envPath, 'utf8') : '';

  function setEnvVar(content, key, value) {
    const regex = new RegExp(`^${key}=.*$`, 'm');
    if (regex.test(content)) return content.replace(regex, `${key}=${value}`);
    return content + `\n${key}=${value}`;
  }

  envContent = setEnvVar(envContent, 'VITE_TOKEN_CONTRACT_ADDRESS',   tokenAddr);
  envContent = setEnvVar(envContent, 'VITE_NFT_CONTRACT_ADDRESS',     nftAddr);
  envContent = setEnvVar(envContent, 'VITE_STAKING_CONTRACT_ADDRESS', portalAddr);

  writeFileSync(envPath, envContent);
  console.log('   ✅ .env updated');

  console.log('\n🎉 All contracts deployed and verified successfully!');
  console.log('\n📌 Next steps:');
  console.log('   1. Restart server:  pm2 restart meechain-dashboard');
  console.log('   2. Test health:     curl http://localhost:3000/api/health');
  console.log('   3. Open dashboard:  http://localhost:3000');
}

main().catch(e => {
  console.error('\n❌ Deployment failed:', e.message);
  process.exit(1);
});
