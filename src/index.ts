import 'dotenv/config'
import { parseEther } from 'viem'
import { getOrCreateSmartAccount } from './accounts/smartAccount'
import { bundlerClient, getGasPrice } from './config/bundler'

const RECIPIENT = '0x01d961f525ee8c5a6011f275fa2b2aa9417bc8f1' as const

const main = async () => {
    const smartAccount = await getOrCreateSmartAccount()
    const gasPrice = await getGasPrice()

    const userOpHash = await bundlerClient.sendUserOperation({
        account: smartAccount,
        calls: [{
            to: RECIPIENT,
            value: parseEther('0.001'),
            data: '0x',
        }],
        ...gasPrice,
    })

    console.log('UserOp Hash:', userOpHash)

    const receipt = await bundlerClient.waitForUserOperationReceipt({
        hash: userOpHash,
    })

    console.log('✅ User Operation confirmed!')
    console.log('Tx Hash:', receipt.receipt.transactionHash)
}

main().catch(console.error)