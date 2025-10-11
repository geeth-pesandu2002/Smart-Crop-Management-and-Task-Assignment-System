import { createNativeStackNavigator } from '@react-navigation/native-stack';
import TaskListScreen from '../features/tasks/TaskListScreen';
import TaskDetailScreen from '../features/tasks/TaskDetailScreen';

const Stack = createNativeStackNavigator();

export default function Navigation() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="TaskList" component={TaskListScreen} options={{ title: 'Tasks' }} />
      <Stack.Screen name="TaskDetail" component={TaskDetailScreen} options={{ title: 'Task Detail' }} />
    </Stack.Navigator>
  );
}
