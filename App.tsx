import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SleepScreen } from './src/screens/Sleep/SleepScreen';

export default function App() {
  return (
    <>
      <StatusBar style="light" />
      <SleepScreen />
    </>
  );
}
