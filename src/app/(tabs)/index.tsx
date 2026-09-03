import React, { useState } from 'react';
import { View, Text, ActivityIndicator, Dimensions, TouchableOpacity, Modal, TextInput, KeyboardAvoidingView, Platform, ScrollView, Switch } from 'react-native';
import { useBudget } from '../../hooks/useBudget';
import { LinearGradient } from 'expo-linear-gradient';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { useRouter } from 'expo-router';
import { format } from 'date-fns';
import { supabase } from '../../lib/supabase';
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

function TwoVesselNode({ 
  status, 
  index, 
  totalNodes,
  onDoubleTap
}: { 
  status: BudgetStatus; 
  index: number; 
  totalNodes: number;
  onDoubleTap: (categoryId: string) => void;
}) {
  const CANVAS_CENTER = 1500;
  
  // Calculate node position on a circle
  // Dynamically increase radius if there are many nodes so they don't overlap
  const minSpacing = 320; // Minimum arc length per node
  const calculatedRadius = (totalNodes * minSpacing) / (2 * Math.PI);
  const radius = Math.max(280, calculatedRadius); // Base radius of 280
  
  const angle = (index / totalNodes) * 2 * Math.PI - Math.PI / 2; // Start from top (-90 deg)
  const x = Math.cos(angle) * radius;
  const y = Math.sin(angle) * radius;

  const baseColor = status.category.color || GRADIENTS[index % GRADIENTS.length][0];
  const colors = [baseColor, baseColor] as const;
  
  // --- Top Container (Daily Glass) ---
  const topIsOverBudget = status.todayRemaining < 0;
  const topColors = topIsOverBudget ? ['#ef4444', '#b91c1c'] as const : colors;
  const topFillPercentage = Math.max(0, Math.min(100, (status.todayRemaining / status.dailyBudget) * 100)) || 0;
  const topTargetHeight = (topFillPercentage / 100) * 140;
  const topFillHeight = useSharedValue(0);

  // --- Bottom Container (Savings Vault) ---
  const bottomIsNegative = status.totalSaved < 0;
  const bottomColors = bottomIsNegative ? ['#ef4444', '#b91c1c'] as const : colors;
  // Cap at 100% just for animation scale
  const bottomFillPercentage = Math.max(0, Math.min(100, (status.totalSaved / status.expectedMonthlyBudget) * 100)) || 0;
  const bottomTargetHeight = (bottomFillPercentage / 100) * 140;
  const bottomFillHeight = useSharedValue(0);

  React.useEffect(() => {
    topFillHeight.value = withTiming(topTargetHeight, { duration: 1500 });
    // Add a slight delay for the vault animation so it feels like a sequence
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
      <Animated.View 
        style={{
          position: 'absolute',
          top: CANVAS_CENTER + y - 145, // half of total height 290
          left: CANVAS_CENTER + x - 70, // half of width 140
          width: 140,
          height: 290,
        }}
        className="items-center justify-between"
      >
      {/* Top Container: Daily Glass */}
      <View className="w-full h-[140px] bg-white rounded-t-[70px] rounded-b-3xl shadow-sm border-4 border-slate-100 overflow-hidden items-center justify-center">
        <View className="absolute inset-0 bg-slate-50" />
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
            style={{ position: 'absolute', bottom: 0, left: 0, width: 140, height: 140 }}
          />
        </Animated.View>

        <View className="absolute inset-0 items-center justify-center bg-white/50 p-2">
          {renderIcon(status.category.icon, status.category.color || '#4f46e5', 16)}
          <Text className="text-slate-900 font-extrabold text-xs uppercase tracking-wider text-center mt-1">
            {status.category.name} Daily
          </Text>
          <Text className={`${topIsOverBudget ? 'text-red-600' : 'text-slate-900'} font-black text-2xl mt-1`}>
            {topIsOverBudget ? '-' : ''}${Math.abs(status.todayRemaining).toFixed(0)}
          </Text>
          <Text className={`${topIsOverBudget ? 'text-red-500' : 'text-slate-800'} font-bold text-[10px] mt-1`}>
            {topIsOverBudget ? 'OVERSPENT' : 'REMAINING TODAY'}
          </Text>
        </View>
      </View>

      {/* Spacer / Pipe connector */}
      <View className="w-3 h-[10px] bg-slate-200 rounded-full" />

      {/* Bottom Container: Savings Vault */}
      <View className="w-full h-[140px] bg-white rounded-b-[70px] rounded-t-3xl shadow-sm border-4 border-slate-100 overflow-hidden items-center justify-center">
        <View className="absolute inset-0 bg-slate-50" />
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
            style={{ position: 'absolute', bottom: 0, left: 0, width: 140, height: 140 }}
          />
        </Animated.View>

        <View className="absolute inset-0 items-center justify-center bg-white/50 p-2">
          <Text className="text-slate-900 font-extrabold text-xs uppercase tracking-wider text-center">
            Vault
          </Text>
          <Text className={`${bottomIsNegative ? 'text-red-600' : 'text-slate-900'} font-black text-2xl mt-1`}>
            {bottomIsNegative ? '-' : ''}${Math.abs(status.totalSaved).toFixed(0)}
          </Text>
          <Text className={`${bottomIsNegative ? 'text-red-500' : 'text-slate-800'} font-bold text-[10px] mt-1`}>
            {bottomIsNegative ? 'DEFICIT' : 'TOTAL SAVED'}
          </Text>
        </View>
      </View>
    </Animated.View>
    </GestureDetector>
  );
}

function SingleVesselNode({ 
  status, 
  index, 
  totalNodes,
  onDoubleTap
}: { 
  status: BudgetStatus; 
  index: number; 
  totalNodes: number;
  onDoubleTap: (categoryId: string) => void;
}) {
  const CANVAS_CENTER = 1500;
  
  const minSpacing = 320;
  const calculatedRadius = (totalNodes * minSpacing) / (2 * Math.PI);
  const radius = Math.max(280, calculatedRadius);
  
  const angle = (index / totalNodes) * 2 * Math.PI - Math.PI / 2;
  const x = Math.cos(angle) * radius;
  const y = Math.sin(angle) * radius;

  const baseColor = status.category.color || GRADIENTS[index % GRADIENTS.length][0];
  const colors = [baseColor, baseColor] as const;
  
  const remaining = status.expectedMonthlyBudget - status.spentThisMonth;
  const isOverBudget = remaining < 0;
  const fillColors = isOverBudget ? ['#ef4444', '#b91c1c'] as const : colors;
  
  const fillPercentage = Math.max(0, Math.min(100, (remaining / status.expectedMonthlyBudget) * 100)) || 0;
  const targetHeight = (fillPercentage / 100) * 290;
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
      <Animated.View 
        style={{
          position: 'absolute',
          top: CANVAS_CENTER + y - 145,
          left: CANVAS_CENTER + x - 70,
          width: 140,
          height: 290,
        }}
        className="items-center justify-center"
      >
      <View className="w-full h-full bg-white rounded-[70px] shadow-sm border-4 border-slate-100 overflow-hidden items-center justify-center">
        <View className="absolute inset-0 bg-slate-50" />
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
            style={{ position: 'absolute', bottom: 0, left: 0, width: 140, height: 290 }}
          />
        </Animated.View>

        <View className="absolute inset-0 items-center justify-center bg-white/50 p-2">
          {renderIcon(status.category.icon, status.category.color || '#4f46e5', 16)}
          <Text className="text-slate-900 font-extrabold text-xs uppercase tracking-wider text-center mt-1">
            {status.category.name}
          </Text>
          <Text className={`${isOverBudget ? 'text-red-600' : 'text-slate-900'} font-black text-3xl mt-1`}>
            {isOverBudget ? '-' : ''}${Math.abs(remaining).toFixed(0)}
          </Text>
          <Text className={`${isOverBudget ? 'text-red-500' : 'text-slate-800'} font-bold text-[10px] mt-1 text-center`}>
            {isOverBudget ? 'OVERSPENT' : 'REMAINING\nMONTHLY'}
          </Text>
        </View>
      </View>
    </Animated.View>
    </GestureDetector>
  );
}

