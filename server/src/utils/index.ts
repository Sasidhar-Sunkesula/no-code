
export function getDateTenYearsFromNow(): Date {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();
    const currentDay = currentDate.getDate();

    // Create a new date with the current day, month, and year + 10
    const tenYearsFromNow = new Date(currentYear + 10, currentMonth, currentDay);

    return tenYearsFromNow;
}
/**
* Checks if daily tokens should be reset (past midnight)
*/
export function shouldResetDaily(lastReset: Date): boolean {
    const now = new Date();
    const lastResetDate = new Date(lastReset);
    // Set both dates to midnight for comparison
    const nowDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const lastResetDay = new Date(lastResetDate.getFullYear(), lastResetDate.getMonth(), lastResetDate.getDate());

    // If the last reset day is before today, we should reset
    return lastResetDay < nowDay;
}

/**
 * Checks if monthly tokens should be reset (new month)
 */
export function shouldResetMonthly(lastReset: Date): boolean {
    const now = new Date();
    const lastResetDate = new Date(lastReset);

    // If month or year has changed, we should reset
    return lastResetDate.getMonth() !== now.getMonth() ||
        lastResetDate.getFullYear() !== now.getFullYear();
}

export type PlanInfo = {
    dailyTokenLimit: number;
    monthlyTokenLimit: number;
    dailyTokensUsed: number;
    monthlyTokensUsed: number;
}