import React, { Component } from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import * as adminActions from '../../actions/admin.actions';
import * as navigationActions from '../../actions/navigation.actions';
import * as postActions from '../../actions/post.actions';
import InviteComponent from './invites.component';
import InviteList from './inviteList.component';

class Invites extends Component {
  constructor(props, context) {
    super(props, context);
  }

  componentWillMount() {
    console.log('load invites')
    let skip = this.props.inviteList.length;
    this.props.actions.getInvites(skip, 100);
  }

  render() {
    if (this.props.inviteListView) return <InviteList {...this.props} />;
    return <InviteComponent {...this.props} />;
  }
}

function mapStateToProps(state) {
  return {
    users: state.user.users,
    auth: state.auth,
    invites: state.admin.invites,
    inviteList: state.admin.inviteList
  };
}

function mapDispatchToProps(dispatch) {
  return {
    actions: bindActionCreators(
      {
        ...postActions,
        ...adminActions,
        ...navigationActions,
      }, dispatch),
  };
}

export default connect(mapStateToProps, mapDispatchToProps)(Invites);
