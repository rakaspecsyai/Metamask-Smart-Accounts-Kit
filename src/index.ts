import 'dotenv/config'
import { parseEther } from 'viem'
import { getOrCreateSmartAccount } from './accounts/smartAccount'
import { bundlerClient, getGasPrice } from './config/bundler'

const RECIPIENT = '0xA5FE0888cfa49B5479f41FD4389F0C7F3c3d7077' as const

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