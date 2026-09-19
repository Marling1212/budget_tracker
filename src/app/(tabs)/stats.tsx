import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useBudget } from '../../hooks/useBudget';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { format, subMonths, addMonths } from 'date-fns';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withDelay } from 'react-native-reanimated';
import React, { useEffect } from 'react';
import * as Icons from 'lucide-react-native';
import { PieChart, BarChart } from 'react-native-gifted-charts';

const renderIcon = (name: string, color: string, size: number) => {
  const IconComponent = (Icons as any)[name || 'Tag'] || Icons.Tag;
  return <IconComponent color={color} size={size} />;
};

const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

const getCategoryColor = (color: string | undefined | null, index: number) => {
  const defaultBlues = ['#4f46e5', '#6366f1'];
  if (color && color.trim() !== '' && !defaultBlues.includes(color.toLowerCase())) {
    return color;
  }
  return PIE_COLORS[index % PIE_COLORS.length];
};

function ProgressBar({ percentage, color, expectedPercentage }: { percentage: number, color: readonly [string, string, ...string[]], expectedPercentage?: number }) {
  const width = useSharedValue(0);

  useEffect(() => {
    width.value = withDelay(300, withTiming(percentage, { duration: 1000 }));
  }, [percentage]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: `${width.value}%`,
  }));

  return (
    <View className="h-4 w-full bg-slate-200 rounded-full overflow-hidden relative">
      <Animated.View style={[{ height: '100%', borderRadius: 9999 }, animatedStyle]}>
        <LinearGradient
          colors={color}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ width: '100%', height: '100%' }}
        />
      </Animated.View>
      {expectedPercentage !== undefined && (
        <View 
          className="absolute top-0 bottom-0 w-1 bg-slate-800 z-10"
          style={{ left: `${expectedPercentage}%`, marginLeft: -2 }}
        />
      )}
    </View>
  );
}

