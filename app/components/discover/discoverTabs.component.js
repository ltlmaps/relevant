import React, { PureComponent, Component } from 'react';
import {
  StyleSheet,
  Text,
  InteractionManager,
  View
} from 'react-native';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import ScrollableTabView from 'react-native-scrollable-tab-view';
import DefaultTabBar from './discoverTabBar.component';
import Feed from './feed.container';
import Discover from './discover.container';
import DiscoverHeader from './discoverHeader.component';
import { globalStyles, fullWidth, fullHeight, blue } from '../../styles/global';
import Topics from '../createPost/topics.component';

let styles;
const SUB_TITLE = 'Subscriptions';

class DiscoverTabs extends Component {
  constructor(props, context) {
    super(props, context);
    this.state = {
      index: 1,
      routes: [
        { key: 'feed', title: SUB_TITLE },
        { key: 'new', title: 'New' },
        { key: 'trending', title: 'Trending' },
      ],
      headerHeight: 50,
    };
    this.renderHeader = this.renderHeader.bind(this);
    this.handleChangeTab = this.handleChangeTab.bind(this);
    this.setPostTop = this.setPostTop.bind(this);
    this.onScroll = this.onScroll.bind(this);
    this.renderScene = this.renderScene.bind(this);
    this.renderBadge = this.renderBadge.bind(this);
    this.scrollOffset = {};
    this.initialTab = 1;
    if (this.props.scene) {
      this.state.routes = [
        { key: 'new', title: 'New' },
        { key: 'trending', title: 'Trending' },
        { key: 'people', title: 'People' },
      ];
    }
  }

  componentWillMount() {
    if (this.props.scene && this.props.scene.topic) {
      this.mainDiscover = false;
      this.topicView = true;
      this.filter = [this.props.scene.topic];
      this.topic = this.props.scene.topic;
      this.loaded = false;
      this.needsReload = new Date().getTime();

      this.onInteraction = InteractionManager.runAfterInteractions(() => {
        this.loaded = true;
        this.setState({});
      });
    } else {
      // this.setState({ index: 1 });
      // this.filter = this.props.tags.selectedTags;
    }
  }

  componentDidMount() {
    // swipe to default tab here
    // if (this.props.view.discover !== this.state.view && this.mainDiscover) {
    //   this.setState({ view: this.props.view.discover });
    //   this.tabView.goToPage(this.state.view);
    // }
    // this.setState({ index: 1 });
  }

  componentWillReceiveProps(next) {
    if (next.view.discover !== this.props.view.discover &&
      next.view.discover.tab !== this.state.index
    ) {
      this.tabView.goToPage(next.view.discover.tab);
    }
  }

  onScroll(event, key) {
    // this.scrollOffset[key] = event.nativeEvent.contentOffset.y;
    this.header.onScroll(event);
  }

  setPostTop(height) {
    this.setState({ headerHeight: height });
  }

  handleChangeTab(index) {
    this.header.showHeader();
    this.setState({ index });
    this.props.actions.setView('discover', index);
  }

  renderScene(route) {
    let index = this.state.index;
    let currentRoute = this.state.routes[index];
    switch (route.key) {
      case 'feed':
        return (
          <Feed
            key={'feed'}
            active={currentRoute.key === route.key}
            onScroll={this.onScroll}
            offsetY={this.state.headerHeight}
            tabLabel={route.title}
          />
        );
      case 'new':
        return (
          <Discover
            active={currentRoute.key === route.key}
            type={'new'}
            key={'new'}
            scene={this.props.scene}
            onScroll={this.onScroll}
            offsetY={this.state.headerHeight}
            tabLabel={route.title}
          />
        );
      case 'trending':
        return (
          <Discover
            active={currentRoute.key === route.key}
            type={'top'}
            key={'top'}
            scene={this.props.scene}
            onScroll={this.onScroll}
            offsetY={this.state.headerHeight}
            tabLabel={route.title}
          />
        );
      case 'people':
        return (
          <Discover
            active={currentRoute.key === route.key}
            type={'people'}
            key={'people'}
            scene={this.props.scene}
            onScroll={this.onScroll}
            offsetY={this.state.headerHeight}
            tabLabel={route.title}
          />
        );
      default:
        return null;
    }
  };

  renderBadge(title) {
    if (title !== SUB_TITLE) return null;
    let count = this.props.feedUnread;
    if (typeof count === 'number') {
      this.totalBadge += count;
    }
    if (!count) return null;
    return (
      <Text
        style={{
          backgroundColor: 'transparent',
          fontSize: 14,
          fontWeight: 'bold',
          position: 'absolute',
          color: 'red',
          // color: blue,
          top: -1,
          right: -10 }}
      >
        {'•'}
        {/*count*/}
      </Text>
    );
  }

  renderHeader(props) {
    return (
      <DiscoverHeader
        ref={(c => this.header = c)}
        setPostTop={this.setPostTop}
      >
        <DefaultTabBar
          tabStyle={{ paddingBottom: 0 }}
          style={{
            height: 50,
            paddingBottom: 0,
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderColor: 'black'
          }}
          renderBadge={this.renderBadge}
          {...props}
        />
      </DiscoverHeader>
    );
  }

  render() {
    let tabs = this.state.routes.map(route => this.renderScene(route));

    let topics;
    if (this.props.topics) {
      topics = (<View
        style={{
          position: 'absolute',
          backgroundColor: 'white',
          width: fullWidth,
          height: fullHeight - 108,
          zIndex: 10000,
        }}
      >
        <Topics
          topics={this.props.tags.parentTags}
          action={(topic) => {
            this.props.actions.goToTopic(topic);
          }}
          actions={this.props.actions}
        />
      </View>);
    }

    return (
      <View style={{ flex: 1 }}>
        {topics}
        <ScrollableTabView
          ref={tabView => this.tabView = tabView}
          tabBarTextStyle={[styles.tabFont]}
          tabBarActiveTextColor={blue}
          initialPage={this.initialTab}
          tabBarUnderlineStyle={{ backgroundColor: blue }}
          onChangeTab={(tab) => {
            this.setState({ index: tab.i });
            this.header.showHeader();
          }}
          prerenderingSiblingsNumber={Infinity}
          contentProps={{
            bounces: false,
            forceSetResponder: (e) => {
              this.props.actions.scrolling(true);
              clearTimeout(this.scrollTimeout);
              this.scrollTimeout = setTimeout(
                () => this.props.actions.scrolling(false), 80);
            }
          }}
          renderTabBar={(props) => this.renderHeader(props)}
        >
          {tabs}
        </ScrollableTabView>
      </View>
    );
  }
}

let localStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

styles = { ...globalStyles, ...localStyles };

function mapStateToProps(state) {
  return {
    tags: state.tags,
    view: state.view,
    // tabs: state.navigation.tabs,
    topics: state.navigation.showTopics,
    feedUnread: state.posts.feedUnread
  };
}

function mapDispatchToProps(dispatch) {
  return {
    // actions: bindActionCreators(
    //   { ...postActions,
    //     ...animationActions,
    //     ...tagActions,
    //     ...investActions,
    //     ...userActions,
    //     ...statsActions,
    //     ...authActions,
    //     ...navigationActions,
    //     ...createPostActions,
    //   }, dispatch),
  };
}

export default connect(mapStateToProps, mapDispatchToProps)(DiscoverTabs);
