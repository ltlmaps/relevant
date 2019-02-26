import React, { Component } from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import PropTypes from 'prop-types';
import * as authActions from 'modules/auth/auth.actions';
import * as earningsActions from 'modules/wallet/earnings.actions';
import Eth from 'modules/web_ethTools/eth.context';
// import MetaMaskCta from 'modules/web_splash/metaMaskCta.component';
import Earning from 'modules/wallet/earning.component';
import { initDrizzle } from 'app/utils/eth';
import Balance from 'modules/wallet/balance.component';
import { View } from 'modules/styled/uni';
import get from 'lodash/get';
import { FlatList, RefreshControl } from 'react-native';
import moment from 'moment';
import { computeUserPayout } from 'app/utils/rewards';

let drizzle;

const PAGE_SIZE = 10;

class WalletContainer extends Component {
  static propTypes = {
    user: PropTypes.object,
    auth: PropTypes.object,
    contract: PropTypes.object,
    actions: PropTypes.object,
    earnings: PropTypes.object
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
      drizzle = initDrizzle(this.context.store);
    }
    if (!this.props.earnings.list.length) {
      this.load(0, 0);
    }
  }

  componentDidUpdate(prevProps) {
    const { isAuthenticated } = this.props.auth;
    if (isAuthenticated && !prevProps.auth.isAuthenticated && !drizzle) {
      drizzle = initDrizzle(this.context.store);
    }
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
      <Eth.Consumer>
        {wallet => <Balance wallet={wallet} mobile {...this.props} />}
      </Eth.Consumer>
    </View>
  );

  renderRow = ({ item }) => {
    if (!item) return null;
    const earning = item;

    const payout = computeUserPayout(earning);
    if (!payout || !earning) return null;

    const month = moment(earning.createdAt).format('MMMM');
    const showMonth = this.previousMonth !== month;
    this.previousMonth = month;

    return (
      <Earning
        mobile
        earning={earning}
        payout={payout}
        month={showMonth ? month : null}
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
      <View flex={1}>
        <FlatList
          ref={c => (this.scrollView = c)}
          data={entities}
          renderItem={this.renderRow}
          keyExtractor={(item, index) => index.toString()}
          removeClippedSubviews
          pageSize={1}
          initialListSize={10}
          keyboardShouldPersistTaps={'always'}
          keyboardDismissMode={'interactive'}
          onEndReachedThreshold={100}
          overScrollMode={'always'}
          style={{ flex: 1 }}
          ListHeaderComponent={this.renderHeader}
          refreshControl={
            <RefreshControl
              refreshing={this.state.reloading}
              onRefresh={this.reload}
              tintColor="#000000"
              colors={['#000000', '#000000', '#000000']}
              progressBackgroundColor="#ffffff"
            />
          }
        />
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
