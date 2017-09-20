import React, { Component } from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import Post from './post.component';
import * as postActions from '../../../actions/post.actions';
import Comments from '../comment/comment.container';

if (process.env.BROWSER === true) {
  console.log('BROWSER, import css');
  require('./post.css');
}

class Posts extends Component {
  constructor(props) {
    super(props);
  }

  static fetchData(dispatch, params, req) {
    console.log('calling fetchData');
    return dispatch(postActions.getSelectedPost(params.id));
  }

  componentDidMount() {
    if (!this.post) {
      this.props.actions.getSelectedPost(this.props.params.id);
    }
  }

  render () {
    this.post = this.props.posts.posts[this.props.params.id];
    return (
      <div className='postContainer'>
        <Post post={this.post} {...this.props} />
        <Comments post={this.post} {...this.props} />
      </div>
    );
  }
}

export default connect(
  state => ({
    auth: state.auth,
    posts: state.posts,
  }),
  dispatch => ({
    actions: bindActionCreators({
      ...postActions
    }, dispatch)
  }))(Posts);
