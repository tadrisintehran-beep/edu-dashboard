declare module 'jalaali-js' {
  interface JalaaliDate { jy: number; jm: number; jd: number }
  interface GregorianDate { gy: number; gm: number; gd: number }

  function toJalaali(gy: number, gm: number, gd: number): JalaaliDate
  function toJalaali(date: Date): JalaaliDate
  function toGregorian(jy: number, jm: number, jd: number): GregorianDate
  function isValidJalaaliDate(jy: number, jm: number, jd: number): boolean
  function isLeapJalaaliYear(jy: number): boolean
  function jalaaliMonthLength(jy: number, jm: number): number

  const jalaali: {
    toJalaali: typeof toJalaali
    toGregorian: typeof toGregorian
    isValidJalaaliDate: typeof isValidJalaaliDate
    isLeapJalaaliYear: typeof isLeapJalaaliYear
    jalaaliMonthLength: typeof jalaaliMonthLength
  }
  export default jalaali
  export { toJalaali, toGregorian, isValidJalaaliDate, isLeapJalaaliYear, jalaaliMonthLength }
}
