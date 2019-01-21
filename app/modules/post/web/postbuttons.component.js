import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { browserAlerts } from 'app/utils/alert';
import { computePayout } from 'app/utils/post';
import { abbreviateNumber } from 'app/utils/numbers';
import styled from 'styled-components/primitives';

const Wrapper = styled.View`
  min-width: 70px;
  margin-right: 1em;
`;

const Container = styled.View`
  align-items: center;
`;

const View = styled.View`
  margin: 1em 0;
`;

const Touchable = styled.Touchable`
`;

const Text = styled.Text`
  display: flex;
`;

const Image = styled.Image`
  width: 20px;
  height: 20px;
`;

const VoteIcon = styled(Image)`
  // margin: 1em;
`;


class PostButtons extends Component {
  static propTypes = {
    auth: PropTypes.object,
    myPostInv: PropTypes.object,
    post: PropTypes.shape({
      data: PropTypes.object
    }),
    community: PropTypes.object,
    actions: PropTypes.object,
    className: PropTypes.string,
  };

  constructor(props) {
    super(props);
    this.state = {};
    this.vote = this.vote.bind(this);
    this.irrelevant = this.irrelevant.bind(this);
    this.share = this.share.bind(this);
  }

  async vote(e, vote) {
    try {
      e.preventDefault();
      e.stopPropagation();

      if (!this.props.auth.isAuthenticated) return null;

      const amount = 1;
      await this.props.actions.vote(amount, this.props.post, this.props.auth.user, vote);
      // browserAlerts.alert('Success!');

      // TODO animation & analytics
      // Analytics.logEvent('upvote');
      // this.props.actions.triggerAnimation('vote');
      // setTimeout(() => {
      //   // this.props.actions.reloadTab('read');
      //   let name = this.props.post.embeddedUser.name;
      //   browserAlerts.alert('You have subscribed to receive '
      //   + results.subscription.amount + ' posts from ' + name);
      // }, 1500);
    } catch (err) {
      // TODO error handling
    }
    return null;
  }

  async irrelevant(e, vote) {
    try {
      e.preventDefault();
      e.stopPropagation();

      if (!this.props.auth.isAuthenticated) return;
      // for testing
      // this.props.actions.triggerAnimation('vote', -1);
      // this.props.actions.triggerAnimation('irrelevant', -1);
      // return;

      await this.props.actions.vote(-1, this.props.post, this.props.auth.user, vote);
      // browserAlerts.alert('Success!');

      // TODO animations
      // this.props.actions.triggerAnimation('vote', -1);
      // this.props.actions.triggerAnimation('irrelevant', -1);
    } catch (err) {
      // TODO error handling
      browserAlerts.alert(err.message);
    }
  }

  async share(e) {
    e.preventDefault();
    return null;
  }

  render() {
    const { post, auth, community, className } = this.props;

    if (post === 'notFound') {
      return null;
    }
    if (!post) return null;

    let vote;
    let votedUp;
    let votedDown;
    let buttonOpacity = { opacity: 1 };
    let upvoteBtn = '/img/upvote.png';

    if (this.props.myPostInv) {
      vote = this.props.myPostInv[post.id] || !this.props.auth.isAuthenticated;
      if (auth.user && auth.user._id === post.user) vote = true;
      if (vote) {
        votedUp = vote.amount > 0;
        votedDown = vote.amount < 0;
        buttonOpacity = { opacity: 0.5 };
        upvoteBtn = '/img/upvote-shadow.svg';
      }
    }

    let payout;
    if (post.data && post.data.paidOut) payout = post.data.payout;
    payout = computePayout(post.data, community);
    if (post.data && post.data.parentPost) payout = null;

    return (
      <Wrapper className={className}>
        <Container>
          <Touchable onClick={e => this.vote(e, vote)} to="#">
            <VoteIcon
              alt="Upvote"
              source={{ uri: votedUp ? '/img/upvoteActive.png' : upvoteBtn }}
            />
          </Touchable>
          <View>
            <Text>
              <Image alt="R" source={{ uri: '/img/r-gray.svg' }} /> {
                post.data ? Math.round(post.data.pagerank) : null
              }
              {payout > 0 ? abbreviateNumber(payout) : null }
            </Text>
          </View>
          <Touchable onClick={e => this.irrelevant(e, vote)} to="#">
            <VoteIcon
              alt="Downvote"
              source={{ uri: votedDown ? '/img/downvote-blue.svg' : '/img/downvote-gray.svg' }}
            />
          </Touchable>
        </Container>
      </Wrapper>
    );
  }
}

export default PostButtons;
