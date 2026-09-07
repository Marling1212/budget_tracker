import React, { useEffect } from 'react';
import { View, StyleSheet, useColorScheme } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  interpolateColor,
  Easing,
  useAnimatedProps,
} from 'react-native-reanimated';

const AnimatedPath = Animated.createAnimatedComponent(Path);

interface LiquidAntigravityGlassProps {
  width: number;
  height: number;
  dailyQuota: number;
  remainingToday: number;
  children?: React.ReactNode;
}

export default function LiquidAntigravityGlass({
  width,
  height,
  dailyQuota,
  remainingToday,
  children,
}: LiquidAntigravityGlassProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // --- Math & Logic ---
  const rawRatio = Math.max(0, Math.min(remainingToday / dailyQuota, 1));
  const isOverspent = remainingToday < 0;

  // The SVG acts as the "Empty Space" mask anchored to the ceiling.
  // rawRatio = 1 -> full -> empty mask is 0
  // rawRatio = 0 -> empty -> empty mask covers entire height
  const targetLiquidHeight = isOverspent ? 0 : (1 - rawRatio) * height;

  // --- Shared Values ---
  const liquidHeight = useSharedValue(targetLiquidHeight);
  const waveOffset = useSharedValue(0);

  // --- Bubbles Setup ---
  const bubble1Y = useSharedValue(height);
  const bubble2Y = useSharedValue(height);
  const bubble3Y = useSharedValue(height);
  
  const bubble1X = useSharedValue(0);
  const bubble2X = useSharedValue(0);
  const bubble3X = useSharedValue(0);

  // 1. Animate Liquid Level Height
  useEffect(() => {
    liquidHeight.value = withTiming(targetLiquidHeight, {
      duration: 1500,
      easing: Easing.inOut(Easing.cubic),
    });
  }, [targetLiquidHeight]);

  // 2. Animate Wave and Bubbles (Continuous Horizontal Loop)
  useEffect(() => {
    waveOffset.value = withRepeat(
      withTiming(-width, { duration: 3000, easing: Easing.linear }),
      -1, // infinite
      false
    );

    // 3. Animate Bubbles (Normal Buoyancy: float from bottom floor up to wave surface)
    const animateBubble = (y: Animated.SharedValue<number>, x: Animated.SharedValue<number>, delay: number, speed: number) => {
      setTimeout(() => {
        y.value = withRepeat(
          withSequence(
            withTiming(height, { duration: 0 }),
            withTiming(targetLiquidHeight, { duration: speed, easing: Easing.out(Easing.ease) })
          ),
          -1,
          false
        );
        x.value = withRepeat(
          withSequence(
            withTiming(0, { duration: 0 }),
            withTiming(Math.random() * 40 - 20, { duration: speed, easing: Easing.inOut(Easing.sine) })
          ),
          -1,
          true
        );
      }, delay);
    };

    animateBubble(bubble1Y, bubble1X, 0, 4000);
    animateBubble(bubble2Y, bubble2X, 1500, 5000);
    animateBubble(bubble3Y, bubble3X, 2500, 4500);

  }, [width, height]);

  // --- Animations ---
  // The SVG mask represents the EMPTY space (matches the card background)
  const emptySpaceColor = isDark ? '#1e293b' : '#ffffff'; // slate-800 or white
  const animatedPathProps = useAnimatedProps(() => {
    return { fill: emptySpaceColor };
  });

  // The Container Background represents the LIQUID
  const animatedContainerStyle = useAnimatedStyle(() => {
    const bg = interpolateColor(
      isOverspent ? 1 : 0,
      [0, 1],
      ['#06b6d4', '#ef4444'] // Cyan to Red liquid
    );
    return { backgroundColor: bg };
  });

  const animatedBubbleStyle = useAnimatedStyle(() => {
    const bg = interpolateColor(
      isOverspent ? 1 : 0,
      [0, 1],
      ['rgba(255, 255, 255, 0.3)', 'rgba(255, 255, 255, 0.3)'] // White bubbles
    );
    return { backgroundColor: bg };
  });

  // The Wave Container Style
  // The Animated.View has height 4000, and the wave is drawn at the bottom (y=0 in SVG, but viewBox maps it to the bottom of the SVG).
  // To place the wave at exactly `liquidHeight`, we translate the container so its bottom edge aligns with `liquidHeight`.
  const animatedLiquidContainerStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateY: liquidHeight.value - 4000 },
        { translateX: waveOffset.value },
      ],
    };
  });

  // --- Inverted Wave SVG Path ---
  // We draw 2 full cycles to allow smooth endless panning.
  const amplitude = 15;
  const cycleWidth = width;
  const p1x = cycleWidth * 0.25;
  const p2x = cycleWidth * 0.5;
  const p3x = cycleWidth * 0.75;
  const p4x = cycleWidth;

  const pathString = `
    M 0 0 
    C ${p1x} ${amplitude}, ${p1x} ${amplitude}, ${p2x} 0
    C ${p3x} ${-amplitude}, ${p3x} ${-amplitude}, ${p4x} 0
    C ${p4x + p1x} ${amplitude}, ${p4x + p1x} ${amplitude}, ${p4x + p2x} 0
    C ${p4x + p3x} ${-amplitude}, ${p4x + p3x} ${-amplitude}, ${p4x + p4x} 0
    L ${cycleWidth * 2} -4000 
    L 0 -4000 
    Z
  `;

  return (
    <Animated.View style={[{ width, height, overflow: 'hidden', borderRadius: 24 }, animatedContainerStyle]}>
      {/* 2. Floating Bubbles (Normal Buoyancy) */}
      <Animated.View style={[styles.bubble, animatedBubbleStyle, { width: 12, height: 12, left: width * 0.2 }, useAnimatedStyle(() => ({ transform: [{ translateY: bubble1Y.value }, { translateX: bubble1X.value }] }))] } />
      <Animated.View style={[styles.bubble, animatedBubbleStyle, { width: 24, height: 24, left: width * 0.5 }, useAnimatedStyle(() => ({ transform: [{ translateY: bubble2Y.value }, { translateX: bubble2X.value }] }))] } />
      <Animated.View style={[styles.bubble, animatedBubbleStyle, { width: 16, height: 16, left: width * 0.8 }, useAnimatedStyle(() => ({ transform: [{ translateY: bubble3Y.value }, { translateX: bubble3X.value }] }))] } />

      {/* 1. The Empty Space Mask (SVG) - Rendered ON TOP of bubbles so they disappear when they hit the surface */}
      <Animated.View style={[{ position: 'absolute', top: 0, left: 0, width: width * 2, height: 4000 }, animatedLiquidContainerStyle]}>
        <Svg width={width * 2} height={4000} viewBox={`0 -4000 ${width * 2} 4000`}>
          <AnimatedPath d={pathString} animatedProps={animatedPathProps} />
        </Svg>
      </Animated.View>

      {/* 3. The Content (Children) overlay */}
      <View style={StyleSheet.absoluteFill}>
        {children}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    position: 'absolute',
    borderRadius: 999,
  },
});
