import React from 'react';
import { View, Text, ActivityIndicator, Dimensions, TouchableOpacity } from 'react-native';
import { useBudget } from '../hooks/useBudget';
import { LinearGradient } from 'expo-linear-gradient';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { useRouter } from 'expo-router';
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

function TwoVesselNode({ 
  status, 
  index, 
  totalNodes 
}: { 
  status: BudgetStatus; 
  index: number; 
  totalNodes: number;
}) {
  const CANVAS_CENTER = 1500;
  
  // Calculate node position on a circle
  // Increased radius to accommodate taller nodes
  const radius = 240; 
  const angle = (index / totalNodes) * 2 * Math.PI - Math.PI / 2; // Start from top (-90 deg)
  const x = Math.cos(angle) * radius;
  const y = Math.sin(angle) * radius;

  const colors = GRADIENTS[index % GRADIENTS.length];
  
  // --- Top Container (Daily Glass) ---
  const topIsOverBudget = status.todayRemaining <= 0;
  const topColors = topIsOverBudget ? ['#ef4444', '#b91c1c'] : colors;
  const topFillPercentage = Math.max(0, Math.min(100, (status.todayRemaining / status.dailyBudget) * 100)) || 0;
  const topTargetHeight = (topFillPercentage / 100) * 140;
  const topFillHeight = useSharedValue(0);

  // --- Bottom Container (Savings Vault) ---
  const bottomIsNegative = status.totalSaved < 0;
  const bottomColors = bottomIsNegative ? ['#ef4444', '#b91c1c'] : colors;
  // Cap at 100% just for animation scale
  const bottomFillPercentage = Math.max(0, Math.min(100, (status.totalSaved / status.expectedMonthlyBudget) * 100)) || 0;
  const bottomTargetHeight = (bottomFillPercentage / 100) * 140;
  const bottomFillHeight = useSharedValue(0);

  React.useEffect(() => {
    topFillHeight.value = withTiming(topTargetHeight, { duration: 1500 });
    // Add a slight delay for the vault animation so it feels like a sequence
    setTimeout(() => {
      bottomFillHeight.value = withTiming(bottomTargetHeight, { duration: 1500 });
    }, 300);
  }, [topTargetHeight, bottomTargetHeight]);

  const topAnimatedStyle = useAnimatedStyle(() => ({ height: topFillHeight.value }));
  const bottomAnimatedStyle = useAnimatedStyle(() => ({ height: bottomFillHeight.value }));

  return (
    <View 
      style={{
        position: 'absolute',
        top: CANVAS_CENTER + y - 145, // half of total height 290
        left: CANVAS_CENTER + x - 70, // half of width 140
        width: 140,
        height: 290,
      }}
      className="items-center justify-between"
    >
      {/* Top Container: Daily Glass */}
      <View className="w-full h-[140px] bg-white rounded-t-[70px] rounded-b-3xl shadow-sm border-4 border-slate-100 overflow-hidden items-center justify-center">
        <View className="absolute inset-0 bg-slate-50" />
        <Animated.View 
          style={[
            { position: 'absolute', bottom: 0, left: 0, right: 0, overflow: 'hidden' },
            topAnimatedStyle
          ]}
        >
          <LinearGradient
            colors={topColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ position: 'absolute', bottom: 0, left: 0, width: 140, height: 140 }}
          />
        </Animated.View>

        <View className="absolute inset-0 items-center justify-center bg-white/50 p-2">
          <Text className="text-slate-900 font-extrabold text-xs uppercase tracking-wider text-center">
            {status.category.name} Daily
          </Text>
          <Text className="text-slate-900 font-black text-2xl mt-1">
            ${Math.abs(status.todayRemaining).toFixed(0)}
          </Text>
          <Text className="text-slate-800 font-bold text-[10px] mt-1">
            {topIsOverBudget ? '0 REMAINING' : 'REMAINING TODAY'}
          </Text>
        </View>
      </View>

      {/* Spacer / Pipe connector */}
      <View className="w-3 h-[10px] bg-slate-200 rounded-full" />

      {/* Bottom Container: Savings Vault */}
      <View className="w-full h-[140px] bg-white rounded-b-[70px] rounded-t-3xl shadow-sm border-4 border-slate-100 overflow-hidden items-center justify-center">
        <View className="absolute inset-0 bg-slate-50" />
        <Animated.View 
          style={[
            { position: 'absolute', bottom: 0, left: 0, right: 0, overflow: 'hidden' },
            bottomAnimatedStyle
          ]}
        >
          <LinearGradient
            colors={bottomColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ position: 'absolute', bottom: 0, left: 0, width: 140, height: 140 }}
          />
        </Animated.View>

        <View className="absolute inset-0 items-center justify-center bg-white/50 p-2">
          <Text className="text-slate-900 font-extrabold text-xs uppercase tracking-wider text-center">
            Vault
          </Text>
          <Text className="text-slate-900 font-black text-2xl mt-1">
            {bottomIsNegative ? '-' : ''}${Math.abs(status.totalSaved).toFixed(0)}
          </Text>
          <Text className="text-slate-800 font-bold text-[10px] mt-1">
            {bottomIsNegative ? 'DEFICIT' : 'TOTAL SAVED'}
          </Text>
        </View>
      </View>
    </View>
  );
}

export default function DashboardScreen() {
  const { budgetStatuses, loading, error } = useBudget();
  const router = useRouter();

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
          {/* Center reference point for aesthetics and routing */}
          <TouchableOpacity 
            onPress={() => router.push('/stats')}
            className="absolute bg-white rounded-full items-center justify-center shadow-lg border-4 border-indigo-50 z-50 overflow-hidden"
            style={{ 
              top: 1500 - 60, 
              left: 1500 - 60, 
              width: 120, 
              height: 120 
            }}
          >
            <LinearGradient
              colors={['#e0e7ff', '#ffffff']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ position: 'absolute', width: '100%', height: '100%' }}
            />
            <View className="items-center justify-center p-2">
              <Text className="text-indigo-600 font-black text-sm text-center tracking-widest">MONTHLY</Text>
              <Text className="text-indigo-600 font-black text-sm text-center tracking-widest mb-1">STATS</Text>
              <View className="bg-indigo-600 px-3 py-1 rounded-full">
                <Text className="text-white font-bold text-[10px] text-center">TAP HERE</Text>
              </View>
            </View>
          </TouchableOpacity>

          {budgetStatuses.map((status, index) => (
            <TwoVesselNode 
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
