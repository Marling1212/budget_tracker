import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, Alert } from 'react-native';
import { supabase } from '../../lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import { Lock, Mail, Globe, Smartphone } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const { t } = useTranslation();

  const safeAlert = (title: string, message: string) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}: ${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  async function handleAuth() {
    if (!email || !password) {
      safeAlert(t('alerts.error'), t('alerts.enterCredentials'));
      return;
    }

    setLoading(true);
    
    if (isSignUp) {
      const { error } = await supabase.auth.signUp({
        email: email,
        password: password,
      });
      if (error) safeAlert(t('alerts.signUpFailed'), error.message);
      else safeAlert(t('alerts.success'), t('alerts.checkEmail'));
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });
      if (error) safeAlert(t('alerts.signInFailed'), error.message);
    }
    
    setLoading(false);
  }

  async function handleOAuth(provider: string) {
    safeAlert(t('alerts.comingSoon'), t('alerts.oauthComingSoon', { provider }));
  }

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-[#F8FAFC] dark:bg-slate-950"
    >
      <View className="flex-1 justify-center px-6">
        <View className="mb-10 mt-10">
          <Text className="text-5xl font-extrabold text-slate-800 dark:text-slate-200 text-center mb-3 tracking-tight">
            {t('auth.appName')}
          </Text>
          <Text className="text-slate-500 dark:text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 font-medium text-center text-lg">
            {isSignUp ? t('auth.createAccount') : t('auth.welcomeBack')}
          </Text>
        </View>

        <View className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 mb-8">
          <View className="mb-6 space-y-4">
            <View className="flex-row items-center bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 h-14 mb-4">
              <Mail color="#94a3b8" size={20} />
              <TextInput
                className="flex-1 text-slate-800 dark:text-slate-200 ml-3 text-base font-medium"
                placeholder={t('auth.emailPlaceholder')}
                placeholderTextColor="#94a3b8"
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
              />
            </View>

            <View className="flex-row items-center bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 h-14">
              <Lock color="#94a3b8" size={20} />
              <TextInput
                className="flex-1 text-slate-800 dark:text-slate-200 ml-3 text-base font-medium"
                placeholder={t('auth.passwordPlaceholder')}
                placeholderTextColor="#94a3b8"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
            </View>
          </View>

          <TouchableOpacity 
            onPress={handleAuth}
            disabled={loading}
            className="rounded-2xl overflow-hidden shadow-sm items-center justify-center mb-6"
            style={{ height: 56 }}
          >
            <LinearGradient
              colors={loading ? ['#94a3b8', '#cbd5e1'] : ['#4f46e5', '#6366f1']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ position: 'absolute', width: '100%', height: '100%' }}
            />
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-extrabold text-lg tracking-wide">
                {isSignUp ? t('auth.signUp') : t('auth.signIn')}
              </Text>
            )}
          </TouchableOpacity>

          <View className="flex-row items-center mb-6">
            <View className="flex-1 h-px bg-slate-200" />
            <Text className="mx-4 text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 font-bold text-xs uppercase tracking-wider">{t('auth.orContinueWith')}</Text>
            <View className="flex-1 h-px bg-slate-200" />
          </View>

          <View className="flex-row justify-between" style={{ gap: 12 }}>
            <TouchableOpacity 
              onPress={() => handleOAuth('Google')}
              className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 py-3 rounded-2xl items-center justify-center flex-row shadow-sm"
            >
              <Globe color="#db4437" size={20} />
              <Text className="ml-2 font-bold text-slate-700">Google</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              onPress={() => handleOAuth('Apple')}
              className="flex-1 bg-slate-900 border border-slate-800 py-3 rounded-2xl items-center justify-center flex-row shadow-sm"
            >
              <Smartphone color="white" size={20} />
              <Text className="ml-2 font-bold text-white">Apple</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity onPress={() => setIsSignUp(!isSignUp)} className="p-4 items-center">
          <Text className="text-slate-500 dark:text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 font-medium text-base">
            {isSignUp ? t('auth.alreadyHaveAccount') : t('auth.dontHaveAccount')}
            <Text className="text-indigo-600 font-bold">
              {isSignUp ? t('auth.signIn') : t('auth.signUp')}
            </Text>
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
