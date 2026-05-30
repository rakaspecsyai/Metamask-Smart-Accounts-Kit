import 'dotenv/config'
import { getOrCreateSmartAccount } from './accounts/smartAccount'
import { getBundlerWithPaymaster } from './config/bundler'

const RECIPIENT = '0x01d961f525ee8c5a6011f275fa2b2aa9417bc8f1' as const

const main = async () => {
    const smartAccount = await getOrCreateSmartAccount()

    console.log('💡 User does NOT need ETH for gas — dApp sponsors it!')
    console.log()

    const bundlerWithPaymaster = getBundlerWithPaymaster()

    const userOpHash = await bundlerWithPaymaster.sendUserOperation({
        account: smartAccount,
        calls: [{ to: RECIPIENT, value: 0n, data: '0x' }],
    })

    console.log('UserOp Hash:', userOpHash)

    const receipt = await bundlerWithPaymaster.waitForUserOperationReceipt({
        hash: userOpHash,
    })

    console.log('✅ Gasless User Operation confirmed!')
    console.log('Tx Hash:', receipt.receipt.transactionHash)
}

main().catch(console.error)