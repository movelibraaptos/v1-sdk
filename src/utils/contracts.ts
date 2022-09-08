import { AptosResourceType } from 'types/aptos'
import { checkAddress } from 'utils/hex'

const EQUAL = 0
const LESS_THAN = 1
const GREATER_THAN = 2

function cmp(a: number, b: number) {
  if (a === b) {
    return EQUAL
  } else if (a < b) {
    return LESS_THAN
  } else {
    return GREATER_THAN
  }
}

// AnimeSwap define `<` :
// 1. length(CoinType1) < length(CoinType1)
// 2. length(CoinType1) == length(CoinType1) && String(CoinType1) < String(CoinType2)
function compare(symbolX: string, symbolY: string) {
  const iX = symbolX.length
  const iY = symbolY.length

  const lenCmp = cmp(iX, iY)
  if (lenCmp != EQUAL) return lenCmp
  let index = 0
  while (index < iX - 1) {
    const elemCmp = cmp(symbolX.charCodeAt(iX), symbolY.charCodeAt(iY))
    if (elemCmp !== 0) {
      return elemCmp
    }
    index++
  }

  return EQUAL
}

export function isSortedSymbols(symbolX: string, symbolY: string) {
  return compare(symbolX, symbolY) === LESS_THAN
}

export function composeType(address: string, generics: AptosResourceType[]): AptosResourceType
export function composeType(
  address: string,
  struct: string,
  generics?: AptosResourceType[]
): AptosResourceType
export function composeType(
  address: string,
  module: string,
  struct: string,
  generics?: AptosResourceType[]
): AptosResourceType

export function composeType(address: string, ...args: unknown[]): AptosResourceType {
  const generics: string[] = Array.isArray(args[args.length - 1])
    ? (args.pop() as string[])
    : []
  const chains = [address, ...args].filter(Boolean)
  let result: string = chains.join('::')
  if (generics && generics.length) {
    result += `<${generics.join(',')}>`
  }
  return result
}

export function composeLPCoin(address: string, coin_x: string, coin_y: string) {
  const isSorted = isSortedSymbols(coin_x, coin_y)
  if (isSorted) {
    return composeType(address, 'DemoLPTokenV1', 'LPToken', [coin_x, coin_y])
  } else {
    return composeType(address, 'DemoLPTokenV1', 'LPToken', [coin_y, coin_x])
  }
}

export function composeLP(address: string, coin_x: string, coin_y: string) {
  const isSorted = isSortedSymbols(coin_x, coin_y)
  const lpToken = composeLPCoin(address, coin_x, coin_y)
  if (isSorted) {
    return composeType(address, 'DemoAnimeSwapPoolV1', 'LiquidityPool', [coin_x, coin_y, lpToken])
  } else {
    return composeType(address, 'DemoAnimeSwapPoolV1', 'LiquidityPool', [coin_y, coin_x, lpToken])
  }
}

export function composeSwapPoolData(address: string) {
  return composeType(address, 'DemoAnimeSwapPoolV1', 'PairAdmin')
}

export function extractAddressFromType(type: string) {
  return type.split('::')[0]
}

export function checkAptosType(
  type: string,
  options: { leadingZero: boolean } = { leadingZero: true }
): boolean {
  let _type = type.replace(/\s/g, '')

  const openBracketsCount = _type.match(/</g)?.length ?? 0
  const closeBracketsCount = _type.match(/>/g)?.length ?? 0

  if (openBracketsCount !== closeBracketsCount) {
    return false
  }

  const genericsString = _type.match(/(<.+>)$/)
  const generics = genericsString?.[1]?.match(
    /(\w+::\w+::\w+)(?:<.*?>(?!>))?/g
  )

  if (generics) {
    _type = _type.slice(0, _type.indexOf('<'))
    const validGenerics = generics.every((g) => {
      const gOpenCount = g.match(/</g)?.length ?? 0
      const gCloseCount = g.match(/>/g)?.length ?? 0
      let t = g
      if (gOpenCount !== gCloseCount) {
        t = t.slice(0, -(gCloseCount - gOpenCount))
      }

      return checkAptosType(t, options)
    })

    if (!validGenerics) {
      return false
    }
  }

  const parts = _type.split('::')
  if (parts.length !== 3) {
    return false
  }

  return (
    checkAddress(parts[0], options) &&
    parts[1].length >= 1 &&
    parts[2].length >= 1
  )
}
