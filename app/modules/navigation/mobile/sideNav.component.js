import React from 'react';
import PropTypes from 'prop-types';
import { ScrollView } from 'react-native';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import styled from 'styled-components/primitives';
import NavProfileComponent from 'modules/profile/navProfile.component';
import CommunityNav from 'modules/community/communityNav.component';
// import SideNavFooter from 'modules/navigation/web/sideNavFooter.component';
import { layout, colors, mixins } from 'app/styles';
import * as navigationActions from 'modules/navigation/navigation.actions';
import { View, Image } from 'modules/styled/uni';
import { SafeAreaView } from 'react-navigation';
import ULink from 'modules/navigation/ULink.component';
import SideNavFooter from 'modules/navigation/sideNavFooter.component';

const SideNavSection = styled.View`
  background-color: ${colors.secondaryBG};
  ${layout.universalBorder('bottom')}
`;

const LogoContainer = styled(View)`
  background-color: ${colors.secondaryBG};
  ${mixins.border}
`;

const logoLink = '/relevant/new';

const SideNav = props => (
  <SafeAreaView style={{ backgroundColor: colors.secondaryBG }}>
    <ScrollView stickyHeaderIndices={[0]}>
      <LogoContainer br bb h={8}>
        <ULink
          align={'flex-start'}
          onPress={() => props.actions.goToTab('discover')}
          to={logoLink}
        >
          <View pl={2} flex={1} align={'center'} fdirection={'row'}>
            <Image
              h={6}
              w={16}
              resizeMode={'contain'}
              source={require('app/public/img/logo-opt.png')}
              alt={'Relevant'}
            />
          </View>
        </ULink>
      </LogoContainer>
      <SideNavSection flex={1}>
        <NavProfileComponent {...props} mobile />
      </SideNavSection>
      <SideNavSection flex={1}>
        <CommunityNav {...props} mobile />
      </SideNavSection>
      <View mt={4} flex={1}>
        <SideNavFooter mobile {...props} />
      </View>
    </ScrollView>
  </SafeAreaView>
);

SideNav.propTypes = {
  className: PropTypes.string,
  actions: PropTypes.object
};

const mapStateToProps = state => ({
  isAuthenticated: state.auth.isAuthenticated
});

export default connect(
  mapStateToProps,
  dispatch => ({
    actions: bindActionCreators({ ...navigationActions }, dispatch)
  })
)(SideNav);
