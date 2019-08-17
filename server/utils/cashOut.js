import Earnings from '../api/earnings/earnings.model';

export async function logCashOut(user, cashOutAmt, next) {
  try {
    const earnings = await Earnings.find({
      user: user._id,
      status: 'paidout',
      earned: { $gt: 0 }
    });
    const totalPreviousPaidout = earnings.reduce(getTotalEarnings, 0);
    const cashOutLog = new Earnings({
      user: user._id,
      cashOutAttempt: true,
      cashOutAmt,
      prevBalance: user.balance,
      endBalance: user.balance - cashOutAmt,
      totalPreviousPaidout,
      legacyAirdrop: user.legacyAirdrop,
      legacyTokens: user.legacyTokens,
      referralTokens: user.referralTokens,
      airdropTokens: user.airdropTokens
    });
    await cashOutLog.save();
    return true;
  } catch (err) {
    return next(new Error('Error logging cashOut', err));
  }
}

export function getTotalEarnings(total, currentVal) {
  total += currentVal.earned;
  return total;
}
