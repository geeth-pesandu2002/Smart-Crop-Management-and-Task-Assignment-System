import React, { useEffect, useImperativeHandle, useRef, useState, forwardRef } from 'react';
import { Animated, Text, View, StyleSheet, Dimensions } from 'react-native';

type ToastHandle = {
  show: (msg: string) => void;
};

const { width } = Dimensions.get('window');

const Toast = forwardRef<ToastHandle>((_, ref) => {
  const [msg, setMsg] = useState<string | null>(null);
  const anim = useRef(new Animated.Value(0)).current;

  useImperativeHandle(ref, () => ({
    show(m: string) {
      setMsg(m);
    }
  }), []);

  useEffect(() => {
    let t: any;
    if (msg) {
      Animated.timing(anim, { toValue: 1, duration: 250, useNativeDriver: true }).start();
      t = setTimeout(() => {
        Animated.timing(anim, { toValue: 0, duration: 250, useNativeDriver: true }).start(() => setMsg(null));
      }, 2800);
    }
    return () => clearTimeout(t);
  }, [msg]);

  if (!msg) return null;

  return (
    <Animated.View pointerEvents="none" style={[styles.container, { transform: [{ translateY: anim.interpolate({ inputRange: [0,1], outputRange: [-40, 0] }) }], opacity: anim }]}>
      <View style={styles.box}>
        <Text style={styles.text}>{msg}</Text>
      </View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 42,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 9999
  },
  box: {
    maxWidth: Math.min(560, width - 40),
    backgroundColor: 'rgba(0,0,0,0.85)',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8
  },
  text: {
    color: 'white',
    fontSize: 14
  }
});

export default Toast;

// helper holder
export const toastRef: { ref?: React.RefObject<ToastHandle> } = {};

export function showToast(msg: string) {
  try {
    if (toastRef.ref && toastRef.ref.current) toastRef.ref.current.show(msg);
  } catch {}
}
