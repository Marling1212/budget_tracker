import React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { BudgetStatus } from '../../../types/database';
import { useTranslation } from 'react-i18next';
import { useDoubleTap } from '../../hooks/useDoubleTap';
import * as Icons from 'lucide-react-native';

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

function TwoVesselCard({ status, index, onDoubleTap }: { status: BudgetStatus; index: number; onDoubleTap: (id: string) => void }) {
  const { t } = useTranslation();
  const handleDoubleTap = useDoubleTap(() => onDoubleTap(status.category.id));
  const baseColor = status.category.color || GRADIENTS[index % GRADIENTS.length][0];
  const colors = [baseColor, baseColor] as const;
  
  const topIsOverBudget = status.todayRemaining < 0;
  const topColors = topIsOverBudget ? ['#ef4444', '#b91c1c'] as const : colors;
  const topFillPercentage = Math.max(0, Math.min(100, (status.todayRemaining / status.dailyBudget) * 100)) || 0;
  const topTargetHeight = (topFillPercentage / 100) * 105;
  const topFillHeight = useSharedValue(0);

  const bottomIsNegative = status.totalSaved < 0;
  const bottomColors = bottomIsNegative ? ['#ef4444', '#b91c1c'] as const : colors;
  const bottomFillPercentage = Math.max(0, Math.min(100, (status.totalSaved / status.expectedMonthlyBudget) * 100)) || 0;
  const bottomTargetHeight = (bottomFillPercentage / 100) * 105;
  const bottomFillHeight = useSharedValue(0);

  React.useEffect(() => {
    topFillHeight.value = withTiming(topTargetHeight, { duration: 1500 });
    setTimeout(() => { bottomFillHeight.value = withTiming(bottomTargetHeight, { duration: 1500 }); }, 300);
  }, [topTargetHeight, bottomTargetHeight]);

  const topAnimatedStyle = useAnimatedStyle(() => ({ height: topFillHeight.value }));
  const bottomAnimatedStyle = useAnimatedStyle(() => ({ height: bottomFillHeight.value }));

    const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const currentDay = now.getDate();
  const monthProgressPct = ((currentDay - 1) / daysInMonth) * 100;
  const remainingPct = 100 - monthProgressPct;

  return (
    <Pressable style={{ width: '48%' }} className="h-[220px] mb-4 flex-col justify-between" onPress={handleDoubleTap}>
      <View className="w-full h-[106px] bg-white dark:bg-slate-800 rounded-t-3xl rounded-b-xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden items-center justify-center">
        <View className="absolute inset-0 bg-slate-50 dark:bg-slate-700" />
        <Animated.View style={[{ position: 'absolute', bottom: 0, left: 0, right: 0, overflow: 'hidden' }, topAnimatedStyle]}>
          <LinearGradient colors={topColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: 105 }} />
        </Animated.View>
        <View className="absolute inset-0 items-center justify-center bg-white/50 dark:bg-slate-800/50 p-2">
          {renderIcon(status.category.icon, status.category.color || '#4f46e5', 24)}
          <Text className="text-slate-900 dark:text-slate-100 font-bold text-xs uppercase tracking-wider text-center mt-1">{status.category.name} Daily</Text>
          <Text className={`${topIsOverBudget ? 'text-red-600' : 'text-slate-900 dark:text-slate-100'} font-black text-xl mt-1`}>{topIsOverBudget ? '-' : ''}${Math.abs(status.todayRemaining).toFixed(0)}</Text>
        </View>
      </View>
      <View className="w-full h-[106px] bg-white dark:bg-slate-800 rounded-b-3xl rounded-t-xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden items-center justify-center mt-2">
        <View className="absolute inset-0 bg-slate-50 dark:bg-slate-700" />
        <Animated.View style={[{ position: 'absolute', bottom: 0, left: 0, right: 0, overflow: 'hidden' }, bottomAnimatedStyle]}>
          <LinearGradient colors={bottomColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: 105 }} />
        </Animated.View>
        <View className="absolute inset-0 items-center justify-center bg-white/50 dark:bg-slate-800/50 p-2">
          <Text className="text-slate-900 dark:text-slate-100 font-bold text-xs uppercase tracking-wider text-center">Vault</Text>
          <Text className={`${bottomIsNegative ? 'text-red-600' : 'text-slate-900 dark:text-slate-100'} font-black text-xl mt-1`}>{bottomIsNegative ? '-' : ''}${Math.abs(status.totalSaved).toFixed(0)}</Text>
        </View>
      </View>
    </Pressable>
  );
}

