'use strict';
import React, {
  AppRegistry,
  Component,
  StyleSheet,
  Text,
  View,
  Image,
  TextInput
} from 'react-native';
import { connect } from 'react-redux';
var Button = require('react-native-button');
import { bindActionCreators } from 'redux';
import * as authActions from '../actions/authActions';
import * as postActions from '../actions/postActions';
require('../publicenv');
import { globalStyles, fullWidth, fullHeight } from '../styles/global';

class SinglePost extends Component {
  constructor (props, context) {
    super(props, context)
    this.state = {
    }
  }

  componentDidMount() {
    // this.props.actions.getPosts();
  }

  render() {
    var self = this;
    var post = null;
    if (this.props.posts.activePost) post = this.props.posts.activePost;

    return (
      <View style={styles.container}>
        <Text style={styles.font20}>Reading post {post ? post._id : null}</Text>
        <Text>{post ? post.body : null}</Text>
      </View>
    );
  }
}

function mapStateToProps(state) {
  return {
    auth: state.auth,
    posts: state.posts,
    router: state.routerReducer
   }
}

function mapDispatchToProps(dispatch) {
  return {
    actions: bindActionCreators({ ...authActions, ...postActions}, dispatch)
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(SinglePost)

const localStyles = StyleSheet.create({

});

var styles = {...localStyles, ...globalStyles}
