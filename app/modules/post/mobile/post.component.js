import React, { PureComponent } from 'react';
import { StyleSheet } from 'react-native';
import PropTypes from 'prop-types';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import * as tooltipActions from 'modules/tooltip/tooltip.actions';
import * as animationActions from 'modules/animation/animation.actions';
import * as postActions from 'modules/post/post.actions';
import * as navigationActions from 'modules/navigation/navigation.actions';
import * as createPostActions from 'modules/createPost/createPost.actions';
import * as investActions from 'modules/post/invest.actions';
import PostInfo from 'modules/post/postinfo.mobile.component';
import ButtonContainer from 'modules/post/mobile/postButtons.container';
import { getTitle, getPostUrl } from 'app/utils/post';
import { Box } from 'modules/styled/uni';
import Commentary from './commentary.component';

class Post extends PureComponent {
  static propTypes = {
    link: PropTypes.object,
    auth: PropTypes.object,
    post: PropTypes.object,
    commentary: PropTypes.array,
    singlePost: PropTypes.bool,
    actions: PropTypes.object,
    hideDivider: PropTypes.bool,
    preview: PropTypes.bool,
    noLink: PropTypes.bool
  };

  render() {
    const {
      link,
      commentary,
      auth,
      actions,
      singlePost,
      hideDivider,
      preview,
      noLink
    } = this.props;

    const { community } = auth;
    const { post } = this.props;

    const separator = (
      <Box style={[{ height: 30, backgroundColor: 'rgba(0,0,0,.03)' }]} />
    );

    const blocked = <Box style={{ height: StyleSheet.hairlineWidth }} />;

    if (!post || !post._id) return blocked;

    const isLinkPost = link && (link.url || link.image);

    const renderComment = (commentary && commentary.length) || (isLinkPost && post.body);
    const commentaryEl = renderComment ? (
      <Commentary
        isReply
        isLinkPost={isLinkPost}
        preview={preview}
        {...this.props}
        commentary={commentary || [post]}
      />
    ) : null;

    const title = getTitle({ post, link });
    const postUrl = getPostUrl(community, post);

    const postEl = isLinkPost ? (
      <Box m={preview ? '4 0 0 0' : 0}>
        <PostInfo
          key={link._id}
          auth={auth}
          actions={actions}
          post={post}
          link={link}
          title={title}
          postUrl={postUrl}
          singlePost={singlePost}
          preview={preview}
          noLink={noLink}
        />
        {!preview && (
          <Box m={2}>
            <ButtonContainer
              horizontal
              post={post}
              singlePost={singlePost}
              actions={actions}
              auth={auth}
              link={link}
            />
          </Box>
        )}
      </Box>
    ) : (
      <Commentary {...this.props} commentary={[post]} />
    );

    return (
      <Box style={{ overflow: 'hidden' }}>
        <Box>
          {postEl}
          {commentaryEl || (preview && isLinkPost ? <Box mt={2} /> : null)}
        </Box>
        {!singlePost && !hideDivider ? separator : null}
      </Box>
    );
  }
}

function mapStateToProps(state) {
  return {
    auth: state.auth,
    users: state.user.users
  };
}

function mapDispatchToProps(dispatch) {
  return {
    actions: bindActionCreators(
      {
        ...postActions,
        ...investActions,
        ...animationActions,
        ...tooltipActions,
        ...navigationActions,
        ...postActions,
        ...createPostActions
      },
      dispatch
    )
  };
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(Post);
