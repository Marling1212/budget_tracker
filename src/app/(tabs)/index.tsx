import React, { useState } from 'react';
import { View, Text, ActivityIndicator, Dimensions, TouchableOpacity, Modal, TextInput, KeyboardAvoidingView, Platform, ScrollView, Switch } from 'react-native';
import { useBudget } from '../../hooks/useBudget';
import { LinearGradient } from 'expo-linear-gradient';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { useRouter } from 'expo-router';
import { format } from 'date-fns';
import { supabase } from '../../lib/supabase';
import { useTranslation } from 'react-i18next';
import { Plus, X } from 'lucide-react-native';
import * as Icons from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withSpring,
  runOnJS
} from 'react-native-reanimated';
import { BudgetStatus } from '../../types/database';

const { width, height } = Dimensions.get('window');

const renderIcon = (name: string, color: string, size: number) => {
  const IconComponent = (Icons as any)[name || 'Tag'] || Icons.Tag;
  return <IconComponent color={color} size={size} />;
};

// Colors for the liquid fill based on index (fallback)
const GRADIENTS = [
  ['#3b82f6', '#8b5cf6'], // Blue to Purple
  ['#ec4899', '#f43f5e'], // Pink to Rose
  ['#10b981', '#059669'], // Emerald
  ['#f59e0b', '#d97706'], // Amber
  ['#6366f1', '#4f46e5'], // Indigo
] as const;


function TwoVesselCard({ 
  status, 
  index, 
  onDoubleTap
}: { 
  status: BudgetStatus; 
  index: number; 
  onDoubleTap: (categoryId: string) => void;
}) {
  const { t } = useTranslation();

  const baseColor = status.category.color || GRADIENTS[index % GRADIENTS.length][0];
  const colors = [baseColor, baseColor] as const;
  
  // --- Top Container (Daily Glass) ---
  const topIsOverBudget = status.todayRemaining < 0;
  const topColors = topIsOverBudget ? ['#ef4444', '#b91c1c'] as const : colors;
  const topFillPercentage = Math.max(0, Math.min(100, (status.todayRemaining / status.dailyBudget) * 100)) || 0;
  const topTargetHeight = (topFillPercentage / 100) * 105;
  const topFillHeight = useSharedValue(0);

  // --- Bottom Container (Savings Vault) ---
  const bottomIsNegative = status.totalSaved < 0;
  const bottomColors = bottomIsNegative ? ['#ef4444', '#b91c1c'] as const : colors;
  const bottomFillPercentage = Math.max(0, Math.min(100, (status.totalSaved / status.expectedMonthlyBudget) * 100)) || 0;
  const bottomTargetHeight = (bottomFillPercentage / 100) * 105;
  const bottomFillHeight = useSharedValue(0);

  React.useEffect(() => {
    topFillHeight.value = withTiming(topTargetHeight, { duration: 1500 });
    setTimeout(() => {
      bottomFillHeight.value = withTiming(bottomTargetHeight, { duration: 1500 });
    }, 300);
  }, [topTargetHeight, bottomTargetHeight]);

  const topAnimatedStyle = useAnimatedStyle(() => ({ height: topFillHeight.value }));
  const bottomAnimatedStyle = useAnimatedStyle(() => ({ height: bottomFillHeight.value }));

  const doubleTap = Gesture.Tap().numberOfTaps(2).onEnd(() => {
    runOnJS(onDoubleTap)(status.category.id);
  });

  return (
    <GestureDetector gesture={doubleTap}>
      <View style={{ width: '48%' }} className="h-[220px] mb-4 flex-col justify-between">
        {/* Top Container: Daily Glass */}
        <View className="w-full h-[106px] bg-white dark:bg-slate-800 rounded-t-3xl rounded-b-xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden items-center justify-center">
          <View className="absolute inset-0 bg-slate-50 dark:bg-slate-700" />
          <Animated.View 
            style={[
              { position: 'absolute', bottom: 0, left: 0, right: 0, overflow: 'hidden' },
              topAnimatedStyle
            ]}
          >
            <LinearGradient
              colors={topColors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: 105 }}
            />
          </Animated.View>

          <View className="absolute inset-0 items-center justify-center bg-white/50 dark:bg-slate-800/50 p-2">
            {renderIcon(status.category.icon, status.category.color || '#4f46e5', 24)}
            <Text className="text-slate-900 dark:text-slate-100 font-bold text-xs uppercase tracking-wider text-center mt-1">
              {status.category.name} Daily
            </Text>
            <Text className={`${topIsOverBudget ? 'text-red-600' : 'text-slate-900 dark:text-slate-100'} font-black text-xl mt-1`}>
              {topIsOverBudget ? '-' : ''}${Math.abs(status.todayRemaining).toFixed(0)}
            </Text>
            <Text className={`${topIsOverBudget ? 'text-red-500' : 'text-slate-800 dark:text-slate-200'} font-bold text-[10px] mt-1`}>
              {topIsOverBudget ? t('dashboard.overspent') : t('dashboard.remainingToday')}
            </Text>
          </View>
        </View>

        {/* Bottom Container: Savings Vault */}
        <View className="w-full h-[106px] bg-white dark:bg-slate-800 rounded-b-3xl rounded-t-xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden items-center justify-center mt-2">
          <View className="absolute inset-0 bg-slate-50 dark:bg-slate-700" />
          <Animated.View 
            style={[
              { position: 'absolute', bottom: 0, left: 0, right: 0, overflow: 'hidden' },
              bottomAnimatedStyle
            ]}
          >
            <LinearGradient
              colors={bottomColors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: 105 }}
            />
          </Animated.View>

          <View className="absolute inset-0 items-center justify-center bg-white/50 dark:bg-slate-800/50 p-2">
            <Text className="text-slate-900 dark:text-slate-100 font-bold text-xs uppercase tracking-wider text-center">
              Vault
            </Text>
            <Text className={`${bottomIsNegative ? 'text-red-600' : 'text-slate-900 dark:text-slate-100'} font-black text-xl mt-1`}>
              {bottomIsNegative ? '-' : ''}${Math.abs(status.totalSaved).toFixed(0)}
            </Text>
            <Text className={`${bottomIsNegative ? 'text-red-500' : 'text-slate-800 dark:text-slate-200'} font-bold text-[10px] mt-1`}>
              {bottomIsNegative ? t('dashboard.deficit') : t('dashboard.totalSaved')}
            </Text>
          </View>
        </View>
      </View>
    </GestureDetector>
  );
}

