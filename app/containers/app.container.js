'use strict';

import React, { Component } from 'react';
import {
  AppRegistry,
  StyleSheet,
  Text,
  View,
  TextInput,
  StatusBarIOS,
  AppState,
  Navigator,
  TouchableHighlight,
  ActionSheetIOS,
  AlertIOS,
  Image
} from 'react-native';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
var {Router, routerReducer, Route, Container, Animations, Schema} = require('react-native-redux-router');
import { globalStyles, fullWidth, fullHeight } from '../styles/global';
import Button from 'react-native-button';
import Auth from './auth.container';
import Import from './import.container';
import Profile from './profile.container';
import Notification from '../components/notification.component';
import Login from '../components/login.component';
import Signup from '../components/signup.component';
import Categories from '../components/categories.component';
import Read from './read.container';
import Footer from './footer.container';
import CreatePost from './createPost.container';
import Discover from './discover.container';
import SinglePost from './singlePost.container';
import Activity from './activity.container';
import Comments from './comments.container';
import Messages from './messages.container';
import Thirst from './thirst.container';
import InvestAnimation from '../components/investAnimation.component';
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
var ImagePickerManager = require('NativeModules').ImagePickerManager;
import * as utils from '../utils';
import { pickerOptions } from '../utils/pickerOptions';

class Application extends Component {
  constructor (props, context) {
    super(props, context)
    this.state = {
      newName: null,
      buttons: [
        'Change display name',
        'Add new photo',
        'Logout',
        'Cancel'
      ],
      destructiveIndex: 2,
      cancelIndex: 3,
      routes: [
        {name: 'auth'}
      ]
    }
  }

  componentDidMount() {
    var self = this;
    AppState.addEventListener('change', this.handleAppStateChange.bind(self));
  }

  componentWillReceiveProps(next, nextState) {
    var self = this;
    if (!self.props.auth.user && next.auth.user) {
      self.props.actions.userToSocket(next.auth.user);
      self.props.actions.getActivity(next.auth.user._id, 0);
      self.props.actions.getGeneralActivity(next.auth.user._id, 0);
      self.props.actions.getMessages(next.auth.user._id);
      self.props.actions.setSelectedUser(next.auth.user._id);
      self.props.actions.setSelectedUserData(next.auth.user);
      if (self.refs.navigator) self.refs.navigator.replace({name: 'profile'});
    }
  }

  componentWillUpdate(nextProps, nextState) {
    var self = this;
    if (!self.state.newName && nextState.newName) {
      var user = self.props.auth.user;
      user.name = nextState.newName;
      self.props.actions.updateUser(user, self.props.auth.token).then(function(results) {
        if (results) self.props.actions.getUser(self.props.auth.token, false);
      })
    }
    if (self.props.posts.tag != nextProps.posts.tag && nextProps.posts.tag) {
      self.refs.navigator.replace({name: 'discover'});
    }
  }

  componentWillUnmount() {
    var self = this;
    AppState.removeEventListener('change', this.handleAppStateChange.bind(self));
  }

  handleAppStateChange(currentAppState) {
    var self = this;
    if (currentAppState == 'active' && self.props.auth.user) {
      self.props.actions.userToSocket(self.props.auth.user);
      self.props.actions.getActivity(self.props.auth.user._id, 0);
      self.props.actions.getGeneralActivity(self.props.auth.user._id, 0);
    }
  }

  logoutRedirect() {
    var self = this;
    self.props.actions.removeDeviceToken(self.props.auth);
    self.props.actions.logoutAction(self.props.auth.user, self.props.auth.token);
    self.refs.navigator.replace({name: 'login'});
  }

  changePhoto() {
    var self = this;
    console.log('change photo');
  }

  changeName() {
    var self = this;
    console.log('change name');
    AlertIOS.prompt(
      'Enter new name',
      self.props.auth.user.name,
      [
        {text: 'Cancel', onPress: () => console.log('Cancel Pressed'), style: 'cancel'},
        {text: 'OK', onPress: newname => self.setState({newName: newname})},
      ],
    );
  }

  configureTransition(route, routeStack) {
    //console.log(Navigator.NavigationBar, 'navigator')
    if (route.name == 'categories' || route.name == 'comments' || route.name == 'login' || route.name == 'signup' || route.name == 'messages' || route.name == 'thirst' || route.name == 'user') {
      return Navigator.SceneConfigs.PushFromRight
    } else {
      return Navigator.SceneConfigs.FadeAndroid
    }
  }

  chooseImage() {
    var self = this;
    self.pickImage(function(err, data){
      if(data){
        utils.s3.toS3Advanced(data, self.props.auth.token).then(function(results){
          if (results.success) {
            var newUser = self.props.auth.user;
            newUser.image = results.url;
            self.props.actions.updateUser(newUser, self.props.auth.token).then(function(results) {
              if (results) self.props.actions.getUser(self.props.auth.token, false);
            })
          } else {
            console.log('err');
          }
        })
      }
    });
  }


