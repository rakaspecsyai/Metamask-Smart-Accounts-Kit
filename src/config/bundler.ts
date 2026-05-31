import 'dotenv/config'
import { createBundlerClient, createPaymasterClient } from 'viem/account-abstraction'
import { http } from 'viem'
import { publicClient } from './client'

const BUNDLER_URL = process.env.BUNDLER_URL

if (!BUNDLER_URL) {
    throw new Error(
        'BUNDLER_URL environment variable is required. ' +
        'Copy .env.example to .env and fill in your API key.'
    )
}

export const bundlerClient = createBundlerClient({
    client: publicClient,
    transport: http(BUNDLER_URL),
})

export const getGasPrice = async () => {
    const json = await fetch(BUNDLER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            jsonrpc: '2.0', id: 1,
            method: 'pimlico_getUserOperationGasPrice',
            params: [],
        }),
    }).then(r => r.json()) as {
        result?: { fast: { maxFeePerGas: string; maxPriorityFeePerGas: string } }
        error?: { code: number; message: string }
    }

    if (!json.result) {
        console.error('getGasPrice API error response:', JSON.stringify(json, null, 2))
        throw new Error(
            json.error
                ? `Bundler API error ${json.error.code}: ${json.error.message}`
                : 'Bundler returned no result. Check your BUNDLER_URL and API key in .env'
        )
    }

    return {
        maxFeePerGas: BigInt(json.result.fast.maxFeePerGas),
        maxPriorityFeePerGas: BigInt(json.result.fast.maxPriorityFeePerGas),
    }
}

const PAYMASTER_URL = process.env.PAYMASTER_URL
const SPONSORSHIP_POLICY_ID = process.env.SPONSORSHIP_POLICY_ID

export const getBundlerWithPaymaster = () => {
    if (!PAYMASTER_URL || !SPONSORSHIP_POLICY_ID) {
        throw new Error(
            'PAYMASTER_URL and SPONSORSHIP_POLICY_ID are required for paymaster setup.'
        )
    }

    const paymasterClient = createPaymasterClient({
        transport: http(PAYMASTER_URL),
    })

    return createBundlerClient({
        client: publicClient,
        transport: http(BUNDLER_URL),
        paymaster: paymasterClient,
        paymasterContext: {
            sponsorshipPolicyId: SPONSORSHIP_POLICY_ID,
        },
    })
}