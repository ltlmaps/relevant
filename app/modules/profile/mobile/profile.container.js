import React, { Component } from 'react';
import { StyleSheet, View, InteractionManager } from 'react-native';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { globalStyles } from 'app/styles/global';
import Post from 'modules/post/mobile/post.component';
import CustomSpinner from 'modules/ui/mobile/CustomSpinner.component';
import * as authActions from 'modules/auth/auth.actions';
import * as postActions from 'modules/post/post.actions';
import * as createPostActions from 'modules/createPost/createPost.actions';
import * as tagActions from 'modules/tag/tag.actions';
import * as userActions from 'modules/user/user.actions';
import * as statsActions from 'modules/stats/stats.actions';
import * as notifActions from 'modules/activity/activity.actions';
import * as errorActions from 'modules/ui/error.actions';
import * as investActions from 'modules/post/invest.actions';
import * as animationActions from 'modules/animation/animation.actions';
import * as navigationActions from 'modules/navigation/navigation.actions';
import CustomListView from 'modules/listview/mobile/customList.component';
import Tabs from 'modules/navigation/mobile/tabs.component';
import ProfileComponent from './profile.component';

let styles;

class Profile extends Component {
  static propTypes = {
    scene: PropTypes.object,
    users: PropTypes.object,
    auth: PropTypes.object,
    refresh: PropTypes.object,
    reload: PropTypes.number,
    actions: PropTypes.object,
    posts: PropTypes.object,
    investments: PropTypes.object,
    error: PropTypes.bool
  };

  constructor(props, context) {
    super(props, context);
    this.renderHeader = this.renderHeader.bind(this);
    this.renderRow = this.renderRow.bind(this);
    this.load = this.load.bind(this);
    this.loadUser = this.loadUser.bind(this);
    this.changeView = this.changeView.bind(this);
    this.offset = 0;
    this.state = {
      view: 0
    };
    this.userData = null;
    this.userId = null;
    this.needsReload = new Date()
    .getTime();
    this.tabs = [{ id: 0, title: 'Posts' }, { id: 1, title: 'Upvotes' }];
    this.loaded = false;
    this.scrollTo = this.scrollTo.bind(this);
  }

  componentWillMount() {
    if (this.props.scene) {
      this.userId = this.props.scene.id;
      this.userData = this.props.users[this.userId];

      this.onInteraction = InteractionManager.runAfterInteractions(() => {
        this.loadUser();
        this.setState({});
      });

      requestAnimationFrame(() => {
        this.loaded = true;
        this.setState({});
      });
    } else {
      this.loaded = true;
      this.userId = this.props.auth.user._id;
      this.userData = this.props.users[this.userId];
      this.myProfile = true;
      this.setState({});
    }
  }

  componentWillReceiveProps(next) {
    this.userData = next.users[this.userId];

    if (this.props.refresh !== next.refresh) {
      this.scrollToTop();
    }
    if (this.props.reload !== next.reload) {
      this.needsReload = new Date()
      .getTime();
      // this.loadUser();
    }
  }

  shouldComponentUpdate(next) {
    const tab = next.tabs.routes[next.tabs.index];
    if (tab.key !== 'myProfile' && !next.scene) return false;
    return true;
  }

  componentWillUnmount() {
    if (this.onInteraction) this.onInteraction.cancel();
  }

  loadUser() {
    this.props.actions.getSelectedUser(this.userId);
  }

  load(view, length) {
    if (view === undefined) view = this.state.view;
    if (length === undefined) length = 0;

    if (this.state.view === 0) {
      this.props.actions.getUserPosts(length, 5, this.userId);
    } else {
      this.props.actions.getInvestments(this.props.auth.token, this.userId, length, 10);
    }
  }

  renderRow(rowData, view) {
    const scene = this.props.scene || { route: { id: this.userId } };

    if (view === 0) {
      const post = this.props.posts.posts[rowData];
      if (!post) return null;
      const link = this.props.posts.links[post.metaPost];
      return <Post post={post} link={link} {...this.props} scene={scene} />;
    }
    if (view === 1) {
      const investment = this.props.investments.investments[rowData];
      const post = this.props.posts.posts[investment.post];
      if (!post) return null;
      const link = this.props.posts.links[post.metaPost];
      return <Post post={post} link={link} {...this.props} />;
    }
    return null;
  }