export default function DashboardScreen() {
  const { categories, budgetStatuses, refreshData, loading, error, transactions } = useBudget();
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

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
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
    if (!addCategoryId) {
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
            category_id: addCategoryId,
            amount: calculatedAmount,
            next_date: addDate,
            note: addNote || null,
            frequency: frequency,
          });

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('transactions')
          .insert({
            category_id: addCategoryId,
            amount: calculatedAmount,
            date: addDate,
            note: addNote || null,
            tags: parsedTags,
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
      setIsAddingExpense(false);
    } catch (err: any) {
      console.error(err);
      safeAlert('Error', err.message || JSON.stringify(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Gesture handling state
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = savedScale.value * e.scale;
    })
    .onEnd(() => {
      if (scale.value < 0.3) scale.value = withSpring(0.3);
      if (scale.value > 3) scale.value = withSpring(3);
      savedScale.value = scale.value;
    });

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      translateX.value = savedTranslateX.value + e.translationX;
      translateY.value = savedTranslateY.value + e.translationY;
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  const composedGestures = Gesture.Simultaneous(pinchGesture, panGesture);

  const animatedCanvasStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scale: scale.value },
      ],
    };
  });

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-[#F8FAFC]">
        <ActivityIndicator size="large" color="#0ea5e9" />
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center bg-[#F8FAFC] p-4">
        <Text className="text-red-500 text-center font-bold">Failed to load data: {error.message || JSON.stringify(error)}</Text>
      </View>
    );
  }

  if (budgetStatuses.length === 0) {
    return (
      <View className="flex-1 items-center justify-center bg-[#F8FAFC] p-4">
        <View className="bg-white p-8 rounded-3xl shadow-sm items-center border border-slate-100">
          <Text className="text-slate-800 text-center text-lg font-bold mb-2">No categories yet</Text>
          <Text className="text-slate-600 text-center">Head over to Settings to create your first budget category!</Text>
        </View>
      </View>
    );
  }

  // Calculate radius to scale the center button proportionally
  const totalNodes = budgetStatuses.length;
  const minSpacing = 320;
  const calculatedRadius = (totalNodes * minSpacing) / (2 * Math.PI);
  const radius = Math.max(280, calculatedRadius);
  const buttonScale = Math.max(1, radius / 280);

  const totalRemainingToday = budgetStatuses.reduce((sum, s) => sum + s.todayRemaining, 0);

  return (
    <GestureHandlerRootView className="flex-1 bg-[#F8FAFC]">
      <View className="absolute z-10 top-12 left-6" pointerEvents="none">
        <Text className="text-4xl font-extrabold text-slate-800 tracking-tight">Spatial Map</Text>
        <Text className="text-slate-600 font-bold mt-1 text-base">Pinch to zoom, drag to pan</Text>
      </View>

      <GestureDetector gesture={composedGestures}>
        <Animated.View 
          style={[
            {
              position: 'absolute',
              width: 3000,
              height: 3000,
              top: '50%',
              left: '50%',
              marginTop: -1500,
              marginLeft: -1500,
              backgroundColor: 'transparent',
              // @ts-ignore (for web cursor)
              cursor: 'grab' as any,
              userSelect: 'none' as any
            },
            animatedCanvasStyle
          ]}
        >
          {/* Center reference point for aesthetics and routing */}
          <TouchableOpacity 
            // @ts-ignore
            onPress={() => router.push('/stats')}
            className="absolute bg-white rounded-full items-center justify-center shadow-lg border-4 border-indigo-50 z-50 overflow-hidden"
            style={{ 
              top: 1500 - 60, 
              left: 1500 - 60, 
              width: 120, 
              height: 120,
              transform: [{ scale: buttonScale }]
            }}
          >
            <LinearGradient
              colors={['#e0e7ff', '#ffffff']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ position: 'absolute', width: '100%', height: '100%' }}
            />
            <View className="items-center justify-center p-2">
              <Text className="text-indigo-600 font-black text-[10px] text-center tracking-widest">REMAINING</Text>
              <Text className="text-indigo-600 font-black text-xl text-center mb-1">${totalRemainingToday.toFixed(0)}</Text>
              <View className="bg-indigo-600 px-3 py-1 rounded-full">
                <Text className="text-white font-bold text-[10px] text-center">STATS</Text>
              </View>
            </View>
          </TouchableOpacity>

          {budgetStatuses.map((status, index) => {
            if (status.category.is_accumulative) {
              return (
                <TwoVesselNode 
                  key={status.category.id}
                  status={status}
                  index={index}
                  totalNodes={budgetStatuses.length}
                  onDoubleTap={handleNodeDoubleTap}
                />
              );
            } else {
              return (
                <SingleVesselNode 
                  key={status.category.id}
                  status={status}
                  index={index}
                  totalNodes={budgetStatuses.length}
                  onDoubleTap={handleNodeDoubleTap}
                />
              );
            }
          })}
        </Animated.View>
      </GestureDetector>

      {/* Floating Action Button (FAB) */}
      <TouchableOpacity
        className="absolute bottom-8 right-6 w-16 h-16 rounded-full shadow-lg shadow-indigo-200 z-50 overflow-hidden items-center justify-center bg-indigo-500"
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
        <View className="flex-1 justify-end bg-slate-900/50">
          <View className="bg-white rounded-t-[40px] p-6 pt-8 pb-12 shadow-xl h-[90%]">
            <View className="flex-row justify-between items-center mb-8">
              <Text className="text-3xl font-extrabold text-slate-800 tracking-tight">Add Expense</Text>
              <TouchableOpacity onPress={() => setIsAddingExpense(false)} className="p-3 bg-slate-100 rounded-full">
                <X color="#64748b" size={24} />
              </TouchableOpacity>
            </View>

            <KeyboardAvoidingView 
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              className="flex-1"
            >
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <Text className="text-slate-500 font-bold mb-2 text-sm uppercase tracking-wider">Amount</Text>
                <View className="flex-row items-center border-b-2 border-slate-100 pb-2 mb-8">
                  <Text className="text-4xl font-black text-slate-800 mr-2">$</Text>
                  <TextInput
                    className="flex-1 text-4xl font-black text-slate-800"
                    placeholder="0.00"
                    placeholderTextColor="#cbd5e1"
                    keyboardType="numbers-and-punctuation"
                    value={addAmount}
                    onChangeText={setAddAmount}
                  />
                </View>

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
                  className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-8"
                >
                  <Text className="text-slate-800 font-bold text-lg">{addDate}</Text>
                </TouchableOpacity>

                {showDatePicker && (
                  <View className="mb-8">
                    <DateTimePicker
                      value={new Date(addDate)}
                      mode="date"
                      display="default"
                      onChange={onDateChange}
                    />
                  </View>
                )}

                <Text className="text-slate-500 font-bold mb-4 text-sm uppercase tracking-wider">Category</Text>
                <View className="flex-row flex-wrap mb-8">
                  {categories.map((cat) => (
                    <TouchableOpacity
                      key={cat.id}
                      onPress={() => setAddCategoryId(cat.id)}
                      className={`px-5 py-3 rounded-full mr-3 mb-3 border-2 ${
                        addCategoryId === cat.id 
                          ? 'border-indigo-600 bg-indigo-50' 
                          : 'border-slate-100 bg-white'
                      }`}
                    >
                      <Text className={`font-bold ${addCategoryId === cat.id ? 'text-indigo-600' : 'text-slate-500'}`}>
                        {cat.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                  {categories.length === 0 && (
                    <Text className="text-slate-400 italic">No categories available. Please add one in settings.</Text>
                  )}
                </View>

                <Text className="text-slate-500 font-bold mb-3 text-sm uppercase tracking-wider">Note (Optional)</Text>
                <TextInput
                  className={`bg-slate-50 border border-slate-200 rounded-2xl p-4 text-slate-800 font-medium text-base ${frequentNotes.length > 0 ? 'mb-3' : 'mb-8'}`}
                  placeholder="What was this for?"
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

                <Text className="text-slate-500 font-bold mb-3 text-sm uppercase tracking-wider">Tags (Optional)</Text>
                <TextInput
                  className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-slate-800 font-medium text-base mb-8"
                  placeholder="e.g. vacation, coffee (comma separated)"
                  placeholderTextColor="#94a3b8"
                  value={addTagsInput}
                  onChangeText={setAddTagsInput}
                />

                <View className="flex-row items-center justify-between mb-4 bg-slate-50 p-4 rounded-2xl">
                  <View className="flex-1 pr-4">
                    <Text className="text-slate-800 font-bold text-base mb-1">Recurring Expense</Text>
                    <Text className="text-slate-500 text-xs font-medium">Automatically add this expense periodically</Text>
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
                    <Text className="text-slate-500 font-bold mb-3 text-sm uppercase tracking-wider">Frequency</Text>
                    <View className="flex-row justify-between space-x-2">
                      {['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'].map((freq) => (
                        <TouchableOpacity
                          key={freq}
                          onPress={() => setFrequency(freq as any)}
                          className={`flex-1 items-center justify-center py-3 rounded-xl border-2 ${
                            frequency === freq ? 'border-indigo-600 bg-indigo-50' : 'border-slate-100 bg-white'
                          }`}
                        >
                          <Text className={`font-bold text-xs ${frequency === freq ? 'text-indigo-600' : 'text-slate-500'}`}>
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
