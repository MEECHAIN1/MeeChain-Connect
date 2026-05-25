#!/usr/bin/env node
/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  MeeChain GovernanceDAO Deployment Script (Phase 5)             ║
 * ║  Deploy: GovernanceDAO.sol to Ritual Chain (ID 13390)           ║
 * ║                                                                  ║
 * ║  Usage:                                                          ║
 * ║    node scripts/deploy-governance.js [--network ritual|local]   ║
 * ║                                                                  ║
 * ║  Env vars required:                                              ║
 * ║    PRIVATE_KEY   — deployer wallet private key (with 0x)        ║
 * ║    DRPC_RPC_URL  — RPC endpoint (default: https://rpc.meechain.live) ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

const { ethers } = require('ethers');
const fs         = require('fs');
const path       = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// ── CLI network flag ────────────────────────────────────────────────
const arg     = process.argv[2] || '--network';
const netFlag = process.argv[3] || 'local';

const NETWORKS = {
  ritual:    process.env.DRPC_RPC_URL    || 'https://rpc.meechain.live',
  local:     'http://127.0.0.1:8545',
  localhost: 'http://127.0.0.1:8545',
  mock:      'http://meechain-mock-rpc:8545',
};

const RPC_URL     = NETWORKS[netFlag] || NETWORKS.local;
const PRIVATE_KEY = process.env.PRIVATE_KEY || '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
const TOKEN_ADDR  = process.env.TOKEN_CONTRACT || '0x5FbDB2315678afecb367f032d93F642f64180aa3';

// ── GovernanceDAO ABI + Bytecode ────────────────────────────────────
// If Hardhat artifacts exist, load them; otherwise use inline minimal ABI.
function loadArtifact(contractName) {
  const artifactPath = path.join(__dirname, '..', 'artifacts', 'contracts',
    `${contractName}.sol`, `${contractName}.json`);
  if (fs.existsSync(artifactPath)) {
    const a = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
    return { abi: a.abi, bytecode: a.bytecode };
  }
  // Fallback: try Hardhat artifacts in different directory
  const alt = path.join(__dirname, '..', 'artifacts', `${contractName}.json`);
  if (fs.existsSync(alt)) {
    const a = JSON.parse(fs.readFileSync(alt, 'utf8'));
    return { abi: a.abi, bytecode: a.bytecode };
  }
  throw new Error(
    `Artifact not found for ${contractName}.\n` +
    `  Run: npx hardhat compile\n` +
    `  Expected: artifacts/contracts/${contractName}.sol/${contractName}.json`
  );
}

// ── Helpers ─────────────────────────────────────────────────────────
function setEnvVar(content, key, value) {
  const regex = new RegExp(`^${key}=.*$`, 'm');
  if (regex.test(content)) return content.replace(regex, `${key}=${value}`);
  return content.trimEnd() + `\n${key}=${value}\n`;
}

async function main() {
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║     GovernanceDAO Deployment — Phase 5               ║');
  console.log('╚══════════════════════════════════════════════════════╝');
  console.log(`\n🌐 Network  : ${netFlag}`);
  console.log(`📡 RPC URL  : ${RPC_URL}`);
  console.log(`🔑 Token    : ${TOKEN_ADDR}`);

  // ── Connect ──────────────────────────────────────────────────────
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  let network;
  try {
    network = await Promise.race([
      provider.getNetwork(),
      new Promise((_, rej) => setTimeout(() => rej(new Error('Timeout 15s')), 15000)),
    ]);
    console.log(`✅ Connected  : chain ${network.chainId}`);
  } catch (e) {
    console.error(`❌ Cannot connect to RPC: ${e.message}`);
    process.exit(1);
  }

  const deployer = new ethers.Wallet(PRIVATE_KEY, provider);
  const balance  = await provider.getBalance(deployer.address);
  console.log(`👛 Deployer  : ${deployer.address}`);
  console.log(`💰 Balance   : ${ethers.formatEther(balance)} MEE\n`);

  if (balance === 0n && netFlag === 'ritual') {
    console.error('❌ Deployer balance is 0. Fund the deployer wallet first.');
    process.exit(1);
  }

  // ── Load artifact ─────────────────────────────────────────────────
  let artifact;
  try {
    artifact = loadArtifact('GovernanceDAO');
    console.log('📦 GovernanceDAO artifact loaded from Hardhat artifacts');
  } catch (e) {
    console.error(`❌ ${e.message}`);
    process.exit(1);
  }

  // ── Deploy GovernanceDAO ──────────────────────────────────────────
  console.log('\n🚀 Deploying GovernanceDAO...');
  const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, deployer);

  let dao;
  try {
    // GovernanceDAO constructor takes no args in current implementation
    dao = await factory.deploy({ gasLimit: 5_000_000 });
    console.log(`   📡 TX Hash   : ${dao.deploymentTransaction()?.hash}`);
    console.log('   ⏳ Waiting for confirmation...');
    await dao.waitForDeployment();
  } catch (e) {
    console.error(`❌ Deployment failed: ${e.message}`);
    process.exit(1);
  }

  const daoAddr = await dao.getAddress();
  console.log(`   ✅ GovernanceDAO deployed at: ${daoAddr}`);

  // ── Verify on-chain ───────────────────────────────────────────────
  console.log('\n🔍 Verifying on-chain...');
  try {
    const contract = new ethers.Contract(daoAddr, artifact.abi, provider);
    // Try calling a read function to confirm deployment
    const stats = await contract.getStats().catch(() => null);
    if (stats) {
      console.log(`   ✔  proposals: ${stats[0]}, votes: ${stats[2]}`);
    } else {
      console.log('   ✔  Contract deployed (getStats not available in this build)');
    }
  } catch (e) {
    console.warn(`   ⚠  Verification warning: ${e.message}`);
  }

  // ── Update .env ───────────────────────────────────────────────────
  const envPath  = path.join(__dirname, '..', '.env');
  let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
  envContent = setEnvVar(envContent, 'GOVERNANCE_DAO_ADDRESS', daoAddr);
  fs.writeFileSync(envPath, envContent);
  console.log('\n📝 .env updated → GOVERNANCE_DAO_ADDRESS=' + daoAddr);

  // ── Save deployment log ───────────────────────────────────────────
  const log = {
    timestamp: new Date().toISOString(),
    network:   { name: netFlag, chainId: Number(network.chainId), rpc: RPC_URL },
    deployer:  deployer.address,
    contracts: { GovernanceDAO: daoAddr },
  };
  const logPath = path.join(__dirname, '..', 'deployment-governance.json');
  fs.writeFileSync(logPath, JSON.stringify(log, null, 2));
  console.log('💾 Deployment log → deployment-governance.json');

  // ── Summary ───────────────────────────────────────────────────────
  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║   Deployment Summary                                 ║');
  console.log('╚══════════════════════════════════════════════════════╝');
  console.log(`\n   GovernanceDAO : ${daoAddr}`);
  console.log('\n📌 Next steps:');
  console.log('   1. Update server.js CONTRACTS.governance = "' + daoAddr + '"');
  console.log('   2. pm2 restart meechain-dashboard');
  console.log('   3. Test: curl http://localhost:3000/api/dao/stats');
  console.log('   4. Explorer: https://explorer.meechain.run.place/address/' + daoAddr);
}

main().catch(e => {
  console.error('\n❌ Fatal error:', e.message);
  process.exit(1);
});
