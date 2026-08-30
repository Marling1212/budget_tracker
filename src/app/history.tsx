import React, { useState, useMemo } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator, 
  ScrollView, 
  Modal, 
  TextInput,
  Platform
} from 'react-native';
import { useBudget } from '../hooks/useBudget';
import { supabase } from '../lib/supabase';
import { Calendar, Tag, ChevronLeft, Trash2, Edit2, X, Save } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Transaction, Category } from '../types/database';

export default function HistoryScreen() {
  const { categories, transactions, refreshData, loading, budgetStatuses } = useBudget();
  
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedDay, setSelectedDay] = useState<number | 'ALL'>('ALL');
  
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editNote, setEditNote] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editCategoryId, setEditCategoryId] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Generate days array (1 to daysInMonth)
  const daysInMonth = budgetStatuses.length > 0 ? budgetStatuses[0].daysInMonth : 31;
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      // Filter by category
      if (selectedCategory !== 'ALL' && t.category_id !== selectedCategory) {
        return false;
      }
      
      // Filter by day
      if (selectedDay !== 'ALL') {
        const txDay = new Date(t.date).getDate();
        if (txDay !== selectedDay) {
          return false;
        }
      }
      return true;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, selectedCategory, selectedDay]);

  const openEditModal = (tx: Transaction) => {
    setEditingTransaction(tx);
    setEditAmount(String(tx.amount));
    setEditNote(tx.note || '');
    setEditDate(tx.date);
    setEditCategoryId(tx.category_id);
  };

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

  const handleSaveEdit = async () => {
    if (!editingTransaction) return;
    if (!editAmount || isNaN(Number(editAmount))) {
      safeAlert('Error', 'Please enter a valid amount');
      return;
    }
    if (!editDate) {
      safeAlert('Error', 'Please enter a valid date');
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('transactions')
        .update({
          amount: Number(editAmount),
          note: editNote.trim(),
          date: editDate,
          category_id: editCategoryId,
        })
        .eq('id', editingTransaction.id);

      if (error) throw error;
      
      await refreshData();
      setEditingTransaction(null);
    } catch (err: any) {
      console.error(err);
      safeAlert('Error', err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editingTransaction) return;
    
    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to delete this transaction?')) {
        executeDelete();
      }
    } else {
      import('react-native').then(({ Alert }) => {
        Alert.alert(
          'Delete Transaction',
          'Are you sure you want to delete this transaction?',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: executeDelete }
          ]
        );
      });
    }
  };

  const executeDelete = async () => {
    if (!editingTransaction) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', editingTransaction.id);

      if (error) throw error;
      
      await refreshData();
      setEditingTransaction(null);
    } catch (err: any) {
      console.error(err);
      safeAlert('Error', err.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading && transactions.length === 0) {
    return (
      <View className="flex-1 items-center justify-center bg-[#F8FAFC]">
        <ActivityIndicator size="large" color="#0ea5e9" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#F8FAFC]">
      <View className="pt-8 px-5 pb-4 bg-white shadow-sm border-b border-slate-100 z-10">
        <Text className="text-3xl font-extrabold text-slate-800 tracking-tight">History</Text>
        <Text className="text-slate-500 font-medium text-sm mt-1">Review and manage your expenses</Text>
        
        {/* Category Filter */}
        <View className="mt-6 flex-row items-center">
          <Tag color="#94a3b8" size={16} className="mr-3" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-1">
            <TouchableOpacity 
              onPress={() => setSelectedCategory('ALL')}
              className={`px-4 py-2 rounded-full mr-2 ${selectedCategory === 'ALL' ? 'bg-indigo-600' : 'bg-slate-100'}`}
            >
              <Text className={`font-bold text-xs ${selectedCategory === 'ALL' ? 'text-white' : 'text-slate-600'}`}>
                All Categories
              </Text>
            </TouchableOpacity>
            {categories.map(cat => (
              <TouchableOpacity 
                key={cat.id}
                onPress={() => setSelectedCategory(cat.id)}
                className={`px-4 py-2 rounded-full mr-2 ${selectedCategory === cat.id ? 'bg-indigo-600' : 'bg-slate-100'}`}
              >
                <Text className={`font-bold text-xs ${selectedCategory === cat.id ? 'text-white' : 'text-slate-600'}`}>
                  {cat.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Date Filter */}
        <View className="mt-4 flex-row items-center">
          <Calendar color="#94a3b8" size={16} className="mr-3" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-1">
            <TouchableOpacity 
              onPress={() => setSelectedDay('ALL')}
              className={`w-12 h-12 rounded-2xl items-center justify-center mr-2 border-2 ${selectedDay === 'ALL' ? 'border-indigo-600 bg-indigo-50' : 'border-transparent bg-slate-100'}`}
            >
              <Text className={`font-black text-xs ${selectedDay === 'ALL' ? 'text-indigo-600' : 'text-slate-600'}`}>
                ALL
              </Text>
            </TouchableOpacity>
            {daysArray.map(day => (
              <TouchableOpacity 
                key={day}
                onPress={() => setSelectedDay(day)}
                className={`w-12 h-12 rounded-2xl items-center justify-center mr-2 border-2 ${selectedDay === day ? 'border-indigo-600 bg-indigo-50' : 'border-transparent bg-slate-100'}`}
              >
                <Text className={`font-black text-lg ${selectedDay === day ? 'text-indigo-600' : 'text-slate-700'}`}>
                  {day}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>

      {/* Transactions List */}
      <FlatList
        data={filteredTransactions}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
        ListEmptyComponent={
          <View className="items-center justify-center py-20">
            <Text className="text-slate-400 font-bold text-lg">No transactions found</Text>
          </View>
        }
        renderItem={({ item }) => {
          const cat = categories.find(c => c.id === item.category_id);
          const day = new Date(item.date).getDate();
          return (
            <TouchableOpacity 
              onPress={() => openEditModal(item)}
              className="bg-white rounded-3xl p-4 mb-3 shadow-sm border border-slate-100 flex-row items-center justify-between"
            >
              <View className="flex-row items-center flex-1">
                <View className="w-12 h-12 bg-indigo-50 rounded-2xl items-center justify-center mr-4">
                  <Text className="text-indigo-600 font-black text-lg">{day}</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-slate-800 font-extrabold text-base">{cat?.name || 'Unknown'}</Text>
                  {item.note ? (
                    <Text className="text-slate-500 font-medium text-xs mt-0.5">{item.note}</Text>
                  ) : null}
                </View>
              </View>
              <Text className="text-slate-900 font-black text-xl">
                ${Number(item.amount).toFixed(0)}
              </Text>
            </TouchableOpacity>
          );
        }}
      />

      {/* Edit Modal */}
      <Modal
        visible={!!editingTransaction}
        animationType="slide"
        transparent={true}
      >
        <View className="flex-1 justify-end bg-slate-900/50">
          <View className="bg-white rounded-t-[40px] p-6 pt-8 pb-12 shadow-xl h-[85%]">
            <View className="flex-row justify-between items-center mb-8">
              <Text className="text-2xl font-extrabold text-slate-800 tracking-tight">Edit Transaction</Text>
              <TouchableOpacity onPress={() => setEditingTransaction(null)} className="p-2 bg-slate-100 rounded-full">
                <X color="#64748b" size={20} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text className="text-slate-500 font-bold mb-2 text-sm uppercase tracking-wider">Amount ($)</Text>
              <TextInput
                className="border-b-2 border-slate-100 py-2 mb-6 text-3xl font-black text-slate-800"
                keyboardType="decimal-pad"
                value={editAmount}
                onChangeText={setEditAmount}
              />

              <Text className="text-slate-500 font-bold mb-2 text-sm uppercase tracking-wider">Date (YYYY-MM-DD)</Text>
              <TextInput
                className="border-b-2 border-slate-100 py-2 mb-6 text-xl font-bold text-slate-800"
                value={editDate}
                onChangeText={setEditDate}
              />

              <Text className="text-slate-500 font-bold mb-2 text-sm uppercase tracking-wider">Note (Optional)</Text>
              <TextInput
                className="border-b-2 border-slate-100 py-2 mb-8 text-xl font-bold text-slate-800"
                value={editNote}
                onChangeText={setEditNote}
              />

              <Text className="text-slate-500 font-bold mb-4 text-sm uppercase tracking-wider">Category</Text>
              <View className="flex-row flex-wrap mb-8">
                {categories.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    onPress={() => setEditCategoryId(cat.id)}
                    className={`px-5 py-3 rounded-full mr-3 mb-3 border-2 ${
                      editCategoryId === cat.id 
                        ? 'border-indigo-600 bg-indigo-50' 
                        : 'border-slate-100 bg-white'
                    }`}
                  >
                    <Text className={`font-bold ${editCategoryId === cat.id ? 'text-indigo-600' : 'text-slate-500'}`}>
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View className="flex-row space-x-4 mt-4">
                <TouchableOpacity 
                  onPress={handleDelete}
                  disabled={isSaving}
                  className="bg-red-50 py-4 px-6 rounded-2xl items-center flex-row justify-center"
                >
                  <Trash2 color="#ef4444" size={20} className="mr-2" />
                  <Text className="text-red-500 font-bold text-base">Delete</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  onPress={handleSaveEdit}
                  disabled={isSaving}
                  className="flex-1 overflow-hidden rounded-2xl shadow-sm"
                >
                  <LinearGradient
                    colors={isSaving ? ['#94a3b8', '#cbd5e1'] : ['#4f46e5', '#6366f1']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    className="py-4 items-center flex-row justify-center"
                  >
                    {isSaving ? (
                      <ActivityIndicator color="white" size="small" />
                    ) : (
                      <>
                        <Save color="white" size={20} className="mr-2" />
                        <Text className="text-white font-bold text-base">Save Changes</Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
