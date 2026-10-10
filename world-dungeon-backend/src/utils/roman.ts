const ROMAN_MAP: [number, string][] = [
  [1000, 'M'],
  [900, 'CM'],
  [500, 'D'],
  [400, 'CD'],
  [100, 'C'],
  [90, 'XC'],
  [50, 'L'],
  [40, 'XL'],
  [10, 'X'],
  [9, 'IX'],
  [5, 'V'],
  [4, 'IV'],
  [1, 'I'],
]

export function toRoman(num: number): string {
  if (num <= 0 || num > 3999) {
    return String(num)
  }
  let result = ''
  let remaining = num
  for (const [value, numeral] of ROMAN_MAP) {
    while (remaining >= value) {
      result += numeral
      remaining -= value
    }
  }
  return result
}
