import React, { Component } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  InteractionManager
} from 'react-native';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import * as authActions from '../actions/auth.actions';
import * as userActions from '../actions/user.actions';
import * as postActions from '../actions/post.actions';
import * as statsActions from '../actions/stats.actions';
import * as investActions from '../actions/invest.actions';
import { globalStyles, fullWidth } from '../styles/global';
import Post from '../components/post.component';
import * as animationActions from '../actions/animation.actions';
import CustomSpinner from '../components/CustomSpinner.component';

const localStyles = StyleSheet.create({
  singlePostContainer: {
    width: fullWidth,
    flex: 1,
  },
});

let styles = { ...localStyles, ...globalStyles };

class SinglePost extends Component {

  componentWillMount() {
    this.postId = this.props.scene.id;
    this.postData = this.props.posts.selectedPostData[this.postId];

    if (!this.postData) {
      InteractionManager.runAfterInteractions(() => {
        this.props.actions.getSelectedPost(this.postId);
      });
    }
  }

  render() {
    let el = null;

    this.postData = this.props.posts.selectedPostData[this.postId];

    if (this.postData) {
      el = (<ScrollView style={styles.fullContainer}>
        <View>
          <Post post={this.postData} {...this.props} styles={styles} />
        </View>
      </ScrollView>);
    }

    return (
      <View style={[styles.fullContainer, { backgroundColor: 'white' }]}>
        {el}
        <CustomSpinner visible={!this.postData} />
      </View>
    );
  }
}

function mapStateToProps(state) {
  return {
    auth: state.auth,
    posts: state.posts,
    // stats: state.stats,
    // users: state.user,
    // investments: state.investments,
  };
}

function mapDispatchToProps(dispatch) {
  return {
    actions: bindActionCreators({
      ...statsActions,
      ...authActions,
      ...postActions,
      ...animationActions,
      ...investActions,
      ...userActions,
    }, dispatch),
  };
}

export default connect(mapStateToProps, mapDispatchToProps)(SinglePost);
