
const HOURS = 60 * 60 * 1000;
const DAYS = HOURS * 24;
export const PAYOUT_FREQUENCY = 1 * HOURS; // how often we compute payouts
const PAYOUT_FREQUENCY_FRACTION = 1 / (365 * 24); // fraction of year
const YEARLY_INFLATION = 0.1; // 10%
export const INTERVAL_INFLAITION = Math.pow(1 + YEARLY_INFLATION, PAYOUT_FREQUENCY_FRACTION) - 1;
export const INIT_COIN = 1000000;
export const SHARE_DECAY = 6 * DAYS; // time it takes to decay payout post shares
export const PAYOUT_TIME = 3 * DAYS; // time it takes for post to pay out
// const AUTHOR_SHARE = 1 / 2;