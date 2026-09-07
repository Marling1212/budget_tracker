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

function ListRow({ status, index, onDoubleTap }: { status: BudgetStatus; index: number; onDoubleTap: (id: string) => void }) {
  const { t } = useTranslation();
  const handleDoubleTap = useDoubleTap(() => onDoubleTap(status.category.id));
  const baseColor = status.category.color || GRADIENTS[index % GRADIENTS.length][0];
  const colors = [baseColor, baseColor] as const;
  
  const remaining = status.expectedMonthlyBudget - status.spentThisMonth;
  const isOverBudget = remaining < 0;
  const fillColors = isOverBudget ? ['#ef4444', '#b91c1c'] as const : colors;
  const fillPercentage = Math.max(0, Math.min(100, (remaining / status.expectedMonthlyBudget) * 100)) || 0;
  
  const targetWidth = `${fillPercentage}%`;
  
  return (
    <Pressable onPress={handleDoubleTap} className="bg-white dark:bg-slate-800 rounded-3xl p-4 mb-4 shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
      <View className="absolute inset-0 bg-slate-50 dark:bg-slate-700/50" />
      <View className="absolute left-0 bottom-0 top-0 opacity-20" style={{ width: targetWidth }}>
         <LinearGradient colors={fillColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: '100%', height: '100%' }} />
      </View>
      <View className="flex-row items-center justify-between z-10">
        <View className="flex-row items-center flex-1">
          <View className="bg-white/80 dark:bg-slate-900/50 p-3 rounded-full mr-4">
            {renderIcon(status.category.icon, status.category.color || '#4f46e5', 24)}
          </View>
          <View className="flex-1">
            <Text className="text-slate-900 dark:text-slate-100 font-bold text-lg">{status.category.name}</Text>
            {status.category.is_accumulative ? (
              <Text className="text-slate-500 dark:text-slate-400 text-xs">Daily: ${Math.abs(status.todayRemaining).toFixed(0)} | Vault: ${Math.abs(status.totalSaved).toFixed(0)}</Text>
            ) : (
              <Text className="text-slate-500 dark:text-slate-400 text-xs">{isOverBudget ? t('dashboard.overspent') : t('dashboard.remainingMonthly')}</Text>
            )}
          </View>
        </View>
        <View className="items-end">
          <Text className={`${isOverBudget ? 'text-red-600' : 'text-slate-900 dark:text-slate-100'} font-black text-2xl`}>
            {isOverBudget ? '-' : ''}${Math.abs(remaining).toFixed(0)}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

export default function ListLayout({ budgetStatuses, onAddExpense, netWorth, totalRemainingToday }: { budgetStatuses: BudgetStatus[], onAddExpense: (id: string) => void, netWorth: number, totalRemainingToday: number }) {
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
        </View>
      </View>

      <View className="px-6">
        {budgetStatuses.length === 0 ? (
          <View className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-sm items-center border border-slate-100 dark:border-slate-700">
            <Text className="text-slate-800 dark:text-slate-200 text-center text-lg font-bold mb-2">{t('dashboard.noCategories')}</Text>
            <Text className="text-slate-600 dark:text-slate-300 text-center">{t('dashboard.noCategoriesDesc')}</Text>
          </View>
        ) : (
          budgetStatuses.map((status, index) => (
            <ListRow key={status.category.id} status={status} index={index} onDoubleTap={onAddExpense} />
          ))
        )}
      </View>
    </ScrollView>
  );
}
