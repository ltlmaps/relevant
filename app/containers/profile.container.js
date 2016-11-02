import React, { Component } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ListView,
  TouchableHighlight,
  RefreshControl,
} from 'react-native';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { globalStyles, fullWidth, fullHeight } from '../styles/global';
import Post from '../components/post.component';
import ProfileComponent from '../components/profile.component';
import Investment from '../components/investment.component';
import CustomSpinner from '../components/CustomSpinner.component';
import * as authActions from '../actions/auth.actions';
import * as postActions from '../actions/post.actions';
import * as tagActions from '../actions/tag.actions';
import * as userActions from '../actions/user.actions';
import * as statsActions from '../actions/stats.actions';
import * as onlineActions from '../actions/online.actions';
import * as notifActions from '../actions/notif.actions';
import * as viewActions from '../actions/view.actions';
import * as messageActions from '../actions/message.actions';
import * as subscriptionActions from '../actions/subscription.actions';
import * as investActions from '../actions/invest.actions';
import * as animationActions from '../actions/animation.actions';

let styles;
let localStyles;

class Profile extends Component {
  constructor(props, context) {
    super(props, context);
    this.renderHeader = this.renderHeader.bind(this);
    this.renderFeedRow = this.renderFeedRow.bind(this);
    this.loadMore = this.loadMore.bind(this);
    this.state = {
      view: 1,
    };
    this.enabled = true;
    this.userData = null;
    this.userId = null;
    this.postsData = null;
    this.investmentsData = null;
    this.loading = false;
  }

  componentWillMount() {
    if (this.props.scene) {
      this.myProfile = false;
      this.userId = this.props.scene.id;
    } else {
      this.myProfile = true;
      this.userId = this.props.auth.user._id;
      this.userData = this.props.auth.user;
    }
    this.loadUser();
  }

  componentWillReceiveProps(next) {
    let newPosts;
    let oldPosts;
    let oldUserData;
    let newUserData;
    let newInvestments;
    let oldInvestments;
    if (this.myProfile) {
      newPosts = next.posts.myPosts;
      oldPosts = this.props.posts.myPosts;
      oldUserData = this.props.auth.user;
      newUserData = next.auth.user;
      newInvestments = next.investments.myInvestments;
      oldInvestments = this.props.investments.myInvestments;
    } else {
      newPosts = next.posts.userPosts;
      oldPosts = this.props.posts.userPosts;
      oldUserData = this.props.users.selectedUserData;
      newUserData = next.users.selectedUserData;
      newInvestments = next.investments.userInvestments;
      oldInvestments = this.props.investments.userInvestments;
    }

    if (oldUserData !== newUserData) {
      this.userData = newUserData;
    }

    if (newPosts !== oldPosts && newPosts) {
      let altered = null;
      if (!newPosts.length) {
        altered = [{ fakePost: true }];
      } else {
        altered = newPosts;
      }
      this.createPosts(altered);
    }

    if (newInvestments !== oldInvestments && newInvestments) {
      let altered = null;
      if (!newInvestments.length) {
        altered = [{ fakeInvestment: true }];
      } else {
        altered = newInvestments;
      }
      this.createInvestments(altered);
    }
  }

  createInvestments(investments) {
    let id = new ListView.DataSource({ rowHasChanged: (r1, r2) => r1 !== r2 });
    this.investmentsData = id.cloneWithRows(investments);
  }

  createPosts(posts) {
    let pd = new ListView.DataSource({ rowHasChanged: (r1, r2) => r1 !== r2 });
    this.postsData = pd.cloneWithRows(posts);
  }

  loadUser() {
    if (this.myProfile) {
      this.props.actions.getInvestments(this.props.auth.token, this.userId, 0, 10, 'myInvestments');
      this.props.actions.getSelectedUser(this.userId);
      this.props.actions.getUserPosts(0, 5, this.userId, 'myPosts');
    } else {
      this.props.actions.getInvestments(this.props.auth.token, this.userId, 0, 10, 'userInvestments');
      this.props.actions.getSelectedUser(this.userId);
      this.props.actions.getUserPosts(0, 5, this.userId, 'userPosts');
    }
  }

  loadMore() {
    const self = this;
    if (!this.enabled) return;

    if (this.state.view === 1) {
      if (this.myProfile) {
        this.props.actions.getUserPosts(this.props.posts.myPosts.length, 5, this.userId, 'myPosts');
      } else {
        this.props.actions.getUserPosts(this.props.posts.userPosts.length, 5, this.userId, 'userPosts');
      }
    } else {
      if (this.myProfile) {
        this.props.actions.getInvestments(this.props.auth.token, this.userId, this.props.investments.myInvestments.length, 10, 'myInvestments');
      } else {
        this.props.actions.getInvestments(this.props.auth.token, this.userId, this.props.investments.userInvestments.length, 10, 'userInvestments');
      }
    }

    this.enabled = false;
    setTimeout(() => {
      self.enabled = true;
    }, 1000);
  }

