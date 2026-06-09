import hre from 'hardhat'
import fs from 'fs'
import path from 'path'

async function main() {
  const ethers = hre.ethers

  const [deployer] = await ethers.getSigners()

  console.log('Deploying KineticDAO...')
  console.log('Deployer:', deployer.address)

  const balance = await ethers.provider.getBalance(deployer.address)
  console.log('Balance:', ethers.formatEther(balance), 'KNTC')

  if (balance === 0n) {
    throw new Error('Deployer wallet has 0 KNTC. Fund it from the Maculatus faucet first.')
  }

  const KineticDAO = await ethers.getContractFactory('KineticDAO')
  const contract   = await KineticDAO.deploy()
  await contract.waitForDeployment()

  const address = await contract.getAddress()
  console.log('\nKineticDAO deployed to:', address)
  console.log('Network: Maculatus Testnet (Chain ID: 10778)')
  console.log('Explorer: https://explorer.x1eco.com/address/' + address)

  // Write address to .env for local dev
  const envPath = path.join(process.cwd(), '.env')
  const envLine = `VITE_CONTRACT_ADDRESS=${address}\n`

  if (fs.existsSync(envPath)) {
    let content = fs.readFileSync(envPath, 'utf8')
    if (content.includes('VITE_CONTRACT_ADDRESS=')) {
      content = content.replace(/VITE_CONTRACT_ADDRESS=.*/g, `VITE_CONTRACT_ADDRESS=${address}`)
      fs.writeFileSync(envPath, content)
    } else {
      fs.appendFileSync(envPath, envLine)
    }
  } else {
    fs.writeFileSync(envPath, envLine)
  }

  console.log('\n.env updated with VITE_CONTRACT_ADDRESS =', address)
  console.log('\nAdd this to Vercel environment variables:')
  console.log('  VITE_CONTRACT_ADDRESS =', address)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
