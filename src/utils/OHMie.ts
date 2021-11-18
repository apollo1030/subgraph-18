import { Address, BigDecimal, BigInt, log } from '@graphprotocol/graph-ts'
import { Ohmie, Transaction } from '../../generated/schema'
import { OlympusERC20 } from '../../generated/sOlympusERC20/OlympusERC20'
import { sOlympusERC20 } from '../../generated/sOlympusERC20/sOlympusERC20'
import { DAIBond } from '../../generated/DAIBond/DAIBond'
import { FRAXBond } from '../../generated/FRAXBond/FRAXBond'

import { OHM_ERC20_CONTRACT, SOHM_ERC20_CONTRACT, DAIBOND_CONTRACTS_BLOCK, DAIBOND_CONTRACTS, FRAXBOND_CONTRACT, FRAXBOND_CONTRACT_BLOCK } from '../utils/Constants'
import { loadOrCreateOhmieBalance } from './OhmieBalances'
import { toDecimal } from './Decimals'
import { getOHMUSDRate } from './Price'
import { loadOrCreateContractInfo } from './ContractInfo'
import { getHolderAux } from './Au_'

export function loadOrCreateOHMie(addres: Address): Ohmie{
    let ohmie = Ohmie.load(addres.toHex())
    if (ohmie == null) {
        let holders = getHolderAux()
        holders.value = holders.value.plus(BigInt.fromI32(1))
        holders.save()

        ohmie = new Ohmie(addres.toHex())
        ohmie.active = true
        ohmie.save()
    }
    return ohmie as Ohmie
}

