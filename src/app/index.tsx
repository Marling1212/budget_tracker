import React, { useState } from 'react';
import { View, Text, ActivityIndicator, Dimensions, TouchableOpacity, Modal, TextInput, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useBudget } from '../hooks/useBudget';
import { LinearGradient } from 'expo-linear-gradient';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { useRouter } from 'expo-router';
import { format } from 'date-fns';
import { supabase } from '../lib/supabase';
import { Plus, X } from 'lucide-react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withSpring
} from 'react-native-reanimated';
import { BudgetStatus } from '../types/database';

const { width, height } = Dimensions.get('window');

// Colors for the liquid fill based on index
const GRADIENTS = [
  ['#3b82f6', '#8b5cf6'], // Blue to Purple
  ['#ec4899', '#f43f5e'], // Pink to Rose
  ['#10b981', '#059669'], // Emerald
  ['#f59e0b', '#d97706'], // Amber
  ['#6366f1', '#4f46e5'], // Indigo
];

function TwoVesselNode({ 
  status, 
  index, 
  totalNodes 
}: { 
  status: BudgetStatus; 
  index: number; 
  totalNodes: number;
}) {
  const CANVAS_CENTER = 1500;
  
  // Calculate node position on a circle
  // Increased radius to accommodate taller nodes
  const radius = 240; 
  const angle = (index / totalNodes) * 2 * Math.PI - Math.PI / 2; // Start from top (-90 deg)
  const x = Math.cos(angle) * radius;
  const y = Math.sin(angle) * radius;

  const colors = GRADIENTS[index % GRADIENTS.length];
  
  // --- Top Container (Daily Glass) ---
  const topIsOverBudget = status.todayRemaining <= 0;
  const topColors = topIsOverBudget ? ['#ef4444', '#b91c1c'] : colors;
  const topFillPercentage = Math.max(0, Math.min(100, (status.todayRemaining / status.dailyBudget) * 100)) || 0;
  const topTargetHeight = (topFillPercentage / 100) * 140;
  const topFillHeight = useSharedValue(0);

  // --- Bottom Container (Savings Vault) ---
  const bottomIsNegative = status.totalSaved < 0;
  const bottomColors = bottomIsNegative ? ['#ef4444', '#b91c1c'] : colors;
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

  return (
    <View 
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
          <Text className="text-slate-900 font-extrabold text-xs uppercase tracking-wider text-center">
            {status.category.name} Daily
          </Text>
          <Text className="text-slate-900 font-black text-2xl mt-1">
            ${Math.abs(status.todayRemaining).toFixed(0)}
          </Text>
          <Text className="text-slate-800 font-bold text-[10px] mt-1">
            {topIsOverBudget ? '0 REMAINING' : 'REMAINING TODAY'}
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
          <Text className="text-slate-900 font-black text-2xl mt-1">
            {bottomIsNegative ? '-' : ''}${Math.abs(status.totalSaved).toFixed(0)}
          </Text>
          <Text className="text-slate-800 font-bold text-[10px] mt-1">
            {bottomIsNegative ? 'DEFICIT' : 'TOTAL SAVED'}
          </Text>
        </View>
      </View>
    </View>
  );
}

export default function DashboardScreen() {
  const { categories, budgetStatuses, refreshData, loading, error } = useBudget();
  const router = useRouter();

  // Add Expense State
  const [isAddingExpense, setIsAddingExpense] = useState(false);
  const [addAmount, setAddAmount] = useState('');
  const [addNote, setAddNote] = useState('');
  const [addCategoryId, setAddCategoryId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    if (!addAmount || isNaN(Number(addAmount))) {
      safeAlert('Error', 'Please enter a valid amount');
      return;
    }
    if (!addCategoryId) {
      safeAlert('Error', 'Please select a category');
      return;
    }

    setIsSubmitting(true);
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      
      const { error } = await supabase
        .from('transactions')
        .insert({
          category_id: addCategoryId,
          amount: Number(addAmount),
          date: today,
          note: addNote || null,
        });

      if (error) throw error;
      
      await refreshData();
      
      // Reset form
      setAddAmount('');
      setAddNote('');
      setAddCategoryId(null);
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
              cursor: 'grab',
              userSelect: 'none'
            },
            animatedCanvasStyle
          ]}
        >
          {/* Center reference point for aesthetics and routing */}
          <TouchableOpacity 
            onPress={() => router.push('/stats')}
            className="absolute bg-white rounded-full items-center justify-center shadow-lg border-4 border-indigo-50 z-50 overflow-hidden"
            style={{ 
              top: 1500 - 60, 
              left: 1500 - 60, 
              width: 120, 
              height: 120 
            }}
          >
            <LinearGradient
              colors={['#e0e7ff', '#ffffff']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ position: 'absolute', width: '100%', height: '100%' }}
            />
            <View className="items-center justify-center p-2">
              <Text className="text-indigo-600 font-black text-sm text-center tracking-widest">MONTHLY</Text>
              <Text className="text-indigo-600 font-black text-sm text-center tracking-widest mb-1">STATS</Text>
              <View className="bg-indigo-600 px-3 py-1 rounded-full">
                <Text className="text-white font-bold text-[10px] text-center">TAP HERE</Text>
              </View>
            </View>
          </TouchableOpacity>

          {budgetStatuses.map((status, index) => (
            <TwoVesselNode 
              key={status.category.id}
              status={status}
              index={index}
              totalNodes={budgetStatuses.length}
            />
          ))}
        </Animated.View>
      </GestureDetector>

      {/* Floating Action Button (FAB) */}
      <TouchableOpacity
        className="absolute bottom-8 right-6 w-16 h-16 rounded-full shadow-lg shadow-indigo-200 z-50 overflow-hidden"
        onPress={() => setIsAddingExpense(true)}
      >
        <LinearGradient
          colors={['#4f46e5', '#6366f1']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          className="w-full h-full items-center justify-center"
        >
          <Plus color="white" size={32} />
        </LinearGradient>
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
                    keyboardType="decimal-pad"
                    value={addAmount}
                    onChangeText={setAddAmount}
                  />
                </View>

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
                  className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-slate-800 font-medium text-base mb-8"
                  placeholder="What was this for?"
                  placeholderTextColor="#94a3b8"
                  value={addNote}
                  onChangeText={setAddNote}
                />

                <TouchableOpacity
                  onPress={handleSaveExpense}
                  disabled={isSubmitting}
                  className="shadow-md shadow-indigo-200 mb-20 overflow-hidden rounded-2xl"
                >
                  <LinearGradient
                    colors={isSubmitting ? ['#94a3b8', '#cbd5e1'] : ['#4f46e5', '#6366f1']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    className="py-4 items-center flex-row justify-center"
                  >
                    {isSubmitting ? (
                      <ActivityIndicator color="#ffffff" />
                    ) : (
                      <>
                        <Plus color="white" size={24} className="mr-2" />
                        <Text className="text-white font-extrabold text-lg tracking-wide">Save Expense</Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </ScrollView>
            </KeyboardAvoidingView>
          </View>
        </View>
      </Modal>
    </GestureHandlerRootView>
  );
}
