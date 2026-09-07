import React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
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
  
  const remaining = status.todayRemaining;
  const isOverBudget = remaining < 0;
  const fillColors = isOverBudget ? ['#ef4444', '#b91c1c'] as const : colors;
  
  // Normal: 100% -> 0% down. Overbudget: 0% -> 100% up in red.
  let fillPercentage = isOverBudget 
    ? Math.min(100, (Math.abs(remaining) / status.dailyBudget) * 100) || 0
    : Math.max(0, Math.min(100, (remaining / status.dailyBudget) * 100)) || 0;
  
  const targetWidth = `${fillPercentage}%`;
  
  return (
    <Pressable onPress={handleDoubleTap} className="bg-white dark:bg-slate-800 rounded-3xl p-4 mb-4 shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
      <View className="absolute inset-0 bg-slate-50 dark:bg-slate-700/50" />
      <View className="absolute left-0 bottom-0 top-0 opacity-20" style={{ width: targetWidth }}>
         <LinearGradient colors={fillColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: '100%', height: '100%' }} />
      </View>
      <View className="absolute left-0 bottom-0 top-0 opacity-100 items-end justify-center" style={{ width: targetWidth }}>
        <View className="w-1 h-8 rounded-full mr-1 opacity-50" style={{ backgroundColor: fillColors[0] }} />
      </View>
      
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center flex-1">
          <View className="w-12 h-12 rounded-2xl items-center justify-center bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700">
            {renderIcon(status.category.icon, status.category.color || '#4f46e5', 24)}
          </View>
          <View className="ml-4 flex-1">
            <Text className="text-slate-900 dark:text-slate-100 font-extrabold text-base">{status.category.name}</Text>
            <Text className="text-slate-500 dark:text-slate-400 font-medium text-xs mt-0.5">{status.spentToday.toFixed(0)} {t('dashboard.spentToday')}</Text>
          </View>
        </View>
        
        <View className="items-end">
          <Text className={`${isOverBudget ? 'text-red-600' : 'text-slate-900 dark:text-slate-100'} font-black text-xl`}>{isOverBudget ? '-' : ''}${Math.abs(remaining).toFixed(0)}</Text>
          <Text className={`${isOverBudget ? 'text-red-500' : 'text-slate-500 dark:text-slate-400'} font-bold text-xs mt-0.5`}>{isOverBudget ? t('dashboard.overspent') : t('dashboard.remainingToday', 'Daily Glass')}</Text>
        </View>
      </View>
    </Pressable>
  );
}

export default function ListLayout({ budgetStatuses, onAddExpense, masterVaultValue }: { budgetStatuses: BudgetStatus[], onAddExpense: (id: string) => void, masterVaultValue: number }) {
  const { t } = useTranslation();
  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const currentDay = now.getDate();
  const monthProgressPct = ((currentDay - 1) / daysInMonth) * 100;
  
  const totalSpentThisMonth = budgetStatuses.reduce((sum, s) => sum + s.spentThisMonth, 0);
  const totalExpectedMonthlyBudget = budgetStatuses.reduce((sum, s) => sum + s.expectedMonthlyBudget, 0);
  const spentPct = totalExpectedMonthlyBudget > 0 ? (totalSpentThisMonth / totalExpectedMonthlyBudget) * 100 : 0;

  return (
    <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
      <View className="px-6 pt-16 pb-8 bg-indigo-600 rounded-b-[40px] shadow-lg mb-6">
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
