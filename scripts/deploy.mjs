import { createWalletClient, createPublicClient, http, defineChain } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// ─── Chain config ─────────────────────────────────────────────────────────────
const maculatusTestnet = defineChain({
  id: 10778,
  name: 'Maculatus Testnet',
  nativeCurrency: { decimals: 18, name: 'KNTC', symbol: 'KNTC' },
  rpcUrls: {
    default: { http: ['https://maculatus-rpc.x1eco.com'] },
  },
  blockExplorers: {
    default: { name: 'KNTC Explorer', url: 'https://explorer.x1eco.com' },
  },
  testnet: true,
})

// ─── Load compiled artifact ───────────────────────────────────────────────────
const artifactPath = join(__dirname, '../artifacts/contracts/KineticDAO.sol/KineticDAO.json')
const artifact = JSON.parse(readFileSync(artifactPath, 'utf8'))
const { bytecode, abi } = artifact

// ─── Setup ───────────────────────────────────────────────────────────────────
const privateKey = process.env.DEPLOYER_PRIVATE_KEY
if (!privateKey) {
  console.error('ERROR: DEPLOYER_PRIVATE_KEY env var is not set.')
  process.exit(1)
}

const pk = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`
const account = privateKeyToAccount(pk)

const publicClient = createPublicClient({
  chain: maculatusTestnet,
  transport: http('https://maculatus-rpc.x1eco.com'),
})

const walletClient = createWalletClient({
  chain: maculatusTestnet,
  transport: http('https://maculatus-rpc.x1eco.com'),
  account,
})

// ─── Deploy ───────────────────────────────────────────────────────────────────
async function main() {
  console.log('=== KineticDAO Deployment ===')
  console.log('Network : Maculatus Testnet (Chain ID: 10778)')
  console.log('Deployer:', account.address)

  const balance = await publicClient.getBalance({ address: account.address })
  const balanceKNTC = Number(balance) / 1e18
  console.log('Balance :', balanceKNTC.toFixed(4), 'KNTC')

  if (balance === 0n) {
    console.error('\nERROR: Wallet has 0 KNTC. Fund it from the Maculatus faucet first.')
    process.exit(1)
  }

  console.log('\nDeploying contract...')
  const hash = await walletClient.deployContract({
    abi,
    bytecode,
    account,
  })

  console.log('Deploy tx  :', hash)
  console.log('Waiting for confirmation...')

  const receipt = await publicClient.waitForTransactionReceipt({ hash })
  const address  = receipt.contractAddress

  if (!address) {
    console.error('ERROR: Contract address not found in receipt.')
    process.exit(1)
  }

  console.log('\n=== Deployment Successful ===')
  console.log('Contract   :', address)
  console.log('Block      :', receipt.blockNumber.toString())
  console.log('Gas used   :', receipt.gasUsed.toString())
  console.log('Explorer   : https://explorer.x1eco.com/address/' + address)

  // ── Update .env ──────────────────────────────────────────────────────────
  const envPath = join(__dirname, '../.env')
  const envLine = `VITE_CONTRACT_ADDRESS=${address}`

  if (existsSync(envPath)) {
    let content = readFileSync(envPath, 'utf8')
    if (content.includes('VITE_CONTRACT_ADDRESS=')) {
      content = content.replace(/VITE_CONTRACT_ADDRESS=.+/g, envLine)
    } else {
      content += `\n${envLine}\n`
    }
    writeFileSync(envPath, content)
  } else {
    writeFileSync(envPath, `${envLine}\n`)
  }

  console.log('\n.env updated  : VITE_CONTRACT_ADDRESS =', address)
  console.log('\n--- Add to Vercel Environment Variables ---')
  console.log('Key   : VITE_CONTRACT_ADDRESS')
  console.log('Value :', address)
  console.log('-------------------------------------------')
}

main().catch(err => {
  console.error('\nDeployment failed:', err.message || err)
  process.exit(1)
})
