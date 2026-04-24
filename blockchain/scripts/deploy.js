import { ethers } from "ethers";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Needed for __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  // Connect to Hardhat local node
  const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");

  // Use first Hardhat account
  const signer = await provider.getSigner(0);

  console.log("Deploying with account:", await signer.getAddress());

  // Load compiled contract artifact
  const artifactPath = path.join(
    __dirname,
    "../artifacts/contracts/AntiqueVerification.sol/AntiqueVerification.json"
  );

  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

  // Create contract factory
  const factory = new ethers.ContractFactory(
    artifact.abi,
    artifact.bytecode,
    signer
  );

  // Deploy
  const contract = await factory.deploy();
  await contract.waitForDeployment();

  console.log(
    "AntiqueVerification deployed to:",
    await contract.getAddress()
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});