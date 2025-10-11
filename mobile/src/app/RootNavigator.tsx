// mobile/src/app/RootNavigator.tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Pressable, Text } from 'react-native';

import Login from '../screens/Login';
import TaskList from '../screens/TaskList';
import TaskDetails from '../screens/TaskDetails';
import { getMeta, setMeta } from '../db/meta';

export type RootStackParamList = {
  Login: undefined;
  TaskList: undefined;
  TaskDetails: { id: string } | undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const hasToken = !!getMeta('auth_token');

  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName={hasToken ? 'TaskList' : 'Login'}>
        {/* ⬇️ Hide the native top bar on the login page */}
        <Stack.Screen
          name="Login"
          component={Login}
          options={{ headerShown: false }}
        />

        <Stack.Screen
          name="TaskList"
          component={TaskList}
          options={({ navigation }) => ({
            title: 'කාර්යයන්',
            headerRight: () => (
              <Pressable
                onPress={() => {
                  setMeta('auth_token', null);
                  setMeta('user_id', null);
                  setMeta('user_name', null);
                  setMeta('user_role', null);
                  navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
                }}
                style={({ pressed }) => ({
                  backgroundColor: '#5aa15a',
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 12,
                  opacity: pressed ? 0.85 : 1,
                })}
              >
                <Text style={{ color: 'white', fontWeight: '700' }}>ඉවත්වෙන්න</Text>
              </Pressable>
            ),
          })}
        />

        <Stack.Screen
          name="TaskDetails"
          component={TaskDetails}
          options={{ title: 'විස්තර' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
