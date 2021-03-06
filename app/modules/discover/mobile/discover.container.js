import React, { Component, useMemo } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import Post from 'modules/post/mobile/post.component';
import get from 'lodash/get';
import * as statsActions from 'modules/stats/stats.actions';
import * as authActions from 'modules/auth/auth.actions';
import * as postActions from 'modules/post/post.actions';
import * as tagActions from 'modules/tag/tag.actions';
import * as investActions from 'modules/post/invest.actions';
import * as animationActions from 'modules/animation/animation.actions';
import * as navigationActions from 'modules/navigation/navigation.actions';
import * as createPostActions from 'modules/createPost/createPost.actions';
import { globalStyles, mainPadding } from 'app/styles/global';
import CustomListView from 'modules/listview/mobile/customList.component';
import TwitterButton from 'modules/auth/mobile/TwitterButton.component';

let styles;
const POST_PAGE_SIZE = 15;

class Discover extends Component {
  static propTypes = {
    type: PropTypes.string,
    navigation: PropTypes.object,
    tags: PropTypes.object,
    refresh: PropTypes.number,
    active: PropTypes.bool,
    reload: PropTypes.number,
    offsetY: PropTypes.number,
    actions: PropTypes.object,
    auth: PropTypes.object,
    onScroll: PropTypes.func,
    error: PropTypes.bool,
    posts: PropTypes.object
  };

  constructor(props, context) {
    super(props, context);
    this.state = {
      offsetY: 50,
      view: 0
    };
    this.renderRow = this.renderRow.bind(this);
    this.renderHeader = this.renderHeader.bind(this);
    this.load = this.load.bind(this);
    this.scrollToTop = this.scrollToTop.bind(this);

    this.needsReload = new Date().getTime();
    this.myTabs = [
      { id: 0, title: 'Trending', type: 'top' },
      { id: 1, title: 'New', type: 'new' },
      { id: 2, title: 'People', type: 'people' },
      { id: 3, title: 'Twitter', type: 'twitterFeed' }
    ];
    this.loaded = true;
    this.type = this.props.type;
    this.state.view = this.myTabs.find(tab => tab.type === this.type).id;
  }

  componentDidMount() {
    if (this.props.navigation.state.params) {
      this.topic = this.props.navigation.state.params.topic;
      this.topic = this.topic && this.topic._id ? this.topic._id : this.topic;
      this.filter = this.topic ? [this.topic] : [];
    }
  }

  componentWillReceiveProps(next) {
    const { type } = this.myTabs[this.state.view];
    if (this.props.tags.selectedTags !== next.tags.selectedTags && type !== 'people') {
      this.filter = next.tags.selectedTags;
      this.needsReload = new Date().getTime();
    }
    if (this.props.refresh !== next.refresh && this.props.active) {
      if (this.scrollOffset !== -50) this.scrollToTop();
    }
    if (this.props.reload !== next.reload) {
      this.needsReload = new Date().getTime();
    }

    if (this.props.auth.community !== next.auth.community) {
      this.needsReload = new Date().getTime();
    }
  }

  shouldComponentUpdate = next => next.active && next.navigation.isFocused();

  getViewData(props, view) {
    switch (view) {
      case 0:
        if (this.topic) {
          return {
            data: props.posts.topics.top[this.topic],
            loaded: props.posts.loaded.topics[this.topic]
              ? props.posts.loaded.topics[this.topic].top
              : false
          };
        }
        return {
          data: props.posts.top,
          loaded: props.posts.loaded.top
        };
      case 1:
        if (this.topic) {
          return {
            data: props.posts.topics.new[this.topic],
            loaded: props.posts.loaded.topics[this.topic]
              ? props.posts.loaded.topics[this.topic].new
              : false
          };
        }
        return {
          data: props.posts.new,
          loaded: props.posts.loaded.new
        };
      default:
        return null;
    }
  }

  scrollToTop() {
    const view = this.listview;
    if (view && view.listview) {
      view.listview.scrollToOffset({ offset: -this.props.offsetY });
    }
  }

  load(view, length) {
    if (!view) view = this.state.view;
    if (!length) length = 0;
    const tags = this.filter;
    switch (view) {
      case 0:
        this.props.actions.getPosts(length, tags, 'rank', POST_PAGE_SIZE);
        break;
      case 1:
        this.props.actions.getPosts(length, tags, null, POST_PAGE_SIZE);
        break;
      default:
    }
  }

  renderHeader() {
    if (this.state.view !== 3 || get(this.props.auth, 'user.twitterId')) {
      return null;
    }
    return (
      <View style={{ paddingBottom: 20, paddingHorizontal: mainPadding }}>
        <TwitterButton auth={this.props.auth} actions={this.props.actions}>
          Connect Twitter Account
        </TwitterButton>
        <Text style={[styles.smallInfo, { paddingTop: 5, textAlign: 'center' }]}>
          Connect your accont to see relevant post from your twitter feed
        </Text>
      </View>
    );
  }

  renderRow(rowData, view, i) {
    const { posts } = this.props;
    const { type } = this.myTabs[view];
    return <PostEl type={type} rowData={rowData} posts={posts} index={i} />;
  }

  render() {
    let dataEl = [];

    if (this.loaded) {
      const tabData = this.getViewData(this.props, this.state.view) || [];
      dataEl = (
        <CustomListView
          ref={c => (this.listview = c)}
          key={this.state.view + this.topic}
          data={tabData.data || []}
          loaded={tabData.loaded}
          renderRow={this.renderRow}
          renderHeader={this.renderHeader}
          load={this.load}
          type={'posts'}
          parent={'discover'}
          view={this.state.view}
          active={this.props.active}
          YOffset={this.props.offsetY}
          onScroll={this.props.onScroll}
          needsReload={this.needsReload}
          scrollableTab
          error={this.props.error}
        />
      );
    }

    return <View style={{ backgroundColor: 'hsl(0,0%,100%)', flex: 1 }}>{dataEl}</View>;
  }
}

PostEl.propTypes = {
  posts: PropTypes.object,
  rowData: PropTypes.string,
  type: PropTypes.string,
  index: PropTypes.number
};

function PostEl({ posts, rowData, type, index }) {
  const post = posts.posts[rowData];

  const commentary = useMemo(() => {
    if (!post) return null;
    return post[type].map(c => posts.posts[c]);
  }, [posts.posts, post, type]);

  if (!post) return null;
  const link = posts.links[post.metaPost];

  return (
    <Post
      tooltip={parseInt(index, 10) === 0 || false}
      post={post}
      commentary={commentary}
      link={link}
      styles={styles}
      posts={posts}
    />
  );
}

const localStyles = StyleSheet.create({
  padding20: {
    padding: 20
  },
  listStyle: {
    height: 100
  },
  listScroll: {
    height: 100,
    borderWidth: 1,
    borderColor: 'red'
  },
  scrollPadding: {
    marginTop: 300
  }
});

styles = { ...localStyles, ...globalStyles };

function mapStateToProps(state) {
  return {
    auth: state.auth,
    posts: state.posts,
    animation: state.animation,
    stats: state.stats,
    userList: state.user.list,
    tags: state.tags,
    error: state.error.discover,
    refresh: state.navigation.discover.refresh,
    reload: state.navigation.discover.reload,
    topics: state.navigation.showTopics
  };
}

function mapDispatchToProps(dispatch) {
  return {
    actions: bindActionCreators(
      {
        ...postActions,
        ...animationActions,
        ...tagActions,
        ...investActions,
        ...statsActions,
        ...authActions,
        ...navigationActions,
        ...createPostActions
      },
      dispatch
    )
  };
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(Discover);
