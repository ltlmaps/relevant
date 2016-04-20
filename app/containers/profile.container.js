'use strict';
import React, {
  AppRegistry,
  Component,
  StyleSheet,
  Text,
  View,
  Image,
  TextInput,
  Dimensions,
  ScrollView
} from 'react-native';

var FileUpload = require('NativeModules').FileUpload;
import { connect } from 'react-redux';
var Button = require('react-native-button');
import * as authActions from '../actions/auth.actions';
import * as postActions from '../actions/post.actions';
import { bindActionCreators } from 'redux';
var ImagePickerManager = require('NativeModules').ImagePickerManager;
require('../publicenv');
import * as utils from '../utils';
import { pickerOptions } from '../utils/pickerOptions';
import { globalStyles, fullWidth, fullHeight } from '../styles/global';
import Post from '../components/post.component';

class Profile extends Component {
  constructor (props, context) {
    super(props, context)
    this.state = {
      newName: '',
      editing: false
    }
  }

  componentDidMount() {
   this.props.actions.getUserPosts(this.props.auth.user._id);
  }

  sendTestSocketMessage() {
    this.props.dispatch({type:'server/hello', payload:"Hello"})
  }

  render() {
    var self = this;
    var user = null;
    var userImage = null;
    var name = null;
    var relevance = 0;
    var balance = 0;
    var userImageEl = null;
    var postsEl = null;

    if (this.props.auth.user) {
      user = this.props.auth.user;
      if (user.name) name = user.name;
      if (user.image) userImage = user.image;
      if (user.relevance) relevance = user.relevance;
      if (user.balance) balance = user.balance;
    }

    if (userImage) {
      userImageEl = (<Image source={{uri: userImage}} style={styles.uploadAvatar} />)
    }

    if (self.props.posts.userPosts) {
      if (self.props.posts.userPosts.length > 0) {
        postsEl = self.props.posts.userPosts.map(function(post, i) {
          return (<Post post={post} {...self.props} styles={styles} />);
        });
      } else {
         postsEl = (<View><Text>0 Posts</Text></View>)
       }
    } else {
      postsEl = (<View><Text>0 Posts</Text></View>)
    }

    return (
      <View style={styles.fullContainer}>
      <ScrollView style={styles.fullContainer}>
        <View style={styles.row}>
          <View>{userImageEl}</View>
          <View style={[styles.insideRow, styles.insidePadding]}>
            <Text>Relevance: <Text style={styles.active}>{relevance}</Text></Text>
            <Text>Balance: <Text style={styles.active}>{balance}</Text></Text>
          </View>
        </View>
        <View>
          <Button onPress={this.sendTestSocketMessage.bind(this)}>Send test socket message</Button>
          <Text>{this.props.message}</Text>
          <Text style={[styles.font20, styles.postsHeader]}>Posts</Text>
          {postsEl}
        </View>
      </ScrollView>

      </View>
    );
  }
}

function mapStateToProps(state) {
  return {
    auth: state.auth,
    posts: state.posts,
    router: state.routerReducer,
    message: state.socket.message
   }
}

function mapDispatchToProps(dispatch) {
  return {
    actions: bindActionCreators({...authActions, ...postActions}, dispatch)
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(Profile)

const localStyles = StyleSheet.create({
  postsHeader: {
    padding: 20
  },
  uploadAvatar: {
    height: 100,
    width: 100,
    resizeMode: 'cover'
  },
  profileContainer: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    backgroundColor: 'white',
  },
  column: {
    flexDirection: 'column',
    width: fullWidth,
    paddingRight: 20,
    paddingLeft: 20,
    paddingBottom: 20,
  },
  insideRow: {
    flex: 1,
  },
  insidePadding: {
    paddingLeft: 10,
    paddingRight: 10
  },
  pictureWidth: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  wrap: {
    flexDirection: 'row',
    flexWrap: 'nowrap'
  },
});

var styles = {...localStyles, ...globalStyles};
