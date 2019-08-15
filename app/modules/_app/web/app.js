import React, { Component } from 'react';
import PropTypes from 'prop-types';

import loadable from '@loadable/component';

import AwesomeDebouncePromise from 'awesome-debounce-promise';
import routes from 'modules/_app/web/routes'; // eslint-disable-line
import queryString from 'query-string';
import get from 'lodash.get';
import { renderRoutes, matchRoutes } from 'react-router-config';
import { getCommunities } from 'modules/community/community.actions';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { withRouter } from 'react-router-dom';
import { getEarnings } from 'modules/wallet/earnings.actions';
import * as navigationActions from 'modules/navigation/navigation.actions';
import * as authActions from 'modules/auth/auth.actions';
import Modal from 'modules/ui/web/modal';
import { GlobalStyle } from 'app/styles';
import { BANNED_COMMUNITY_SLUGS } from 'server/config/globalConstants';
import SmartBanner from 'react-smartbanner';
import ReactGA from 'react-ga';
import { TwitterCT } from 'app/utils/social';
import * as modals from 'modules/ui/modals';
import { TextTooltip } from 'modules/tooltip/web/tooltip.component';
import { ToastContainer } from 'react-toastify';
import CreatePostModal from 'modules/createPost/web/createPost.modal';

const UpvoteAnimation = loadable(() =>
  import('modules/animation/upvoteAnimation.component')
);
const DownvoteAnimation = loadable(() =>
  import('modules/animation/downvoteAnimation.component')
);

let ReactPixel;

const DEV_MODE = process.env.NODE_ENV === 'development';

if (process.env.BROWSER === true) {
  require('app/styles/index.css');
  require('app/styles/fonts.css');
  require('react-toastify/dist/ReactToastify.css');
  require('react-smartbanner/dist/main.css');
}

class App extends Component {
  static propTypes = {
    auth: PropTypes.object,
    actions: PropTypes.object,
    match: PropTypes.object,
    location: PropTypes.object,
    user: PropTypes.object,
    children: PropTypes.node,
    history: PropTypes.object,
    route: PropTypes.object,
    activeCommunity: PropTypes.string,
    globalModal: PropTypes.oneOfType([PropTypes.object, PropTypes.string]),
    navigation: PropTypes.object
  };

  state = {
    authType: null
  };

  componentWillMount() {
    const { auth, history, actions, location } = this.props;
    const { community } = auth;
    if (community && location.pathname === '/') {
      history.replace(`/${community}/new`);
    }
    // TODO don't need this if api is middleware
    if (community) actions.setCommunity(community);
  }

  componentDidMount() {
    const { actions, auth, location, history } = this.props;

    if (process.env.NODE_ENV !== 'development') {
      this.initAnalytics({ location, history });
    }

    // actions.getCommunities();
    actions.getUser();

    if (auth.user) this.handleUserLogin();

    const parsed = queryString.parse(location.search);
    if (parsed.invitecode) {
      actions.setInviteCode(parsed.invitecode);
      if (auth.isAuthenticated) {
        actions.redeemInvite(parsed.invitecode);
      } else if (!location.pathname.match('resetPassword')) {
        history.push({
          pathname: '/user/signup',
          search: `${location.search}&redirect=${location.pathname}`
        });
      }
    }
    this.updateWidth();
    window.addEventListener('resize', this.updateWidth);
    // TODO do this after a timeout
    window.addEventListener('blur', () => {
      this.backgroundTime = new Date().getTime();
    });

    // TODO do this after a timeout
    window.addEventListener('focus', () => this.reloadTabs());
  }

  initAnalytics = ({ location, history }) => {
    ReactPixel = require('react-facebook-pixel').default;

    ReactPixel.init('286620198458049');
    TwitterCT.init('o1p7u');
    ReactGA.initialize('UA-51795165-6');

    ReactPixel.pageView();
    TwitterCT.pageView();
    ReactGA.pageview(location.pathname + location.search);

    history.listen(loc => {
      TwitterCT.pageView();
      ReactGA.pageview(loc.pathname + loc.search);
      ReactPixel.pageView();

      // eslint-disable-next-line
      Intercom('update');
    });
  };

  setWidth = () => {
    this.props.actions.setWidth(window.innerWidth);
  };

  debouncedSetWidth = AwesomeDebouncePromise(this.setWidth, 100);

  updateWidth = () => {
    this.debouncedSetWidth();
  };

  reloadTabs = () => {
    const now = new Date().getTime();
    if (now - this.backgroundTime > 10 * 60 * 1000) {
      this.props.actions.reloadAllTabs();
    }
  };

