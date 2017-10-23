import React, {
  Component,
} from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';

import * as actionCreators from '../../../actions/admin.actions';
import Marquee from './marquee.component';
import RequestInvite from './requestInvite.component';
import Mission from './mission.component';
import Footer from '../common/footer.component';

if (process.env.BROWSER === true) {
  require('./splash.css');
}

export class Splash extends Component {
  constructor(props, context) {
    super(props, context);
  }

  render() {
    return (
      <div className="splashContainer">
        <Marquee {...this.props} />
        <RequestInvite {...this.props} />
        <Mission />
      </div>
    );
  }
}

const mapStateToProps = (state) => ({
  isAuthenticating: state.auth.isAuthenticating,
  isAuthenticated: state.auth.isAuthenticated,
  statusText: state.auth.statusText,
  user: state.auth.user,
  message: state.socket.message
});

const mapDispatchToProps = (dispatch) => (Object.assign({}, { dispatch }, {
  actions: bindActionCreators(Object.assign({}, actionCreators), dispatch)
}));

export default connect(mapStateToProps, mapDispatchToProps)(Splash);