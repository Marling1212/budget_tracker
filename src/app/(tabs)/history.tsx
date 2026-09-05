import React, { useState, useMemo } from 'react';
import { 
  View, 
  Text, 
  SectionList, 
  TouchableOpacity, 
  ActivityIndicator, 
  ScrollView, 
  Modal, 
  TextInput,
  Platform,
  Keyboard
} from 'react-native';
import { useBudget } from '../../hooks/useBudget';
import { supabase } from '../../lib/supabase';
import { Calendar, Tag, ChevronLeft, ChevronRight, Trash2, Edit2, X, Save, Search } from 'lucide-react-native';
import * as Icons from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Transaction, Category } from '../../types/database';
import { format, subMonths, addMonths } from 'date-fns';
import DateTimePicker from '@react-native-community/datetimepicker';

const renderIcon = (name: string, color: string, size: number) => {
  const IconComponent = (Icons as any)[name || 'Tag'] || Icons.Tag;
  return <IconComponent color={color} size={size} />;
};

export default function HistoryScreen() {
  const { categories, transactions, refreshData, loading, budgetStatuses, currentMonth, setCurrentMonth, accounts } = useBudget();
  
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editNote, setEditNote] = useState('');
  const [editTagsInput, setEditTagsInput] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editCategoryId, setEditCategoryId] = useState('');
  const [editType, setEditType] = useState<'EXPENSE' | 'INCOME'>('EXPENSE');
  const [editAccountId, setEditAccountId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) setEditDate(format(selectedDate, 'yyyy-MM-dd'));
  };
  
  const evaluateAmount = (str: string) => {
    try {
      const sanitized = str.replace(/[^-()\d/*+.]/g, '');
      if (!sanitized) return NaN;
      return Function('"use strict";return (' + sanitized + ')')();
    } catch(e) {
      return NaN;
    }
  };

  // Group transactions by date
  const sections = useMemo(() => {
    const groups: { [key: string]: Transaction[] } = {};
    
    // First filter by category and search
    const categoryFiltered = transactions.filter(t => {
      if (selectedCategory !== 'ALL' && t.category_id !== selectedCategory) {
        return false;
      }
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase().trim();
        const searchTerms = query.split(/\s+/);
        
        const noteText = t.note?.toLowerCase() || '';
        const cat = categories.find(c => c.id === t.category_id);
        const catName = cat?.name.toLowerCase() || '';
        const tagsText = t.tags && Array.isArray(t.tags) ? t.tags.map(tag => '#' + tag).join(' ').toLowerCase() : '';
        
        const combinedText = `${noteText} ${catName} ${tagsText}`;
        
        // Ensure every word the user typed is found somewhere in this transaction
        const matchesAll = searchTerms.every(term => combinedText.includes(term));
        if (!matchesAll) return false;
      }
      return true;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Group by date
    categoryFiltered.forEach(t => {
      if (!groups[t.date]) groups[t.date] = [];
      groups[t.date].push(t);
    });

    // Convert to SectionList format
    return Object.keys(groups)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
      .map(date => ({
        title: date,
        data: groups[date]
      }));
  }, [transactions, selectedCategory, searchQuery, categories]);

  const openEditModal = (tx: Transaction) => {
    setEditingTransaction(tx);
    setEditAmount(String(tx.amount));
    setEditNote(tx.note || '');
    setEditTagsInput(tx.tags ? tx.tags.join(', ') : '');
    setEditDate(tx.date);
    setEditCategoryId(tx.category_id);
    setEditType(tx.type || 'EXPENSE');
    setEditAccountId(tx.account_id || null);
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
    const calculatedAmount = evaluateAmount(editAmount);
    if (isNaN(calculatedAmount) || calculatedAmount <= 0) {
      safeAlert('Error', 'Please enter a valid amount or formula');
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
          amount: calculatedAmount,
          note: editNote.trim(),
          date: editDate,
          category_id: editCategoryId,
          tags: editTagsInput.split(',').map(t => t.trim()).filter(t => t),
          type: editType,
          account_id: editAccountId
        })
        .eq('id', editingTransaction.id);

      if (error) throw error;
      
      await refreshData(true);
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
      
      await refreshData(true);
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
      <View className="pt-12 px-5 pb-4 bg-white shadow-sm border-b border-slate-100 z-10">
        <View className="flex-row justify-between items-center mb-4">
          <View>
            <Text className="text-3xl font-extrabold text-slate-800 tracking-tight">History</Text>
            <Text className="text-slate-500 font-medium text-sm mt-1">Review and manage your expenses</Text>
          </View>
          <View className="flex-row items-center bg-slate-50 rounded-full px-3 py-1.5 border border-slate-200">
            <TouchableOpacity onPress={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-1">
              <ChevronLeft color="#64748b" size={20} />
            </TouchableOpacity>
            <Text className="text-slate-800 font-bold mx-2">{format(currentMonth, 'MMM yyyy')}</Text>
            <TouchableOpacity onPress={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-1">
              <ChevronRight color="#64748b" size={20} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Search Bar */}
        <View className="flex-row items-center bg-slate-50 rounded-2xl px-4 py-3 border border-slate-200">
          <Search color="#94a3b8" size={20} className="mr-2" />
          <TextInput
            className="flex-1 text-slate-800 font-medium"
            placeholder="Search notes, categories, tags..."
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            onSubmitEditing={() => Keyboard.dismiss()}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X color="#94a3b8" size={16} />
            </TouchableOpacity>
          )}
        </View>
        
        {/* Category Filter */}
        <View className="mt-4 flex-row items-center">
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
      </View>

      {/* Transactions List */}
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
        stickySectionHeadersEnabled={true}
        ListEmptyComponent={
          <View className="items-center justify-center py-20">
            <Text className="text-slate-400 font-bold text-lg">No transactions found</Text>
          </View>
        }
        renderSectionHeader={({ section: { title } }) => {
          const dateObj = new Date(title);
          const formattedDate = !isNaN(dateObj.getTime()) 
            ? dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short' })
            : title;
          
          return (
            <View className="bg-[#F8FAFC] py-2 mb-2 mt-4">
              <Text className="text-slate-500 font-bold text-sm tracking-wider uppercase">
                {formattedDate}
              </Text>
            </View>
          );
        }}
        renderItem={({ item }) => {
          const cat = categories.find(c => c.id === item.category_id);
          const baseColor = cat?.color || '#4f46e5';
          return (
            <TouchableOpacity 
              onPress={() => openEditModal(item)}
              className="bg-white rounded-3xl p-4 mb-3 shadow-sm border border-slate-100 flex-row items-center justify-between"
            >
              <View className="flex-row items-center flex-1">
                <View style={{ backgroundColor: `${baseColor}15` }} className="w-12 h-12 rounded-2xl items-center justify-center mr-4">
                  {renderIcon(cat?.icon || 'Tag', baseColor, 24)}
                </View>
                <View className="flex-1">
                  <Text className="text-slate-800 font-extrabold text-base">{cat?.name || 'Unknown'}</Text>
                  {item.note ? (
                    <Text className="text-slate-500 font-medium text-xs mt-0.5">{item.note}</Text>
                  ) : null}
                  {item.tags && item.tags.length > 0 && (
                    <View className="flex-row flex-wrap mt-1">
                      {item.tags.map(tag => (
                        <Text key={tag} className="text-indigo-500 font-bold text-[10px] bg-indigo-50 px-1.5 py-0.5 rounded mr-1">#{tag}</Text>
                      ))}
                    </View>
                  )}
                </View>
              </View>
              <Text className={`font-black text-xl ${item.type === 'INCOME' ? 'text-green-500' : 'text-slate-900'}`}>
                {item.type === 'INCOME' ? '+' : ''}${Number(item.amount).toFixed(0)}
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

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <View className="flex-row bg-slate-100 p-1 rounded-xl mb-6">
                <TouchableOpacity
                  onPress={() => setEditType('EXPENSE')}
                  className={`flex-1 py-3 rounded-lg items-center ${editType === 'EXPENSE' ? 'bg-white shadow-sm' : ''}`}
                >
                  <Text className={`font-bold ${editType === 'EXPENSE' ? 'text-red-500' : 'text-slate-500'}`}>Expense</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setEditType('INCOME')}
                  className={`flex-1 py-3 rounded-lg items-center ${editType === 'INCOME' ? 'bg-white shadow-sm' : ''}`}
                >
                  <Text className={`font-bold ${editType === 'INCOME' ? 'text-green-500' : 'text-slate-500'}`}>Income</Text>
                </TouchableOpacity>
              </View>

              <Text className="text-slate-500 font-bold mb-2 text-sm uppercase tracking-wider">Amount ($)</Text>
              <TextInput
                className="border-b-2 border-slate-100 py-2 mb-6 text-3xl font-black text-slate-800"
                keyboardType="numbers-and-punctuation"
                value={editAmount}
                onChangeText={setEditAmount}
              />

              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-slate-500 font-bold text-sm uppercase tracking-wider">Date</Text>
                {Platform.OS === 'ios' && showDatePicker && (
                  <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                    <Text className="text-indigo-600 font-bold">Done</Text>
                  </TouchableOpacity>
                )}
              </View>
              <TouchableOpacity 
                onPress={() => setShowDatePicker(true)}
                className="border-b-2 border-slate-100 py-2 mb-6"
              >
                <Text className="text-xl font-bold text-slate-800">{editDate}</Text>
              </TouchableOpacity>

              {showDatePicker && (
                <View className="mb-6">
                  <DateTimePicker
                    value={new Date(editDate || new Date())}
                    mode="date"
                    display="default"
                    onChange={onDateChange}
                  />
                </View>
              )}

              <Text className="text-slate-500 font-bold mb-2 text-sm uppercase tracking-wider">Note (Optional)</Text>
              <TextInput
                className="border-b-2 border-slate-100 py-2 mb-6 text-xl font-bold text-slate-800"
                value={editNote}
                onChangeText={setEditNote}
              />

              <Text className="text-slate-500 font-bold mb-2 text-sm uppercase tracking-wider">Tags (Optional)</Text>
              <TextInput
                className="border-b-2 border-slate-100 py-2 mb-8 text-xl font-bold text-slate-800"
                placeholder="e.g. vacation, coffee"
                placeholderTextColor="#cbd5e1"
                value={editTagsInput}
                onChangeText={setEditTagsInput}
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

              {accounts.length > 0 && (
                <>
                  <Text className="text-slate-500 font-bold mb-4 text-sm uppercase tracking-wider">Account</Text>
                  <View className="flex-row flex-wrap mb-8">
                    {accounts.map((acc) => (
                      <TouchableOpacity
                        key={acc.id}
                        onPress={() => setEditAccountId(acc.id)}
                        className={`px-5 py-3 rounded-full mr-3 mb-3 border-2 ${
                          editAccountId === acc.id 
                            ? 'border-indigo-600 bg-indigo-50' 
                            : 'border-slate-100 bg-white'
                        }`}
                      >
                        <Text className={`font-bold ${editAccountId === acc.id ? 'text-indigo-600' : 'text-slate-500'}`}>
                          {acc.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                    <TouchableOpacity
                      onPress={() => setEditAccountId(null)}
                      className={`px-5 py-3 rounded-full mr-3 mb-3 border-2 ${
                        editAccountId === null 
                          ? 'border-indigo-600 bg-indigo-50' 
                          : 'border-slate-100 bg-white'
                      }`}
                    >
                      <Text className={`font-bold ${editAccountId === null ? 'text-indigo-600' : 'text-slate-500'}`}>
                        None
                      </Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}

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
                      <>
                        <Save color="white" size={20} className="mr-2" />
                        <Text className="text-white font-bold text-base">Save Changes</Text>
                      </>
                    )}
                  </View>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
