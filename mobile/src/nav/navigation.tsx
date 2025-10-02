import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import TaskListScreen from '../features/tasks/TaskListScreen';
import TaskDetailScreen from '../features/tasks/TaskDetailScreen';
import LoginScreen from '../features/auth/LoginScreen';

export type RootStackParamList = {
  Login: undefined;
  Tasks: undefined;
  TaskDetail: { id: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNav() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Login">
        <Stack.Screen name="Login" component={LoginScreen} options={{ title: 'පිවිසුම' }} />
        <Stack.Screen name="Tasks" component={TaskListScreen} options={{ title: 'කාර්යයන්' }} />
        <Stack.Screen name="TaskDetail" component={TaskDetailScreen} options={{ title: 'Task' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
