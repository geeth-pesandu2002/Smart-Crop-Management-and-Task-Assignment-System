import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, AppState, AppStateStatus } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import './src/i18n';
import RootNavigator from './src/app/RootNavigator';
import { bootstrap } from './src/app/bootstrap';

import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './src/core/queryClient';

import { registerBackgroundSync } from './src/sync/background';
import { syncNow } from './src/sync/taskSync';
import { getMeta } from './src/db/meta';

export default function App() {
  const [ready, setReady] = useState(false);

  // App bootstrap + register background sync + initial foreground sync (if logged in)
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        bootstrap();
        await registerBackgroundSync();
        const token = getMeta('auth_token');
        if (token) {
          await syncNow(); // only sync if authenticated
        }
      } catch {
        // ignore; app still loads
      } finally {
        if (mounted) setReady(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Auto-sync whenever app returns to the foreground (if logged in)
  useEffect(() => {
    const onChange = async (state: AppStateStatus) => {
      if (state === 'active') {
        try {
          const token = getMeta('auth_token');
          if (token) {
            await syncNow();
          }
        } catch {}
      }
    };
    const sub = AppState.addEventListener('change', onChange);
    return () => sub.remove();
  }, []);

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="auto" />
      <RootNavigator />
      {/* Toast container (global) */}
      {/* Import dynamically to avoid cycle */}
      {(() => {
        const Toast = require('./src/components/Toast').default;
        const { toastRef } = require('./src/components/Toast');
        const ref = React.createRef();
        toastRef.ref = ref;
        return <Toast ref={ref} />;
      })()}
    </QueryClientProvider>
  );
}
