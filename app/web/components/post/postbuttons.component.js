import React, { Component } from 'react';
import { Link } from 'react-router';
import PropTypes from 'prop-types';

class PostButtons extends Component {
  static propTypes = {
    auth: PropTypes.object,
    myPostInv: PropTypes.object,
    post: PropTypes.object,
  };

  constructor(props) {
    super(props);
    this.state = {
    };
    this.vote = this.vote.bind(this);
    this.irrelevant = this.irrelevant.bind(this);
    this.share = this.share.bind(this);
  }

  async vote(e, vote) {
    try {
      e && e.preventDefault();
      e.stopPropagation();

      if (!this.props.auth.isAuthenticated) return null;

      let amount = 1;
      await this.props.actions.vote(
        amount,
        this.props.post,
        this.props.auth.user,
        vote
      );
      // alert('Success!');

      // TODO animation & analytics
      // Analytics.logEvent('upvote');
      // this.props.actions.triggerAnimation('vote');
      // setTimeout(() => {
      //   // this.props.actions.reloadTab('read');
      //   let name = this.props.post.embeddedUser.name;
      //   alert('You have subscribed to receive ' + results.subscription.amount + ' posts from ' + name);
      // }, 1500);
    } catch (err) {
      console.log(err);
      let text1 = err.message;
      if (text1.match('coin')) {
        text1 = 'Oops! Looks like you ran out of coins, but don\'t worry, you\'ll get more tomorrow';
      }
      alert(text1);
    }
    return null;
  }

  async irrelevant(e, vote) {
    try {
      e && e.preventDefault();
      e.stopPropagation();

      if (!this.props.auth.isAuthenticated) return;
      // for testing
      // this.props.actions.triggerAnimation('vote', -1);
      // this.props.actions.triggerAnimation('irrelevant', -1);
      // return;

      await this.props.actions.vote(-1, this.props.post, this.props.auth.user, vote);
      // alert('Success!');

      // TODO animations
      // this.props.actions.triggerAnimation('vote', -1);
      // this.props.actions.triggerAnimation('irrelevant', -1);
    } catch (err) {
      let text1 = err.message;
      if (text1.match('coin')) {
        text1 = 'Oops! Looks like you ran out of coins, but don\'t worry, you\'ll get more tomorrow';
      }
      alert(text1);
    }
  }

  async share(e) {
    e && e.preventDefault();
    return null;
  }

  render() {
    let { post, auth } = this.props;

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

    let comments = post.commentCount || '';
    let commentText = comments > 1 ? comments + ' comments' : comments + ' comment';

    let commentEl = <Link className="commentcount details" to={'/post/' + post._id}>
      <img alt="Comment" src="/img/comment.svg" />
      <span>{commentText}</span>
    </Link>;

    return (
      <div className="postbuttons">
        <div className="left">
          <a
            style={buttonOpacity}
            onClick={e => this.vote(e, vote)}
          >
            <img alt="Upvote" src={votedUp ? '/img/upvoteActive.png' : upvoteBtn} className="upvote" />
          </a>
          <div className="fraction">
            <div className="dem">
              {post.data ? Math.round(post.data.pagerank) : null}
              <img alt="R" src="/img/r-gray.svg" />
            </div>
          </div>
          <a
            style={buttonOpacity}
            onClick={e => this.irrelevant(e, vote)}
          >
            <img alt="Downvote" src={votedDown ? '/img/downvote-blue.svg' : '/img/downvote-gray.svg'} className="downvote" />
          </a>
        </div>
        <div className="right">
          {post.type === 'comment' ? '' : commentEl}
        </div>
      </div>
    );
  }
}

export default PostButtons;
