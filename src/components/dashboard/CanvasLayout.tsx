import React from 'react';
import { View, Text, Dimensions, Pressable, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSpring, runOnJS } from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BudgetStatus } from '../../../types/database';
import { useTranslation } from 'react-i18next';
import { useDoubleTap } from '../../hooks/useDoubleTap';
import * as Icons from 'lucide-react-native';

const { width, height } = Dimensions.get('window');
const CANVAS_CENTER = 1500;

const renderIcon = (name: string, color: string, size: number) => {
  const IconComponent = (Icons as any)[name || 'Tag'] || Icons.Tag;
  return <IconComponent color={color} size={size} />;
};

const GRADIENTS = [
  ['#3b82f6', '#8b5cf6'],
  ['#ec4899', '#f43f5e'],
  ['#10b981', '#059669'],
  ['#f59e0b', '#d97706'],
  ['#6366f1', '#4f46e5'],
] as const;

const NodeScaleSlider = ({ extremeLevel }: { extremeLevel: Animated.SharedValue<number> }) => {
  const { t } = useTranslation();
  const SLIDER_WIDTH = 120;
  const KNOB_SIZE = 24;
  
  const savedX = useSharedValue(extremeLevel.value * (SLIDER_WIDTH - KNOB_SIZE));
  const translateX = useSharedValue(extremeLevel.value * (SLIDER_WIDTH - KNOB_SIZE));

  React.useEffect(() => {
    AsyncStorage.getItem('@node_scale_extremity').then((val) => {
      if (val !== null) {
        const numVal = parseFloat(val);
        if (!isNaN(numVal) && numVal >= 0 && numVal <= 1) {
          extremeLevel.value = numVal;
          const initialX = numVal * (SLIDER_WIDTH - KNOB_SIZE);
          translateX.value = initialX;
          savedX.value = initialX;
        }
      }
    });
  }, []);

  const saveScaleToStorage = (val: number) => {
    AsyncStorage.setItem('@node_scale_extremity', val.toString());
  };

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      let newX = savedX.value + e.translationX;
      if (newX < 0) newX = 0;
      if (newX > SLIDER_WIDTH - KNOB_SIZE) newX = SLIDER_WIDTH - KNOB_SIZE;
      translateX.value = newX;
      extremeLevel.value = newX / (SLIDER_WIDTH - KNOB_SIZE);
    })
    .onEnd(() => {
      savedX.value = translateX.value;
      runOnJS(saveScaleToStorage)(translateX.value / (SLIDER_WIDTH - KNOB_SIZE));
    });

  const animatedKnobStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }]
  }));
  
  const animatedTrackStyle = useAnimatedStyle(() => ({
    width: translateX.value + KNOB_SIZE / 2
  }));

  return (
    <View className="absolute z-50 bottom-12 left-6 items-start pointer-events-auto bg-white/80 dark:bg-slate-800/80 p-3 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
      <Text className="text-slate-600 dark:text-slate-300 font-bold mb-3 text-xs">{t('dashboard.nodeScale', 'Node Scale')}</Text>
      <View style={{ height: 24, justifyContent: 'center', width: SLIDER_WIDTH }}>
        <View style={{ position: 'absolute', left: 0, right: 0, height: 8, borderRadius: 4, backgroundColor: '#cbd5e1' }} />
        <Animated.View style={[{ position: 'absolute', left: 0, height: 8, borderRadius: 4, backgroundColor: '#6366f1' }, animatedTrackStyle]} />
        <GestureDetector gesture={panGesture}>
          <Animated.View style={[{ position: 'absolute', left: 0, width: KNOB_SIZE, height: KNOB_SIZE, borderRadius: KNOB_SIZE / 2, backgroundColor: 'white', borderWidth: 2, borderColor: '#6366f1', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 1.5, elevation: 3 }, animatedKnobStyle]} />
        </GestureDetector>
      </View>
    </View>
  );
};

