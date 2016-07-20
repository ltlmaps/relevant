'use strict';
import React, {
  AppRegistry,
  Component,
  StyleSheet,
  Text,
  View,
  Image,
  TextInput,
  ScrollView,
  ListView,
  Linking,
  TouchableHighlight,
  LayoutAnimation
} from 'react-native';
import { connect } from 'react-redux';
var Button = require('react-native-button');
import { bindActionCreators } from 'redux';
import * as authActions from '../actions/auth.actions';
import * as postActions from '../actions/post.actions';
import * as userActions from '../actions/user.actions';
import { globalStyles, fullWidth, fullHeight } from '../styles/global';
import Post from '../components/post.component';
import * as investActions from '../actions/invest.actions';
import * as notifActions from '../actions/notif.actions';
import * as tagActions from '../actions/tag.actions';
import Notification from '../components/notification.component';
import SingleActivity from '../components/activity.component';
import DiscoverUser from '../components/discoverUser.component';
import Spinner from 'react-native-loading-spinner-overlay';

class Activity extends Component {
  constructor (props, context) {
    super(props, context)
    this.state = {
      view: 1,
      online: [],
      onlinePop: [],
      dataSource: null,
      enabled: true
    }
  }

  componentDidMount() {
    var self = this;
    self.populateUsers(self.props.online);
    self.props.actions.markRead(self.props.auth.token, self.props.auth.user._id);
  }

  componentWillReceiveProps(next) {
    var self = this;
    if(next.online != self.props.online) self.populateUsers(next.online);
  }

  componentWillUpdate(next, nextState) {
    var self = this;
    if (next.notif.personal && next.notif.general && next.notif.general != self.props.notif.general || next.notif.personal != self.props.notif.personal || self.state.view != nextState.view) {
      if (nextState.view == 1) {
        var ds = new ListView.DataSource({rowHasChanged: (r1, r2) => r1 !== r2});
        self.setState({dataSource: ds.cloneWithRows(next.notif.personal)});
      }
      if (nextState.view == 2) {
        var ds = new ListView.DataSource({rowHasChanged: (r1, r2) => r1 !== r2});
        self.setState({dataSource: ds.cloneWithRows(next.notif.general)});
      }
    }
  }

  renderRow(rowData) {
    var self = this;
    return (
      <SingleActivity singleActivity={rowData} {...self.props} styles={styles} />
    );
  }

  populateUsers(users) {
    var self = this;
    var i = 0;
    var populated = [];
    for (var index in users) {
      i += 1;
      self.props.actions.getOnlineUser(index, self.props.auth.token).then(function(response) {
        if (response.status) {
          populated.push(response.data);
          if (i == Object.keys(users).length) {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            self.setState({onlinePop: populated, online: users});
          }
        } else {
          console.log('error');
        }
      })
    }
  }

  changeView(num) {
    var self = this;
    self.setState({view: num});
  }

  onScroll(e) {
    var self = this;
    if (self.refs.listview.scrollProperties.offset + self.refs.listview.scrollProperties.visibleLength >= self.refs.listview.scrollProperties.contentLength) {
      self.loadMore();
    }
  }

  loadMore() {
    var self = this;
     console.log('load more');
    if (self.state.enabled) {
      self.setState({enabled: false});
      switch(self.state.view) {
        case 1:
           self.props.actions.getActivity(self.props.auth.user._id, self.props.notif.personal.length);
          break;

        case 2:
           self.props.actions.getGeneralActivity(self.props.auth.user._id, self.props.notif.general.length);
          break;

        default:
          return;
      }
      setTimeout(function() {
        self.setState({enabled: true})
      }, 1000);
    }
  }

  render() {
    var self = this;
    var activityEl = null;
    var personalActivity = null;
    var generalActivity = null;
    var personalActivityEl = null;
    var generalActivityEl = null;
    var onlineEl = null;

    if (self.state.dataSource) {
      activityEl = (<ListView ref="listview" renderScrollComponent={props => <ScrollView {...props} />} onScroll={self.onScroll.bind(self)} dataSource={self.state.dataSource} renderRow={self.renderRow.bind(self)} />)
    }

    if (self.state.onlinePop.length) {
      onlineEl = self.state.onlinePop.map(function(user, i) {
          return <DiscoverUser key={user._id} {...self.props} user={user} styles={styles} />;
      });
    }

    return (
      <View style={styles.fullContainer}>
        <View style={styles.activityHeader}>
          <Text onPress={self.changeView.bind(self, 1)} style={[self.state.view == 1 ? styles.active : null, styles.font20]}>Personal</Text>
          <Text onPress={self.changeView.bind(self, 2)} style={[self.state.view == 2 ? styles.active : null, styles.font20]}>General</Text>
          <Text onPress={self.changeView.bind(self, 3)} style={[self.state.view == 3 ? styles.active : null, styles.font20]}>Online</Text>
        </View>
        {self.state.view < 3 ? activityEl : onlineEl }
        <View pointerEvents={'none'} style={styles.notificationContainer}>
          <Notification />
        </View>
        <Spinner color='rgba(0,0,0,1)' overlayColor='rgba(0,0,0,0)' visible={!self.state.dataSource} />
      </View>
    );
  }
}

function mapStateToProps(state) {
  return {
    auth: state.auth,
    posts: state.posts,
    user: state.user,
    router: state.routerReducer,
    online: state.online,
    notif: state.notif
   }
}

function mapDispatchToProps(dispatch) {
  return {
    actions: bindActionCreators({...investActions, ...authActions, ...postActions, ...userActions, ...tagActions, ...notifActions}, dispatch)
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(Activity)

const localStyles = StyleSheet.create({
activityRight: {
  flex: 0.40,
},
activityLeft: {
  flex: 0.60,
},
singleActivity: {
  padding: 10,
  borderBottomWidth: 1,
  borderBottomColor: 'black',
  width: fullWidth,
  justifyContent: 'space-between',
  flexDirection: 'row',
  alignItems: 'center',
  flex: 1,
},
activityHeader: {
  flexDirection: 'row',
  padding: 10,
  justifyContent: 'space-around',
  alignItems: 'center'
},
onlineUser: {
  justifyContent: 'space-between',
  flexDirection: 'row',
  padding: 10
},
});

var styles = {...localStyles, ...globalStyles};


















