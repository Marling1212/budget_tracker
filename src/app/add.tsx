import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { format } from 'date-fns';
import { useBudget } from '../hooks/useBudget';
import { supabase } from '../lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';

export default function AddTransactionScreen() {
  const router = useRouter();
  const { categories, refreshData } = useBudget();
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSave = async () => {
    if (!amount || isNaN(Number(amount))) {
      const msg = 'Please enter a valid amount';
      if (Platform.OS === 'web') window.alert(msg);
      return;
    }
    if (!selectedCategoryId) {
      const msg = 'Please select a category';
      if (Platform.OS === 'web') window.alert(msg);
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
      
      // Reset form
      setAmount('');
      setNote('');
      setSelectedCategoryId(null);
      
      router.navigate('/'); // go back to dashboard
    } catch (err: any) {
      const msg = err.message || JSON.stringify(err);
      if (Platform.OS === 'web') window.alert('Error: ' + msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-[#F8FAFC]"
    >
      <ScrollView className="flex-1 p-5" keyboardShouldPersistTaps="handled">
        
        <View className="mb-8 mt-2">
          <Text className="text-4xl font-extrabold text-slate-800 tracking-tight">Add Expense</Text>
          <Text className="text-slate-500 font-medium mt-1 text-base">Keep track of your spending</Text>
        </View>

        <View className="bg-white rounded-[32px] p-6 shadow-sm border border-slate-100 mb-8">
          <Text className="text-slate-500 font-bold mb-2 text-sm uppercase tracking-wider">Amount</Text>
          <View className="flex-row items-center border-b-2 border-slate-100 pb-2 mb-8">
            <Text className="text-4xl font-black text-slate-800 mr-2">$</Text>
            <TextInput
              className="flex-1 text-4xl font-black text-slate-800"
              placeholder="0.00"
              placeholderTextColor="#cbd5e1"
              keyboardType="decimal-pad"
              value={amount}
              onChangeText={setAmount}
            />
          </View>

          <Text className="text-slate-500 font-bold mb-4 text-sm uppercase tracking-wider">Category</Text>
          <View className="flex-row flex-wrap mb-6">
            {categories.map((cat) => {
              const isSelected = selectedCategoryId === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  onPress={() => setSelectedCategoryId(cat.id)}
                  className={`mr-3 mb-3 px-5 py-3 rounded-2xl border-2 ${
                    isSelected 
                      ? 'border-indigo-500 bg-indigo-50' 
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  <Text className={`${isSelected ? 'text-indigo-600 font-bold' : 'text-slate-600 font-medium'}`}>
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
            {categories.length === 0 && (
              <Text className="text-slate-400 italic">No categories available. Please add one in settings.</Text>
            )}
          </View>

          <Text className="text-slate-500 font-bold mb-3 text-sm uppercase tracking-wider">Note (Optional)</Text>
          <TextInput
            className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-slate-800 font-medium text-base mb-2"
            placeholder="What was this for?"
            placeholderTextColor="#94a3b8"
            value={note}
            onChangeText={setNote}
          />
        </View>

        <TouchableOpacity
          onPress={handleSave}
          disabled={isSubmitting}
          className="shadow-md shadow-indigo-200 mb-10"
        >
          <LinearGradient
            colors={isSubmitting ? ['#94a3b8', '#cbd5e1'] : ['#4f46e5', '#6366f1']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            className="rounded-2xl py-4 items-center"
          >
            {isSubmitting ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text className="text-white font-extrabold text-lg tracking-wide">Save Expense</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}
