import React, { useEffect, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import PropTypes from 'prop-types';
import {
  View,
  LinkFont,
  HoverButton
  // Text
  // SmallText,
  // NumericalValue,
  // Image
} from 'modules/styled/uni';
import { timeLeft, getTimestamp } from 'utils/numbers';

// import { timeLeft, abbreviateNumber as toFixed } from 'utils/numbers';
import { colors } from 'styles';
import { PAYOUT_TIME } from 'server/config/globalConstants';
import { showModal } from 'modules/navigation/navigation.actions';
import { PieChart } from 'modules/stats/piechart';
import CoinStat from 'modules/stats/coinStat.component';
import Tooltip from 'modules/tooltip/tooltip.component';
import { CENTER_BUTTON_SIZE } from 'styles/layout';
// import styled from 'styled-components/primitives';

// const coinImage = require('app/public/img/relevantcoin.png');

// const CoinImage = styled(Image)`
//   position: absolute;
//   left: ${() => sizing(-2)};
//   top: ${() => sizing(-2)};
// `;

CenterButton.propTypes = {
  post: PropTypes.object,
  votedUp: PropTypes.bool,
  horizontal: PropTypes.bool
};

export function CenterButton({ post, votedUp, horizontal }) {
  const { payoutTime } = post.data;

  const dispatch = useDispatch();
  const openBetModal = () => dispatch(showModal('investModal', { postId: post._id }));

  const timer = (
    <View w={CENTER_BUTTON_SIZE} h={CENTER_BUTTON_SIZE}>
      <Timer payoutTime={payoutTime} post={post} />
    </View>
  );

  return (
    <View p={horizontal ? '0 1.5' : '.75 0'}>
      {votedUp ? (
        <BetButton size={CENTER_BUTTON_SIZE} openBetModal={openBetModal} post={post} />
      ) : (
        timer
      )}
    </View>
  );
}

BetButton.propTypes = {
  size: PropTypes.number,
  openBetModal: PropTypes.func,
  post: PropTypes.object
};

export function BetButton({ size, openBetModal, post }) {
  const earning = useSelector(state =>
    state.earnings.pending
      .map(e => state.earnings.entities[e])
      .find(ee => ee.post === post._id)
  );

  const tooltipData = {
    text: earning
      ? 'This is your projected reward for this post, click to increase your bet'
      : 'Bet on the relevance of this post to earn rewards',
    position: 'right',
    desktopOnly: true
  };

  const estimatedRewards =
    earning && (earning.estimatedPostPayout * earning.shares) / earning.totalPostShares;

  return (
    <View>
      <Tooltip data={tooltipData} name="betButton" globalEventOff={'click'}>
        <HoverButton
          w={size}
          h={size * 0.8}
          minwidth={'0'}
          bradius={size / 2}
          onPress={openBetModal}
          bg={earning ? 'transparent' : colors.gold}
          p={'0 0'}
          c={colors.white}
          // bc={colors.gold}
          // bw={1}
          // border //= {!earning}
        >
          {earning ? (
            <CoinStat
              mr={0}
              spaceBetween={0}
              lh={2}
              fs={1.5}
              size={1.5}
              align={'center'}
              amount={estimatedRewards}
            />
          ) : (
            <LinkFont c={earning ? colors.white : colors.black}>BET</LinkFont>
          )}
        </HoverButton>
      </Tooltip>
    </View>
  );
}

// <CoinImage resizeMode="contain" w={2} h={2} source={coinImage} />
// <NumericalValue ls={1.5} fs={1.5}>
//   {toFixed(earning.stakedTokens)}
// </NumericalValue>

Timer.propTypes = {
  payoutTime: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
  post: PropTypes.object
};

export function Timer({ payoutTime, post }) {
  const updateTimerParams = useCallback(() => {
    const now = new Date();
    const payoutDate = new Date(payoutTime);
    const percent = 100 - (100 * (payoutDate.getTime() - now.getTime())) / PAYOUT_TIME;
    const text = timeLeft({ _date: payoutTime, index: 1 });
    return { percent, text };
  }, [payoutTime]);

  const [timer, updateTimer] = useState(updateTimerParams);

  useEffect(() => {
    const id = setInterval(() => updateTimer(updateTimerParams), 10000);
    return () => clearInterval(id);
  }, [payoutTime, updateTimerParams]);

  const timeLelft = getTimestamp(post.data.payoutTime, true).toLowerCase();

  const tooltipData = {
    text: `Upvote this post to be able to bet on it.\nYou have ${timeLelft} to bet.`,
    position: 'right'
  };

  return (
    <React.Fragment>
      <PieChart color={colors.black} strokeWidth={1} {...timer} />
      <Tooltip name="bet" data={tooltipData} />
    </React.Fragment>
  );
}
