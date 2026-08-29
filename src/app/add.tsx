import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { format } from 'date-fns';
import { useBudget } from '../hooks/useBudget';
import { supabase } from '../lib/supabase';

export default function AddTransactionScreen() {
  const router = useRouter();
  const { categories, refreshData } = useBudget();
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSave = async () => {
    if (!amount || isNaN(Number(amount))) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }
    if (!selectedCategoryId) {
      Alert.alert('Error', 'Please select a category');
      return;
    }

    setIsSubmitting(true);
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      
      const { error } = await supabase
        .from('transactions')
        .insert({
          category_id: selectedCategoryId,
          amount: Number(amount),
          date: today,
          note: note || null,
        });

      if (error) throw error;
      
      await refreshData();
      router.navigate('/'); // go back to dashboard
      
      // Reset form
      setAmount('');
      setNote('');
      setSelectedCategoryId(null);
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-gray-50"
    >
      <ScrollView className="flex-1 p-4" keyboardShouldPersistTaps="handled">
        
        <View className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <Text className="text-gray-700 font-semibold mb-2 text-base">Amount</Text>
          <View className="flex-row items-center border-b border-gray-200 pb-2 mb-6">
            <Text className="text-3xl font-bold text-gray-800 mr-2">$</Text>
            <TextInput
              className="flex-1 text-3xl font-bold text-gray-800"
              placeholder="0.00"
              keyboardType="decimal-pad"
              value={amount}
              onChangeText={setAmount}
            />
          </View>

          <Text className="text-gray-700 font-semibold mb-3 text-base">Category</Text>
          <View className="flex-row flex-wrap mb-4">
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                onPress={() => setSelectedCategoryId(cat.id)}
                className={`mr-2 mb-2 px-4 py-2 rounded-full border ${
                  selectedCategoryId === cat.id 
                    ? 'bg-sky-500 border-sky-500' 
                    : 'bg-white border-gray-300'
                }`}
              >
                <Text className={`${selectedCategoryId === cat.id ? 'text-white' : 'text-gray-600'} font-medium`}>
                  {cat.name}
                </Text>
              </TouchableOpacity>
            ))}
            {categories.length === 0 && (
              <Text className="text-gray-400 italic">No categories available. Please add one in settings.</Text>
            )}
          </View>

          <Text className="text-gray-700 font-semibold mb-2 text-base">Note (Optional)</Text>
          <TextInput
            className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-gray-800 mb-6"
            placeholder="What was this for?"
            value={note}
            onChangeText={setNote}
          />

          <TouchableOpacity
            onPress={handleSave}
            disabled={isSubmitting}
            className={`rounded-xl py-4 items-center ${isSubmitting ? 'bg-sky-300' : 'bg-sky-500'}`}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text className="text-white font-bold text-lg">Save Expense</Text>
            )}
          </TouchableOpacity>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}
