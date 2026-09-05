import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Switch, Platform } from 'react-native';
import { useBudget } from '../../hooks/useBudget';
import { supabase } from '../../lib/supabase';
import { Trash2, Plus, Edit2, LogOut } from 'lucide-react-native';
import * as Icons from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../contexts/AuthContext';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

const AVAILABLE_ICONS = ['Tag', 'Coffee', 'Car', 'Home', 'ShoppingCart', 'Utensils', 'Smartphone', 'Heart', 'Smile', 'Book', 'Gift', 'Plane'];
const AVAILABLE_COLORS = ['#6366f1', '#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7', '#ec4899'];

const renderIcon = (name: string, color: string, size: number) => {
  const IconComponent = (Icons as any)[name] || Icons.Tag;
  return <IconComponent color={color} size={size} />;
};

export default function SettingsScreen() {
  const { categories, budgetStatuses, refreshData, loading, recurringTransactions } = useBudget();
  const [isAdding, setIsAdding] = useState(false);
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [newCatName, setNewCatName] = useState('');
  const [newCatBudget, setNewCatBudget] = useState('');
  const [isAccumulative, setIsAccumulative] = useState(true);
  const [newCatIcon, setNewCatIcon] = useState('Tag');
  const [newCatColor, setNewCatColor] = useState('#6366f1');
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  
  // Account state
  const [isAddingAccount, setIsAddingAccount] = useState(false);
  const [editingAccId, setEditingAccId] = useState<string | null>(null);
  const [newAccName, setNewAccName] = useState('');
  const [newAccType, setNewAccType] = useState<'CASH' | 'BANK' | 'CREDIT'>('BANK');
  const [newAccBalance, setNewAccBalance] = useState('');
  const [newAccColor, setNewAccColor] = useState('#6366f1');

  const { signOut, user } = useAuth();
  const { transactions, accounts } = useBudget();

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
    setNewCatIcon('Tag');
    setNewCatColor('#6366f1');
    setIsAdding(false);
    setEditingCatId(null);
  };

  const handleEditCategory = (cat: any) => {
    setEditingCatId(cat.id);
    setNewCatName(cat.name);
    setNewCatBudget(String(cat.daily_budget));
    setIsAccumulative(cat.is_accumulative);
    setNewCatIcon(cat.icon || 'Tag');
    setNewCatColor(cat.color || '#6366f1');
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
          icon: newCatIcon,
          color: newCatColor,
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
          icon: newCatIcon,
          color: newCatColor,
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

  const handleDeleteRecurring = async (id: string) => {
    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to cancel this subscription?')) {
        try {
          const { error } = await supabase.from('recurring_transactions').delete().eq('id', id);
          if (error) throw error;
          await refreshData(true);
        } catch (err: any) {
          safeAlert('Error', err.message);
        }
      }
    } else {
      import('react-native').then(({ Alert }) => {
        Alert.alert(
          'Cancel Subscription',
          'Are you sure you want to cancel this recurring expense?',
          [
            { text: 'Keep It', style: 'cancel' },
            { 
              text: 'Cancel', 
              style: 'destructive',
              onPress: async () => {
                try {
                  const { error } = await supabase.from('recurring_transactions').delete().eq('id', id);
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

  const resetAccForm = () => {
    setNewAccName('');
    setNewAccBalance('');
    setNewAccType('BANK');
    setNewAccColor('#6366f1');
    setIsAddingAccount(false);
    setEditingAccId(null);
  };

  const handleEditAccount = (acc: any) => {
    setEditingAccId(acc.id);
    setNewAccName(acc.name);
    setNewAccType(acc.type);
    setNewAccBalance(String(acc.balance));
    setNewAccColor(acc.color || '#6366f1');
    setIsAddingAccount(true);
  };

  const handleSaveAccount = async () => {
    if (!newAccName.trim() || !newAccBalance || isNaN(Number(newAccBalance))) {
      safeAlert('Error', 'Please enter a valid name and balance');
      return;
    }
    setIsSaving(true);
    try {
      if (editingAccId) {
        const { error } = await supabase.from('accounts').update({
          name: newAccName.trim(),
          type: newAccType,
          balance: Number(newAccBalance),
          color: newAccColor,
        }).eq('id', editingAccId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('accounts').insert({
          name: newAccName.trim(),
          type: newAccType,
          balance: Number(newAccBalance),
          color: newAccColor,
        });
        if (error) throw error;
      }
      await refreshData(true);
      resetAccForm();
    } catch (err: any) {
      safeAlert('Error', err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAccount = async (id: string) => {
    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to delete this account?')) {
        try {
          const { error } = await supabase.from('accounts').delete().eq('id', id);
          if (error) throw error;
          await refreshData(true);
        } catch (err: any) { safeAlert('Error', err.message); }
      }
    } else {
      import('react-native').then(({ Alert }) => {
        Alert.alert('Delete Account', 'Are you sure you want to delete this account?', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: async () => {
              try {
                const { error } = await supabase.from('accounts').delete().eq('id', id);
                if (error) throw error;
                await refreshData(true);
              } catch (err: any) { safeAlert('Error', err.message); }
          }}
        ]);
      });
    }
  };

  const handleExportCSV = async () => {
    if (!transactions || transactions.length === 0) {
      safeAlert('No Data', 'You have no transactions to export.');
      return;
    }

    setIsExporting(true);
    try {
      // 1. Create CSV String
      const header = 'Date,Category,Amount,Note,Tags\n';
      const rows = transactions.map(t => {
        const cat = categories.find(c => c.id === t.category_id);
        const catName = cat ? `"${cat.name.replace(/"/g, '""')}"` : 'Unknown';
        const amount = t.amount;
        const note = t.note ? `"${t.note.replace(/"/g, '""')}"` : '';
        const tags = t.tags && t.tags.length > 0 ? `"${t.tags.join(', ')}"` : '';
        return `${t.date},${catName},${amount},${note},${tags}`;
      });
      const csvContent = header + rows.join('\n');

      // 2. Save to temp file
      if (Platform.OS === 'web') {
        // Simple download trigger for web
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `BudgetTracker_Export_${new Date().getTime()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        const fileName = `BudgetTracker_Export_${new Date().getTime()}.csv`;
        // @ts-ignore - documentDirectory missing in types for some Expo versions
        const fileUri = `${FileSystem.documentDirectory}${fileName}`;
        
        await FileSystem.writeAsStringAsync(fileUri, csvContent, { encoding: FileSystem.EncodingType.UTF8 });
        
        // 3. Share the file
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri, {
            mimeType: 'text/csv',
            dialogTitle: 'Export Budget Tracker Data',
            UTI: 'public.comma-separated-values-text'
          });
        } else {
          safeAlert('Error', 'Sharing is not available on this device');
        }
      }
    } catch (error: any) {
      console.error(error);
      safeAlert('Export Failed', error.message);
    } finally {
      setIsExporting(false);
    }
  };

  const totalMonthlyExpected = budgetStatuses.reduce((sum, status) => sum + status.expectedMonthlyBudget, 0);

  return (
    <ScrollView className="flex-1 bg-[#F8FAFC]" contentContainerStyle={{ padding: 20 }}>
      
      <View className="mb-6 mt-2">
        <Text className="text-4xl font-extrabold text-slate-800 tracking-tight mb-4">Settings</Text>
        
        <View className="bg-white rounded-[32px] p-5 flex-row items-center shadow-sm border border-slate-100">
          <View className="w-14 h-14 bg-indigo-100 rounded-full items-center justify-center mr-4">
            <Text className="text-indigo-600 font-bold text-xl">
              {user?.email ? user.email.charAt(0).toUpperCase() : 'U'}
            </Text>
          </View>
          <View className="flex-1">
            <Text className="text-slate-800 font-bold text-lg">My Account</Text>
            <Text className="text-slate-500 font-medium text-sm">{user?.email}</Text>
          </View>
        </View>
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

      {/* Add New Account Section */}
      {!isAddingAccount ? (
        <TouchableOpacity
          onPress={() => setIsAddingAccount(true)}
          className="mb-8 rounded-xl overflow-hidden shadow-sm items-center justify-center bg-indigo-50"
          style={{ height: 56 }}
        >
          <View className="flex-row items-center z-10">
            <Plus color="#4f46e5" size={20} className="mr-2" />
            <Text className="text-indigo-600 font-bold text-lg">Create Account</Text>
          </View>
        </TouchableOpacity>
      ) : (
        <View className="bg-white rounded-[32px] p-6 mb-8 shadow-sm border border-slate-100">
          <Text className="text-xl font-extrabold text-slate-800 mb-6">{editingAccId ? 'Edit Account' : 'New Account'}</Text>
          <Text className="text-slate-500 font-bold mb-2 text-sm uppercase tracking-wider">Account Name</Text>
          <TextInput
            className="border-b-2 border-slate-100 py-2 mb-6 text-2xl font-bold text-slate-800"
            placeholder="e.g. Chase Bank, Cash"
            placeholderTextColor="#cbd5e1"
            value={newAccName}
            onChangeText={setNewAccName}
          />

          <Text className="text-slate-500 font-bold mb-2 text-sm uppercase tracking-wider">Type</Text>
          <View className="flex-row bg-slate-100 p-1 rounded-xl mb-6">
            {['CASH', 'BANK', 'CREDIT'].map((type) => (
              <TouchableOpacity
                key={type}
                onPress={() => setNewAccType(type as any)}
                className={`flex-1 py-2 rounded-lg items-center ${newAccType === type ? 'bg-white shadow-sm' : ''}`}
              >
                <Text className={`font-bold ${newAccType === type ? 'text-indigo-600' : 'text-slate-500'}`}>{type}</Text>
              </TouchableOpacity>
            ))}
          </View>
          
          <Text className="text-slate-500 font-bold mb-2 text-sm uppercase tracking-wider">Balance ($)</Text>
          <TextInput
            className="border-b-2 border-slate-100 py-2 mb-8 text-2xl font-bold text-slate-800"
            placeholder="0.00"
            placeholderTextColor="#cbd5e1"
            keyboardType="decimal-pad"
            value={newAccBalance}
            onChangeText={setNewAccBalance}
          />

          <Text className="text-slate-500 font-bold mb-2 text-sm uppercase tracking-wider">Color</Text>
          <View className="flex-row flex-wrap mb-8">
            {AVAILABLE_COLORS.map(color => (
              <TouchableOpacity
                key={color}
                onPress={() => setNewAccColor(color)}
                style={{ backgroundColor: color }}
                className={`w-10 h-10 rounded-full m-1 items-center justify-center ${newAccColor === color ? 'border-4 border-slate-800' : ''}`}
              />
            ))}
          </View>

          <View className="flex-row space-x-4">
            <TouchableOpacity 
              onPress={resetAccForm}
              className="flex-1 bg-slate-100 py-4 rounded-2xl items-center"
            >
              <Text className="text-slate-600 font-bold text-base">Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              onPress={handleSaveAccount}
              disabled={isSaving}
              className="flex-1 overflow-hidden rounded-2xl shadow-sm items-center justify-center bg-indigo-600"
              style={{ height: 56 }}
            >
              {isSaving ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Text className="text-white font-bold text-base">Save</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Existing Accounts List */}
      <Text className="text-xl font-extrabold text-slate-800 mb-4 tracking-tight">Your Accounts</Text>
      
      {loading && accounts.length === 0 ? (
        <ActivityIndicator color="#4f46e5" className="mt-4 mb-8" size="large" />
      ) : accounts.length === 0 ? (
        <View className="bg-slate-50 rounded-3xl p-6 items-center border border-slate-100 mb-8">
          <Text className="text-slate-500 font-medium text-center">No accounts created.</Text>
        </View>
      ) : (
        <View className="mb-8">
          {accounts.map((acc) => (
            <View key={acc.id} className="bg-white rounded-3xl p-5 mb-4 shadow-sm border border-slate-100 flex-row justify-between items-center">
              <View style={{ backgroundColor: `${acc.color || '#6366f1'}15` }} className="w-12 h-12 rounded-2xl items-center justify-center mr-4">
                {renderIcon(acc.type === 'CASH' ? 'DollarSign' : acc.type === 'CREDIT' ? 'CreditCard' : 'Building', acc.color || '#6366f1', 24)}
              </View>
              <View className="flex-1 pr-4">
                <Text className="text-slate-800 font-extrabold text-lg mb-1">{acc.name}</Text>
                <View className="flex-row items-center">
                  <Text className={`font-bold mr-2 ${acc.balance < 0 ? 'text-red-500' : 'text-green-500'}`}>${acc.balance}</Text>
                  <Text className="text-slate-400 font-medium text-xs">
                    • {acc.type}
                  </Text>
                </View>
              </View>
              <View className="flex-row">
                <TouchableOpacity onPress={() => handleEditAccount(acc)} className="p-3 bg-slate-100 rounded-full mr-2">
                  <Edit2 color="#64748b" size={20} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDeleteAccount(acc.id)} className="p-3 bg-red-50 rounded-full">
                  <Trash2 color="#ef4444" size={20} />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}

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

          <Text className="text-slate-500 font-bold mb-2 text-sm uppercase tracking-wider">Color</Text>
          <View className="flex-row flex-wrap mb-6">
            {AVAILABLE_COLORS.map(color => (
              <TouchableOpacity
                key={color}
                onPress={() => setNewCatColor(color)}
                style={{ backgroundColor: color }}
                className={`w-10 h-10 rounded-full m-1 items-center justify-center ${newCatColor === color ? 'border-4 border-slate-800' : ''}`}
              />
            ))}
          </View>

          <Text className="text-slate-500 font-bold mb-2 text-sm uppercase tracking-wider">Icon</Text>
          <View className="flex-row flex-wrap mb-8">
            {AVAILABLE_ICONS.map(icon => (
              <TouchableOpacity
                key={icon}
                onPress={() => setNewCatIcon(icon)}
                className={`w-12 h-12 rounded-xl m-1 items-center justify-center ${newCatIcon === icon ? 'bg-slate-800' : 'bg-slate-100'}`}
              >
                {renderIcon(icon, newCatIcon === icon ? 'white' : '#64748b', 24)}
              </TouchableOpacity>
            ))}
          </View>

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
            <View style={{ backgroundColor: `${cat.color || '#6366f1'}15` }} className="w-12 h-12 rounded-2xl items-center justify-center mr-4">
              {renderIcon(cat.icon || 'Tag', cat.color || '#6366f1', 24)}
            </View>
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

      {/* Subscriptions / Recurring List */}
      <Text className="text-xl font-extrabold text-slate-800 mb-4 mt-8 tracking-tight">Your Subscriptions</Text>
      
      {loading && recurringTransactions.length === 0 ? (
        <ActivityIndicator color="#4f46e5" className="mt-8" size="large" />
      ) : recurringTransactions.length === 0 ? (
        <View className="bg-slate-50 rounded-3xl p-6 items-center border border-slate-100">
          <Text className="text-slate-500 font-medium text-center">No active subscriptions.{'\n'}Add a recurring expense from the home screen.</Text>
        </View>
      ) : (
        recurringTransactions.map((rec) => {
          const category = categories.find(c => c.id === rec.category_id);
          if (!category) return null;
          
          return (
            <View key={rec.id} className="bg-white rounded-3xl p-5 mb-4 shadow-sm border border-slate-100 flex-row justify-between items-center">
              <View style={{ backgroundColor: `${category.color || '#6366f1'}15` }} className="w-12 h-12 rounded-2xl items-center justify-center mr-4">
                {renderIcon(category.icon || 'Tag', category.color || '#6366f1', 24)}
              </View>
              <View className="flex-1 pr-4">
                <Text className="text-slate-800 font-extrabold text-lg mb-1">{category.name}</Text>
                <View className="flex-row items-center">
                  <Text className="text-indigo-500 font-bold mr-2">${rec.amount} / {rec.frequency.toLowerCase()}</Text>
                  {rec.note && (
                    <Text className="text-slate-400 font-medium text-xs truncate" numberOfLines={1}>
                      • {rec.note}
                    </Text>
                  )}
                </View>
              </View>
              <View className="flex-row">
                <TouchableOpacity 
                  onPress={() => handleDeleteRecurring(rec.id)} 
                  className="p-3 bg-red-50 rounded-full"
                >
                  <Trash2 color="#ef4444" size={20} />
                </TouchableOpacity>
              </View>
            </View>
          );
        })
      )}
      
      {/* Actions */}
      <Text className="text-xl font-extrabold text-slate-800 mb-4 mt-8 tracking-tight">Actions</Text>
      
      <TouchableOpacity 
        onPress={handleExportCSV}
        disabled={isExporting}
        className="mb-4 bg-indigo-50 rounded-2xl py-4 flex-row justify-center items-center border border-indigo-100"
      >
        {isExporting ? (
          <ActivityIndicator color="#4f46e5" size="small" className="mr-2" />
        ) : (
          <Icons.Download color="#4f46e5" size={20} className="mr-2" />
        )}
        <Text className="text-indigo-600 font-bold text-lg">Export to CSV</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        onPress={signOut}
        className="mb-4 bg-slate-100 rounded-2xl py-4 flex-row justify-center items-center"
      >
        <LogOut color="#64748b" size={20} className="mr-2" />
        <Text className="text-slate-600 font-bold text-lg">Sign Out</Text>
      </TouchableOpacity>

      <View className="h-24" />
    </ScrollView>
  );
}
