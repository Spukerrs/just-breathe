const React = require('react');

const mockComponent = (name) => {
  const Component = (props) => {
    return React.createElement(name, props, props.children);
  };
  Component.displayName = name;
  return Component;
};

module.exports = {
  View: mockComponent('View'),
  Text: mockComponent('Text'),
  TouchableOpacity: mockComponent('TouchableOpacity'),
  ScrollView: mockComponent('ScrollView'),
  SafeAreaView: mockComponent('SafeAreaView'),
  Modal: mockComponent('Modal'),
  TextInput: mockComponent('TextInput'),
  ActivityIndicator: mockComponent('ActivityIndicator'),
  RefreshControl: mockComponent('RefreshControl'),
  KeyboardAvoidingView: mockComponent('KeyboardAvoidingView'),
  StatusBar: {
    setBarStyle: jest.fn(),
  },
  StyleSheet: {
    create: (styles) => styles,
    flatten: (style) => (Array.isArray(style) ? Object.assign({}, ...style) : style),
  },
  Dimensions: {
    get: jest.fn(() => ({ width: 375, height: 812 })),
  },
  Platform: {
    OS: 'ios',
    select: (obj) => obj.ios || obj.default,
  },
  Alert: {
    alert: jest.fn(),
  },
  Animated: {
    Value: jest.fn(() => ({
      setValue: jest.fn(),
      interpolate: jest.fn(),
    })),
    timing: jest.fn(() => ({ start: (cb) => cb && cb() })),
    parallel: jest.fn(() => ({ start: (cb) => cb && cb() })),
    View: mockComponent('Animated.View'),
  },
  Easing: {
    ease: jest.fn(),
    out: jest.fn(),
    in: jest.fn(),
    bezier: jest.fn(),
  },
};
