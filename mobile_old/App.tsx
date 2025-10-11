import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import Navigation from './src/nav/navigation';

export default function App() {
  return (
    <NavigationContainer>
      <Navigation />
    </NavigationContainer>
  );
}
