import React from 'react';
import { View, Text, Dimensions, Pressable, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSpring } from 'react-native-reanimated';
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

function CategoryNode({ status, index, totalNodes, onDoubleTap }: { status: BudgetStatus; index: number; totalNodes: number; onDoubleTap: (id: string) => void }) {
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
    <Animated.View style={{ position: 'absolute', top: CANVAS_CENTER + y - 170, left: CANVAS_CENTER + x - 90, width: 180, height: 340 }} className="items-center justify-center">
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

export default function CanvasLayout({ budgetStatuses, onAddExpense, masterVaultValue }: { budgetStatuses: BudgetStatus[], onAddExpense: (id: string) => void, masterVaultValue: number }) {
  const { t } = useTranslation();
  
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

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
  const remainingPct = 100 - monthProgressPct;

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
            
            {/* Red Progression Fill - using a simple view that fills up proportionally from the bottom to represent time left */}
            <View className="absolute inset-0 rounded-full overflow-hidden">
               <View className="absolute bottom-0 left-0 right-0 bg-red-400" style={{ height: `${remainingPct}%` }} />
            </View>
            
            {/* Inner Center Node */}
            <View className="absolute bg-white dark:bg-slate-800 rounded-full items-center justify-center shadow-lg overflow-hidden border-[6px] border-white dark:border-slate-800"
              style={{ width: 164, height: 164 }}>
              <LinearGradient colors={['#e0e7ff', '#ffffff']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ position: 'absolute', width: '100%', height: '100%' }} />
              <View className="items-center justify-center p-2">
                <Text className="text-indigo-600 font-black text-sm text-center tracking-widest">{t('dashboard.masterVault', 'Master Vault')}</Text>
                <Text className="text-indigo-600 font-black text-3xl text-center mb-1">${masterVaultValue.toFixed(0)}</Text>
                <View className="bg-indigo-600 px-3 py-1 rounded-full mt-1">
                  <Text className="text-white font-bold text-xs text-center">{remainingPct.toFixed(0)}% Left</Text>
                </View>
              </View>
            </View>
          </View>

          {budgetStatuses.map((status, index) => (
            <CategoryNode key={status.category.id} status={status} index={index} totalNodes={totalNodes} onDoubleTap={onAddExpense} />
          ))}
        </Animated.View>
      </GestureDetector>
    </>
  );
}
