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
import { bundlerClient, getGasPrice } from '../config/bundler'

const main = async () => {
    const aliceKey = generatePrivateKey()
    const aliceEOA = privateKeyToAccount(aliceKey)
    const aliceSmartAccount = await toMetaMaskSmartAccount({
        client: publicClient,
        implementation: Implementation.Hybrid,
        deployParams: [aliceEOA.address, [], [], []],
        deploySalt: '0x',
        signer: { account: aliceEOA },
    })
    console.log('Alice (Delegator):', aliceSmartAccount.address)

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

    const caveatBuilder = createCaveatBuilder(env)
    const delegation = createDelegation({
        environment: env,
        from: aliceSmartAccount.address,
        to: bobSmartAccount.address,
        caveats: caveatBuilder
            .addCaveat('allowedTargets', { targets: ['0xSpecificContractAddress' as `0x${string}`] })
            .addCaveat('valueLte', { maxValue: parseEther('0.5') })
            .build(),
        parentPermissionContext: [],
    })
    console.log('Delegation created')
    console.log('  - allowedTargets: 0xSpecificContractAddress')
    console.log('  - valueLte: 0.5 ETH')

    const signature = await aliceSmartAccount.signDelegation({ delegation })
    const signedDelegation = { ...delegation, signature }
    console.log('Delegation signed')

    const delegationManagerAddress = env.DelegationManager
    const permissionContext = encodeDelegations([signedDelegation])
    const mode = ExecutionMode.SingleDefault
    const executionCalldata = encodeExecutionCalldata([{
        target: '0x01d961f525ee8c5a6011f275fa2b2aa9417bc8f1' as const,
        value: parseEther('0.001'),
        callData: '0x',
    }])

    const redeemCalldata = encodeFunctionData({
        abi: DelegationManager,
        functionName: 'redeemDelegations',
        args: [[permissionContext], [mode], [executionCalldata]],
    })

    console.log('Bob redeems delegation...')

    const gasPrice = await getGasPrice()

    const userOpHash = await bundlerClient.sendUserOperation({
        account: bobSmartAccount,
        calls: [{
            to: delegationManagerAddress,
            data: redeemCalldata,
            value: 0n,
        }],
        ...gasPrice,
    })

    console.log('UserOp Hash:', userOpHash)

    const receipt = await bundlerClient.waitForUserOperationReceipt({
        hash: userOpHash,
    })

    console.log('✅ Delegation redeemed! Bob executed tx on behalf of Alice.')
    console.log('Tx Hash:', receipt.receipt.transactionHash)
}

main().catch(console.error)