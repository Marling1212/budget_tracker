import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Switch, Platform } from 'react-native';
import { useBudget } from '../../hooks/useBudget';
import { supabase } from '../../lib/supabase';
import { Trash2, Plus, Edit2 } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../contexts/AuthContext';
import { LogOut } from 'lucide-react-native';

export default function SettingsScreen() {
  const { categories, budgetStatuses, refreshData, loading } = useBudget();
  const [isAdding, setIsAdding] = useState(false);
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [newCatName, setNewCatName] = useState('');
  const [newCatBudget, setNewCatBudget] = useState('');
  const [isAccumulative, setIsAccumulative] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { signOut, user } = useAuth();

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

  const resetForm = () => {
    setNewCatName('');
    setNewCatBudget('');
    setIsAccumulative(true);
    setIsAdding(false);
    setEditingCatId(null);
  };

  const handleEditCategory = (cat: any) => {
    setEditingCatId(cat.id);
    setNewCatName(cat.name);
    setNewCatBudget(String(cat.daily_budget));
    setIsAccumulative(cat.is_accumulative);
    setIsAdding(true);
  };

  const handleSaveCategory = async () => {
    if (!newCatName.trim() || !newCatBudget || isNaN(Number(newCatBudget))) {
      safeAlert('Error', 'Please enter a valid name and budget');
      return;
    }

    setIsSaving(true);
    try {
      if (editingCatId) {
        const { error } = await supabase.from('categories').update({
          name: newCatName.trim(),
          daily_budget: Number(newCatBudget),
          is_accumulative: isAccumulative,
        }).eq('id', editingCatId);

        if (error) {
          console.error("Supabase update error:", error);
          throw error;
        }
      } else {
        const { error } = await supabase.from('categories').insert({
          name: newCatName.trim(),
          daily_budget: Number(newCatBudget),
          is_accumulative: isAccumulative,
        });

        if (error) {
          console.error("Supabase insert error:", error);
          throw error;
        }
      }

      await refreshData(true);
      resetForm();
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
          await refreshData(true);
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
                  await refreshData(true);
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

  const totalMonthlyExpected = budgetStatuses.reduce((sum, status) => sum + status.expectedMonthlyBudget, 0);

  return (
    <ScrollView className="flex-1 bg-[#F8FAFC]" contentContainerStyle={{ padding: 20 }}>
      
      <View className="mb-6 mt-2">
        <Text className="text-4xl font-extrabold text-slate-800 tracking-tight">Settings</Text>
        <Text className="text-slate-500 font-medium mt-1 text-base">Account: {user?.email}</Text>
      </View>

      {/* Monthly Overview Card */}
      <View className="bg-white rounded-[32px] p-6 mb-8 shadow-sm border border-slate-100 flex-row justify-between items-center">
        <View>
          <Text className="text-slate-500 font-bold text-xs uppercase tracking-wider mb-1">Expected Monthly Total</Text>
          <Text className="text-slate-900 font-black text-3xl">${totalMonthlyExpected.toFixed(0)}</Text>
        </View>
        <View className="bg-indigo-50 px-3 py-1.5 rounded-full">
          <Text className="text-indigo-600 font-bold text-xs">{categories.length} Categories</Text>
        </View>
      </View>

      {/* Add New Category Section */}
      {!isAdding ? (
        <TouchableOpacity
          onPress={() => setIsAdding(true)}
          className="mb-8 rounded-xl overflow-hidden shadow-sm shadow-indigo-100 items-center justify-center bg-indigo-50"
          style={{ height: 56 }}
        >
          <LinearGradient
            colors={['#6366f1', '#4f46e5']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ position: 'absolute', width: '100%', height: '100%' }}
          />
          <View className="flex-row items-center z-10">
            <Plus color="white" size={20} className="mr-2" />
            <Text className="text-white font-bold text-lg">Create Category</Text>
          </View>
        </TouchableOpacity>
      ) : (
        <View className="bg-white rounded-[32px] p-6 mb-8 shadow-sm border border-slate-100">
          <Text className="text-xl font-extrabold text-slate-800 mb-6">{editingCatId ? 'Edit Category' : 'New Category'}</Text>
          <Text className="text-slate-500 font-bold mb-2 text-sm uppercase tracking-wider">Category Name</Text>
          <TextInput
            className="border-b-2 border-slate-100 py-2 mb-6 text-2xl font-bold text-slate-800"
            placeholder="e.g. Food, Transport"
            placeholderTextColor="#cbd5e1"
            value={newCatName}
            onChangeText={setNewCatName}
          />
          
          <Text className="text-slate-500 font-bold mb-2 text-sm uppercase tracking-wider">Daily Budget ($)</Text>
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
              onPress={resetForm}
              className="flex-1 bg-slate-100 py-4 rounded-2xl items-center"
            >
              <Text className="text-slate-600 font-bold text-base">Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              onPress={handleSaveCategory}
              disabled={isSaving}
              className="flex-1 overflow-hidden rounded-2xl shadow-sm items-center justify-center"
              style={{ height: 56 }}
            >
              <LinearGradient
                colors={isSaving ? ['#94a3b8', '#cbd5e1'] : ['#4f46e5', '#6366f1']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ position: 'absolute', width: '100%', height: '100%' }}
              />
              <View className="flex-row items-center z-10">
                {isSaving ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Text className="text-white font-bold text-base">Save</Text>
                )}
              </View>
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
                <Text className="text-indigo-500 font-bold mr-2">${cat.daily_budget}/day</Text>
                <Text className="text-slate-400 font-medium text-xs">
                  • {cat.is_accumulative ? 'Accumulates' : 'Fixed'}
                </Text>
              </View>
            </View>
            <View className="flex-row">
              <TouchableOpacity 
                onPress={() => handleEditCategory(cat)} 
                className="p-3 bg-slate-100 rounded-full mr-2"
              >
                <Edit2 color="#64748b" size={20} />
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={() => handleDeleteCategory(cat.id)} 
                className="p-3 bg-red-50 rounded-full"
              >
                <Trash2 color="#ef4444" size={20} />
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}
      
      {/* Sign Out Button */}
      <TouchableOpacity 
        onPress={signOut}
        className="mt-8 mb-4 bg-slate-100 rounded-2xl py-4 flex-row justify-center items-center"
      >
        <LogOut color="#64748b" size={20} className="mr-2" />
        <Text className="text-slate-600 font-bold text-lg">Sign Out</Text>
      </TouchableOpacity>

      <View className="h-24" />
    </ScrollView>
  );
}
