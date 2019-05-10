import React, { Component } from 'react';
import {
  View,
  Divider,
  CTALink,
  CommentText,
  SecondaryText,
  Spacer,
  Touchable,
  Image
} from 'modules/styled/uni';
import get from 'lodash.get';
import PropTypes from 'prop-types';
import AvatarBox from 'modules/user/avatarbox.component';
import Popup from 'modules/ui/web/popup';
import PostButtons from 'modules/post/postbuttons.component';
import CommentForm from 'modules/comment/web/commentForm.component';
import { colors, layout } from 'app/styles';
import ULink from 'modules/navigation/ULink.component';
import Linkify from 'linkifyjs/react';
import * as linkify from 'linkifyjs';
import mentionPlugin from 'linkifyjs/plugins/mention';
import hashTagPlugin from 'linkifyjs/plugins/hashtag';

import { Link } from 'react-router-dom';
import { withRouter } from 'react-router';

mentionPlugin(linkify);
hashTagPlugin(linkify);

class ChatMessage extends Component {
  static propTypes = {
    actions: PropTypes.object,
    comment: PropTypes.object,
    user: PropTypes.object,
    auth: PropTypes.object,
    activeComment: PropTypes.string,
    setActiveComment: PropTypes.func,
    parentPost: PropTypes.object,
    childComments: PropTypes.object,
    posts: PropTypes.object,
    nestingLevel: PropTypes.number,
    hidePostButtons: PropTypes.bool,
    hideReplyButtons: PropTypes.bool,
    condensedView: PropTypes.bool,
    postUrl: PropTypes.string,
    hideBorder: PropTypes.bool,
    post: PropTypes.object,
    hideAvatar: PropTypes.bool,
    noLink: PropTypes.bool,
    avatarText: PropTypes.func,
    focusedComment: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    scrollTo: PropTypes.func,
    preview: PropTypes.bool,
    inMainFeed: PropTypes.bool,
    history: PropTypes.object,
    screenSize: PropTypes.number,
    additionalNesting: PropTypes.number
  };

  static defaultProps = {
    additionalNesting: 0
  };

  state = {
    editing: false,
    hovering: false,
    copied: false
  };

  constructor(props) {
    super(props);
    this.el = React.createRef();
  }

  scrollIfFocused = () => {
    const { focusedComment, comment, scrollTo } = this.props;
    if (comment && focusedComment === comment._id) {
      this.el.current.measureInWindow((x, y) => {
        scrollTo(0, y);
      });
    }
  };

  componentDidMount() {
    this.scrollIfFocused();
  }

  componentDidUpdate(prevProps) {
    if (prevProps.focusedComment !== this.props.focusedComment) {
      this.scrollIfFocused();
    }
  }

  deletePost() {
    // TODO custom confirm
    // eslint-disable-next-line
    const okToDelete = confirm('Are you sure you want to delete this post?');
    if (!okToDelete) return;
    this.props.actions.deleteComment(this.props.comment._id);
  }

  static getDerivedStateFromProps(props) {
    const { user: userState, comment } = props;
    if (!comment || !comment.embeddedUser) return null;
    const userId = userState.handleToId[comment.embeddedUser.handle];
    const user = userState.users[userId] || comment.embeddedUser;
    return { user };
  }

  editPost() {
    this.setState({ editing: true });
  }

  // TODO utils & link copied via tooltip
  copyToClipboard = () => {
    const { parentPost, auth } = this.props;
    const el = document.createElement('textarea');
    el.value = `${window.location.host}/${auth.community}/post/${parentPost._id}`;
    el.setAttribute('readonly', '');
    el.style.position = 'absolute';
    el.style.left = '-9999px';
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
    this.setState({ copied: true });
  };

  cancel = () => {
    this.props.setActiveComment(null);
    this.setState({ editing: false });
  };

