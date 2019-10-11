import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import PropTypes from 'prop-types';
import { storage } from 'utils';
import {
  enableDesktopNotifications,
  hideBannerPrompt
} from 'modules/activity/activity.actions';
import { enableMobileNotifications } from 'modules/auth/auth.actions';
import MobileAlert from './mobile.banner';
import Banner from './banner.component';

const TEXT_DEFAULTS = {
  messageText: 'Enable notifications and get alerted when people respond',
  actionText: 'enable desktop notifications',
  dismissText: 'Dismiss'
};

const MESSAGE_TEXT_DEFAULTS = {
  upvoteComment: 'Get notified when someone comments on this thread',
  upvotePost: 'Get notified when you earn rewards for upvoting posts',
  createComment: 'Get notified when someone replies to your comment',
  createPost: 'Get notified when someone replies to your post'
};

PushNotification.propTypes = {
  messageText: PropTypes.string,
  actionText: PropTypes.string,
  dismissText: PropTypes.string,
  isMobile: PropTypes.bool,
  type: PropTypes.string
};

function PushNotification({
  messageText = TEXT_DEFAULTS.messageText,
  actionText = TEXT_DEFAULTS.actionText,
  dismissText = TEXT_DEFAULTS.dismissText,
  isMobile,
  type
}) {
  const user = useSelector(state => state.auth.user);
  const dispatch = useDispatch();

  const handleClick = () => dispatch(enableDesktopNotifications());
  const handleClickMobile = () => dispatch(enableMobileNotifications(user));

  const handleDismiss = () => {
    dispatch(hideBannerPrompt());
    const now = new Date().getTime();
    storage.set('pushDismissed', now);
  };

  const mainText = messageText || MESSAGE_TEXT_DEFAULTS[type];

  if (isMobile) {
    MobileAlert({
      title: 'Stay up to date',
      messageText: mainText,
      actionText,
      dismissText,
      onDismiss: handleDismiss,
      onClick: handleClickMobile
    });
    dispatch(hideBannerPrompt());
    return null;
  }

  return (
    <Banner
      onClick={handleClick}
      onDismiss={handleDismiss}
      messageText={mainText + ': '}
      dismissText={dismissText}
      actionText={actionText}
    />
  );
}

export default PushNotification;
