import 'dotenv/config'
import { Implementation, toMetaMaskSmartAccount } from '@metamask/smart-accounts-kit'
import { privateKeyToAccount, generatePrivateKey } from 'viem/accounts'
import { publicClient } from '../config/client'

const PRIVATE_KEY = process.env.PRIVATE_KEY

export const getOrCreateSmartAccount = async () => {
    if (!PRIVATE_KEY) {
        const newKey = generatePrivateKey()
        console.warn('⚠️  No PRIVATE_KEY in .env. Generating a random one for testing.')
        console.warn('⚠️  Save this key to .env for consistent address across runs:')
        console.warn(`    ${newKey}`)
        console.warn()
        const account = privateKeyToAccount(newKey)
        return createSmartAccount(account)
    }

    const account = privateKeyToAccount(PRIVATE_KEY as `0x${string}`)
    return createSmartAccount(account)
}

const createSmartAccount = async (account: ReturnType<typeof privateKeyToAccount>) => {
    const smartAccount = await toMetaMaskSmartAccount({
        client: publicClient,
        implementation: Implementation.Hybrid,
        deployParams: [account.address, [], [], []],
        deploySalt: '0x',
        signer: { account },
    })

    const isDeployed = await smartAccount.isDeployed()

    console.log('=== Smart Account Info ===')
    console.log('EOA Signer:', account.address)
    console.log('Smart Account Address:', smartAccount.address)
    console.log('Is Deployed:', isDeployed)
    if (!isDeployed) {
        console.log('💡 Smart account is counterfactual — address is known before first deploy.')
    }
    console.log()

    return smartAccount
}