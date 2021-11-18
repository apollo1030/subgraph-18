import { Address, BigDecimal, BigInt, log} from '@graphprotocol/graph-ts'
// import { OHMDAIBond } from '../../generated/OHMDAIBond/OHMDAIBond';
import { DAIBond } from '../../generated/DAIBond/DAIBond';
// import { OHMFRAXBond } from '../../generated/OHMFRAXBond/OHMFRAXBond';
import { FRAXBond } from '../../generated/FRAXBond/FRAXBond';

import { BondDiscount, Transaction } from '../../generated/schema'
import { DAIBOND_CONTRACTS, DAIBOND_CONTRACTS_BLOCK, FRAXBOND_CONTRACT, FRAXBOND_CONTRACT_BLOCK } from './Constants';
import { hourFromTimestamp } from './Dates';
import { toDecimal } from './Decimals';
import { getOHMUSDRate } from './Price';

export function loadOrCreateBondDiscount(timestamp: BigInt): BondDiscount{
    let hourTimestamp = hourFromTimestamp(timestamp);

    let bondDiscount = BondDiscount.load(hourTimestamp)
    if (bondDiscount == null) {
        bondDiscount = new BondDiscount(hourTimestamp)
        bondDiscount.timestamp = timestamp
        bondDiscount.dai_discount  = BigDecimal.fromString("0")
        bondDiscount.ohmdai_discount = BigDecimal.fromString("0")
        bondDiscount.frax_discount = BigDecimal.fromString("0")
        bondDiscount.ohmfrax_discount = BigDecimal.fromString("0")
        bondDiscount.save()
    }
    return bondDiscount as BondDiscount
}

export function updateBondDiscounts(transaction: Transaction): void{
    let bd = loadOrCreateBondDiscount(transaction.timestamp);
    let ohmRate = getOHMUSDRate();

    // //OHMDAI
    // if(transaction.blockNumber.gt(BigInt.fromString(OHMDAISLPBOND_CONTRACT_BLOCK))){
    //     let bond = OHMDAIBond.bind(Address.fromString(OHMDAISLPBOND_CONTRACT))
    //     let price_call = bond.try_bondPriceInUSD()
    //     if(price_call.reverted===false && price_call.value.gt(BigInt.fromI32(0))){
    //         bd.ohmdai_discount = ohmRate.div(toDecimal(price_call.value, 18))
    //         bd.ohmdai_discount = bd.ohmdai_discount.minus(BigDecimal.fromString("1"))
    //         bd.ohmdai_discount = bd.ohmdai_discount.times(BigDecimal.fromString("100"))
    //         log.debug("OHMDAI Discount OHM price {}  Bond Price {}  Discount {}", [ohmRate.toString(), price_call.value.toString(), bd.ohmfrax_discount.toString()])
    //     }
    // }

    //DAI
    if(transaction.blockNumber.gt(BigInt.fromString(DAIBOND_CONTRACTS_BLOCK))){
        let bond = DAIBond.bind(Address.fromString(DAIBOND_CONTRACTS))
        let price_call = bond.try_bondPriceInUSD()
        if(price_call.reverted===false && price_call.value.gt(BigInt.fromI32(0))){
            bd.dai_discount = ohmRate.div(toDecimal(price_call.value, 18))
            bd.dai_discount = bd.dai_discount.minus(BigDecimal.fromString("1"))
            bd.dai_discount = bd.dai_discount.times(BigDecimal.fromString("100"))
            log.debug("DAI Discount OHM price {}  Bond Price {}  Discount {}", [ohmRate.toString(), price_call.value.toString(), bd.ohmfrax_discount.toString()])
        }    
    }

    //OHMFRAX
    // if(transaction.blockNumber.gt(BigInt.fromString(OHMFRAXLPBOND_CONTRACT_BLOCK))){
    //     let bond = OHMFRAXBond.bind(Address.fromString(OHMFRAXLPBOND_CONTRACT))
    //     let price_call = bond.try_bondPriceInUSD()
    //     if(price_call.reverted===false && price_call.value.gt(BigInt.fromI32(0))){
    //         bd.ohmfrax_discount = ohmRate.div(toDecimal(price_call.value, 18))
    //         bd.ohmfrax_discount = bd.ohmfrax_discount.minus(BigDecimal.fromString("1"))
    //         bd.ohmfrax_discount = bd.ohmfrax_discount.times(BigDecimal.fromString("100"))
    //         log.debug("OHMFRAX Discount OHM price {}  Bond Price {}  Discount {}", [ohmRate.toString(), price_call.value.toString(), bd.ohmfrax_discount.toString()])
    //     }
    // }

    //FRAX
    if(transaction.blockNumber.gt(BigInt.fromString(FRAXBOND_CONTRACT_BLOCK))){
        let bond = FRAXBond.bind(Address.fromString(FRAXBOND_CONTRACT))
        let price_call = bond.try_bondPriceInUSD()
        if(price_call.reverted===false && price_call.value.gt(BigInt.fromI32(0))){
            bd.frax_discount = ohmRate.div(toDecimal(price_call.value, 18))
            bd.frax_discount = bd.frax_discount.minus(BigDecimal.fromString("1"))
            bd.frax_discount = bd.frax_discount.times(BigDecimal.fromString("100"))
            log.debug("FRAX Discount OHM price {}  Bond Price {}  Discount {}", [ohmRate.toString(), price_call.value.toString(), bd.ohmfrax_discount.toString()])
        }
    }

    bd.save()
}