function SingleVesselCard({ 
  status, 
  index, 
  onDoubleTap
}: { 
  status: BudgetStatus; 
  index: number; 
  onDoubleTap: (categoryId: string) => void;
}) {
  const { t } = useTranslation();
  
  const baseColor = status.category.color || GRADIENTS[index % GRADIENTS.length][0];
  const colors = [baseColor, baseColor] as const;
  
  const remaining = status.expectedMonthlyBudget - status.spentThisMonth;
  const isOverBudget = remaining < 0;
  const fillColors = isOverBudget ? ['#ef4444', '#b91c1c'] as const : colors;
  
  const fillPercentage = Math.max(0, Math.min(100, (remaining / status.expectedMonthlyBudget) * 100)) || 0;
  const targetHeight = (fillPercentage / 100) * 220;
  const fillHeight = useSharedValue(0);

  React.useEffect(() => {
    fillHeight.value = withTiming(targetHeight, { duration: 1500 });
  }, [targetHeight]);

  const animatedStyle = useAnimatedStyle(() => ({ height: fillHeight.value }));

  const doubleTap = Gesture.Tap().numberOfTaps(2).onEnd(() => {
    runOnJS(onDoubleTap)(status.category.id);
  });

  return (
    <GestureDetector gesture={doubleTap}>
      <View style={{ width: '48%' }} className="h-[220px] mb-4">
        <View className="w-full h-full bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden items-center justify-center">
          <View className="absolute inset-0 bg-slate-50 dark:bg-slate-700" />
          <Animated.View 
            style={[
              { position: 'absolute', bottom: 0, left: 0, right: 0, overflow: 'hidden' },
              animatedStyle
            ]}
          >
            <LinearGradient
              colors={fillColors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: 220 }}
            />
          </Animated.View>

          <View className="absolute inset-0 items-center justify-center bg-white/50 dark:bg-slate-800/50 p-2">
            {renderIcon(status.category.icon, status.category.color || '#4f46e5', 40)}
            <Text className="text-slate-900 dark:text-slate-100 font-extrabold text-sm uppercase tracking-wider text-center mt-2">
              {status.category.name}
            </Text>
            <Text className={`${isOverBudget ? 'text-red-600' : 'text-slate-900 dark:text-slate-100'} font-black text-2xl mt-1`}>
              {isOverBudget ? '-' : ''}${Math.abs(remaining).toFixed(0)}
            </Text>
            <Text className={`${isOverBudget ? 'text-red-500' : 'text-slate-800 dark:text-slate-200'} font-bold text-xs mt-1 text-center`}>
              {isOverBudget ? t('dashboard.overspent') : t('dashboard.remainingMonthly')}
            </Text>
          </View>
        </View>
      </View>
    </GestureDetector>
  );
}

