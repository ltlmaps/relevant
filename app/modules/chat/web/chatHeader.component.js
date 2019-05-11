import React, { Component } from 'react';
import PropTypes from 'prop-types';

import { View, Title } from 'modules/styled/uni';
// import LinearGradient from 'react-native-linear-gradient';

export default class ChatHeader extends Component {
  static propTypes = {
    post: PropTypes.object
    // actions: PropTypes.object,
  };

  render() {
    const { title } = this.props.post;
    return (
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%'
        }}
        display="flex"
        fdirection="column"
        zIndex={2}
      >
        <View style={{ backgroundColor: 'white' }} p={2}>
          <Title inline={1} flex={1} numberOfLines={2}>
            {title}
          </Title>
        </View>
      </View>
    );
  }
}

/*
        <LinearGradient
          start={{ x: 0.5, y: 0.0 }}
          end={{ x: 0.5, y: 1.0 }}
          colors={[
            'rgba(255,255,255,1.0)',
            'rgba(255,255,255,0.0)',
          ]}
          style={{ height: 10 }}
        />
*/