function CategoryNode({ status, index, totalNodes, onDoubleTap, maxBudget, extremeLevel }: { status: BudgetStatus; index: number; totalNodes: number; onDoubleTap: (id: string) => void; maxBudget: number; extremeLevel: Animated.SharedValue<number> }) {
  const { t } = useTranslation();
  const handleDoubleTap = useDoubleTap(() => onDoubleTap(status.category.id));
  
  const minSpacing = 280;
  const calculatedRadius = (totalNodes * minSpacing) / (2 * Math.PI);
  const radius = Math.max(240, calculatedRadius);
  
  const angle = (index / totalNodes) * 2 * Math.PI - Math.PI / 2;
  const x = Math.cos(angle) * radius;
  const y = Math.sin(angle) * radius;

  const relativeBudget = maxBudget > 0 ? status.expectedMonthlyBudget / maxBudget : 1;

  const animatedScaleStyle = useAnimatedStyle(() => {
    const baseScale = 1 - 0.55 * extremeLevel.value;
    const maxScale = 1 + 0.65 * extremeLevel.value;
    const scale = baseScale + (maxScale - baseScale) * relativeBudget;
    return {
      transform: [{ scale }]
    };
  });

  const baseColor = status.category.color || GRADIENTS[index % GRADIENTS.length][0];
  const colors = [baseColor, baseColor] as const;
  
  const remaining = status.todayRemaining;
  const isOverBudget = remaining < 0;
  const fillColors = isOverBudget ? ['#ef4444', '#b91c1c'] as const : colors;
  
  // Normal: 100% -> 0% down. Overbudget: 0% -> 100% up in red.
  let fillPercentage = isOverBudget 
    ? Math.min(100, (Math.abs(remaining) / status.dailyBudget) * 100) || 0
    : Math.max(0, Math.min(100, (remaining / status.dailyBudget) * 100)) || 0;
  
  const targetHeight = (fillPercentage / 100) * 340;
  const fillHeight = useSharedValue(0);

  React.useEffect(() => {
    fillHeight.value = withTiming(targetHeight, { duration: 1500 });
  }, [targetHeight]);

  const animatedStyle = useAnimatedStyle(() => ({ height: fillHeight.value }));

  return (
    <Animated.View style={[{ position: 'absolute', top: CANVAS_CENTER + y - 170, left: CANVAS_CENTER + x - 90, width: 180, height: 340 }, animatedScaleStyle]} className="items-center justify-center">
      <Pressable onPress={handleDoubleTap} className="w-full h-full">
        <View className="w-full h-full bg-white dark:bg-slate-800 rounded-[90px] shadow-sm border-4 border-slate-100 dark:border-slate-700 overflow-hidden items-center justify-center">
          <View className="absolute inset-0 bg-slate-50 dark:bg-slate-700" />
          <Animated.View style={[{ position: 'absolute', bottom: 0, left: 0, right: 0, overflow: 'hidden' }, animatedStyle]}>
            <LinearGradient colors={fillColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ position: 'absolute', bottom: 0, left: 0, width: 180, height: 340 }} />
          </Animated.View>
          <View className="absolute inset-0 items-center justify-center bg-white/50 dark:bg-slate-800/50 p-2 pointer-events-none">
            {renderIcon(status.category.icon, status.category.color || '#4f46e5', 56)}
            <Text className="text-slate-900 dark:text-slate-100 font-extrabold text-lg uppercase tracking-wider text-center mt-1">{status.category.name}</Text>
            <Text className={`${isOverBudget ? 'text-red-600' : 'text-slate-900 dark:text-slate-100'} font-black text-4xl mt-1`}>{isOverBudget ? '-' : ''}${Math.abs(remaining).toFixed(0)}</Text>
            <Text className={`${isOverBudget ? 'text-red-500' : 'text-slate-800 dark:text-slate-200'} font-bold text-xs mt-1 text-center`}>{isOverBudget ? t('dashboard.overspent') : t('dashboard.remainingToday', 'Daily Glass')}</Text>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

function TwoVesselNode({ status, index, totalNodes, onDoubleTap, maxBudget, extremeLevel }: { status: BudgetStatus; index: number; totalNodes: number; onDoubleTap: (id: string) => void; maxBudget: number; extremeLevel: Animated.SharedValue<number> }) {
  const { t } = useTranslation();
  const handleDoubleTap = useDoubleTap(() => onDoubleTap(status.category.id));
  
  const minSpacing = 280;
  const calculatedRadius = (totalNodes * minSpacing) / (2 * Math.PI);
  const radius = Math.max(240, calculatedRadius);
  
  const angle = (index / totalNodes) * 2 * Math.PI - Math.PI / 2;
  const x = Math.cos(angle) * radius;
  const y = Math.sin(angle) * radius;

  const baseColor = status.category.color || GRADIENTS[index % GRADIENTS.length][0];
  const colors = [baseColor, baseColor] as const;
  
  // Top: Daily Glass
  const topIsOverBudget = status.todayRemaining < 0;
  const topColors = topIsOverBudget ? ['#ef4444', '#b91c1c'] as const : colors;
  const topFillPercentage = Math.max(0, Math.min(100, (Math.abs(status.todayRemaining) / status.dailyBudget) * 100)) || 0;
  
  // Bottom: Vault
  const bottomIsNegative = status.totalSaved < 0;
  const bottomColors = bottomIsNegative ? ['#ef4444', '#b91c1c'] as const : colors;
  const bottomFillPercentage = Math.max(0, Math.min(100, (Math.abs(status.totalSaved) / status.expectedMonthlyBudget) * 100)) || 0;
  
  const topTargetHeight = (topFillPercentage / 100) * 165;
  const bottomTargetHeight = (bottomFillPercentage / 100) * 165;
  
  const topFillHeight = useSharedValue(0);
  const bottomFillHeight = useSharedValue(0);

  React.useEffect(() => {
    topFillHeight.value = withTiming(topTargetHeight, { duration: 1500 });
    setTimeout(() => { bottomFillHeight.value = withTiming(bottomTargetHeight, { duration: 1500 }); }, 300);
  }, [topTargetHeight, bottomTargetHeight]);

  const relativeBudget = maxBudget > 0 ? status.expectedMonthlyBudget / maxBudget : 1;
  const animatedScaleStyle = useAnimatedStyle(() => {
    const baseScale = 1 - 0.55 * extremeLevel.value;
    const maxScale = 1 + 0.65 * extremeLevel.value;
    const scale = baseScale + (maxScale - baseScale) * relativeBudget;
    return {
      transform: [{ scale }]
    };
  });

  const topAnimatedStyle = useAnimatedStyle(() => ({ height: topFillHeight.value }));
  const bottomAnimatedStyle = useAnimatedStyle(() => ({ height: bottomFillHeight.value }));

  return (
    <Animated.View style={[{ position: 'absolute', top: CANVAS_CENTER + y - 170, left: CANVAS_CENTER + x - 90, width: 180, height: 340 }, animatedScaleStyle]}>
      <Pressable onPress={handleDoubleTap} className="w-full h-full flex-col justify-between">
        
        {/* Daily Glass (Top) */}
        <View className="w-full h-[166px] bg-white dark:bg-slate-800 rounded-t-[90px] rounded-b-2xl shadow-sm border-4 border-slate-100 dark:border-slate-700 overflow-hidden items-center justify-center">
          <View className="absolute inset-0 bg-slate-50 dark:bg-slate-700" />
          <Animated.View style={[{ position: 'absolute', bottom: 0, left: 0, right: 0, overflow: 'hidden' }, topAnimatedStyle]}>
            <LinearGradient colors={topColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ position: 'absolute', bottom: 0, left: 0, width: 180, height: 165 }} />
          </Animated.View>
          <View className="absolute inset-0 items-center justify-center bg-white/50 dark:bg-slate-800/50 p-2 pointer-events-none">
            {renderIcon(status.category.icon, status.category.color || '#4f46e5', 32)}
            <Text className="text-slate-900 dark:text-slate-100 font-extrabold text-sm uppercase tracking-wider text-center mt-1">{status.category.name} Daily</Text>
            <Text className={`${topIsOverBudget ? 'text-red-600' : 'text-slate-900 dark:text-slate-100'} font-black text-3xl mt-1`}>{topIsOverBudget ? '-' : ''}${Math.abs(status.todayRemaining).toFixed(0)}</Text>
          </View>
        </View>

        {/* Vault (Bottom) */}
        <View className="w-full h-[166px] bg-white dark:bg-slate-800 rounded-b-[90px] rounded-t-2xl shadow-sm border-4 border-slate-100 dark:border-slate-700 overflow-hidden items-center justify-center mt-2">
          <View className="absolute inset-0 bg-slate-50 dark:bg-slate-700" />
          <Animated.View style={[{ position: 'absolute', bottom: 0, left: 0, right: 0, overflow: 'hidden' }, bottomAnimatedStyle]}>
            <LinearGradient colors={bottomColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ position: 'absolute', bottom: 0, left: 0, width: 180, height: 165 }} />
          </Animated.View>
          <View className="absolute inset-0 items-center justify-center bg-white/50 dark:bg-slate-800/50 p-2 pointer-events-none">
            <Text className="text-slate-900 dark:text-slate-100 font-extrabold text-sm uppercase tracking-wider text-center mt-1">Vault</Text>
            <Text className={`${bottomIsNegative ? 'text-red-600' : 'text-slate-900 dark:text-slate-100'} font-black text-3xl mt-1`}>{bottomIsNegative ? '-' : ''}${Math.abs(status.totalSaved).toFixed(0)}</Text>
          </View>
        </View>

      </Pressable>
    </Animated.View>
  );
}

