// components/AnimatedBookmark.tsx
import React, { useEffect } from 'react';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import BookmarkOn from '../assets/icons/bookmarkOn.svg';
import BookmarkOff from '../assets/icons/bookmarkOff.svg';

type Props = {
  isActive: boolean;
};

export const AnimatedBookmark = ({ isActive }: Props) => {
  const scale = useSharedValue(1);
  const rotate = useSharedValue(0);
  const opacity = useSharedValue(1);

  useEffect(() => {
    // アニメーションのリセット & トリガー
    scale.value = 0.8;
    rotate.value = 0;
    opacity.value = 0;

    scale.value = withTiming(1, { duration: 300 });
    rotate.value = withTiming(360, { duration: 300 });
    opacity.value = withTiming(1, { duration: 300 });
  }, [isActive]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { rotate: `${rotate.value}deg` },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        { alignItems: 'center', justifyContent: 'center' },
        animatedStyle,
      ]}
    >
      {isActive ? (
        <BookmarkOn width={24} height={24} color="#EA580C" />
      ) : (
        <BookmarkOff width={24} height={24} color="#EA580C" />
      )}
    </Animated.View>
  );
};
