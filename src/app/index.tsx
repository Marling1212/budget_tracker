import { View, Text, ScrollView, ActivityIndicator, Dimensions } from 'react-native';
import { useBudget } from '../hooks/useBudget';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

export default function DashboardScreen() {
  const { budgetStatuses, loading, error } = useBudget();

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-[#F8FAFC]">
        <ActivityIndicator size="large" color="#0ea5e9" />
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center bg-[#F8FAFC] p-4">
        <Text className="text-red-500 text-center font-medium">Failed to load data: {error.message || JSON.stringify(error)}</Text>
      </View>
    );
  }

  if (budgetStatuses.length === 0) {
    return (
      <View className="flex-1 items-center justify-center bg-[#F8FAFC] p-4">
        <View className="bg-white p-8 rounded-3xl shadow-sm items-center border border-slate-100">
          <Text className="text-slate-400 text-center text-lg font-bold mb-2">No categories yet</Text>
          <Text className="text-slate-400 text-center">Head over to Settings to create your first budget category!</Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-[#F8FAFC]" contentContainerStyle={{ padding: 20 }}>
      <View className="mb-6 mt-4">
        <Text className="text-4xl font-extrabold text-slate-800 tracking-tight">Overview</Text>
        <Text className="text-slate-500 font-medium mt-1 text-base">Your daily quotas at a glance</Text>
      </View>
      
      {budgetStatuses.map((status, index) => {
        const isOverBudget = status.remaining < 0;
        const progressPercentage = Math.min(100, Math.max(0, (status.spentThisMonth / status.accumulatedLimit) * 100)) || 0;
        
        // Pick a gradient based on the index to make it colorful
        const gradients = [
          ['#3b82f6', '#8b5cf6'], // Blue to Purple
          ['#ec4899', '#f43f5e'], // Pink to Rose
          ['#10b981', '#059669'], // Emerald
          ['#f59e0b', '#d97706'], // Amber
          ['#6366f1', '#4f46e5'], // Indigo
        ];
        const colors = gradients[index % gradients.length];

        return (
          <View key={status.category.id} className="mb-5 shadow-sm">
            <LinearGradient
              colors={isOverBudget ? ['#ef4444', '#b91c1c'] : colors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              className="rounded-[32px] p-6"
            >
              <View className="flex-row justify-between items-start mb-6">
                <View>
                  <Text className="text-white/80 font-medium text-sm mb-1 uppercase tracking-wider">
                    {status.category.name}
                  </Text>
                  <Text className="text-white font-extrabold text-3xl">
                    ${Math.abs(status.remaining).toFixed(2)}
                  </Text>
                  <Text className="text-white/90 font-medium mt-1">
                    {isOverBudget ? 'over budget' : 'remaining today'}
                  </Text>
                </View>
                <View className="bg-white/20 px-3 py-1.5 rounded-xl backdrop-blur-md">
                  <Text className="text-white font-bold">${status.expectedMonthlyBudget.toFixed(0)}/mo</Text>
                </View>
              </View>
              
              <View className="h-3 w-full bg-black/20 rounded-full overflow-hidden mb-3">
                <View 
                  className="h-full rounded-full bg-white shadow-sm"
                  style={{ width: `${progressPercentage}%` }}
                />
              </View>
              
              <View className="flex-row justify-between">
                <Text className="text-white/80 font-medium text-xs">
                  Spent: ${status.spentThisMonth.toFixed(2)}
                </Text>
                <Text className="text-white/80 font-medium text-xs">
                  Limit: ${status.accumulatedLimit.toFixed(2)}
                </Text>
              </View>
            </LinearGradient>
          </View>
        );
      })}
      
      <View className="h-24" />
    </ScrollView>
  );
}
