import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import Constants from 'expo-constants';
import { syncNow } from './taskSync';

export const SYNC_TASK = 'smartfarm-background-sync';

const isExpoGo = () => Constants.appOwnership === 'expo';

// Define the task only when supported (Dev/Prod builds, not Expo Go)
if (!isExpoGo()) {
  TaskManager.defineTask(SYNC_TASK, async () => {
    try {
      await syncNow();
      return BackgroundFetch.BackgroundFetchResult.NewData;
    } catch {
      return BackgroundFetch.BackgroundFetchResult.Failed;
    }
  });
}

export async function registerBackgroundSync() {
  if (isExpoGo()) {
    // Background fetch isn't available in Expo Go—quietly skip.
    return false;
  }
  try {
    const status = await BackgroundFetch.getStatusAsync();
    if (
      status === BackgroundFetch.BackgroundFetchStatus.Restricted ||
      status === BackgroundFetch.BackgroundFetchStatus.Denied
    ) {
      return false;
    }
    const already = await TaskManager.isTaskRegisteredAsync(SYNC_TASK);
    if (!already) {
      await BackgroundFetch.registerTaskAsync(SYNC_TASK, {
        minimumInterval: 15 * 60, // 15 minutes (OS decides actual cadence)
        stopOnTerminate: false,
        startOnBoot: true,
      });
    }
    return true;
  } catch {
    return false;
  }
}

export async function unregisterBackgroundSync() {
  if (isExpoGo()) return;
  try {
    await BackgroundFetch.unregisterTaskAsync(SYNC_TASK);
  } catch {}
}
