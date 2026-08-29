import { View, Text, ScrollView, ActivityIndicator } from 'react-native';
import { useBudget } from '../hooks/useBudget';

export default function DashboardScreen() {
  const { budgetStatuses, loading, error } = useBudget();

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color="#0ea5e9" />
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 p-4">
        <Text className="text-red-500 text-center">Failed to load data: {error.message}</Text>
      </View>
    );
  }

  if (budgetStatuses.length === 0) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 p-4">
        <Text className="text-gray-500 text-center text-lg">No categories found.</Text>
        <Text className="text-gray-400 text-center mt-2">Go to Settings to add a category.</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-gray-50 p-4">
      <Text className="text-2xl font-bold text-gray-800 mb-6">Today's Quota</Text>
      
      {budgetStatuses.map((status) => {
        const isOverBudget = status.remaining < 0;
        const progressPercentage = Math.min(100, Math.max(0, (status.spentThisMonth / status.accumulatedLimit) * 100)) || 0;

        return (
          <View key={status.category.id} className="bg-white rounded-2xl p-5 mb-4 shadow-sm border border-gray-100">
            <View className="flex-row justify-between items-center mb-3">
              <Text className="text-lg font-semibold text-gray-800">{status.category.name}</Text>
              <Text className={`text-xl font-bold ${isOverBudget ? 'text-red-500' : 'text-green-500'}`}>
                ${status.remaining.toFixed(2)}
              </Text>
            </View>
            
            <View className="h-3 w-full bg-gray-100 rounded-full overflow-hidden mb-2">
              <View 
                className={`h-full rounded-full ${isOverBudget ? 'bg-red-500' : 'bg-sky-500'}`}
                style={{ width: `${progressPercentage}%` }}
              />
            </View>
            
            <View className="flex-row justify-between">
              <Text className="text-xs text-gray-500">
                Spent: ${status.spentThisMonth.toFixed(2)}
              </Text>
              <Text className="text-xs text-gray-500">
                Limit: ${status.accumulatedLimit.toFixed(2)}
              </Text>
            </View>
          </View>
        );
      })}
      
      <View className="h-20" />
    </ScrollView>
  );
}