  changeView(view) {
    this.setState({ view });
  }

  renderFeedRow(rowData, sectionID, rowID) {
    if (this.state.view === 1) {
      if (!rowData.fakePost) {
        return (<Post
          key={rowID}
          post={rowData}
          {...this.props}
          styles={styles}
        />);
      } else {
        return (<View key={rowID}>
          <Text>No posts bruh</Text>
        </View>);
      }
    } else {
      if (!rowData.fakeInvestment) {
        return (<Investment
          key={rowID}
          investment={rowData}
          {...this.props}
          styles={styles}
        />);
      } else {
        return (<View>
          <Text>No investments bruh</Text>
        </View>);
      }
    }
  }

  renderHeader() {
    const view = this.state.view;
    const header = [];

    if (this.userId && this.userData) {

      header.push(<ProfileComponent
        key={0}
        {...this.props}
        user={this.userData}
        styles={styles}
      />);

      header.push(<View
        style={[styles.row, { width: fullWidth, backgroundColor: 'white' }]}
        key={1}
      >
        <TouchableHighlight
          underlayColor={'transparent'}
          style={[styles.typeParent, view === 1 ? styles.activeBorder : null]}
          onPress={() => this.changeView(1)}
        >
          <Text style={[styles.type, styles.darkGray, styles.font15, view === 1 ? styles.active : null]}>
            Posts
          </Text>
        </TouchableHighlight>
        <TouchableHighlight
          underlayColor={'transparent'}
          style={[styles.typeParent, view === 2 ? styles.activeBorder : null]}
          onPress={() => this.changeView(2)}
        >
          <Text
            style={[
              styles.type,
              styles.darkGray,
              styles.font15,
              view === 2 ? styles.active : null
            ]}
          >
            Investments
          </Text>
        </TouchableHighlight>
      </View>);
    }

    return header;
  }

  render() {
    let view = this.state.view;
    let postsEl = null;

    if (this.postsData && this.investmentsData && this.userId && this.userData) {
      postsEl = (
        <ListView
          ref={(c) => { this.listview = c; }}
          enableEmptySections
          removeClippedSubviews
          pageSize={1}
          initialListSize={2}
          stickyHeaderIndices={[1]}
          automaticallyAdjustContentInsets={false}
          dataSource={view === 1 ? this.postsData : this.investmentsData}
          renderHeader={this.renderHeader}
          scrollEventThrottle={16}
          renderRow={this.renderFeedRow}
          onEndReached={this.loadMore}
          onEndReachedThreshold={100}
          refreshControl={
            <RefreshControl
              refreshing={this.loading}
              onRefresh={this.loadMore}
              tintColor="#000000"
              colors={['#000000', '#000000', '#000000']}
              progressBackgroundColor="#ffffff"
            />
          }
        />);
    }

    return (
      <View
        style={{
          position: 'relative',
          backgroundColor: 'white',
          flex: 1,
          flexGrow: 1,
          alignItems: 'stretch' }}
      >
        {postsEl}
        <CustomSpinner
          visible={!this.postsData ||
            !this.investmentsData ||
            !this.userId ||
            !this.userData
          }
        />
      </View>
    );
  }
}

Profile.propTypes = {
  actions: React.PropTypes.object,
};

function mapStateToProps(state) {
  return {
    auth: state.auth,
    posts: state.posts,
    users: state.user,
    online: state.online,
    view: state.view,
    stats: state.stats,
    investments: state.investments,
  };
}

function mapDispatchToProps(dispatch) {
  return {
    actions: bindActionCreators({
      ...statsActions,
      ...authActions,
      ...postActions,
      ...onlineActions,
      ...notifActions,
      ...animationActions,
      ...viewActions,
      ...messageActions,
      ...tagActions,
      ...userActions,
      ...investActions,
      ...subscriptionActions,
    }, dispatch),
  };
}

export default connect(mapStateToProps, mapDispatchToProps)(Profile);

localStyles = StyleSheet.create({
  postsHeader: {
    padding: 10,
  },
  uploadAvatar: {
    height: 100,
    width: 100,
    resizeMode: 'cover',
  },
  profileContainer: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    backgroundColor: 'white',
  },
  insideRow: {
    flex: 1,
  },
  insidePadding: {
    paddingLeft: 10,
    paddingRight: 10,
  },
  pictureWidth: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  wrap: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
  },
  centering: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
});

styles = { ...localStyles, ...globalStyles };
