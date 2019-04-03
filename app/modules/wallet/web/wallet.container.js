import React, { Component } from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import PropTypes from 'prop-types';
import * as authActions from 'modules/auth/auth.actions';
import * as earningsActions from 'modules/wallet/earnings.actions';
import Eth from 'modules/web_ethTools/eth.context';
// import MetaMaskCta from 'modules/web_splash/metaMaskCta.component';
import Earning from 'modules/wallet/earning.component';
// import { initDrizzle } from 'app/utils/eth';
import Balance from 'modules/wallet/balance.component';
import { View } from 'modules/styled/uni';
import get from 'lodash/get';
import moment from 'moment';
import InfScroll from 'modules/listview/web/infScroll.component';
import { computeUserPayout } from 'app/utils/rewards';
import PostPreview from 'modules/post/postPreview.container';

// let drizzle;

const PAGE_SIZE = 50;

class WalletContainer extends Component {
  static propTypes = {
    user: PropTypes.object,
    auth: PropTypes.object,
    contract: PropTypes.object,
    actions: PropTypes.object,
    earnings: PropTypes.object,
    screenSize: PropTypes.number
  };

  static contextTypes = {
    store: PropTypes.object
  };

  state = {
    reloading: false
  };

  componentDidMount() {
    const { isAuthenticated } = this.props.auth;
    if (isAuthenticated) {
      // eslint-disable-next-line
      // temporarily disabled
      // drizzle = initDrizzle(this.context.store);
    }
    this.reload();
  }

  componentDidUpdate() {
    // const { isAuthenticated } = this.props.auth;
    // if (isAuthenticated && !prevProps.auth.isAuthenticated && !drizzle) {
    //   drizzle = initDrizzle(this.context.store);
    // }
  }

  hasMore = true;

  load = (page, length) => {
    this.hasMore = page * PAGE_SIZE <= length;
    if (this.hasMore) {
      this.props.actions.getEarnings(null, PAGE_SIZE, length);
    }
  };

  reload = () => this.load(0, 0);

  renderHeader = () => (
    // eslint-disable-line
    // if (this.props.user && this.props.user.ethAddress && this.props.user.ethAddress[0]) {
    //   return null;
    // }
    // return <Eth.Consumer>{wallet => <MetaMaskCta {...wallet} />}</Eth.Consumer>;

    <View>
      <Eth.Consumer>{wallet => <Balance wallet={wallet} {...this.props} />}</Eth.Consumer>
    </View>
  );

  renderRow = ({ item }) => {
    const { screenSize } = this.props;
    if (!item) return null;
    const earning = item;

    const payout = computeUserPayout(earning);
    if (!payout) return null;

    const month = moment(earning.createdAt).format('MMMM');
    const showMonth = this.previousMonth !== month;
    this.previousMonth = month;

    return (
      <Earning
        key={earning._id}
        earning={earning}
        payout={payout}
        month={showMonth ? month : null}
        PostPreview={PostPreview}
        screenSize={screenSize}
      />
    );
  };

  render() {
    const { contract, earnings } = this.props;
    if (contract && !contract.initialized) return null;

    const { list } = earnings;
    const entities = list.map(id => earnings.entities[id]);
    this.previousMonth = null;

    return (
      <View mb={8}>
        {this.renderHeader()}
        <View>
          <InfScroll
            data={list}
            loadMore={p => this.load(p, list.length)}
            hasMore={this.hasMore}
            key="recent-activties"
            className={'parent'}
            style={{ position: 'relative', marginBottom: 20 }}
          >
            {entities.map(item => this.renderRow({ item }))}
          </InfScroll>
        </View>
      </View>
    );
  }
}

function mapStateToProps(state) {
  return {
    auth: state.auth,
    earnings: state.earnings,
    user: state.auth.user,
    drizzleStatus: state.drizzleStatus,
    contract: get(state, 'contracts.RelevantCoin'),
    accounts: state.accounts,
    contracts: state.contracts,
    accountBalances: state.accountBalances,
    screenSize: state.navigation.screenSize,
    drizzle: {
      transactions: state.transactions,
      web3: state.web3,
      transactionStack: state.transactionStack
    }
  };
}

const mapDispatchToProps = dispatch => ({
  actions: bindActionCreators(
    {
      ...authActions,
      ...earningsActions
    },
    dispatch
  )
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(WalletContainer);