export default function DashboardScreen() {
  const { t } = useTranslation();
  const { categories, budgetStatuses, refreshData, loading, error, transactions, accounts, netWorth } = useBudget();
  const router = useRouter();
  
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

  // Set default account when accounts load or when modal opens
  React.useEffect(() => {
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

  // Derive top frequent notes for the selected category
  const frequentNotes = React.useMemo(() => {
    if (!addCategoryId) return [];
    
    const categoryTransactions = transactions.filter(t => t.category_id === addCategoryId && t.note && t.note.trim().length > 0);
    
    const noteCounts: Record<string, number> = {};
    categoryTransactions.forEach(t => {
      const note = t.note!.trim();
      noteCounts[note] = (noteCounts[note] || 0) + 1;
    });
    
    return Object.entries(noteCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4) // Top 4 frequent notes
      .map(entry => entry[0]);
  }, [addCategoryId, transactions]);

  const handleNodeDoubleTap = (categoryId: string) => {
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
      
      // Reset form
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

  const totalRemainingToday = budgetStatuses.reduce((sum, s) => sum + s.todayRemaining, 0);

  return (
    <GestureHandlerRootView className="flex-1 bg-slate-50 dark:bg-slate-900">
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        
        {/* Hero Header */}
        <View className="px-6 pt-16 pb-8 bg-indigo-600 rounded-b-[40px] shadow-lg mb-6">
          <Text className="text-indigo-200 font-bold text-sm uppercase tracking-widest mb-1">{t('dashboard.netWorth')}</Text>
          <Text className="text-5xl font-extrabold text-white tracking-tight">${netWorth.toFixed(0)}</Text>
          
          <View className="mt-8 flex-row justify-between items-end">
            <View>
              <Text className="text-indigo-200 font-bold text-xs uppercase mb-1">{t('dashboard.remainingToday')}</Text>
              <Text className="text-3xl font-black text-white">${totalRemainingToday.toFixed(0)}</Text>
            </View>
            <TouchableOpacity 
              onPress={() => router.push('/stats')} 
              className="bg-white/20 rounded-full px-5 py-3 flex-row items-center"
            >
              <Text className="text-white font-extrabold text-sm uppercase tracking-wider">{t('dashboard.stats')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {budgetStatuses.length === 0 ? (
          <View className="px-6">
            <View className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-sm items-center border border-slate-100 dark:border-slate-700">
              <Text className="text-slate-800 dark:text-slate-200 text-center text-lg font-bold mb-2">{t('dashboard.noCategories')}</Text>
              <Text className="text-slate-600 dark:text-slate-300 text-center">{t('dashboard.noCategoriesDesc')}</Text>
            </View>
          </View>
        ) : (
          <View className="px-6 flex-row flex-wrap justify-between">
            {budgetStatuses.map((status, index) => {
              if (status.category.is_accumulative) {
                return (
                  <TwoVesselCard 
                    key={status.category.id}
                    status={status}
                    index={index}
                    onDoubleTap={handleNodeDoubleTap}
                  />
                );
              } else {
                return (
                  <SingleVesselCard 
                    key={status.category.id}
                    status={status}
                    index={index}
                    onDoubleTap={handleNodeDoubleTap}
                  />
                );
              }
            })}
          </View>
        )}
      </ScrollView>

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
    </GestureHandlerRootView>
  );
}
