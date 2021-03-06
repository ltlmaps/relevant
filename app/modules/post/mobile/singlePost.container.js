import React, { Component } from 'react';
import { View, InteractionManager } from 'react-native';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import * as authActions from 'modules/auth/auth.actions';
import * as userActions from 'modules/user/user.actions';
import * as postActions from 'modules/post/post.actions';
import * as commentActions from 'modules/comment/comment.actions';
import * as statsActions from 'modules/stats/stats.actions';
import * as tagActions from 'modules/tag/tag.actions';
import * as investActions from 'modules/post/invest.actions';
import * as createPostActions from 'modules/createPost/createPost.actions';
import * as navigationActions from 'modules/navigation/navigation.actions';
import * as animationActions from 'modules/animation/animation.actions';
import * as tooltipActions from 'modules/tooltip/tooltip.actions';
import CustomSpinnerRelative from 'modules/ui/mobile/customSpinnerRelative.component';
import ErrorComponent from 'modules/ui/mobile/error.component';
import SinglePost from './singlePost.component';

class SinglePostContainer extends Component {
  static propTypes = {
    navigation: PropTypes.object,
    actions: PropTypes.object,
    comments: PropTypes.object,
    users: PropTypes.object,
    auth: PropTypes.object,
    error: PropTypes.bool,
    posts: PropTypes.object
  };

  state = {
    inputHeight: 0,
    editing: false,
    comment: null
  };

  componentWillMount() {
    this.setTitle(this.props);
    InteractionManager.runAfterInteractions(this.getPost());
  }

  componentDidUpdate(prevProps) {
    // TODO this is not needed if we don't wipe post reducer
    // when switching communities
    if (prevProps.auth.community !== this.props.auth.community) this.getPost();
  }

  getPost = () => {
    const { posts, navigation } = this.props;
    const { id } = navigation.state.params;
    const post = posts.posts[id];
    if (!post) this.props.actions.getSelectedPost(id);
    this.props.actions.getComments(id);
  };

  setTitle(props) {
    const { posts, navigation } = props;
    const { id } = navigation.state.params;
    const post = posts.posts[id];
    if (!post) return;

    const link = post && posts.links[post.metaPost];
    const title = post.title || post.body || link.title;

    if (!this.props.navigation.state.params || title !== navigation.state.params.title) {
      navigation.setParams({ title });
    }
  }

  componentDidWillUpdate(next) {
    if (
      !this.props.navigation.state.params ||
      !this.props.navigation.state.params.title
    ) {
      this.setTitle(next);
    }
  }

  setEditing = bool => {
    this.setState({ editing: bool });
  };

  reload = () => {
    const { id } = this.props.navigation.state.params;
    this.props.actions.getSelectedPost(id);
    this.props.actions.getComments(id);
  };

  render() {
    const { posts, navigation, error } = this.props;
    const { id } = navigation.state.params;
    const post = posts.posts[id];

    const related = posts.related[id] || [];
    const link = post && posts.links[post.metaPost];

    if (error && !post) {
      return (
        <ErrorComponent
          error={this.props.error}
          parent={'singlepost'}
          reloadFunction={this.reload}
        />
      );
    }

    return (
      <View style={{ flex: 1 }}>
        <SinglePost
          postId={id}
          post={post}
          link={link}
          singlePostEditing={this.setEditing}
          error={this.error}
          related={related}
          {...this.props}
        />
        <CustomSpinnerRelative visible={!post && !this.props.error} />
      </View>
    );
  }
}

function mapStateToProps(state) {
  return {
    auth: state.auth,
    posts: state.posts,
    user: state.user,
    error: state.error.singlepost,
    comments: state.comments,
    users: state.user,
    tags: state.tags
    // myPostInv: state.investments.myPostInv
  };
}

function mapDispatchToProps(dispatch) {
  return {
    actions: bindActionCreators(
      {
        ...statsActions,
        ...tagActions,
        ...authActions,
        ...commentActions,
        ...postActions,
        ...animationActions,
        ...investActions,
        ...userActions,
        ...createPostActions,
        ...navigationActions,
        ...tooltipActions
      },
      dispatch
    )
  };
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(SinglePostContainer);
