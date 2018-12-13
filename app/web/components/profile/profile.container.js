import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import Profile from './profile.component';
import UserPosts from './userPosts.component';
import * as MessageActions from '../../../actions/message.actions';
import * as UserActions from '../../../actions/user.actions';
import * as PostActions from '../../../actions/post.actions';
import Eth from '../ethTools/eth.context';

const pageSize = 10;

class ProfileContainer extends Component {
  static propTypes = {
    actions: PropTypes.object,
    params: PropTypes.object
  };

  constructor() {
    super();
    this.state = {};
    this.grabPosts = this.grabPosts.bind(this);
  }

  // Get user object based on userid param in route
  grabUser() {
    this.props.actions.getSelectedUser(this.props.params.id);
  }

  // Get array of posts based on userid param in route
  grabPosts(l) {
    this.props.actions.getUserPosts(l || 0, pageSize, this.props.params.id);
  }

  componentDidMount() {
    this.grabUser();
  }

  componentDidUpdate(nextProps) {
    if (this.props.params.id !== nextProps.params.id) {
      this.grabUser();
    }
  }

  render() {
    return (
      <div style={{ flex: 1 }}>
        <Eth.Consumer>{wallet => <Profile wallet={wallet} {...this.props} />}</Eth.Consumer>
        <UserPosts {...this.props} load={this.grabPosts} pageSize={pageSize} />
      </div>
    );
  }
}

const mapStateToProps = state => ({
  auth: state.auth,
  isAuthenticated: state.auth.isAuthenticated,
  user: state.user,
  posts: state.posts,
  investments: state.investments,
  myPostInv: state.investments.myPostInv
});

const mapDispatchToProps = dispatch =>
  Object.assign(
    {},
    { dispatch },
    {
      actions: bindActionCreators(
        Object.assign(
          {},
          {
            ...UserActions,
            ...MessageActions,
            ...PostActions
          }
        ),
        dispatch
      )
    }
  );

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(ProfileContainer);
