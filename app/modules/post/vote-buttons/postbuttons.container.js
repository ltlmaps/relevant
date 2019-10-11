import React, { useRef, useState, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import PropTypes from 'prop-types';
import { browserAlerts } from 'app/utils/alert';
import { getPostType } from 'app/utils/post';
import { View } from 'modules/styled/uni';
import { triggerAnimation } from 'modules/animation/animation.actions';
import { useCommunity } from 'modules/community/community.selectors';
import { CenterButton } from './center-button';
import PostButton from './postbutton';
import { vote as voteAction } from '../invest.actions';
import PostRank from './postrank';

let Analytics;
let ReactGA;
if (process.env.WEB !== 'true') {
  Analytics = require('react-native-firebase-analytics');
} else {
  ReactGA = require('react-ga').default;
}

PostButtons.propTypes = {
  auth: PropTypes.object,
  post: PropTypes.shape({
    id: PropTypes.string,
    data: PropTypes.object,
    user: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
    myVote: PropTypes.object,
    parentPost: PropTypes.string,
    type: PropTypes.string,
    url: PropTypes.string
  }),
  color: PropTypes.string,
  horizontal: PropTypes.bool
};

export default function PostButtons({ post, auth, color, horizontal }) {
  const dispatch = useDispatch();
  const investButton = useRef();
  const [processingVote, setProcessingVote] = useState(false);
  const community = useCommunity();
  const { user } = auth;

  const castVote = useCallback(
    async (e, vote, amount) => {
      try {
        e.preventDefault();
        e.stopPropagation();
        if (processingVote) return;

        const type = amount > 0 ? 'upvote' : 'downvote';
        if (!auth.isAuthenticated)
          throw new Error(`You must be logged in to ${type} posts`);

        setProcessingVote(true);
        const res = await dispatch(voteAction(amount, post, user, vote));
        setProcessingVote(false);
        if (!res || res.undoInvest) return;

        const rankChange = computeRankChange({ post, rankChange: res.rankChange });
        const el = investButton;
        const params = { amount: rankChange, horizontal };
        launchAnimation({ type, params, el, dispatch });
        runAnalytics(type);
      } catch (err) {
        setProcessingVote(false);
        browserAlerts.alert(err.message);
      }
    },
    [auth.isAuthenticated, user, processingVote, dispatch, post, horizontal]
  );

  if (!post || post === 'notFound') return null;

  const canBet = getCanBet({ post, community, user });
  const tooltipData = getTooltipData(post);
  const voteStatus = getVoteStatus(user, post);

  return (
    <View
      ref={investButton}
      onLayout={() => {}}
      align="center"
      fdirection={horizontal ? 'row' : 'column'}
      style={{ opacity: 1 }} // need this to make animations work on android
    >
      <PostButton
        tooltipData={tooltipData}
        key={`${post.id}-up`}
        imageSet="UPVOTE"
        isActive={voteStatus.up}
        alt="upvote"
        color={color}
        onPress={e => castVote(e, voteStatus.vote, 1)}
      />
      {canBet ? (
        <CenterButton horizontal={horizontal} votedUp={voteStatus.up} post={post} />
      ) : (
        <PostRank horizontal={horizontal} color={color} post={post} />
      )}
      <PostButton
        tooltipData={tooltipData}
        key={`${post.id}-down`}
        imageSet="DOWNVOTE"
        isActive={voteStatus.down}
        alt="downvote"
        color={color}
        onPress={e => castVote(e, voteStatus.vote, -1)}
      />
    </View>
  );
}

function getVoteStatus(user, post) {
  const ownPost = user && user._id === post.user;
  const vote = ownPost ? true : post.myVote;
  return {
    vote,
    up: vote && vote.amount > 0,
    down: vote && vote.amount < 0
  };
}

function getTooltipData(post) {
  const postType = getPostType({ post });
  const tipText =
    postType === 'link'
      ? 'Upvote articles that are worth reading, downvote spam.'
      : `Upvote quality ${postType}s and downvote spam`;

  return {
    text: tipText,
    position: 'right',
    desktopOnly: true
  };
}

function getCanBet({ post, community, user }) {
  const now = new Date();
  const bettingEnabled = community && community.betEnabled;
  const manualBet = user && user.notificationSettings.bet.manual;
  return (
    manualBet &&
    bettingEnabled &&
    post.data.eligibleForReward &&
    now.getTime() < new Date(post.data.payoutTime).getTime()
  );
}

function computeRankChange({ post, rankChange }) {
  const startRank = post.data ? post.data.pagerank : 0;
  const total = startRank + rankChange + 1;
  return Math.round(total) - Math.round(startRank);
}

function launchAnimation({ type, params, el, dispatch }) {
  el.current.measureInWindow((x, y, w, h) => {
    const parent = { x, y, w, h };
    if (x + y + w + h === 0) return;
    const action = triggerAnimation(type, { parent, ...params });
    dispatch(action);
  });
}

function runAnalytics(type) {
  Analytics && Analytics.logEvent(type);
  ReactGA &&
    ReactGA.event({
      category: 'User',
      action: `${type}ed a post`
    });
}