  scrollToTop() {
    const view = this.tabs[this.state.view].component.listview;
    if (view) view.scrollTo({ y: 0, animated: true });
  }

  scrollTo(y) {
    const view = this.tabs[this.state.view].component.listview;
    if (view) view.scrollTo({ y, animated: true });
  }

  renderHeader() {
    let header = null;
    if (this.userId && this.userData) {
      header = [
        <ProfileComponent
          key={0}
          {...this.props}
          myProfile={this.myProfile}
          user={this.userData}
          styles={styles}
          scrollTo={this.scrollTo}
        />,
        <Tabs
          key={1}
          tabs={this.tabs}
          active={this.state.view}
          handleChange={this.changeView}
        />,
        <View key={2} style={{ height: 0 }} />
      ];
    }
    return header;
  }

  getViewData(props, view) {
    switch (view) {
      case 0:
        return {
          data: this.props.posts.userPosts[this.userId],
          loaded: this.props.posts.loaded.userPosts
        };
      case 1:
        return {
          data: this.props.investments.userInvestments[this.userId],
          loaded: this.props.investments.loadedProfileInv
        };
      default:
        return null;
    }
  }

  changeView(view) {
    if (view === this.state.view) this.scrollToTop();
    this.setState({ view });
  }

  render() {
    let listEl = <CustomSpinner />;

    // solves logout bug
    if (!this.props.auth.user) return null;

    if (this.userData && this.loaded) {
      listEl = [];
      this.tabs.forEach(tab => {
        const tabData = this.getViewData(this.props, tab.id);
        const active = this.state.view === tab.id;
        let data = tabData.data || [];
        if (!this.loaded) data = [];
        const loaded = tabData.loaded && this.loaded;
        const postCount =
          this.userData.postCount !== undefined ? this.userData.postCount : '';
        const Upvotes =
          this.userData.investmentCount !== undefined
            ? this.userData.investmentCount
            : '';

        if (tab.id === 0) {
          tab.title = 'Posts ' + postCount;
          tab.type = 'posts';
        }
        if (tab.id === 1) {
          tab.title = 'Upvotes ' + Upvotes;
          tab.type = 'upvotes';
        }

        listEl.push(
          <CustomListView
            ref={c => {
              this.tabs[tab.id].component = c;
            }}
            key={tab.id}
            data={data}
            parent={'profile'}
            loaded={loaded}
            renderRow={this.renderRow}
            load={this.load}
            view={tab.id}
            stickyHeaderIndices={[1]}
            type={tab.type}
            active={active}
            renderHeader={this.renderHeader}
            needsReload={this.needsReload}
            onReload={this.loadUser}
            error={this.props.error}
            headerData={this.userData}
          />
        );
      });
    }

    return <View style={styles.profileContainer}>{listEl}</View>;
  }
}

function mapStateToProps(state) {
  return {
    auth: state.auth,
    posts: state.posts,
    users: state.user.users,
    online: state.online,
    error: state.error.profile,
    view: state.view,
    stats: state.stats,
    investments: state.investments,
    refresh: state.navigation.myProfile.refresh,
    reload: state.navigation.myProfile.reload,
    tabs: state.navigation.tabs
  };
}

function mapDispatchToProps(dispatch) {
  return {
    actions: bindActionCreators(
      {
        ...statsActions,
        ...authActions,
        ...postActions,
        ...notifActions,
        ...errorActions,
        ...animationActions,
        ...tagActions,
        ...userActions,
        ...investActions,
        ...createPostActions,
        ...navigationActions
      },
      dispatch
    )
  };
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(Profile);

const localStyles = StyleSheet.create({
  postsHeader: {
    padding: 10
  },
  profileContainer: {
    position: 'relative',
    flex: 1,
    flexGrow: 1,
    alignItems: 'stretch',
    backgroundColor: 'white'
  },
  wrap: {
    flexDirection: 'row',
    flexWrap: 'nowrap'
  },
  centering: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8
  }
});

styles = { ...localStyles, ...globalStyles };