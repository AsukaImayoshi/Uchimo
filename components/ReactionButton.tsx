import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { TouchableOpacity, Text, ViewStyle } from 'react-native';
import React from 'react';

type ReactionButtonProps = {
  onPress: () => void;
  icon: React.ReactNode;
  count: number;
  style?: ViewStyle;
  color?: string;
};

export const ReactionButton = ({
  onPress,
  icon,
  count,
  style,
  color = '#EA580C',
}: ReactionButtonProps) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    // アニメーション
    scale.value = withSpring(1.3, { damping: 5, stiffness: 150 }, () => {
      scale.value = withSpring(1);
    });
    // リアクション処理
    onPress();
  };

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.8}>
      <Animated.View
        style={[
          {
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 12,
            paddingVertical: 6,
            backgroundColor: '#FED7AA',
            borderRadius: 9999,
          },
          animatedStyle,
          style,
        ]}
      >
        {icon}
        <Text style={{ color, fontWeight: '600', marginLeft: 8 }}>{count}</Text>
      </Animated.View>
    </TouchableOpacity>
  );
};
