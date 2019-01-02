import React, { Component } from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import * as postActions from 'modules/post/post.actions';
import * as investActions from 'modules/post/invest.actions';
import Comments from 'modules/comment/web/comment.container';
import Footer from 'modules/navigation/web/footer.component';
import Sidebar from 'modules/navigation/web/sidebar.component';
import Post from './post.component';

class Posts extends Component {
  static propTypes = {
    actions: PropTypes.object,
    posts: PropTypes.object,
    match: PropTypes.object,
    location: PropTypes.object
  };

  static fetchData(dispatch, params) {
    if (!params.id || params.id === undefined) return null;
    return dispatch(postActions.getSelectedPost(params.id));
  }

  componentDidMount() {
    const { params } = this.props.match;
    this.post = this.props.posts.posts[params.id];
    if (!this.post) {
      this.props.actions.getSelectedPost(params.id);
    }
  }

  render() {
    const { params } = this.props.match;
    this.post = this.props.posts.posts[params.id];
    if (!this.post) return null;
    const link = this.props.posts.links[this.post.metaPost];
    const hasPost = this.post && this.post !== 'notFound';

    return (
      <div style={{ flex: 1 }}>
        <div className="singlePost row column pageContainer">
          {hasPost && (
            <div className="postContainer">
              <Post post={this.post} link={link} {...this.props} />
              <Comments post={this.post} {...this.props} />
            </div>
          )}
          <Sidebar {...this.props} />
        </div>
        <Footer location={this.props.location} />
      </div>
    );
  }
}

export default connect(
  state => ({
    auth: state.auth,
    posts: state.posts,
    user: state.user,
    investments: state.investments,
    myPostInv: state.investments.myPostInv,
    isAuthenticated: state.auth.isAuthenticated
  }),
  dispatch => ({
    actions: bindActionCreators(
      {
        ...postActions,
        ...investActions
      },
      dispatch
    )
  })
)(Posts);