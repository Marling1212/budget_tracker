import React, { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator, Dimensions, TouchableOpacity, Modal, TextInput, KeyboardAvoidingView, Platform, ScrollView, Switch } from 'react-native';
import { useBudget } from '../../hooks/useBudget';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { format } from 'date-fns';
import { supabase } from '../../lib/supabase';
import { useTranslation } from 'react-i18next';
import { Plus, X, LayoutTemplate } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';

import CanvasLayout from '../../components/dashboard/CanvasLayout';
import BentoLayout from '../../components/dashboard/BentoLayout';
import ListLayout from '../../components/dashboard/ListLayout';
import CarouselLayout from '../../components/dashboard/CarouselLayout';

export type LayoutType = 'bento' | 'canvas' | 'list' | 'carousel';

export default function DashboardScreen() {
  const { t } = useTranslation();
  const { categories, budgetStatuses, refreshData, loading, error, transactions, accounts, netWorth, masterVaultValue } = useBudget();
  const router = useRouter();
  
  // Layout Management
  const [layout, setLayout] = useState<LayoutType>('bento');
  
  useEffect(() => {
    AsyncStorage.getItem('@dashboard_layout').then((val) => {
      if (val) setLayout(val as LayoutType);
    });
  }, []);
  
  const cycleLayout = () => {
    const layouts: LayoutType[] = ['bento', 'list', 'carousel', 'canvas'];
    const nextIdx = (layouts.indexOf(layout) + 1) % layouts.length;
    const next = layouts[nextIdx];
    setLayout(next);
    AsyncStorage.setItem('@dashboard_layout', next);
  };
  
  // State for Add Expense Modal
  const [isAddingExpense, setIsAddingExpense] = useState(false);
  const [addAmount, setAddAmount] = useState('');
  const [addNote, setAddNote] = useState('');
  const [addTagsInput, setAddTagsInput] = useState('');
  const [addDate, setAddDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [addCategoryId, setAddCategoryId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);
  const [frequency, setFrequency] = useState<'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY'>('MONTHLY');
  const [addType, setAddType] = useState<'EXPENSE' | 'INCOME'>('EXPENSE');
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

  useEffect(() => {
    if (accounts.length > 0 && selectedAccountId === null) {
      setSelectedAccountId(accounts[0].id);
    }
  }, [accounts]);

  const onDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS !== 'ios') {
      setShowDatePicker(false);
    }
    if (selectedDate && event.type !== 'dismissed') {
      setAddDate(format(selectedDate, 'yyyy-MM-dd'));
    }
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

  const frequentNotes = React.useMemo(() => {
    if (!addCategoryId) return [];
    const categoryTransactions = transactions.filter(t => t.category_id === addCategoryId && t.note && t.note.trim().length > 0);
    const noteCounts: Record<string, number> = {};
    categoryTransactions.forEach(t => {
      const note = t.note!.trim();
      noteCounts[note] = (noteCounts[note] || 0) + 1;
    });
    return Object.entries(noteCounts).sort((a, b) => b[1] - a[1]).slice(0, 4).map(entry => entry[0]);
  }, [addCategoryId, transactions]);

  const handleAddExpense = (categoryId: string) => {
    setAddCategoryId(categoryId);
    setAddType('EXPENSE');
    if (accounts.length > 0) setSelectedAccountId(accounts[0].id);
    setIsAddingExpense(true);
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

  const handleSaveExpense = async () => {
    const calculatedAmount = evaluateAmount(addAmount);
    
    if (isNaN(calculatedAmount) || calculatedAmount <= 0) {
      safeAlert('Error', 'Please enter a valid amount or formula');
      return;
    }
    if (!addCategoryId && addType === 'EXPENSE') {
      safeAlert('Error', 'Please select a category');
      return;
    }

    setIsSubmitting(true);
    try {
      const calculatedAmount = evaluateAmount(addAmount);
      const parsedTags = addTagsInput.split(',').map(t => t.trim()).filter(t => t);
      
      if (isRecurring) {
        const { error } = await supabase
          .from('recurring_transactions')
          .insert({
            category_id: addCategoryId || null,
            amount: calculatedAmount,
            next_date: addDate,
            note: addNote || null,
            frequency: frequency,
            type: addType,
            account_id: selectedAccountId
          });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('transactions')
          .insert({
            category_id: addCategoryId || null,
            amount: calculatedAmount,
            date: addDate,
            note: addNote || null,
            tags: parsedTags,
            type: addType,
            account_id: selectedAccountId
          });
        if (error) throw error;
      }
      
      await refreshData(true);
      
      setAddAmount('');
      setAddNote('');
      setAddTagsInput('');
      setAddCategoryId(null);
      setAddDate(format(new Date(), 'yyyy-MM-dd'));
      setIsRecurring(false);
      setFrequency('MONTHLY');
      setAddType('EXPENSE');
      setSelectedAccountId(accounts.length > 0 ? accounts[0].id : null);
      setIsAddingExpense(false);
    } catch (err: any) {
      console.error(err);
      safeAlert('Error', err.message || JSON.stringify(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50 dark:bg-slate-900">
        <ActivityIndicator size="large" color="#0ea5e9" />
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50 dark:bg-slate-900 p-4">
        <Text className="text-red-500 text-center font-bold">{t('dashboard.failedToLoad')} {error.message || JSON.stringify(error)}</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-900">
      
      {layout === 'canvas' && <CanvasLayout budgetStatuses={budgetStatuses} onAddExpense={handleAddExpense} masterVaultValue={masterVaultValue} />}
      {layout === 'bento' && <BentoLayout budgetStatuses={budgetStatuses} onAddExpense={handleAddExpense} masterVaultValue={masterVaultValue} />}
      {layout === 'list' && <ListLayout budgetStatuses={budgetStatuses} onAddExpense={handleAddExpense} masterVaultValue={masterVaultValue} />}
      {layout === 'carousel' && <CarouselLayout budgetStatuses={budgetStatuses} onAddExpense={handleAddExpense} masterVaultValue={masterVaultValue} />}

      {/* Layout Switcher Button */}
      <TouchableOpacity 
        onPress={cycleLayout}
        className="absolute top-14 right-6 bg-white/20 dark:bg-slate-800/50 p-3 rounded-full shadow-sm z-50 border border-white/30"
      >
        <LayoutTemplate color="#ffffff" size={24} />
      </TouchableOpacity>
      

            {/* Floating Action Button (FAB) */}
      <TouchableOpacity
        className="absolute bottom-8 right-6 w-16 h-16 rounded-full shadow-lg shadow-indigo-200 dark:shadow-slate-800 z-50 overflow-hidden items-center justify-center bg-indigo-500"
        onPress={() => setIsAddingExpense(true)}
      >
        <LinearGradient
          colors={['#4f46e5', '#6366f1']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ position: 'absolute', width: '100%', height: '100%' }}
        />
        <Plus color="white" size={32} style={{ zIndex: 10 }} />
      </TouchableOpacity>

            {/* Add Expense Modal */}
      <Modal
        visible={isAddingExpense}
        animationType="slide"
        transparent={true}
      >
        <View className="flex-1 justify-end bg-slate-900/50 dark:bg-slate-900/80">
          <View className="bg-white dark:bg-slate-800 rounded-t-[40px] p-6 pt-8 pb-12 shadow-xl h-[90%]">
            <View className="flex-row justify-between items-center mb-8">
              <Text className="text-3xl font-extrabold text-slate-800 dark:text-slate-200 tracking-tight">
                {addType === 'INCOME' ? t('expenseModal.addIncome') : t('expenseModal.addExpense')}
              </Text>
              <TouchableOpacity onPress={() => setIsAddingExpense(false)} className="p-3 bg-slate-100 dark:bg-slate-700 rounded-full">
                <X color="#64748b" size={24} />
              </TouchableOpacity>
            </View>

            <KeyboardAvoidingView 
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              className="flex-1"
            >
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <View className="flex-row bg-slate-100 dark:bg-slate-700 p-1 rounded-xl mb-6">
                  <TouchableOpacity
                    onPress={() => setAddType('EXPENSE')}
                    className={`flex-1 py-3 rounded-lg items-center ${addType === 'EXPENSE' ? 'bg-white dark:bg-slate-800 shadow-sm' : ''}`}
                  >
                    <Text className={`font-bold ${addType === 'EXPENSE' ? 'text-red-500' : 'text-slate-500 dark:text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500'}`}>{t('expenseModal.expense')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setAddType('INCOME')}
                    className={`flex-1 py-3 rounded-lg items-center ${addType === 'INCOME' ? 'bg-white dark:bg-slate-800 shadow-sm' : ''}`}
                  >
                    <Text className={`font-bold ${addType === 'INCOME' ? 'text-green-500' : 'text-slate-500 dark:text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500'}`}>{t('expenseModal.income')}</Text>
                  </TouchableOpacity>
                </View>

                <Text className="text-slate-500 dark:text-slate-400 dark:text-slate-500 font-bold mb-2 text-sm uppercase tracking-wider">{t('expenseModal.amount')}</Text>
                <View className="flex-row items-center border-b-2 border-slate-100 dark:border-slate-700 pb-2 mb-8">
                  <Text className="text-4xl font-black text-slate-800 dark:text-slate-200 mr-2">$</Text>
                  <TextInput
                    className="flex-1 text-4xl font-black text-slate-800 dark:text-slate-200"
                    placeholder="0.00"
                    placeholderTextColor="#cbd5e1"
                    keyboardType="numbers-and-punctuation"
                    value={addAmount}
                    onChangeText={setAddAmount}
                  />
                </View>

                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-slate-500 dark:text-slate-400 dark:text-slate-500 font-bold text-sm uppercase tracking-wider">{t('expenseModal.date')}</Text>
                  {Platform.OS === 'ios' && showDatePicker && (
                    <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                      <Text className="text-indigo-600 font-bold">{t('expenseModal.done')}</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {Platform.OS === 'web' ? (
                  // @ts-ignore
                  <input
                    type="date"
                    value={addDate}
                    onChange={(e: any) => setAddDate(e.target.value)}
                    style={{ 
                      padding: '16px', 
                      borderRadius: '16px', 
                      border: '1px solid #e2e8f0', 
                      fontSize: '18px',
                      width: '100%',
                      marginBottom: '32px',
                      backgroundColor: '#f8fafc',
                      color: '#1e293b',
                      outline: 'none',
                      fontFamily: 'inherit'
                    }}
                  />
                ) : (
                  <>
                    <TouchableOpacity 
                      onPress={() => setShowDatePicker(true)}
                      className="bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 mb-8"
                    >
                      <Text className="text-slate-800 dark:text-slate-200 font-bold text-lg">{addDate}</Text>
                    </TouchableOpacity>

                    {showDatePicker && (
                      <View className="mb-8">
                        <DateTimePicker
                          value={
                            (() => {
                              const [year, month, day] = addDate.split('-');
                              return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                            })()
                          }
                          mode="date"
                          display="default"
                          onChange={onDateChange}
                        />
                      </View>
                    )}
                  </>
                )}

                {addType === 'EXPENSE' && (
                  <>
                    <Text className="text-slate-500 dark:text-slate-400 dark:text-slate-500 font-bold mb-4 text-sm uppercase tracking-wider">{t('expenseModal.category')}</Text>
                    <View className="flex-row flex-wrap mb-8">
                      {categories.map((cat) => (
                        <TouchableOpacity
                          key={cat.id}
                          onPress={() => setAddCategoryId(cat.id)}
                          className={`px-5 py-3 rounded-full mr-3 mb-3 border-2 ${
                            addCategoryId === cat.id 
                              ? 'border-indigo-600 bg-indigo-50' 
                              : 'border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800'
                          }`}
                        >
                          <Text className={`font-bold ${addCategoryId === cat.id ? 'text-indigo-600' : 'text-slate-500 dark:text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500'}`}>
                            {cat.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                      {categories.length === 0 && (
                        <Text className="text-slate-400 dark:text-slate-500 dark:text-slate-400 italic">{t('expenseModal.noCategoriesAvail')}</Text>
                      )}
                    </View>
                  </>
                )}

                {accounts.length > 0 && (
                  <>
                    <Text className="text-slate-500 dark:text-slate-400 dark:text-slate-500 font-bold mb-4 text-sm uppercase tracking-wider">{t('expenseModal.account')}</Text>
                    <View className="flex-row flex-wrap mb-8">
                      {accounts.map((acc) => (
                        <TouchableOpacity
                          key={acc.id}
                          onPress={() => setSelectedAccountId(acc.id)}
                          className={`px-5 py-3 rounded-full mr-3 mb-3 border-2 ${
                            selectedAccountId === acc.id 
                              ? 'border-indigo-600 bg-indigo-50' 
                              : 'border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800'
                          }`}
                        >
                          <Text className={`font-bold ${selectedAccountId === acc.id ? 'text-indigo-600' : 'text-slate-500 dark:text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500'}`}>
                            {acc.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                      <TouchableOpacity
                        onPress={() => setSelectedAccountId(null)}
                        className={`px-5 py-3 rounded-full mr-3 mb-3 border-2 ${
                          selectedAccountId === null 
                            ? 'border-indigo-600 bg-indigo-50' 
                            : 'border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800'
                        }`}
                      >
                        <Text className={`font-bold ${selectedAccountId === null ? 'text-indigo-600' : 'text-slate-500 dark:text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500'}`}>
                          {t('expenseModal.none')}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}

                <Text className="text-slate-500 dark:text-slate-400 dark:text-slate-500 font-bold mb-3 text-sm uppercase tracking-wider">{t('expenseModal.noteOpt')}</Text>
                <TextInput
                  className={`bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 text-slate-800 dark:text-slate-200 font-medium text-base ${frequentNotes.length > 0 ? 'mb-3' : 'mb-8'}`}
                  placeholder={t('expenseModal.notePlaceholder')}
                  placeholderTextColor="#94a3b8"
                  value={addNote}
                  onChangeText={setAddNote}
                />
                
                {frequentNotes.length > 0 && (
                  <View className="flex-row flex-wrap mb-6">
                    {frequentNotes.map((note) => (
                      <TouchableOpacity
                        key={note}
                        onPress={() => setAddNote(note)}
                        className="bg-indigo-50 border border-indigo-100 px-4 py-2 rounded-full mr-2 mb-2"
                      >
                        <Text className="text-indigo-600 font-bold text-xs">{note}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                <Text className="text-slate-500 dark:text-slate-400 dark:text-slate-500 font-bold mb-3 text-sm uppercase tracking-wider">{t('expenseModal.tagsOpt')}</Text>
                <TextInput
                  className="bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 text-slate-800 dark:text-slate-200 font-medium text-base mb-8"
                  placeholder={t('expenseModal.tagsPlaceholder')}
                  placeholderTextColor="#94a3b8"
                  value={addTagsInput}
                  onChangeText={setAddTagsInput}
                />

                <View className="flex-row items-center justify-between mb-4 bg-slate-50 dark:bg-slate-700 p-4 rounded-2xl">
                  <View className="flex-1 pr-4">
                    <Text className="text-slate-800 dark:text-slate-200 font-bold text-base mb-1">{t('expenseModal.recurring')}</Text>
                    <Text className="text-slate-500 dark:text-slate-400 dark:text-slate-500 text-xs font-medium">{t('expenseModal.recurringDesc')}</Text>
                  </View>
                  <Switch 
                    value={isRecurring} 
                    onValueChange={setIsRecurring} 
                    trackColor={{ false: '#e2e8f0', true: '#4f46e5' }}
                    thumbColor="#ffffff"
                  />
                </View>

                {isRecurring && (
                  <View className="mb-8">
                    <Text className="text-slate-500 dark:text-slate-400 dark:text-slate-500 font-bold mb-3 text-sm uppercase tracking-wider">{t('expenseModal.frequency')}</Text>
                    <View className="flex-row justify-between space-x-2">
                      {['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'].map((freq) => (
                        <TouchableOpacity
                          key={freq}
                          onPress={() => setFrequency(freq as any)}
                          className={`flex-1 items-center justify-center py-3 rounded-xl border-2 ${
                            frequency === freq ? 'border-indigo-600 bg-indigo-50' : 'border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800'
                          }`}
                        >
                          <Text className={`font-bold text-xs ${frequency === freq ? 'text-indigo-600' : 'text-slate-500 dark:text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500'}`}>
                            {freq}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}

                <TouchableOpacity
                  onPress={handleSaveExpense}
                  disabled={isSubmitting}
                  className="shadow-md shadow-indigo-200 mb-20 overflow-hidden rounded-2xl items-center justify-center"
                  style={{ height: 56 }}
                >
                  <LinearGradient
                    colors={isSubmitting ? ['#94a3b8', '#cbd5e1'] : ['#4f46e5', '#6366f1']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{ position: 'absolute', width: '100%', height: '100%' }}
                  />
                  <View className="flex-row items-center z-10">
                    {isSubmitting ? (
                      <ActivityIndicator color="#ffffff" />
                    ) : (
                      <>
                        <Plus color="white" size={24} className="mr-2" />
                        <Text className="text-white font-extrabold text-lg tracking-wide">Save Expense</Text>
                      </>
                    )}
                  </View>
                </TouchableOpacity>
              </ScrollView>
            </KeyboardAvoidingView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
