import 'dotenv/config'
import { createPublicClient, http } from 'viem'
import { sepolia } from 'viem/chains'

const RPC_URL = process.env.RPC_URL

export const publicClient = createPublicClient({
    chain: sepolia,
    transport: RPC_URL ? http(RPC_URL) : http(),
})