export default function StatsScreen() {
  const { budgetStatuses, sixMonthStats, loading, currentMonth, setCurrentMonth } = useBudget();
  const router = useRouter();

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50 dark:bg-slate-900">
        <ActivityIndicator size="large" color="#0ea5e9" />
      </View>
    );
  }

  const totalExpected = budgetStatuses.reduce((sum, s) => sum + s.expectedMonthlyBudget, 0);
  const totalSpent = budgetStatuses.reduce((sum, s) => sum + s.spentThisMonth, 0);
  
  const totalPercentage = totalExpected > 0 ? Math.min(100, (totalSpent / totalExpected) * 100) : 0;
  const isOverTotal = totalSpent > totalExpected;

  const firstStatus = budgetStatuses[0];
  const timePercentage = firstStatus ? (firstStatus.currentDayOfMonth / firstStatus.daysInMonth) * 100 : 0;

  const pieData = budgetStatuses
    .map((status, index) => ({
      status,
      index
    }))
    .filter(item => item.status.spentThisMonth > 0)
    .map(item => ({
      value: item.status.spentThisMonth,
      color: getCategoryColor(item.status.category.color, item.index),
      text: item.status.category.name,
    }));

  const barData = (sixMonthStats || []).map(stat => ({
    value: stat.value,
    label: stat.label,
    frontColor: '#3b82f6',
  }));

  return (
    <ScrollView className="flex-1 bg-slate-50 dark:bg-slate-900" contentContainerStyle={{ padding: 20 }}>
      {/* Header */}
      <View className="flex-row items-center justify-between mb-8 mt-2">
        <View className="flex-row items-center">
          <TouchableOpacity 
            onPress={() => router.back()}
            className="bg-white dark:bg-slate-800 p-3 rounded-full shadow-sm border border-slate-100 dark:border-slate-700 mr-4"
          >
            <ChevronLeft color="#334155" size={24} />
          </TouchableOpacity>
          <View>
            <Text className="text-3xl font-extrabold text-slate-800 dark:text-slate-200 tracking-tight">Analysis</Text>
            <Text className="text-slate-500 dark:text-slate-400 dark:text-slate-500 font-medium text-sm">Monthly Overview</Text>
          </View>
        </View>
        <View className="flex-row items-center bg-white dark:bg-slate-800 rounded-full px-2 py-1.5 border border-slate-200 dark:border-slate-700 shadow-sm">
          <TouchableOpacity onPress={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-1">
            <ChevronLeft color="#64748b" size={16} />
          </TouchableOpacity>
          <Text className="text-slate-800 dark:text-slate-200 font-bold mx-1 text-xs">{format(currentMonth, 'MMM yy')}</Text>
          <TouchableOpacity onPress={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-1">
            <ChevronRight color="#64748b" size={16} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Main KPI Card */}
      <View className="bg-white dark:bg-slate-800 rounded-[32px] p-6 mb-8 shadow-sm border border-slate-100 dark:border-slate-700">
        <Text className="text-slate-500 dark:text-slate-400 dark:text-slate-500 font-bold text-xs uppercase tracking-wider mb-2 text-center">
          Total Spent This Month
        </Text>
        <Text className="text-slate-900 dark:text-slate-100 font-black text-5xl text-center mb-1">
          ${totalSpent.toFixed(0)}
        </Text>
        <Text className="text-slate-400 dark:text-slate-500 dark:text-slate-400 font-medium text-sm text-center mb-6">
          of ${totalExpected.toFixed(0)} expected
        </Text>

        <ProgressBar 
          percentage={totalPercentage} 
          color={isOverTotal ? ['#ef4444', '#b91c1c'] as const : ['#3b82f6', '#8b5cf6'] as const} 
          expectedPercentage={timePercentage}
        />
        
        <View className="flex-row justify-between mt-3">
          <Text className="text-slate-500 dark:text-slate-400 dark:text-slate-500 font-bold text-xs">0%</Text>
          <Text className={`font-bold text-xs ${isOverTotal ? 'text-red-500' : 'text-slate-500 dark:text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500'}`}>
            {totalPercentage.toFixed(1)}%
          </Text>
        </View>
      </View>

      {/* 6-Month Trend */}
      {barData.length > 0 && (
        <View className="bg-white dark:bg-slate-800 rounded-[32px] p-6 mb-8 shadow-sm border border-slate-100 dark:border-slate-700 items-center">
          <Text className="text-xl font-extrabold text-slate-800 dark:text-slate-200 mb-6 tracking-tight self-start">6-Month Trend</Text>
          <View style={{ marginLeft: -10 }}>
            <BarChart
              data={barData}
              barWidth={28}
              spacing={20}
              roundedTop
              roundedBottom
              hideRules
              xAxisThickness={0}
              yAxisThickness={0}
              yAxisTextStyle={{color: '#94a3b8'}}
              xAxisLabelTextStyle={{color: '#94a3b8', fontSize: 11}}
              noOfSections={4}
              maxValue={Math.max(...barData.map(d => d.value), 1000)}
              initialSpacing={10}
            />
          </View>
        </View>
      )}

      {/* Category Breakdown Pie Chart */}
      {pieData.length > 0 && (
        <View className="bg-white dark:bg-slate-800 rounded-[32px] p-6 mb-8 shadow-sm border border-slate-100 dark:border-slate-700 items-center">
          <Text className="text-xl font-extrabold text-slate-800 dark:text-slate-200 mb-6 tracking-tight self-start">Spending Proportion</Text>
          <PieChart
            donut
            innerRadius={60}
            radius={90}
            data={pieData}
            centerLabelComponent={() => {
              return (
                <View className="justify-center items-center">
                  <Text className="text-slate-900 dark:text-slate-100 font-bold text-2xl">${totalSpent.toFixed(0)}</Text>
                  <Text className="text-slate-500 text-xs">Total</Text>
                </View>
              );
            }}
          />
          <View className="flex-row flex-wrap justify-center mt-8 w-full px-2">
            {pieData.map((item, index) => (
              <View key={index} className="flex-row items-center mx-3 mb-3">
                <View style={{ backgroundColor: item.color }} className="w-3 h-3 rounded-full mr-2 shadow-sm" />
                <Text className="text-slate-600 dark:text-slate-400 text-xs font-bold">{item.text}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Category Breakdown */}
      <Text className="text-xl font-extrabold text-slate-800 dark:text-slate-200 mb-4 tracking-tight">Category Breakdown</Text>
      
      {budgetStatuses.map((status, index) => {
        const catPercentage = status.expectedMonthlyBudget > 0 
          ? Math.min(100, (status.spentThisMonth / status.expectedMonthlyBudget) * 100) 
          : 0;
        const catIsOver = status.spentThisMonth > status.expectedMonthlyBudget;
        
        const baseColor = getCategoryColor(status.category.color, index);
        const color = catIsOver ? ['#ef4444', '#b91c1c'] as const : [baseColor, baseColor] as const;

        return (
          <View key={status.category.id} className="bg-white dark:bg-slate-800 rounded-3xl p-5 mb-4 shadow-sm border border-slate-100 dark:border-slate-700">
            <View className="flex-row justify-between items-center mb-4">
              <View className="flex-row items-center flex-1">
                <View style={{ backgroundColor: `${baseColor}15` }} className="w-10 h-10 rounded-xl items-center justify-center mr-3">
                  {renderIcon(status.category.icon, baseColor, 20)}
                </View>
                <View>
                  <Text className="text-slate-800 dark:text-slate-200 font-extrabold text-lg">{status.category.name}</Text>
                  <Text className="text-slate-400 dark:text-slate-500 dark:text-slate-400 font-medium text-xs mt-0.5">
                    ${status.spentThisMonth.toFixed(0)} / ${status.expectedMonthlyBudget.toFixed(0)}
                  </Text>
                </View>
              </View>
              <Text className={`font-bold text-sm ${catIsOver ? 'text-red-500' : 'text-slate-600 dark:text-slate-300'}`}>
                {catPercentage.toFixed(0)}%
              </Text>
            </View>
            <ProgressBar percentage={catPercentage} color={color} expectedPercentage={timePercentage} />
          </View>
        );
      })}
      
      <View className="h-24" />
    </ScrollView>
  );
}
