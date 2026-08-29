import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Switch } from 'react-native';
import { useBudget } from '../hooks/useBudget';
import { supabase } from '../lib/supabase';
import { Trash2 } from 'lucide-react-native';

export default function SettingsScreen() {
  const { categories, refreshData, loading } = useBudget();
  const [isAdding, setIsAdding] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatBudget, setNewCatBudget] = useState('');
  const [isAccumulative, setIsAccumulative] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const handleAddCategory = async () => {
    if (!newCatName.trim() || !newCatBudget || isNaN(Number(newCatBudget))) {
      Alert.alert('Error', 'Please enter valid name and budget');
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase.from('categories').insert({
        name: newCatName.trim(),
        monthly_budget: Number(newCatBudget),
        is_accumulative: isAccumulative,
      });

      if (error) throw error;

      await refreshData();
      setNewCatName('');
      setNewCatBudget('');
      setIsAccumulative(true);
      setIsAdding(false);
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
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
              Alert.alert('Error', err.message);
            }
          }
        }
      ]
    );
  };

  return (
    <ScrollView className="flex-1 bg-gray-50 p-4">
      <Text className="text-2xl font-bold text-gray-800 mb-6">Manage Categories</Text>

      {/* Add New Category Section */}
      {!isAdding ? (
        <TouchableOpacity 
          onPress={() => setIsAdding(true)}
          className="bg-sky-100 rounded-xl p-4 mb-6 border border-sky-200 border-dashed items-center"
        >
          <Text className="text-sky-600 font-semibold">+ Add New Category</Text>
        </TouchableOpacity>
      ) : (
        <View className="bg-white rounded-2xl p-5 mb-6 shadow-sm border border-gray-200">
          <Text className="text-gray-800 font-semibold mb-2">Category Name</Text>
          <TextInput
            className="border border-gray-200 rounded-lg p-3 mb-4 bg-gray-50"
            placeholder="e.g. Food, Transport"
            value={newCatName}
            onChangeText={setNewCatName}
          />
          
          <Text className="text-gray-800 font-semibold mb-2">Monthly Budget ($)</Text>
          <TextInput
            className="border border-gray-200 rounded-lg p-3 mb-4 bg-gray-50"
            placeholder="300"
            keyboardType="decimal-pad"
            value={newCatBudget}
            onChangeText={setNewCatBudget}
          />

          <View className="flex-row items-center justify-between mb-6">
            <View>
              <Text className="text-gray-800 font-semibold">Accumulative</Text>
              <Text className="text-gray-500 text-xs">Unspent daily quota rolls over</Text>
            </View>
            <Switch 
              value={isAccumulative} 
              onValueChange={setIsAccumulative} 
              trackColor={{ false: '#d1d5db', true: '#0ea5e9' }}
            />
          </View>

          <View className="flex-row space-x-3">
            <TouchableOpacity 
              onPress={() => setIsAdding(false)}
              className="flex-1 bg-gray-200 p-3 rounded-lg items-center"
            >
              <Text className="text-gray-700 font-semibold">Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              onPress={handleAddCategory}
              disabled={isSaving}
              className="flex-1 bg-sky-500 p-3 rounded-lg items-center"
            >
              {isSaving ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Text className="text-white font-semibold">Save</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Existing Categories List */}
      <Text className="text-lg font-bold text-gray-800 mb-4">Your Categories</Text>
      
      {loading && categories.length === 0 ? (
        <ActivityIndicator color="#0ea5e9" className="mt-4" />
      ) : (
        categories.map((cat) => (
          <View key={cat.id} className="bg-white rounded-xl p-4 mb-3 shadow-sm border border-gray-100 flex-row justify-between items-center">
            <View className="flex-1 pr-2">
              <Text className="text-gray-800 font-semibold text-lg">{cat.name}</Text>
              <Text className="text-gray-500 text-sm">
                Budget: ${cat.monthly_budget} / month
                {cat.is_accumulative ? ' (Accumulates)' : ' (Fixed limit)'}
              </Text>
            </View>
            <TouchableOpacity onPress={() => handleDeleteCategory(cat.id)} className="p-2">
              <Trash2 color="#ef4444" size={20} />
            </TouchableOpacity>
          </View>
        ))
      )}
      
      <View className="h-20" />
    </ScrollView>
  );
}
