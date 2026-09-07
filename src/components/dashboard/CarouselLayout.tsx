import React from 'react';
import { View, Text, Pressable, ScrollView, Dimensions } from 'react-native';
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
  
  const remaining = status.expectedMonthlyBudget - status.spentThisMonth;
  const isOverBudget = remaining < 0;
  const fillColors = isOverBudget ? ['#ef4444', '#b91c1c'] as const : colors;
  const fillPercentage = Math.max(0, Math.min(100, (remaining / status.expectedMonthlyBudget) * 100)) || 0;
  
  const targetHeight = (fillPercentage / 100) * 450;
  const fillHeight = useSharedValue(0);

  React.useEffect(() => { fillHeight.value = withTiming(targetHeight, { duration: 1500 }); }, [targetHeight]);
  const animatedStyle = useAnimatedStyle(() => ({ height: fillHeight.value }));

  // Subtract padding from screen width to get card width
  const cardWidth = width - 48;

  return (
    <Pressable onPress={handleDoubleTap} style={{ width: cardWidth }} className="mr-6">
      <View className="w-full h-[450px] bg-white dark:bg-slate-800 rounded-[60px] shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden items-center justify-center">
        <View className="absolute inset-0 bg-slate-50 dark:bg-slate-700" />
        <Animated.View style={[{ position: 'absolute', bottom: 0, left: 0, right: 0, overflow: 'hidden' }, animatedStyle]}>
          <LinearGradient colors={fillColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: 450 }} />
        </Animated.View>
        <View className="absolute inset-0 items-center justify-center bg-white/50 dark:bg-slate-800/50 p-6">
          {renderIcon(status.category.icon, status.category.color || '#4f46e5', 80)}
          <Text className="text-slate-900 dark:text-slate-100 font-extrabold text-2xl uppercase tracking-wider text-center mt-6">{status.category.name}</Text>
          <Text className={`${isOverBudget ? 'text-red-600' : 'text-slate-900 dark:text-slate-100'} font-black text-6xl mt-4`}>{isOverBudget ? '-' : ''}${Math.abs(remaining).toFixed(0)}</Text>
          <Text className={`${isOverBudget ? 'text-red-500' : 'text-slate-800 dark:text-slate-200'} font-bold text-lg mt-2 text-center`}>{isOverBudget ? t('dashboard.overspent') : t('dashboard.remainingMonthly')}</Text>
          
          {status.category.is_accumulative && (
             <View className="mt-8 bg-white/80 dark:bg-slate-900/80 p-4 rounded-3xl w-full flex-row justify-between">
                <View className="items-center">
                   <Text className="text-slate-500 font-bold text-xs">DAILY</Text>
                   <Text className="text-slate-900 dark:text-white font-bold text-lg">${status.todayRemaining.toFixed(0)}</Text>
                </View>
                <View className="items-center">
                   <Text className="text-slate-500 font-bold text-xs">VAULT</Text>
                   <Text className="text-slate-900 dark:text-white font-bold text-lg">${status.totalSaved.toFixed(0)}</Text>
                </View>
             </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}

export default function CarouselLayout({ budgetStatuses, onAddExpense, netWorth, totalRemainingToday }: { budgetStatuses: BudgetStatus[], onAddExpense: (id: string) => void, netWorth: number, totalRemainingToday: number }) {
  const { t } = useTranslation();
  
  return (
    <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
      <View className="px-6 pt-16 pb-8 bg-indigo-600 rounded-b-[40px] shadow-lg mb-8">
        <Text className="text-indigo-200 font-bold text-sm uppercase tracking-widest mb-1">{t('dashboard.netWorth')}</Text>
        <Text className="text-5xl font-extrabold text-white tracking-tight">${netWorth.toFixed(0)}</Text>
        <View className="mt-8 flex-row justify-between items-end">
          <View>
            <Text className="text-indigo-200 font-bold text-xs uppercase mb-1">{t('dashboard.remainingToday')}</Text>
            <Text className="text-3xl font-black text-white">${totalRemainingToday.toFixed(0)}</Text>
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
    </ScrollView>
  );
}