export function updateOhmieBalance(ohmie: Ohmie, transaction: Transaction): void{

    let balance = loadOrCreateOhmieBalance(ohmie, transaction.timestamp)

    let ohm_contract = OlympusERC20.bind(Address.fromString(OHM_ERC20_CONTRACT))
    let sohm_contract = sOlympusERC20.bind(Address.fromString(SOHM_ERC20_CONTRACT))
    balance.ohmBalance = toDecimal(ohm_contract.balanceOf(Address.fromString(ohmie.id)), 9)
    let sohmBalance = toDecimal(sohm_contract.balanceOf(Address.fromString(ohmie.id)), 9)
    balance.sohmBalance = sohmBalance

    let stakes = balance.stakes

    let cinfoSohmBalance = loadOrCreateContractInfo(ohmie.id + transaction.timestamp.toString() + "sOlympusERC20")
    cinfoSohmBalance.name = "sOHM"
    cinfoSohmBalance.contract = SOHM_ERC20_CONTRACT
    cinfoSohmBalance.amount = sohmBalance
    cinfoSohmBalance.save()
    stakes.push(cinfoSohmBalance.id)

    balance.stakes = stakes

    if(ohmie.active && balance.ohmBalance.lt(BigDecimal.fromString("0.01")) && balance.sohmBalance.lt(BigDecimal.fromString("0.01"))){
        let holders = getHolderAux()
        holders.value = holders.value.minus(BigInt.fromI32(1))
        holders.save()
        ohmie.active = false
    }
    else if(ohmie.active==false && (balance.ohmBalance.gt(BigDecimal.fromString("0.01")) || balance.sohmBalance.gt(BigDecimal.fromString("0.01")))){
        let holders = getHolderAux()
        holders.value = holders.value.plus(BigInt.fromI32(1))
        holders.save()
        ohmie.active = true
    }

    //OHM-DAI
    let bonds = balance.bonds
    // if(transaction.blockNumber.gt(BigInt.fromString(OHMDAISLPBOND_CONTRACT1_BLOCK))){
    //     let bondOHMDai_contract = OHMDAIBondV1.bind(Address.fromString(OHMDAISLPBOND_CONTRACT1))
    //     let pending = bondOHMDai_contract.getDepositorInfo(Address.fromString(ohmie.id))
    //     if (pending.value1.gt(BigInt.fromString("0"))){
    //         let pending_bond = toDecimal(pending.value1, 9)
    //         balance.bondBalance = balance.bondBalance.plus(pending_bond)

    //         let binfo = loadOrCreateContractInfo(ohmie.id + transaction.timestamp.toString() + "OHMDAIBondV1")
    //         binfo.name = "OHM-DAI"
    //         binfo.contract = OHMDAISLPBOND_CONTRACT1
    //         binfo.amount = pending_bond
    //         binfo.save()
    //         bonds.push(binfo.id)

    //         log.debug("Ohmie {} pending OHMDAIBondV1 V1 {} on tx {}", [ohmie.id, toDecimal(pending.value1, 9).toString(), transaction.id])
    //     }
    // }
    //DAI
    if(transaction.blockNumber.gt(BigInt.fromString(DAIBOND_CONTRACTS_BLOCK))){
        let bondDai_contract = DAIBond.bind(Address.fromString(DAIBOND_CONTRACTS))
        let pending = bondDai_contract.bondInfo(Address.fromString(ohmie.id))
        if (pending.value1.gt(BigInt.fromString("0"))){
            let pending_bond = toDecimal(pending.value1, 9)
            balance.bondBalance = balance.bondBalance.plus(pending_bond)

            let binfo = loadOrCreateContractInfo(ohmie.id + transaction.timestamp.toString() + "DAIBond")
            binfo.name = "DAI"
            binfo.contract = DAIBOND_CONTRACTS
            binfo.amount = pending_bond
            binfo.save()
            bonds.push(binfo.id)

            log.debug("Ohmie {} pending DAIBond {} on tx {}", [ohmie.id, toDecimal(pending.value1, 9).toString(), transaction.id])
        }
    }
    //OHM-FRAX
    // if(transaction.blockNumber.gt(BigInt.fromString(OHMFRAXLPBOND_CONTRACT1_BLOCK))){
    //     let bondFRAXDai_contract = OHMFRAXBondV1.bind(Address.fromString(OHMFRAXLPBOND_CONTRACT1))
    //     let pending = bondFRAXDai_contract.bondInfo(Address.fromString(ohmie.id))
    //     if (pending.value1.gt(BigInt.fromString("0"))){
    //         let pending_bond = toDecimal(pending.value1, 9)
    //         balance.bondBalance = balance.bondBalance.plus(pending_bond)

    //         let binfo = loadOrCreateContractInfo(ohmie.id + transaction.timestamp.toString() + "OHMFRAXBondV1")
    //         binfo.name = "DAI"
    //         binfo.contract = OHMFRAXLPBOND_CONTRACT1
    //         binfo.amount = pending_bond
    //         binfo.save()
    //         bonds.push(binfo.id)

    //         log.debug("Ohmie {} pending OHMFRAXBondV1 V1 {} on tx {}", [ohmie.id, toDecimal(pending.value1, 9).toString(), transaction.id])
    //     }
    // }
    // if(transaction.blockNumber.gt(BigInt.fromString(OHMFRAXLPBOND_CONTRACT2_BLOCK))){
    //     let bondFRAXDai_contract = OHMFRAXBondV2.bind(Address.fromString(OHMFRAXLPBOND_CONTRACT2))
    //     let pending = bondFRAXDai_contract.bondInfo(Address.fromString(ohmie.id))
    //     if (pending.value1.gt(BigInt.fromString("0"))){
    //         let pending_bond = toDecimal(pending.value1, 9)
    //         balance.bondBalance = balance.bondBalance.plus(pending_bond)

    //         let binfo = loadOrCreateContractInfo(ohmie.id + transaction.timestamp.toString() + "OHMFRAXBondV2")
    //         binfo.name = "DAI"
    //         binfo.contract = OHMFRAXLPBOND_CONTRACT2
    //         binfo.amount = pending_bond
    //         binfo.save()
    //         bonds.push(binfo.id)

    //         log.debug("Ohmie {} pending OHMFRAXBondV2 V1 {} on tx {}", [ohmie.id, toDecimal(pending.value1, 9).toString(), transaction.id])
    //     }
    // }
    //FRAX
    if(transaction.blockNumber.gt(BigInt.fromString(FRAXBOND_CONTRACT_BLOCK))){
        let bondFRAX_contract = FRAXBond.bind(Address.fromString(FRAXBOND_CONTRACT))
        let pending = bondFRAX_contract.bondInfo(Address.fromString(ohmie.id))
        if (pending.value1.gt(BigInt.fromString("0"))){
            let pending_bond = toDecimal(pending.value1, 9)
            balance.bondBalance = balance.bondBalance.plus(pending_bond)

            let binfo = loadOrCreateContractInfo(ohmie.id + transaction.timestamp.toString() + "FRAXBondV1")
            binfo.name = "DAI"
            binfo.contract = FRAXBOND_CONTRACT
            binfo.amount = pending_bond
            binfo.save()
            bonds.push(binfo.id)

            log.debug("Ohmie {} pending FRAXBondV1 V1 {} on tx {}", [ohmie.id, toDecimal(pending.value1, 9).toString(), transaction.id])
        }
    }
    // //WETH
    // if(transaction.blockNumber.gt(BigInt.fromString(ETHBOND_CONTRACT1_BLOCK))){
    //     let bondETH_contract = ETHBondV1.bind(Address.fromString(ETHBOND_CONTRACT1))
    //     let pending = bondETH_contract.bondInfo(Address.fromString(ohmie.id))
    //     if (pending.value1.gt(BigInt.fromString("0"))){
    //         let pending_bond = toDecimal(pending.value1, 9)
    //         balance.bondBalance = balance.bondBalance.plus(pending_bond)

    //         let binfo = loadOrCreateContractInfo(ohmie.id + transaction.timestamp.toString() + "FRAXBondV1")
    //         binfo.name = "DAI"
    //         binfo.contract = FRAXBOND_CONTRACT1
    //         binfo.amount = pending_bond
    //         binfo.save()
    //         bonds.push(binfo.id)

    //         log.debug("Ohmie {} pending ETHBondV1 V1 {} on tx {}", [ohmie.id, toDecimal(pending.value1, 9).toString(), transaction.id])
    //     }
    // }
    balance.bonds = bonds

    //TODO add LUSD and OHMLUSD

    //Price
    let usdRate = getOHMUSDRate()
    balance.dollarBalance = balance.ohmBalance.times(usdRate).plus(balance.sohmBalance.times(usdRate)).plus(balance.bondBalance.times(usdRate))
    balance.save()

    ohmie.lastBalance = balance.id;
    ohmie.save()
}