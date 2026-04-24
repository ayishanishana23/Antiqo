import { ethers } from "ethers";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

/* ===== FIX __dirname ===== */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* ===== LOAD CONTRACT ABI ===== */

const contractPath = path.join(
  __dirname,
  "../../blockchain/artifacts/contracts/AntiqueVerification.sol/AntiqueVerification.json"
);

const contractArtifact = JSON.parse(
  fs.readFileSync(contractPath, "utf8")
);

/* ===== HARDHAT PROVIDER ===== */

const provider = new ethers.JsonRpcProvider(
  "http://127.0.0.1:8545"
);

/* ===== USE HARDHAT SIGNER ===== */

const signer = await provider.getSigner(0);

/* ===== CONTRACT ADDRESS ===== */

const CONTRACT_ADDRESS =
  "0x5FbDB2315678afecb367f032d93F642f64180aa3";

/* ===== CONTRACT INSTANCE ===== */

const contract = new ethers.Contract(
  CONTRACT_ADDRESS,
  contractArtifact.abi,
  signer
);

/* ======================================================
   REGISTER ANTIQUE ON BLOCKCHAIN
====================================================== */

export async function registerAntiqueOnBlockchain(
  serialId,
  name,
  owner,
  manufactureDate,
  material
) {

  const tx = await contract.registerAntique(
    serialId,
    name,
    owner,
    manufactureDate,
    material
  );

  const receipt = await tx.wait();

  return {
    blockchainId: serialId,
    txHash: receipt.hash
  };

}

/* ======================================================
   GET ANTIQUE FROM BLOCKCHAIN
====================================================== */

export async function getAntiqueFromBlockchain(serialId) {

  const result = await contract.getAntique(serialId);

  return {
    serialId: result[0],
    name: result[1],
    owner: result[2],
    manufactureDate: result[3],
    material: result[4],
    blockchainVerified: result[5]
  };

}

/* ======================================================
   TRANSFER OWNERSHIP
====================================================== */

export async function transferOwnershipOnBlockchain(
  serialId,
  newOwner
) {

  const tx = await contract.transferOwnership(
    serialId,
    newOwner
  );

  const receipt = await tx.wait();

  return {
    txHash: receipt.hash
  };

}