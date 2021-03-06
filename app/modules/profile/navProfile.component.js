import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import UAvatar from 'modules/user/UAvatar.component';
import CoinStat from 'modules/stats/coinStat.component';
import RStat from 'modules/stats/rStat.component';
import ULink from 'modules/navigation/ULink.component';
import * as navigationActions from 'modules/navigation/navigation.actions';
import { getUser, cacheCommunity } from 'modules/auth/auth.actions';
import ReactTooltip from 'react-tooltip';

import { sizing, colors } from 'app/styles';
import styled from 'styled-components/primitives';
import { Header, View, SecondaryText, CTALink, Text } from 'modules/styled/uni';
import { computeUserPayout } from 'app/utils/rewards';
import { SIDE_NAV_PADDING } from 'styles/layout';

const WalletInfo = styled.View`
  display: flex;
  flex-direction: column;
  padding-left: ${sizing(2)};
  flex-shrink: 1;
`;

export class NavProfile extends Component {
  static propTypes = {
    user: PropTypes.object,
    earnings: PropTypes.object,
    actions: PropTypes.object,
    auth: PropTypes.object
  };

  componentDidMount() {
    if (ReactTooltip.rebuild) ReactTooltip.rebuild();
  }

  componentDidUpdate(lastProps) {
    const { auth, actions, user } = this.props;
    if (
      auth.community !== lastProps.auth.community &&
      user &&
      (!user.relevance || user.relevance.community !== auth.community)
    ) {
      actions.getUser();
    }

    if (user && auth.community !== lastProps.auth.community) {
      actions.cacheCommunity(auth.community);
    }
  }

  render() {
    const { user, earnings, actions } = this.props;
    if (!user) return null;

    // TODO optimize this so its not on every render?
    let pendingPayouts = 0;
    earnings.pending.forEach(id => {
      const earning = earnings.entities[id];
      pendingPayouts += computeUserPayout(earning);
    });

    const hideGetTokens = user.twitterId && user.confirmed;

    return (
      <View bb flex={1}>
        <View p={[SIDE_NAV_PADDING, 2]} pb={[4, 3]}>
          <View fdirection={'row'} justify="space-between" align="center">
            <Header>{user.name}</Header>
            <ULink
              inline={1}
              hu
              to="/user/wallet"
              onPress={() => actions.goToTab('wallet')}
            >
              <CTALink c={colors.blue}>My Wallet</CTALink>
            </ULink>
          </View>

          <View fdirection={'row'} align={'center'} mt={[3, 2]}>
            <UAvatar
              user={user}
              size={8}
              noName
              goToProfile={() => actions.goToTab('myProfile')}
            />
            <WalletInfo>
              <View fdirection={'row'}>
                <ULink
                  to="/user/wallet"
                  inline={1}
                  onPress={() => actions.push('statsView')}
                >
                  <RStat
                    user={user}
                    align="center"
                    data-for="mainTooltip"
                    data-tip={JSON.stringify({
                      type: 'TEXT',
                      props: {
                        text:
                          'Earn Reputation by posting comments.\nThe higher your score, the more weight your votes have.'
                      }
                    })}
                  />
                </ULink>
                <ULink
                  to="/user/wallet"
                  inline={1}
                  onPress={() => actions.goToTab('wallet')}
                >
                  <CoinStat
                    user={user}
                    isOwner={true}
                    // showPrice
                    align="center"
                    data-for="mainTooltip"
                    data-tip={JSON.stringify({
                      type: 'TEXT',
                      props: {
                        text:
                          'Get coins by upvoting quality links.\nThe higher your Reputation the more coins you earn.'
                      }
                    })}
                  />
                </ULink>
              </View>
              <View fdirection={'row'} align={'center'} color={colors.grey} mt={2}>
                <SecondaryText fs={1.5}>Pending Rewards: </SecondaryText>
                <CoinStat
                  size={1.5}
                  mr={1.5}
                  fs={1.5}
                  secondary
                  c={colors.black}
                  amount={pendingPayouts}
                  align={'baseline'}
                  data-for="mainTooltip"
                  data-tip={JSON.stringify({
                    type: 'TEXT',
                    props: {
                      text:
                        'These are your projected earnings for upvoting quality posts.\nRewards are paid out 3 days after a link is posted.'
                    }
                  })}
                />
              </View>
            </WalletInfo>
          </View>

          <View fdirection={'row'} align={'baseline'} mt={3}>
            {hideGetTokens ? null : (
              <ULink
                to="/user/wallet"
                c={colors.blue}
                hu
                onPress={() => {
                  actions.push('getTokens');
                }}
                onClick={e => {
                  e.preventDefault();
                  actions.showModal('getTokens');
                }}
              >
                <CTALink c={colors.blue}>Get Tokens</CTALink>
              </ULink>
            )}
            {hideGetTokens ? null : <Text> &nbsp;&nbsp; </Text>}
            <ULink
              to="/user/wallet"
              ml={1}
              c={colors.blue}
              hu
              onPress={() => {
                actions.push('invites');
              }}
              onClick={e => {
                e.preventDefault();
                actions.showModal('invite');
              }}
            >
              <CTALink c={colors.blue}>Invite Friends</CTALink>
            </ULink>
          </View>
        </View>
      </View>
    );
  }
}

const mapStateToProps = state => ({
  auth: state.auth,
  user: state.auth && state.auth.user,
  earnings: state.earnings
});

const mapDispatchToProps = dispatch => ({
  actions: bindActionCreators(
    {
      ...navigationActions,
      cacheCommunity,
      getUser
    },
    dispatch
  )
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(NavProfile);
