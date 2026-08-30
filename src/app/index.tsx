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
  
  // Center of our 3000x3000 canvas
  const CANVAS_CENTER = 1500;
  
  // Calculate node position on a circle
  // Smaller radius and node size so it fits better
  const radius = 180; 
  const angle = (index / totalNodes) * 2 * Math.PI - Math.PI / 2; // Start from top (-90 deg)
  const x = Math.cos(angle) * radius;
  const y = Math.sin(angle) * radius;

  // Saved amount = Accumulated Limit - Spent this month
  const fillPercentage = Math.max(0, Math.min(100, (status.remaining / status.accumulatedLimit) * 100)) || 0;
  const colors = isOverBudget ? ['#ef4444', '#b91c1c'] : GRADIENTS[index % GRADIENTS.length];

  const targetHeight = (fillPercentage / 100) * 160;
  const fillHeight = useSharedValue(0);

  React.useEffect(() => {
    fillHeight.value = withTiming(targetHeight, { duration: 1500 });
  }, [targetHeight]);

  const animatedFillStyle = useAnimatedStyle(() => {
    return {
      height: fillHeight.value,
    };
  });

  return (
    <View 
      style={{
        position: 'absolute',
        top: CANVAS_CENTER + y - 80, // 80 is half of node height (160)
        left: CANVAS_CENTER + x - 80, // 80 is half of node width
        width: 160,
        height: 160,
      }}
      className="bg-white rounded-[80px] shadow-lg border-4 border-slate-100 overflow-hidden items-center justify-center"
    >
      <View className="absolute inset-0 bg-slate-50" />
      
      <Animated.View 
        style={[
          { position: 'absolute', bottom: 0, left: 0, right: 0, overflow: 'hidden' },
          animatedFillStyle
        ]}
      >
        <LinearGradient
          colors={colors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ position: 'absolute', bottom: 0, left: 0, width: 160, height: 160 }}
        />
      </Animated.View>

      <View className="absolute inset-0 items-center justify-center bg-white/40 p-2">
        <Text className="text-slate-900 font-extrabold text-sm uppercase tracking-wider text-center">
          {status.category.name}
        </Text>
        <Text className="text-slate-900 font-black text-2xl mt-1">
          ${Math.abs(status.remaining).toFixed(0)}
        </Text>
        <Text className="text-slate-800 font-bold text-[10px] mt-1">
          {isOverBudget ? 'OVER' : 'SAVED'}
        </Text>
        
        <View className="bg-slate-900/10 px-2 py-1 rounded-full mt-2">
          <Text className="text-slate-800 font-bold text-[10px]">
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
        <Animated.View 
          style={[
            {
              position: 'absolute',
              width: 3000,
              height: 3000,
              top: '50%',
              left: '50%',
              marginTop: -1500,
              marginLeft: -1500,
              backgroundColor: 'transparent',
              // @ts-ignore (for web cursor)
              cursor: 'grab',
              userSelect: 'none'
            },
            animatedCanvasStyle
          ]}
        >
          {/* Center reference point for aesthetics */}
          <View 
            className="absolute bg-slate-200/50 rounded-full items-center justify-center"
            style={{ 
              top: 1500 - 50, 
              left: 1500 - 50, 
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
