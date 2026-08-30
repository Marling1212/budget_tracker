import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useBudget } from '../../hooks/useBudget';
import { ChevronLeft } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withDelay } from 'react-native-reanimated';
import React, { useEffect } from 'react';

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
  const { budgetStatuses, loading } = useBudget();
  const router = useRouter();

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-[#F8FAFC]">
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

  return (
    <ScrollView className="flex-1 bg-[#F8FAFC]" contentContainerStyle={{ padding: 20 }}>
      {/* Header */}
      <View className="flex-row items-center mb-8 mt-2">
        <TouchableOpacity 
          onPress={() => router.back()}
          className="bg-white p-3 rounded-full shadow-sm border border-slate-100 mr-4"
        >
          <ChevronLeft color="#334155" size={24} />
        </TouchableOpacity>
        <View>
          <Text className="text-3xl font-extrabold text-slate-800 tracking-tight">Analysis</Text>
          <Text className="text-slate-500 font-medium text-sm">Monthly Overview</Text>
        </View>
      </View>

      {/* Main KPI Card */}
      <View className="bg-white rounded-[32px] p-6 mb-8 shadow-sm border border-slate-100">
        <Text className="text-slate-500 font-bold text-xs uppercase tracking-wider mb-2 text-center">
          Total Spent This Month
        </Text>
        <Text className="text-slate-900 font-black text-5xl text-center mb-1">
          ${totalSpent.toFixed(0)}
        </Text>
        <Text className="text-slate-400 font-medium text-sm text-center mb-6">
          of ${totalExpected.toFixed(0)} expected
        </Text>

        <ProgressBar 
          percentage={totalPercentage} 
          color={isOverTotal ? ['#ef4444', '#b91c1c'] as const : ['#3b82f6', '#8b5cf6'] as const} 
          expectedPercentage={timePercentage}
        />
        
        <View className="flex-row justify-between mt-3">
          <Text className="text-slate-500 font-bold text-xs">0%</Text>
          <Text className={`font-bold text-xs ${isOverTotal ? 'text-red-500' : 'text-slate-500'}`}>
            {totalPercentage.toFixed(1)}%
          </Text>
        </View>
      </View>

      {/* Category Breakdown */}
      <Text className="text-xl font-extrabold text-slate-800 mb-4 tracking-tight">Category Breakdown</Text>
      
      {budgetStatuses.map((status, index) => {
        const catPercentage = status.expectedMonthlyBudget > 0 
          ? Math.min(100, (status.spentThisMonth / status.expectedMonthlyBudget) * 100) 
          : 0;
        const catIsOver = status.spentThisMonth > status.expectedMonthlyBudget;
        
        const GRADIENTS = [
          ['#ec4899', '#f43f5e'], // Pink to Rose
          ['#10b981', '#059669'], // Emerald
          ['#f59e0b', '#d97706'], // Amber
          ['#6366f1', '#4f46e5'], // Indigo
        ] as const;
        const color = catIsOver ? ['#ef4444', '#b91c1c'] as const : GRADIENTS[index % GRADIENTS.length];

        return (
          <View key={status.category.id} className="bg-white rounded-3xl p-5 mb-4 shadow-sm border border-slate-100">
            <View className="flex-row justify-between items-end mb-3">
              <View>
                <Text className="text-slate-800 font-extrabold text-lg">{status.category.name}</Text>
                <Text className="text-slate-400 font-medium text-xs mt-0.5">
                  ${status.spentThisMonth.toFixed(0)} / ${status.expectedMonthlyBudget.toFixed(0)}
                </Text>
              </View>
              <Text className={`font-bold text-sm ${catIsOver ? 'text-red-500' : 'text-slate-600'}`}>
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