function SingleVesselNode({ status, index, totalNodes, onDoubleTap, maxBudget, extremeLevel }: { status: BudgetStatus; index: number; totalNodes: number; onDoubleTap: (id: string) => void; maxBudget: number; extremeLevel: Animated.SharedValue<number> }) {
  const { t } = useTranslation();
  const handleDoubleTap = useDoubleTap(() => onDoubleTap(status.category.id));
  
  const minSpacing = 280;
  const calculatedRadius = (totalNodes * minSpacing) / (2 * Math.PI);
  const radius = Math.max(240, calculatedRadius);
  
  const angle = (index / totalNodes) * 2 * Math.PI - Math.PI / 2;
  const x = Math.cos(angle) * radius;
  const y = Math.sin(angle) * radius;

  const baseColor = status.category.color || GRADIENTS[index % GRADIENTS.length][0];
  const colors = [baseColor, baseColor] as const;
  
  const remaining = status.expectedMonthlyBudget - status.spentThisMonth;
  const isOverBudget = remaining < 0;
  const fillColors = isOverBudget ? ['#ef4444', '#b91c1c'] as const : colors;
  
  const fillPercentage = isOverBudget 
    ? Math.min(100, (Math.abs(remaining) / status.expectedMonthlyBudget) * 100) || 0
    : Math.max(0, Math.min(100, (remaining / status.expectedMonthlyBudget) * 100)) || 0;
  
  const targetHeight = (fillPercentage / 100) * 340;
  const fillHeight = useSharedValue(0);

  React.useEffect(() => {
    fillHeight.value = withTiming(targetHeight, { duration: 1500 });
  }, [targetHeight]);

  const relativeBudget = maxBudget > 0 ? status.expectedMonthlyBudget / maxBudget : 1;
  const animatedScaleStyle = useAnimatedStyle(() => {
    const baseScale = 1 - 0.55 * extremeLevel.value;
    const maxScale = 1 + 0.65 * extremeLevel.value;
    const scale = baseScale + (maxScale - baseScale) * relativeBudget;
    return {
      transform: [{ scale }]
    };
  });

  const animatedStyle = useAnimatedStyle(() => ({ height: fillHeight.value }));

  return (
    <Animated.View style={[{ position: 'absolute', top: CANVAS_CENTER + y - 170, left: CANVAS_CENTER + x - 90, width: 180, height: 340 }, animatedScaleStyle]} className="items-center justify-center">
      <Pressable onPress={handleDoubleTap} className="w-full h-full">
        <View className="w-full h-full bg-white dark:bg-slate-800 rounded-[90px] shadow-sm border-4 border-slate-100 dark:border-slate-700 overflow-hidden items-center justify-center">
          <View className="absolute inset-0 bg-slate-50 dark:bg-slate-700" />
          <Animated.View style={[{ position: 'absolute', bottom: 0, left: 0, right: 0, overflow: 'hidden' }, animatedStyle]}>
            <LinearGradient colors={fillColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ position: 'absolute', bottom: 0, left: 0, width: 180, height: 340 }} />
          </Animated.View>
          <View className="absolute inset-0 items-center justify-center bg-white/50 dark:bg-slate-800/50 p-2 pointer-events-none">
            {renderIcon(status.category.icon, status.category.color || '#4f46e5', 56)}
            <Text className="text-slate-900 dark:text-slate-100 font-extrabold text-lg uppercase tracking-wider text-center mt-1">{status.category.name}</Text>
            <Text className={`${isOverBudget ? 'text-red-600' : 'text-slate-900 dark:text-slate-100'} font-black text-4xl mt-1`}>{isOverBudget ? '-' : ''}${Math.abs(remaining).toFixed(0)}</Text>
            <Text className={`${isOverBudget ? 'text-red-500' : 'text-slate-800 dark:text-slate-200'} font-bold text-xs mt-1 text-center`}>{isOverBudget ? t('dashboard.overspent') : t('dashboard.remainingMonthly', 'Monthly Glass')}</Text>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

export default function CanvasLayout({ budgetStatuses, onAddExpense, masterVaultValue, useDoubleBucket }: { budgetStatuses: BudgetStatus[], onAddExpense: (id: string) => void, masterVaultValue: number, useDoubleBucket?: boolean }) {
  const { t } = useTranslation();
  
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);
  
  const extremeLevel = useSharedValue(0.5);

  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => { scale.value = savedScale.value * e.scale; })
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
  const animatedCanvasStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }, { translateY: translateY.value }, { scale: scale.value }],
  }));

  const totalNodes = budgetStatuses.length;
  const minSpacing = 280;
  const calculatedRadius = (totalNodes * minSpacing) / (2 * Math.PI);
  const radius = Math.max(240, calculatedRadius);
  const buttonScale = Math.max(1, radius / 240);
  
  const maxBudget = Math.max(...budgetStatuses.map(s => s.expectedMonthlyBudget), 0);

  React.useEffect(() => {
    if (totalNodes > 0) {
      const requiredExtent = radius + 200;
      const fitScale = Math.min(width / (requiredExtent * 2), height / (requiredExtent * 2), 1);
      if (savedScale.value === 1) {
        scale.value = withSpring(fitScale, { damping: 20, stiffness: 90 });
        savedScale.value = fitScale;
      }
    }
  }, [totalNodes, radius, width, height, scale, savedScale]);

  // Month Progression logic
  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const currentDay = now.getDate();
  const monthProgressPct = ((currentDay - 1) / daysInMonth) * 100;
  
  const totalSpentThisMonth = budgetStatuses.reduce((sum, s) => sum + s.spentThisMonth, 0);
  const totalExpectedMonthlyBudget = budgetStatuses.reduce((sum, s) => sum + s.expectedMonthlyBudget, 0);
  const spentPct = totalExpectedMonthlyBudget > 0 ? (totalSpentThisMonth / totalExpectedMonthlyBudget) * 100 : 0;

  return (
    <>
      <View className="absolute z-10 top-12 left-6" pointerEvents="none">
        <Text className="text-slate-600 dark:text-slate-300 font-bold mt-1 text-xs">{t('dashboard.pinchToZoom')}</Text>
      </View>

      <GestureDetector gesture={composedGestures}>
        <Animated.View style={[{ position: 'absolute', width: 3000, height: 3000, top: '50%', left: '50%', marginTop: -1500, marginLeft: -1500, backgroundColor: 'transparent' }, animatedCanvasStyle]}>
          
          {/* Center node with progress indicator */}
          <View className="absolute z-50 items-center justify-center" style={{ top: 1500 - 90, left: 1500 - 90, width: 180, height: 180, transform: [{ scale: buttonScale }] }}>
            {/* Progression Ring Background */}
            <View className="absolute inset-0 bg-slate-200 dark:bg-slate-700 rounded-full" />
            
            
            
            {/* Inner Center Node */}
            <View className="absolute bg-white dark:bg-slate-800 rounded-full items-center justify-center shadow-lg overflow-hidden border-[6px] border-white dark:border-slate-800"
              style={{ width: 164, height: 164 }}>
              <LinearGradient colors={['#e0e7ff', '#ffffff']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ position: 'absolute', width: '100%', height: '100%' }} />
              <View className="items-center justify-center p-2">
                <Text className="text-indigo-600 font-black text-sm text-center tracking-widest">{t('dashboard.masterVault', 'Master Vault')}</Text>
                <Text className="text-indigo-600 font-black text-3xl text-center mb-1">${masterVaultValue.toFixed(0)}</Text>
                <View className="w-24 mt-2">
                  <View className="flex-row justify-between mb-1">
                    <Text className="text-indigo-800 font-bold text-[8px] uppercase">{spentPct.toFixed(0)}%</Text>
                    <Text className="text-red-500 font-bold text-[8px] uppercase">{monthProgressPct.toFixed(0)}%</Text>
                  </View>
                  <View className="w-full h-1.5 bg-indigo-100 rounded-full relative">
                    <View className="h-full bg-indigo-500 rounded-full" style={{ width: `${Math.min(100, spentPct)}%` }} />
                    <View className="absolute top-0 bottom-0 w-[2px] bg-red-500" style={{ left: `${Math.max(1, Math.min(99, monthProgressPct))}%`, marginLeft: -1 }} />
                  </View>
                </View>
              </View>
            </View>
          </View>

          {budgetStatuses.map((status, index) => {
            if (useDoubleBucket) {
              if (status.category.is_accumulative) return <TwoVesselNode key={status.category.id} status={status} index={index} totalNodes={totalNodes} onDoubleTap={onAddExpense} maxBudget={maxBudget} extremeLevel={extremeLevel} />;
              return <SingleVesselNode key={status.category.id} status={status} index={index} totalNodes={totalNodes} onDoubleTap={onAddExpense} maxBudget={maxBudget} extremeLevel={extremeLevel} />;
            } else {
              return <CategoryNode key={status.category.id} status={status} index={index} totalNodes={totalNodes} onDoubleTap={onAddExpense} maxBudget={maxBudget} extremeLevel={extremeLevel} />;
            }
          })}
        </Animated.View>
      </GestureDetector>
      
      <NodeScaleSlider extremeLevel={extremeLevel} />
    </>
  );
}