function SingleVesselCard({ status, index, onDoubleTap }: { status: BudgetStatus; index: number; onDoubleTap: (id: string) => void }) {
  const { t } = useTranslation();
  const handleDoubleTap = useDoubleTap(() => onDoubleTap(status.category.id));
  const baseColor = status.category.color || GRADIENTS[index % GRADIENTS.length][0];
  const colors = [baseColor, baseColor] as const;
  
  const remaining = status.expectedMonthlyBudget - status.spentThisMonth;
  const isOverBudget = remaining < 0;
  const fillColors = isOverBudget ? ['#ef4444', '#b91c1c'] as const : colors;
  const fillPercentage = Math.max(0, Math.min(100, (remaining / status.expectedMonthlyBudget) * 100)) || 0;
  const targetHeight = (fillPercentage / 100) * 220;
  const fillHeight = useSharedValue(0);

  React.useEffect(() => { fillHeight.value = withTiming(targetHeight, { duration: 1500 }); }, [targetHeight]);
  const animatedStyle = useAnimatedStyle(() => ({ height: fillHeight.value }));

  return (
    <Pressable style={{ width: '48%' }} className="h-[220px] mb-4" onPress={handleDoubleTap}>
      <View className="w-full h-full bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden items-center justify-center">
        <View className="absolute inset-0 bg-slate-50 dark:bg-slate-700" />
        <Animated.View style={[{ position: 'absolute', bottom: 0, left: 0, right: 0, overflow: 'hidden' }, animatedStyle]}>
          <LinearGradient colors={fillColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: 220 }} />
        </Animated.View>
        <View className="absolute inset-0 items-center justify-center bg-white/50 dark:bg-slate-800/50 p-2">
          {renderIcon(status.category.icon, status.category.color || '#4f46e5', 40)}
          <Text className="text-slate-900 dark:text-slate-100 font-extrabold text-sm uppercase tracking-wider text-center mt-2">{status.category.name}</Text>
          <Text className={`${isOverBudget ? 'text-red-600' : 'text-slate-900 dark:text-slate-100'} font-black text-2xl mt-1`}>{isOverBudget ? '-' : ''}${Math.abs(remaining).toFixed(0)}</Text>
          <Text className={`${isOverBudget ? 'text-red-500' : 'text-slate-800 dark:text-slate-200'} font-bold text-xs mt-1 text-center`}>{isOverBudget ? t('dashboard.overspent') : t('dashboard.remainingMonthly')}</Text>
        </View>
      </View>
    </Pressable>
  );
}

export default function BentoLayout({ budgetStatuses, onAddExpense, netWorth, totalRemainingToday }: { budgetStatuses: BudgetStatus[], onAddExpense: (id: string) => void, netWorth: number, totalRemainingToday: number }) {
  const { t } = useTranslation();
  return (
    <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
      <View className="px-6 pt-16 pb-8 bg-indigo-600 rounded-b-[40px] shadow-lg mb-6">
        <Text className="text-indigo-200 font-bold text-sm uppercase tracking-widest mb-1">{t('dashboard.netWorth')}</Text>
        <Text className="text-5xl font-extrabold text-white tracking-tight">${netWorth.toFixed(0)}</Text>
        <View className="mt-8 flex-row justify-between items-end">
          <View>
            <Text className="text-indigo-200 font-bold text-xs uppercase mb-1">{t('dashboard.remainingToday')}</Text>
            <Text className="text-3xl font-black text-white">${totalRemainingToday.toFixed(0)}</Text>
          </View>
          <View className="items-end">
             <Text className="text-indigo-200 font-bold text-xs uppercase mb-1">{remainingPct.toFixed(0)}% Left</Text>
             <View className="w-24 h-2 bg-indigo-800 rounded-full overflow-hidden mt-1">
                <View className="h-full bg-red-400 rounded-full" style={{ width: `${remainingPct}%` }} />
             </View>
          </View>
        </View>
      </View>
      {budgetStatuses.length === 0 ? (
        <View className="px-6">
          <View className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-sm items-center border border-slate-100 dark:border-slate-700">
            <Text className="text-slate-800 dark:text-slate-200 text-center text-lg font-bold mb-2">{t('dashboard.noCategories')}</Text>
            <Text className="text-slate-600 dark:text-slate-300 text-center">{t('dashboard.noCategoriesDesc')}</Text>
          </View>
        </View>
      ) : (
        <View className="px-6 flex-row flex-wrap justify-between">
          {budgetStatuses.map((status, index) => {
            if (status.category.is_accumulative) return <TwoVesselCard key={status.category.id} status={status} index={index} onDoubleTap={onAddExpense} />;
            return <SingleVesselCard key={status.category.id} status={status} index={index} onDoubleTap={onAddExpense} />;
          })}
        </View>
      )}
    </ScrollView>
  );
}
