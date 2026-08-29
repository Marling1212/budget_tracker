import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Switch, Platform } from 'react-native';
import { useBudget } from '../hooks/useBudget';
import { supabase } from '../lib/supabase';
import { Trash2, Plus } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function SettingsScreen() {
  const { categories, refreshData, loading } = useBudget();
  const [isAdding, setIsAdding] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatBudget, setNewCatBudget] = useState('');
  const [isAccumulative, setIsAccumulative] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const safeAlert = (title: string, message: string) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}: ${message}`);
    } else {
      // @ts-ignore
      import('react-native').then(({ Alert }) => {
        Alert.alert(title, message);
      });
    }
  }

  const handleAddCategory = async () => {
    if (!newCatName.trim() || !newCatBudget || isNaN(Number(newCatBudget))) {
      safeAlert('Error', 'Please enter a valid name and budget');
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase.from('categories').insert({
        name: newCatName.trim(),
        monthly_budget: Number(newCatBudget),
        is_accumulative: isAccumulative,
      });

      if (error) {
        console.error("Supabase insert error:", error);
        throw error;
      }

      await refreshData();
      setNewCatName('');
      setNewCatBudget('');
      setIsAccumulative(true);
      setIsAdding(false);
    } catch (err: any) {
      console.error(err);
      safeAlert('Error', err.message || JSON.stringify(err));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure? This will also delete all related expenses.')) {
        try {
          const { error } = await supabase.from('categories').delete().eq('id', id);
          if (error) throw error;
          await refreshData();
        } catch (err: any) {
          safeAlert('Error', err.message);
        }
      }
    } else {
      import('react-native').then(({ Alert }) => {
        Alert.alert(
          'Delete Category',
          'Are you sure? This will also delete all related expenses.',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Delete', 
              style: 'destructive',
              onPress: async () => {
                try {
                  const { error } = await supabase.from('categories').delete().eq('id', id);
                  if (error) throw error;
                  await refreshData();
                } catch (err: any) {
                  safeAlert('Error', err.message);
                }
              }
            }
          ]
        );
      });
    }
  };

  return (
    <ScrollView className="flex-1 bg-[#F8FAFC]" contentContainerStyle={{ padding: 20 }}>
      
      <View className="mb-8 mt-2">
        <Text className="text-4xl font-extrabold text-slate-800 tracking-tight">Settings</Text>
        <Text className="text-slate-500 font-medium mt-1 text-base">Manage your budget categories</Text>
      </View>

      {/* Add New Category Section */}
      {!isAdding ? (
        <TouchableOpacity 
          onPress={() => setIsAdding(true)}
          className="mb-8 overflow-hidden rounded-3xl"
        >
          <LinearGradient
            colors={['#e0e7ff', '#ede9fe']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            className="p-6 items-center flex-row justify-center border border-indigo-100"
          >
            <View className="bg-indigo-500 rounded-full p-1.5 mr-3">
              <Plus color="#ffffff" size={20} />
            </View>
            <Text className="text-indigo-600 font-extrabold text-lg">Create Category</Text>
          </LinearGradient>
        </TouchableOpacity>
      ) : (
        <View className="bg-white rounded-[32px] p-6 mb-8 shadow-sm border border-slate-100">
          <Text className="text-slate-500 font-bold mb-2 text-sm uppercase tracking-wider">Category Name</Text>
          <TextInput
            className="border-b-2 border-slate-100 py-2 mb-6 text-2xl font-bold text-slate-800"
            placeholder="e.g. Food, Transport"
            placeholderTextColor="#cbd5e1"
            value={newCatName}
            onChangeText={setNewCatName}
          />
          
          <Text className="text-slate-500 font-bold mb-2 text-sm uppercase tracking-wider">Monthly Budget ($)</Text>
          <TextInput
            className="border-b-2 border-slate-100 py-2 mb-8 text-2xl font-bold text-slate-800"
            placeholder="300"
            placeholderTextColor="#cbd5e1"
            keyboardType="decimal-pad"
            value={newCatBudget}
            onChangeText={setNewCatBudget}
          />

          <View className="flex-row items-center justify-between mb-8 bg-slate-50 p-4 rounded-2xl">
            <View className="flex-1 pr-4">
              <Text className="text-slate-800 font-bold text-base mb-1">Accumulative</Text>
              <Text className="text-slate-500 text-xs font-medium">Unspent daily quota rolls over to the next day</Text>
            </View>
            <Switch 
              value={isAccumulative} 
              onValueChange={setIsAccumulative} 
              trackColor={{ false: '#e2e8f0', true: '#4f46e5' }}
              thumbColor="#ffffff"
            />
          </View>

          <View className="flex-row space-x-4">
            <TouchableOpacity 
              onPress={() => setIsAdding(false)}
              className="flex-1 bg-slate-100 py-4 rounded-2xl items-center"
            >
              <Text className="text-slate-600 font-bold text-base">Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              onPress={handleAddCategory}
              disabled={isSaving}
              className="flex-1 overflow-hidden rounded-2xl shadow-sm"
            >
              <LinearGradient
                colors={isSaving ? ['#94a3b8', '#cbd5e1'] : ['#4f46e5', '#6366f1']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                className="py-4 items-center"
              >
                {isSaving ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Text className="text-white font-bold text-base">Save</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Existing Categories List */}
      <Text className="text-xl font-extrabold text-slate-800 mb-4 tracking-tight">Your Categories</Text>
      
      {loading && categories.length === 0 ? (
        <ActivityIndicator color="#4f46e5" className="mt-8" size="large" />
      ) : (
        categories.map((cat) => (
          <View key={cat.id} className="bg-white rounded-3xl p-5 mb-4 shadow-sm border border-slate-100 flex-row justify-between items-center">
            <View className="flex-1 pr-4">
              <Text className="text-slate-800 font-extrabold text-lg mb-1">{cat.name}</Text>
              <View className="flex-row items-center">
                <Text className="text-indigo-500 font-bold mr-2">${cat.monthly_budget}</Text>
                <Text className="text-slate-400 font-medium text-xs">
                  • {cat.is_accumulative ? 'Accumulates' : 'Fixed'}
                </Text>
              </View>
            </View>
            <TouchableOpacity 
              onPress={() => handleDeleteCategory(cat.id)} 
              className="p-3 bg-red-50 rounded-full"
            >
              <Trash2 color="#ef4444" size={20} />
            </TouchableOpacity>
          </View>
        ))
      )}
      
      <View className="h-24" />
    </ScrollView>
  );
}