  render() {
    const {
      auth,
      comment,
      activeComment,
      setActiveComment,
      childComments,
      posts,
      nestingLevel,
      hidePostButtons,
      hideReplyButtons,
      postUrl,
      condensedView,
      hideBorder,
      hideAvatar,
      noLink,
      avatarText,
      preview,
      inMainFeed,
      history,
      screenSize,
      additionalNesting
    } = this.props;
    if (!comment) return null;
    const { editing, copied, hovering, user } = this.state;
    let popup;
    const isActive = activeComment === comment.id;

    if (auth.user && auth.user._id === comment.user) {
      popup = (
        <Popup
          options={[
            { text: 'Edit Post', action: this.editPost.bind(this) },
            { text: 'Delete Post', action: this.deletePost.bind(this) }
          ]}
        >
          {hovering && <span className={'optionDots'}>...</span>}
        </Popup>
      );
    }

    const bodyMargin = condensedView ? '1 0 0 5' : '3 0';

    let text = comment.body;
    let readMore;
    if (inMainFeed && text && text.length) {
      let lines = text.split(/\n/);
      lines = lines.map(line =>
        line
        .split(/\s/)
        .slice(0, 50)
        .join(' ')
      );
      text = lines.slice(0, 3).join('\n');
      readMore = text.length < comment.body.length;
    }
    let body = (
      <CommentText style={{ zIndex: 0 }} m={bodyMargin} pl={avatarText ? 5 : 0}>
        <Linkify
          style={{ width: '100%' }}
          options={{
            tagName: {
              mention: () => Link,
              hashtag: () => Link
            },
            attributes: (href, type) => {
              if (type === 'mention') {
                return {
                  to: '/user/profile' + href
                };
              }
              if (type === 'hashtag') {
                return {
                  to: `/${auth.community}/top/${href.replace('#', '')}`
                };
              }
              return {
                onClick: e => e.stopPropagation()
              };
            }
          }}
        >
          {text}
          {readMore ? (
            <CommentText inline={1} c={colors.grey}>
              {' '}
              ...Read More
            </CommentText>
          ) : null}
        </Linkify>
      </CommentText>
    );

    if (postUrl) {
      body = (
        <Touchable to={postUrl} onClick={() => (noLink ? null : history.push(postUrl))}>
          {body}
        </Touchable>
      );
    }

    const commentChildren = get(childComments, comment.id) || [];
    return (
      <View
        ref={this.el}
        onMouseEnter={() => this.setState({ hovering: true })}
        onMouseLeave={() => this.setState({ hovering: false })}
      >
        <Spacer
          nestingLevel={nestingLevel}
          additionalNesting={additionalNesting}
          screenSize={screenSize}
          m={['0 4 0 0', `${preview ? '0 2 0 0' : '0 2 2 2'}`]}
          fdirection="column"
        >
          {nestingLevel > 0 && !hideBorder && (
            <Divider
              className="divider"
              ml={hidePostButtons || screenSize ? 0 : layout.POST_BUTTONS_WIDTH / 3}
            />
          )}
          <View fdirection="row" mt={hideAvatar ? 0 : 1}>
            {!hidePostButtons && !screenSize ? (
              <View w={layout.POST_BUTTONS_WIDTH}>
                <PostButtons {...this.props} post={comment} />
              </View>
            ) : null}
            {screenSize > 0 && nestingLevel > 0 ? (
              <Image
                h={3}
                w={2}
                ml={-3}
                mr={1}
                resizeMode={'contain'}
                source={require('app/public/img/reply.png')}
              />
            ) : null}
            <View fdirection="column" grow={1} shrink={1}>
              {!hideAvatar ? (
                <View fdirection={'row'} justify={'space-between'} zIndex={2}>
                  <AvatarBox
                    twitter={comment.twitter}
                    user={{ ...user, _id: comment.user }}
                    postTime={comment.createdAt}
                    showRelevance
                    condensedView={true}
                    avatarText={avatarText}
                    noLink={noLink}
                  />
                  {popup}
                </View>
              ) : (
                <View style={{ position: 'absolute', right: 0 }} zIndex={2}>
                  {popup}
                </View>
              )}
              {editing ? (
                <View mt={2}>
                  <CommentForm
                    edit
                    p={[0, 2]}
                    comment={comment}
                    text={'Update'}
                    cancel={this.cancel}
                    {...this.props}
                    nestingLevel={nestingLevel}
                    additionalNesting={additionalNesting}
                    autoFocus
                  />
                </View>
              ) : (
                body
              )}
              {editing || hideReplyButtons || (hidePostButtons && preview) ? null : (
                <View
                  ml={condensedView ? 5 : 0}
                  mb={[2, 2]}
                  fdirection="row"
                  justify="space-between"
                  align="center"
                  wrap={1}
                  // stop-gap to avoid the page dimenisons breaking on deeply nested comments
                >
                  {!hidePostButtons && screenSize ? (
                    <View w={12}>
                      <PostButtons {...this.props} post={comment} horizontal />
                    </View>
                  ) : null}
                  <View fdirection="row">
                    <ULink
                      hu
                      to="#"
                      inline
                      authrequired={true}
                      onClick={e => {
                        e.preventDefault();
                        setActiveComment(comment.id);
                      }}
                      onPress={e => {
                        e.preventDefault();
                        setActiveComment(comment.id);
                      }}
                    >
                      <CTALink mr={3} c={colors.blue}>
                        Reply
                      </CTALink>
                    </ULink>
                    <ULink
                      hu
                      to="#"
                      authrequired={true}
                      inline
                      onClick={e => {
                        e.preventDefault();
                        this.copyToClipboard();
                      }}
                      onPress={e => {
                        e.preventDefault();
                        this.copyToClipboard();
                      }}
                    >
                      <CTALink c={colors.blue}>Share</CTALink>
                    </ULink>
                    {copied && <SecondaryText> - Link copied to clipboard</SecondaryText>}
                  </View>
                </View>
              )}
            </View>
          </View>
        </Spacer>

        {isActive && !editing && (
          <CommentForm
            isReply
            nestingLevel={nestingLevel}
            p={[4, 2]}
            text={'Comment'}
            {...this.props}
            additionalNesting={
              additionalNesting +
              (hidePostButtons ? 0 : layout.POST_BUTTONS_NESTING_UNITS)
            }
            parentComment={comment}
            cancel={this.cancel}
            autoFocus
          />
        )}
        {commentChildren.map(childId => (
          <Comment
            {...this.props}
            comment={posts.posts[childId]}
            key={childId}
            nestingLevel={nestingLevel + 1}
          />
        ))}
      </View>
    );
  }
}
export default withRouter(ChatMessage);