  pickImage(callback){
    var self = this;
      ImagePickerManager.showImagePicker(pickerOptions, (response) => {
      if (response.didCancel) {
        console.log('User cancelled image picker');
        callback("cancelled");
      }
      else if (response.error) {
        console.log('ImagePickerManager Error: ', response.error);
        callback("error");
      }
      else if (response.customButton) {
        console.log('User tapped custom button: ', response.customButton);
        callback("error");
      }
      else {
        callback(null, response.uri);
      }
    });
  }


  showActionSheet() {
    var self = this;
    ActionSheetIOS.showActionSheetWithOptions({
      options: self.state.buttons,
      cancelButtonIndex: self.state.cancelIndex,
      destructiveButtonIndex: self.state.destructiveIndex,
    },
    (buttonIndex) => {
      switch(buttonIndex) {
          case 0:
              self.changeName();
              break;
          case 1:
              self.chooseImage();
              break;
          case 2:
              self.logoutRedirect();
              break;
          default:
              return;
      }
    });
  }

  routeFunction(route, nav) {
    var self = this;
    //if (route.name != 'profile' && self.props.users.selectedUserId) self.props.actions.clearSelectedUser();
    switch(route.name) {
      case 'login':
        return <Login { ...self.props } navigator={nav} route={route} />;
        break
      case 'signup':
        return <Signup { ...self.props } navigator={nav} route={route} />;
        break
      case 'profile':
        return <Profile { ...self.props } navigator={nav} route={route} />;
        break
      case 'activity':
        return <Activity { ...self.props } navigator={nav} route={route} />;
        break
      case 'createPost':
        return <CreatePost { ...self.props } navigator={nav} route={route} />;
        break
      case 'categories':
        return <Categories { ...self.props } navigator={nav} route={route} />;
        break
      case 'discover':
        return <Discover { ...self.props } navigator={nav} route={route} />;
        break
      case 'read':
        return <Read { ...self.props } navigator={nav} route={route} />;
        break
      case 'comments':
        return <Comments { ...self.props } navigator={nav} route={route} />;
        break
      case 'thirst':
        return <Thirst { ...self.props } navigator={nav} route={route} />;
        break
      case 'singlePost':
        return <SinglePost { ...self.props } navigator={nav} route={route} />;
        break
      case 'messages':
        return <Messages { ...self.props } navigator={nav} route={route} />;
        break
      default:
        return <Auth { ...self.props } navigator={nav} route={route} />;;
      }
  }

  left(route, navigator, index, navState) {
    var self = this;
    if (route.name == 'messages' || route.name == 'singlePost' || route.name == 'comments' || route.name == 'categories' || route.name == 'login' || route.name == 'signup' || route.name == 'thirst') {
      return (<TouchableHighlight underlayColor={'transparent'} style={{flex: 1, alignItems: 'center', justifyContent: 'center', padding: 10}} onPress={self.back.bind(self, navigator)}><Text>Back</Text></TouchableHighlight>);
    } else {
      return null;
    }
  }

  right(route, navigator, index, navState) {
    var self = this;
    var statsEl = null;
    var relevance = 0;
    var balance = 0;
    var user = null;
    if (self.props.auth.user) {
      user = self.props.auth.user;
      if (user.relevance) relevance = user.relevance;
      if (user.balance) balance = user.balance;
      if (balance > 0) balance = balance.toFixed(0);
      if (relevance > 0) relevance = relevance.toFixed(0);
    }
    if (self.props.auth.user) {
      statsEl = (<View><Text style={styles.statsTxt}>📈<Text style={styles.active}>{relevance}</Text>  💵<Text style={styles.active}>{balance}</Text></Text></View>
      )
    }
    if (route.name != 'profile') {
      return (<View style={{flex: 1, justifyContent: 'center', padding: 10}}>{statsEl}</View>);
    } else if (route.name == 'profile' && !self.props.users.selectedUserId) {
      return (<View style={styles.gear}><TouchableHighlight underlayColor={'transparent'}  onPress={self.showActionSheet.bind(self)} ><Image style={styles.gearImg} source={require('../assets/images/gear.png')} /></TouchableHighlight></View>);
    }
  }

  title(route, navigator, index, navState) {
    var self = this;
    var title = self.getTitle(route);
    return (<View style={{flex: 1, alignItems: 'center', justifyContent: 'center'}}><Text numberOfLines={1} ellipsizeMode={'tail'} style={{width: fullWidth-225, textAlign: 'center'}}>{title}</Text></View>);
  }

  back(nav) {
    var self = this;
    nav.pop();
  }

