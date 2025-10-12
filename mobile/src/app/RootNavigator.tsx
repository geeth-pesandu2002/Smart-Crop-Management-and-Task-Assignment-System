// mobile/src/app/RootNavigator.tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Pressable, Text, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import Login from '../screens/Login';
import TaskList from '../screens/TaskList';
import TaskDetails from '../screens/TaskDetails';
import ReportCreate from '../screens/ReportCreate';
import Profile from '../screens/Profile';
import { getMeta, setMeta } from '../db/meta';
import { useTranslation } from 'react-i18next';

export type RootStackParamList = {
  Login: undefined;
  MainTabs: undefined;
  TaskDetails: { id: string } | undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();

function MainTabs() {
  const { t } = useTranslation();
  return (
    <Tab.Navigator initialRouteName="Tasks">
      <Tab.Screen
        name="Tasks"
        component={TaskList}
        options={{
          title: t('tasks'),
          tabBarIcon: ({ color, size }: { color: string; size: number }) => <MaterialIcons name="task" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Reports"
        component={ReportCreate}
        options={{
          title: t('report'),
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <MaterialCommunityIcons name="file-document-edit-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={Profile}
        options={{
          title: t('profile'),
          tabBarIcon: ({ color, size }: { color: string; size: number }) => <MaterialIcons name="person" size={size} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  const hasToken = !!getMeta('auth_token');

  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName={hasToken ? 'MainTabs' : 'Login'}>
        <Stack.Screen name="Login" component={Login} options={{ headerShown: false }} />
        <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
        <Stack.Screen name="TaskDetails" component={TaskDetails} options={{ title: 'විස්තර' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
