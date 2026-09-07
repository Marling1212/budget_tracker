import React from 'react';
import { View, Text, ScrollView, Dimensions, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { BudgetStatus } from '../../../types/database';
import { useTranslation } from 'react-i18next';
import { useDoubleTap } from '../../hooks/useDoubleTap';
import * as Icons from 'lucide-react-native';

const { width } = Dimensions.get('window');

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

function CarouselCard({ status, index, onDoubleTap }: { status: BudgetStatus; index: number; onDoubleTap: (id: string) => void }) {
  const { t } = useTranslation();
  const handleDoubleTap = useDoubleTap(() => onDoubleTap(status.category.id));
  const baseColor = status.category.color || GRADIENTS[index % GRADIENTS.length][0];
  const colors = [baseColor, baseColor] as const;
  
  const remaining = status.todayRemaining;
  const isOverBudget = remaining < 0;
  const fillColors = isOverBudget ? ['#ef4444', '#b91c1c'] as const : colors;
  
  // Normal: 100% -> 0% down. Overbudget: 0% -> 100% up in red.
  let fillPercentage = isOverBudget 
    ? Math.min(100, (Math.abs(remaining) / status.dailyBudget) * 100) || 0
    : Math.max(0, Math.min(100, (remaining / status.dailyBudget) * 100)) || 0;
  
  const targetHeight = (fillPercentage / 100) * 450;
  const fillHeight = useSharedValue(0);

  React.useEffect(() => { fillHeight.value = withTiming(targetHeight, { duration: 1500 }); }, [targetHeight]);
  const animatedStyle = useAnimatedStyle(() => ({ height: fillHeight.value }));
  
  const cardWidth = width - 48;

  return (
    <Pressable onPress={handleDoubleTap} style={{ width: cardWidth }} className="mr-6">
      <View className="w-full h-[450px] bg-white dark:bg-slate-800 rounded-[60px] shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden items-center justify-center">
        <View className="absolute inset-0 bg-slate-50 dark:bg-slate-700" />
        <Animated.View style={[{ position: 'absolute', bottom: 0, left: 0, right: 0, overflow: 'hidden' }, animatedStyle]}>
          <LinearGradient colors={fillColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: 450 }} />
        </Animated.View>
        <View className="absolute inset-0 items-center justify-center bg-white/50 dark:bg-slate-800/50 p-6 pointer-events-none">
          <View className="w-24 h-24 rounded-full bg-white dark:bg-slate-800 items-center justify-center shadow-lg border border-slate-100 dark:border-slate-700 mb-6">
            {renderIcon(status.category.icon, status.category.color || '#4f46e5', 48)}
          </View>
          <Text className="text-slate-900 dark:text-slate-100 font-extrabold text-2xl uppercase tracking-widest text-center">{status.category.name}</Text>
          <Text className={`${isOverBudget ? 'text-red-600' : 'text-slate-900 dark:text-slate-100'} font-black text-6xl mt-4`}>{isOverBudget ? '-' : ''}${Math.abs(remaining).toFixed(0)}</Text>
          <Text className={`${isOverBudget ? 'text-red-500' : 'text-slate-800 dark:text-slate-200'} font-bold text-base mt-2 text-center`}>{isOverBudget ? t('dashboard.overspent') : t('dashboard.remainingToday', 'Daily Glass')}</Text>
          <View className="mt-8 bg-white/80 dark:bg-slate-800/80 px-6 py-3 rounded-full flex-row items-center">
            <Text className="text-slate-500 dark:text-slate-400 font-bold mr-2 uppercase text-xs tracking-wider">{t('dashboard.spentToday')}</Text>
            <Text className="text-slate-800 dark:text-slate-200 font-black text-lg">${status.spentToday.toFixed(0)}</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

export default function CarouselLayout({ budgetStatuses, onAddExpense, masterVaultValue }: { budgetStatuses: BudgetStatus[], onAddExpense: (id: string) => void, masterVaultValue: number }) {
  const { t } = useTranslation();
  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const currentDay = now.getDate();
  const monthProgressPct = ((currentDay - 1) / daysInMonth) * 100;
  
  const totalSpentThisMonth = budgetStatuses.reduce((sum, s) => sum + s.spentThisMonth, 0);
  const totalExpectedMonthlyBudget = budgetStatuses.reduce((sum, s) => sum + s.expectedMonthlyBudget, 0);
  const spentPct = totalExpectedMonthlyBudget > 0 ? (totalSpentThisMonth / totalExpectedMonthlyBudget) * 100 : 0;

  return (
    <View className="flex-1">
      <View className="px-6 pt-16 pb-8 bg-indigo-600 rounded-b-[40px] shadow-lg mb-8">
        <Text className="text-indigo-200 font-bold text-sm uppercase tracking-widest mb-1">{t('dashboard.masterVault', 'Master Vault')}</Text>
        <Text className="text-5xl font-extrabold text-white tracking-tight">${masterVaultValue.toFixed(0)}</Text>
        <View className="mt-8 flex-row justify-end items-end">
          <View className="flex-1 ml-8">
             <View className="flex-row justify-between mb-1">
               <Text className="text-indigo-200 font-bold text-[10px] uppercase">{t('dashboard.monthlySpent', 'Spent')}: {spentPct.toFixed(0)}%</Text>
               <Text className="text-indigo-200 font-bold text-[10px] uppercase text-right">Time: {monthProgressPct.toFixed(0)}%</Text>
             </View>
             <View className="w-full h-2 bg-indigo-800/50 rounded-full mt-1 relative">
                <View className="h-full bg-white rounded-full" style={{ width: `${Math.min(100, spentPct)}%` }} />
                <View className="absolute top-0 bottom-0 w-1 bg-red-500 shadow-sm" style={{ left: `${Math.max(1, Math.min(99, monthProgressPct))}%`, marginLeft: -2 }} />
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
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          contentContainerStyle={{ paddingHorizontal: 24 }}
          snapToInterval={width - 24} // card width (width-48) + mr-6 (24)
          decelerationRate="fast"
        >
          {budgetStatuses.map((status, index) => (
            <CarouselCard key={status.category.id} status={status} index={index} onDoubleTap={onAddExpense} />
          ))}
        </ScrollView>
      )}
    </View>
  );
}