  getTitle(route) {
    var self = this;
    var title = '';
    switch(route.name) {
      case 'login':
        title = 'Log In';
        break;

      case 'signup':
        title = 'Sign Up';
        break;

      case 'profile':
        if (self.props.users.selectedUserData) {
          title = self.props.users.selectedUserData.name;
        } else if (self.props.auth.user) {
          title = self.props.auth.user.name
        } else {
          title = 'User';
        }
        break;

      case 'activity':
        title = 'Activity';
        break;

      case 'createPost':
          title = 'Post';
        break;

      case 'categories':
          title = 'Categories';
        break;

      case 'discover':
          title = 'Discover';
        break;

      case 'read':
          title = 'Read';
        break;

      case 'user':
        self.props.users.selectedUser ? title = self.props.users.selectedUser.name : title = '';
        break;

      case 'messages':
          title = 'Thirsty message';
        break;

      case 'singlePost':
        self.props.posts.activePost.title ? title = self.props.posts.activePost.title : title = 'Untitled Post';
        break;

      case 'messages':
          title = 'Messages';
        break;

      default:
        title = '';
    }
    return title;
  }

  getNavigator() {
    var self = this;
    return self.refs.navigator;
  }

  render() {
    var self = this;

    if (self.props.auth.user) {
      return (
        <View style={{flex: 1}} >
          <Navigator
            renderScene={(route, navigator) =>
              self.routeFunction(route, navigator)
            }
            initialRouteStack={self.state.routes}
            initialRoute={self.state.routes[0]}
            style={{flex: 1, paddingTop: 64}}
            configureScene={(route, routeStack) =>
              self.configureTransition(route, routeStack)
            }
            ref="navigator"
            navigationBar={
              <Navigator.NavigationBar
                routeMapper={{
                  LeftButton: (route, navigator, index, navState) =>
                    {  return self.left(route, navigator, index, navState) },
                  RightButton: (route, navigator, index, navState) =>
                    { return self.right(route, navigator, index, navState) },
                  Title: (route, navigator, index, navState) =>
                    { return self.title(route, navigator, index, navState) },
                }}
                style={{backgroundColor: 'white', borderBottomColor: '#f0f0f0', borderBottomWidth: StyleSheet.hairlineWidth }}
              />
            }
          />
         <Footer {...self.props} navigator={self.getNavigator()} />
          <View pointerEvents={'none'} style={globalStyles.notificationContainer}>
            <Notification {...self.props} />
          </View>
          <InvestAnimation {...self.props} />
        </View>
      );
    } else {
      return (
        <View style={{flex: 1}}>
          <Navigator
            initialRoute={self.state.routes[0]}
            initialRouteStack={self.state.routes}
            renderScene={(route, navigator) =>
              self.routeFunction(route, navigator)
            }
            configureScene={(route, routeStack) =>
              self.configureTransition(route, routeStack)
            }
            style={{flex: 1, paddingTop: 0}}
            ref="navigator"
          />
          <Footer {...self.props} navigator={self.getNavigator()} />
          <View pointerEvents={'none'} style={globalStyles.notificationContainer}>
            <Notification {...self.props} />
          </View>
          <InvestAnimation {...self.props} />
        </View>
      );
    }
  }
}

function mapStateToProps(state) {
  return {
    auth: state.auth,
    posts: state.posts,
    users: state.user,
    router: state.routerReducer,
    online: state.online,
    notif: state.notif,
    animation: state.animation,
    view: state.view,
    messages: state.messages,
    stats: state.stats,
    investments: state.investments
   }
}

function mapDispatchToProps(dispatch) {
  return {
    actions: bindActionCreators({...statsActions, ...authActions, ...postActions, ...onlineActions, ...notifActions, ...animationActions, ...viewActions, ...messageActions, ...tagActions, ...userActions, ...investActions, ...subscriptionActions}, dispatch)
  }
}


export default connect(mapStateToProps, mapDispatchToProps)(Application)

const localStyles = StyleSheet.create({
  back: {
    position: 'absolute',
    top: 0,
    left: 5,
    height: 60,
    padding: 12,
    flex: 1,
    justifyContent: 'flex-end'
  },
  backInner: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  backImg: {
    height: 10,
    width: 7,
    backgroundColor: 'transparent',
    marginRight: 4
  },
  backText: {
    color: '#aaaaaa',
    fontSize: 12
  },
  gear: {
    height: 45,
    flex: 1,
    justifyContent: 'center',
    padding: 12,
  },
  gearImg: {
    height: 20,
    width: 20
  },
  nav: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.25)'
  },
  stats: {
    position: 'absolute',
    top: 0,
    right: 0,
    padding: 12,
    height: 60,
    alignItems: 'center',
    justifyContent: 'flex-end'
  },
  statsTxt: {
    color: 'black',
    fontSize: 10
  },
  navItem: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'nowrap'
  },
  navLink: {
    backgroundColor: 'transparent',
    fontSize: 15,
    textAlign: 'center',
  },
  maxWidth: {
    width: fullWidth/1.25,
  }
});

var styles = {...localStyles, ...globalStyles};

