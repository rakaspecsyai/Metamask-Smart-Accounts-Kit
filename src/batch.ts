import 'dotenv/config'
import { parseEther, parseUnits, encodeFunctionData } from 'viem'
import { getOrCreateSmartAccount } from './accounts/smartAccount'
import { bundlerClient, getGasPrice } from './config/bundler'

const TOKEN_ADDRESS = '0x01d961f525ee8c5a6011f275fa2b2aa9417bc8f1' as `0x${string}`
const SPENDER_ADDRESS = '0x01d961f525ee8c5a6011f275fa2b2aa9417bc8f1' as `0x${string}`
const RECIPIENT = '0x01d961f525ee8c5a6011f275fa2b2aa9417bc8f1' as const

const ERC20_APPROVE_ABI = [
    {
        name: 'approve',
        type: 'function' as const,
        inputs: [
            { name: 'spender', type: 'address' as const },
            { name: 'amount', type: 'uint256' as const },
        ],
        outputs: [{ name: '', type: 'bool' as const }],
    },
]

const main = async () => {
    const smartAccount = await getOrCreateSmartAccount()
    const gasPrice = await getGasPrice()

    const calls = [
        {
            to: TOKEN_ADDRESS,
            data: encodeFunctionData({
                abi: ERC20_APPROVE_ABI,
                functionName: 'approve',
                args: [SPENDER_ADDRESS, parseUnits('100', 18)],
            }),
        },
        {
            to: RECIPIENT,
            value: parseEther('0.001'),
            data: '0x' as const,
        },
    ]

    const userOpHash = await bundlerClient.sendUserOperation({
        account: smartAccount,
        calls,
        ...gasPrice,
    })

    console.log('UserOp Hash:', userOpHash)

    const receipt = await bundlerClient.waitForUserOperationReceipt({
        hash: userOpHash,
    })

    console.log('✅ Batch User Operation confirmed!')
    console.log('Tx Hash:', receipt.receipt.transactionHash)
}

main().catch(console.error)