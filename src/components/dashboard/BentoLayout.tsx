import React from 'react';
import { View, Text, ScrollView, Dimensions, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { BudgetStatus } from '../../../types/database';
import { useTranslation } from 'react-i18next';
import { useDoubleTap } from '../../hooks/useDoubleTap';
import * as Icons from 'lucide-react-native';
import LiquidAntigravityGlass from '../animations/LiquidAntigravityGlass';

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

function CategoryCard({ status, index, onDoubleTap }: { status: BudgetStatus; index: number; onDoubleTap: (id: string) => void }) {
  const { t } = useTranslation();
  const handleDoubleTap = useDoubleTap(() => onDoubleTap(status.category.id));
  
  const remaining = status.todayRemaining;
  const isOverBudget = remaining < 0;
  const cardWidth = (Dimensions.get('window').width - 48 - 16) / 2;
  const cardHeight = 220;

  return (
    <Pressable style={{ width: '48%' }} className="h-[220px] mb-4" onPress={handleDoubleTap}>
      <View className="w-full h-full rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
        <LiquidAntigravityGlass
          width={cardWidth}
          height={cardHeight}
          dailyQuota={status.dailyBudget}
          remainingToday={remaining}
        >
          <View className="absolute inset-0 items-center justify-center p-2 pointer-events-none">
            {renderIcon(status.category.icon, status.category.color || '#4f46e5', 40)}
            <Text className="text-white font-extrabold text-sm uppercase tracking-wider text-center mt-2">{status.category.name}</Text>
            <Text className={`${isOverBudget ? 'text-red-300' : 'text-white'} font-black text-2xl mt-1`}>{isOverBudget ? '-' : ''}${Math.abs(remaining).toFixed(0)}</Text>
            <Text className={`${isOverBudget ? 'text-red-200' : 'text-slate-100'} font-bold text-xs mt-1 text-center`}>{isOverBudget ? t('dashboard.overspent') : t('dashboard.remainingToday', 'Daily Glass')}</Text>
          </View>
        </LiquidAntigravityGlass>
      </View>
    </Pressable>
  );
}

export default function BentoLayout({ budgetStatuses, onAddExpense, masterVaultValue }: { budgetStatuses: BudgetStatus[], onAddExpense: (id: string) => void, masterVaultValue: number }) {
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
      {budgetStatuses.length === 0 ? (
        <View className="px-6">
          <View className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-sm items-center border border-slate-100 dark:border-slate-700">
            <Text className="text-slate-800 dark:text-slate-200 text-center text-lg font-bold mb-2">{t('dashboard.noCategories')}</Text>
            <Text className="text-slate-600 dark:text-slate-300 text-center">{t('dashboard.noCategoriesDesc')}</Text>
          </View>
        </View>
      ) : (
        <View className="px-6 flex-row flex-wrap justify-between">
          {budgetStatuses.map((status, index) => (
            <CategoryCard key={status.category.id} status={status} index={index} onDoubleTap={onAddExpense} />
          ))}
        </View>
      )}
    </ScrollView>
  );
}
