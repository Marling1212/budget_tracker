import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, Alert } from 'react-native';
import { supabase } from '../../lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import { Lock, Mail } from 'lucide-react-native';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  async function handleAuth() {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }

    setLoading(true);
    
    if (isSignUp) {
      const { error } = await supabase.auth.signUp({
        email: email,
        password: password,
      });
      if (error) Alert.alert('Sign Up Failed', error.message);
      else Alert.alert('Success', 'Check your email for the confirmation link!');
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });
      if (error) Alert.alert('Sign In Failed', error.message);
    }
    
    setLoading(false);
  }

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-slate-950"
    >
      <LinearGradient
        colors={['#020617', '#0f172a', '#1e293b']}
        className="flex-1 justify-center px-8"
      >
        <View className="mb-12">
          <Text className="text-4xl font-bold text-white text-center mb-2">
            BudgetTracker
          </Text>
          <Text className="text-slate-400 text-center text-lg">
            {isSignUp ? 'Create a new account' : 'Sign in to continue'}
          </Text>
        </View>

        <View className="space-y-4">
          <View className="flex-row items-center bg-slate-800/50 border border-slate-700 rounded-2xl px-4 py-3 h-14">
            <Mail color="#94a3b8" size={20} />
            <TextInput
              className="flex-1 text-white ml-3 text-base"
              placeholder="Email address"
              placeholderTextColor="#64748b"
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <View className="flex-row items-center bg-slate-800/50 border border-slate-700 rounded-2xl px-4 py-3 h-14">
            <Lock color="#94a3b8" size={20} />
            <TextInput
              className="flex-1 text-white ml-3 text-base"
              placeholder="Password"
              placeholderTextColor="#64748b"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>
        </View>

        <TouchableOpacity 
          onPress={handleAuth}
          disabled={loading}
          className="bg-sky-500 rounded-2xl py-4 mt-8 items-center justify-center shadow-lg shadow-sky-500/30"
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white font-bold text-lg">
              {isSignUp ? 'Sign Up' : 'Sign In'}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity 
          onPress={() => setIsSignUp(!isSignUp)}
          className="mt-6 p-2"
        >
          <Text className="text-slate-400 text-center text-base">
            {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
            <Text className="text-sky-400 font-bold">
              {isSignUp ? 'Sign In' : 'Sign Up'}
            </Text>
          </Text>
        </TouchableOpacity>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}
