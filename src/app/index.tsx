import React from 'react';
import { View, Text, ActivityIndicator, Dimensions } from 'react-native';
import { useBudget } from '../hooks/useBudget';
import { LinearGradient } from 'expo-linear-gradient';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withSpring
} from 'react-native-reanimated';
import { BudgetStatus } from '../types/database';

const { width, height } = Dimensions.get('window');

// Colors for the liquid fill based on index
const GRADIENTS = [
  ['#3b82f6', '#8b5cf6'], // Blue to Purple
  ['#ec4899', '#f43f5e'], // Pink to Rose
  ['#10b981', '#059669'], // Emerald
  ['#f59e0b', '#d97706'], // Amber
  ['#6366f1', '#4f46e5'], // Indigo
];

function PiggyBankNode({ 
  status, 
  index, 
  totalNodes 
}: { 
  status: BudgetStatus; 
  index: number; 
  totalNodes: number;
}) {
  const isOverBudget = status.remaining < 0;
  
  // Calculate node position on a circle
  // Increase radius a bit so they space out well
  const radius = 220; 
  const angle = (index / totalNodes) * 2 * Math.PI - Math.PI / 2; // Start from top (-90 deg)
  const x = Math.cos(angle) * radius;
  const y = Math.sin(angle) * radius;

  // Saved amount = Accumulated Limit - Spent this month
  // We cap the fill at 100% and minimum 0%
  const fillPercentage = Math.max(0, Math.min(100, (status.remaining / status.accumulatedLimit) * 100)) || 0;
  const colors = isOverBudget ? ['#ef4444', '#b91c1c'] : GRADIENTS[index % GRADIENTS.length];

  const fillHeight = useSharedValue(0);

  React.useEffect(() => {
    fillHeight.value = withTiming(fillPercentage, { duration: 1500 });
  }, [fillPercentage]);

  const animatedFillStyle = useAnimatedStyle(() => {
    return {
      height: `${fillHeight.value}%`,
    };
  });

  return (
    <View 
      style={{
        position: 'absolute',
        top: height / 2 + y - 100, // 100 is half of node height (assuming 200)
        left: width / 2 + x - 100, // 100 is half of node width
        width: 200,
        height: 200,
      }}
      className="bg-white rounded-[100px] shadow-lg border-4 border-slate-100 overflow-hidden items-center justify-center"
    >
      {/* Background layer for empty state */}
      <View className="absolute inset-0 bg-slate-50" />
      
      {/* Liquid Fill Layer */}
      <Animated.View 
        className="absolute bottom-0 left-0 right-0 w-full"
        style={animatedFillStyle}
      >
        <LinearGradient
          colors={colors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          className="w-full h-full"
        />
      </Animated.View>

      {/* Glass overlay or text content */}
      <View className="absolute inset-0 items-center justify-center bg-white/40 p-4">
        <Text className="text-slate-900 font-extrabold text-lg uppercase tracking-wider text-center shadow-sm">
          {status.category.name}
        </Text>
        <Text className="text-slate-900 font-black text-3xl mt-1 shadow-sm">
          ${Math.abs(status.remaining).toFixed(0)}
        </Text>
        <Text className="text-slate-800 font-bold text-xs mt-1 shadow-sm">
          {isOverBudget ? 'OVER' : 'SAVED'}
        </Text>
        
        <View className="bg-slate-900/10 px-3 py-1.5 rounded-full mt-3">
          <Text className="text-slate-800 font-bold text-xs">
            ${status.expectedMonthlyBudget.toFixed(0)}/mo
          </Text>
        </View>
      </View>
    </View>
  );
}

export default function DashboardScreen() {
  const { budgetStatuses, loading, error } = useBudget();

  // Gesture handling state
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = savedScale.value * e.scale;
    })
    .onEnd(() => {
      // Clamp scale between 0.3 and 3
      if (scale.value < 0.3) scale.value = withSpring(0.3);
      if (scale.value > 3) scale.value = withSpring(3);
      savedScale.value = scale.value;
    });

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      translateX.value = savedTranslateX.value + e.translationX;
      translateY.value = savedTranslateY.value + e.translationY;
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  // Compose gestures so both pan and pinch can work simultaneously
  const composedGestures = Gesture.Simultaneous(pinchGesture, panGesture);

  const animatedCanvasStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scale: scale.value },
      ],
    };
  });

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-[#F8FAFC]">
        <ActivityIndicator size="large" color="#0ea5e9" />
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center bg-[#F8FAFC] p-4">
        <Text className="text-red-500 text-center font-bold">Failed to load data: {error.message || JSON.stringify(error)}</Text>
      </View>
    );
  }

  if (budgetStatuses.length === 0) {
    return (
      <View className="flex-1 items-center justify-center bg-[#F8FAFC] p-4">
        <View className="bg-white p-8 rounded-3xl shadow-sm items-center border border-slate-100">
          <Text className="text-slate-800 text-center text-lg font-bold mb-2">No categories yet</Text>
          <Text className="text-slate-600 text-center">Head over to Settings to create your first budget category!</Text>
        </View>
      </View>
    );
  }

  return (
    <GestureHandlerRootView className="flex-1 bg-[#F8FAFC]">
      <View className="absolute z-10 top-12 left-6" pointerEvents="none">
        <Text className="text-4xl font-extrabold text-slate-800 tracking-tight">Spatial Map</Text>
        <Text className="text-slate-600 font-bold mt-1 text-base">Pinch to zoom, drag to pan</Text>
      </View>

      <GestureDetector gesture={composedGestures}>
        <Animated.View className="flex-1" style={animatedCanvasStyle}>
          {/* Center reference point for aesthetics */}
          <View 
            className="absolute bg-slate-200/50 rounded-full items-center justify-center"
            style={{ 
              top: height / 2 - 50, 
              left: width / 2 - 50, 
              width: 100, 
              height: 100 
            }}
          >
            <Text className="text-slate-400 font-black text-xs text-center">CENTER</Text>
          </View>

          {budgetStatuses.map((status, index) => (
            <PiggyBankNode 
              key={status.category.id}
              status={status}
              index={index}
              totalNodes={budgetStatuses.length}
            />
          ))}
        </Animated.View>
      </GestureDetector>
    </GestureHandlerRootView>
  );
}
