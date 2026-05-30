import 'dotenv/config'
import { createWalletClient, http, parseEther } from 'viem'
import { sepolia } from 'viem/chains'
import { privateKeyToAccount } from 'viem/accounts'

const pk = process.env.PRIVATE_KEY!
const account = privateKeyToAccount(pk as `0x${string}`)
const smartAccount = '0xF977a679fc30B34ce0FB37dBec045218C625a7d5'

const client = createWalletClient({ account, chain: sepolia, transport: http() })
console.log('Mengirim 0.05 ETH ke smart account...')
const hash = await client.sendTransaction({ to: smartAccount, value: parseEther('0.05') })
console.log('Tx:', hash)