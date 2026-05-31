import 'dotenv/config'
import {
    Implementation,
    toMetaMaskSmartAccount,
    createDelegation,
    ExecutionMode,
} from '@metamask/smart-accounts-kit'
import {
    createCaveatBuilder,
    encodeDelegations,
    encodeExecutionCalldata,
} from '@metamask/smart-accounts-kit/utils'
import { DelegationManager } from '@metamask/delegation-abis'
import { privateKeyToAccount, generatePrivateKey } from 'viem/accounts'
import { parseEther, encodeFunctionData } from 'viem'
import { publicClient } from '../config/client'
import { getGasPrice, getBundlerWithPaymaster } from '../config/bundler'

if (!process.env.PRIVATE_KEY) throw new Error('PRIVATE_KEY not set in .env')

const main = async () => {
    // Alice = akun nyata dari .env (harus sudah punya ETH di Sepolia)
    const aliceEOA = privateKeyToAccount(process.env.PRIVATE_KEY as `0x${string}`)
    const aliceSmartAccount = await toMetaMaskSmartAccount({
        client: publicClient,
        implementation: Implementation.Hybrid,
        deployParams: [aliceEOA.address, [], [], []],
        deploySalt: '0x',
        signer: { account: aliceEOA },
    })
    console.log('Alice (Delegator):', aliceSmartAccount.address)

    // Bob = akun sementara (delegate), tidak perlu ETH
    const bobKey = generatePrivateKey()
    const bobEOA = privateKeyToAccount(bobKey)
    const bobSmartAccount = await toMetaMaskSmartAccount({
        client: publicClient,
        implementation: Implementation.Hybrid,
        deployParams: [bobEOA.address, [], [], []],
        deploySalt: '0x',
        signer: { account: bobEOA },
    })
    console.log('Bob (Delegate):', bobSmartAccount.address)

    const env = aliceSmartAccount.environment
    const paymasterBundler = getBundlerWithPaymaster()
    const gasPrice = await getGasPrice()

    // Step 1: Deploy Alice's smart account on-chain
    // Wajib dilakukan agar DelegationManager bisa verifikasi signature Alice via isValidSignature()
    console.log('\nDeploying Alice smart account on-chain...')
    const deployHash = await paymasterBundler.sendUserOperation({
        account: aliceSmartAccount,
        calls: [{ to: aliceSmartAccount.address, data: '0x', value: 0n }],
        ...gasPrice,
    })
    await paymasterBundler.waitForUserOperationReceipt({ hash: deployHash })
    console.log('Alice account deployed ✅')

    // Step 2: Buat dan tanda-tangani delegation
    const delegation = createDelegation({
        environment: env,
        from: aliceSmartAccount.address,
        to: bobSmartAccount.address,
        scope: {
            type: 'nativeTokenTransferAmount',
            maxAmount: parseEther('0.01'),
        },
        caveats: createCaveatBuilder(env, { allowInsecureUnrestrictedDelegation: true })
            .addCaveat('allowedTargets', { targets: ['0x01d961f525ee8c5a6011f275fa2b2aa9417bc8f1' as `0x${string}`] })
            .build(),
    })
    console.log('\nDelegation created')
    console.log('  - allowedTargets: 0x01d961f525ee8c5a6011f275fa2b2aa9417bc8f1')
    console.log('  - maxAmount: 0.01 ETH')

    const signature = await aliceSmartAccount.signDelegation({ delegation })
    const signedDelegation = { ...delegation, signature }
    console.log('Delegation signed ✅')

    // Step 3: Bob meredeem delegation (mengeksekusi atas nama Alice)
    const delegationManagerAddress = env.DelegationManager
    const permissionContext = encodeDelegations([signedDelegation])
    const mode = ExecutionMode.SingleDefault
    const executionCalldata = encodeExecutionCalldata([{
        target: '0x01d961f525ee8c5a6011f275fa2b2aa9417bc8f1' as const,
        value: 0n,
        callData: '0x',
    }])

    const redeemCalldata = encodeFunctionData({
        abi: DelegationManager,
        functionName: 'redeemDelegations',
        args: [[permissionContext], [mode], [executionCalldata]],
    })

    console.log('\nBob redeems delegation...')

    const userOpHash = await paymasterBundler.sendUserOperation({
        account: bobSmartAccount,
        calls: [{
            to: delegationManagerAddress,
            data: redeemCalldata,
            value: 0n,
        }],
        ...gasPrice,
    })

    console.log('UserOp Hash:', userOpHash)

    const receipt = await paymasterBundler.waitForUserOperationReceipt({
        hash: userOpHash,
    })

    console.log('\n✅ Delegation redeemed! Bob executed tx on behalf of Alice.')
    console.log('Tx Hash:', receipt.receipt.transactionHash)
}

main().catch(console.error)