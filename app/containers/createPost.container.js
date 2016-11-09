import React, { Component } from 'react';
import {
  StyleSheet,
  NavigationExperimental,
  View,
  Text,
  TouchableHighlight,
  AlertIOS
} from 'react-native';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import * as authActions from '../actions/auth.actions';
import * as createPostActions from '../actions/createPost.actions';
import * as postActions from '../actions/post.actions';
import * as tagActions from '../actions/tag.actions';
import * as navigationActions from '../actions/navigation.actions';
import UrlComponent from '../components/createPost/url.component';
import CreatePostComponent from '../components/createPost/createPost.component';
import Categories from '../components/categories.component';
import * as utils from '../utils';

import { globalStyles } from '../styles/global';

const {
  Header: NavigationHeader,
} = NavigationExperimental;


let styles;

class CreatePostContainer extends Component {

  constructor(props, context) {
    super(props, context);

    this.renderScene = this.renderScene.bind(this);
    this.renderRight = this.renderRight.bind(this);
    this.renderHeader = this.renderHeader.bind(this);
    this.renderTitle = this.renderTitle.bind(this);
    this.back = this.back.bind(this);
    this.uploadPost = this.uploadPost.bind(this);
  }

  back() {
    this.props.actions.pop('home');
  }

  next() {
    if (this.props.step === 'url' && this.enableNext) {
      this.props.navigator.push({
        key: 'categories',
        back: true,
        title: 'Choose a Category',
      }, 'home');
    }
    if (this.props.step === 'post') {
      this.createPost();
    }
  }

  createPost() {
    let props = this.props.createPost;
    this.image = null;

    if (!props.postBody) {
      AlertIOS.alert('Post has no body');
      return;
    }

    if (!props.postCategory) {
      AlertIOS.alert('Please add category');
      return;
    }

    if (props.urlPreview && props.urlPreview.image) {
      utils.s3.toS3Advanced(props.urlPreview.image)
      .then((results) => {
        if (results.success) {
          this.image = results.url;
          this.uploadPost();
        } else {
          this.image = props.urlPreview.image;
          this.uploadPost();
        }
      });
    } else {
      this.image = props.postImage;
      this.uploadPost();
    }
  }

  uploadPost() {
    let props = this.props.createPost;
    let postBody = {
      link: props.postUrl,
      tags: props.postTags,
      body: props.postBody,
      title: props.urlPreview ? props.urlPreview.title : null,
      description: props.urlPreview ? props.urlPreview.description : null,
      category: props.postCategory,
      image: this.image,
      mentions: props.bodyMentions,
      investments: [],
    };
    this.props.actions.submitPost(postBody, this.props.auth.token)
      .then((results) => {
        if (!results) {
          AlertIOS.alert('Post error please try again');
        } else {
          AlertIOS.alert('Success!');
          this.props.actions.clearCreatePost();

          this.props.navigator.resetRoutes('home');

          // this.props.actions.getUserPosts(0, 5, this.props.auth.user._id);
        }
      });
  }

  renderRight(props) {
    this.enableNext = false;
    if (this.props.createPost.postBody && this.props.createPost.postBody.length) {
      this.enableNext = true;
    }
    let right = null;
    if (props.scene.route.next) {
      right = (
        <TouchableHighlight
          style={[styles.rightButton, { opacity: this.enableNext ? 1 : 0.3 }]}
          underlayColor={'transparent'}
          onPress={() => this.next(props)}
        >
          <Text
            style={[styles.rightButtonText]}
          >
            {props.scene.route.next}
          </Text>
        </TouchableHighlight>
      );
    }
    return right;
  }

  renderTitle(props) {
    let title = props.scene.route.title;
    return (
      <NavigationHeader.Title>
        <Text>{title}</Text>
      </NavigationHeader.Title>
    );
  }

  renderHeader(props) {
    let header = (
      <NavigationHeader
        {...props}
        style={{
          backgroundColor: 'white',
          borderBottomColor: '#f0f0f0',
          borderBottomWidth: 1
        }}
        renderTitleComponent={this.renderTitle}
        onNavigateBack={this.back}
        renderRightComponent={this.renderRight}
      />
    );
    return header;
  }

  renderScene() {
    switch (this.props.step) {
      case 'url':
        return <UrlComponent {...this.props.createPost} actions={this.props.actions} />;
      case 'categories':
        return <Categories {...this.props.createPost} actions={this.props.actions} />;
      case 'post':
        return <CreatePostComponent {...this.props.createPost} actions={this.props.actions} />;

      default:
        return null;
    }
  }

  render() {
    return (
      <View style={{ flex: 1 }}>
        {this.renderHeader(this.props.navProps)}
        {this.renderScene()}
      </View>
    );
  }
}

const localStyles = StyleSheet.create({
  rightButton: {
    flex: 1,
    justifyContent: 'center',
    padding: 10
  },
  rightButtonText: {
    color: 'rgb(0, 122, 255)',
    textAlign: 'right',
    fontSize: 17,
  },
});


styles = { ...localStyles, ...globalStyles };

function mapStateToProps(state) {
  return {
    auth: state.auth,
    navigation: state.navigation,
    createPost: state.createPost
  };
}

function mapDispatchToProps(dispatch) {
  return {
    actions: bindActionCreators(
      {
        ...authActions,
        ...navigationActions,
        ...createPostActions,
        ...postActions,
        ...tagActions
      },
      dispatch),
  };
}

export default connect(mapStateToProps, mapDispatchToProps)(CreatePostContainer);