  handleUserLogin = () => {
    const { auth, actions, navigation, location, history } = this.props;
    const { screenSize } = navigation;

    if (auth.user.role === 'temp') {
      return actions.showModal('setHandle');
    }
    if (!auth.user.webOnboard.onboarding) {
      actions.showModal('onboarding');
      actions.webOnboard('onboarding');
    }
    if (auth.invitecode) {
      actions.redeemInvite(auth.invitecode);
      ReactGA.event({
        category: 'User',
        action: 'Redeemed Invite'
      });
    }
    ReactGA.set({ userId: auth.user._id });
    actions.getEarnings('pending');

    if (!auth.community && location.pathname === '/') {
      history.replace('/communities');
    }

    if (screenSize) return null;
    // eslint-disable-next-line
    Intercom('boot', {
      alignment: screenSize ? 'left' : 'right',
      app_id: DEV_MODE ? 'qgy5jx90' : 'uxuj5f7o',
      name: `${auth.user.name} @${auth.user.handle}`, // Full name
      email: auth.user.email, // Email address
      created_at: new Date(auth.user.createdAt).getTime() // Signup date as a Unix timestamp
    });
    return null;
  };

  componentDidUpdate(prevProps) {
    const { actions, auth, location } = this.props;

    const route = matchRoutes(routes, location.pathname);
    const newCommunity = get(route, `[${route.length - 1}].match.params.community`);

    if (
      newCommunity &&
      newCommunity !== auth.community &&
      !BANNED_COMMUNITY_SLUGS.includes(newCommunity)
    ) {
      actions.setCommunity(newCommunity);
    }

    if (location.pathname !== prevProps.location.pathname) {
      window.scrollTo(0, 0);
    }

    const userId = auth.user ? auth.user._id : null;
    const PrevUserId = prevProps.auth.user ? prevProps.auth.user._id : null;

    if (userId !== PrevUserId) {
      actions.userToSocket(userId);
    }

    if (!prevProps.auth.user && auth.user) {
      this.handleUserLogin();
    }

    if (
      prevProps.auth.user &&
      auth.user &&
      prevProps.auth.user.role === 'temp' &&
      auth.user.role !== 'temp'
    ) {
      this.handleUserLogin();
    }
  }

  closeModal(redirect) {
    const { history, location } = this.props;
    const queryParams = queryString.parse(location.search);
    if (queryParams.redirect) {
      history.push(queryParams.redirect);
    } else if (redirect) {
      history.push(redirect);
    } else {
      history.push(location.pathname);
    }
  }

  renderModal() {
    const { location, history } = this.props; // eslint-disable-line
    let { globalModal } = this.props;
    const { hash } = location;
    let hashModal;
    if (hash) {
      hashModal = hash.substring(1);
    }
    // if (!hash && globalModal) {
    //   history.push(location.pathname + `#${globalModal}`);
    // }
    if (hashModal) {
      globalModal = hashModal;
    }
    if (!globalModal) return null;
    globalModal = modals[globalModal] || globalModal;

    if (typeof globalModal === 'string') return null;
    const { Body, redirect } = globalModal;
    const bodyProps = globalModal.bodyProps ? globalModal.bodyProps : {};
    const close = () => {
      this.props.actions.hideModal();
      this.closeModal(redirect);
    };
    return (
      <Modal {...globalModal} close={close} visible>
        <Body {...bodyProps} close={close} />
      </Modal>
    );
  }

  render() {
    const { globalModal, navigation } = this.props;
    const { screenSize } = navigation;

    return (
      <div>
        <GlobalStyle />
        <SmartBanner
          daysHidden={0}
          daysReminder={0}
          title={'Relevant Communities'}
          position={'top'}
          // force={'ios'}
        />
        <TextTooltip
          globalEventOff="click"
          type={'dark'}
          scrollHide
          id="mainTooltip"
          multiline
        />
        {/*        <CustomTooltip id="tooltip" multiline />
         */}
        <div
          pointerEvents={'none'}
          style={{
            top: '0',
            left: '0',
            zIndex: '10000'
          }}
        >
          <UpvoteAnimation />
          <DownvoteAnimation />
        </div>
        {this.renderModal()}
        <CreatePostModal visible={globalModal === 'newpost'} />
        <ToastContainer />
        <div style={globalModal && !screenSize ? { filter: 'blur(2px)' } : {}}>
          {renderRoutes(this.props.route.routes)}
        </div>
      </div>
    );
  }
}

const mapStateToProps = state => ({
  user: state.auth.user,
  auth: state.auth,
  activeCommunity: state.community.active,
  navigation: state.navigation,
  globalModal: state.navigation.modal
});

const mapDispatchToProps = dispatch => ({
  actions: bindActionCreators(
    {
      ...navigationActions,
      ...authActions,
      getCommunities,
      getEarnings
    },
    dispatch
  )
});

export default withRouter(
  connect(
    mapStateToProps,
    mapDispatchToProps
  )(App)
);
