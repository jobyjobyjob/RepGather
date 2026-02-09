import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, useColorScheme, Platform, KeyboardAvoidingView, ScrollView, Modal, FlatList, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { AGE_RANGES, GENDER_OPTIONS } from '@shared/schema';

function PickerModal({ visible, onClose, options, selectedValue, onSelect, title, colors }: {
  visible: boolean;
  onClose: () => void;
  options: readonly string[];
  selectedValue: string;
  onSelect: (value: string) => void;
  title: string;
  colors: any;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={pickerStyles.overlay}>
        <View style={[pickerStyles.container, { backgroundColor: colors.card }]}>
          <View style={pickerStyles.header}>
            <Text style={[pickerStyles.title, { color: colors.text }]}>{title}</Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </Pressable>
          </View>
          <FlatList
            data={options}
            keyExtractor={(item) => item}
            renderItem={({ item }) => {
              const isSelected = item === selectedValue;
              return (
                <Pressable
                  onPress={() => { onSelect(item); onClose(); }}
                  style={[pickerStyles.option, {
                    backgroundColor: isSelected ? colors.tint + '15' : 'transparent',
                  }]}
                >
                  <Text style={[pickerStyles.optionText, {
                    color: isSelected ? colors.tint : colors.text,
                    fontFamily: isSelected ? 'Inter_600SemiBold' : 'Inter_400Regular',
                  }]}>{item}</Text>
                  {isSelected && <Ionicons name="checkmark" size={22} color={colors.tint} />}
                </Pressable>
              );
            }}
          />
        </View>
      </View>
    </Modal>
  );
}

export default function AuthScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();

  const { login, register } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [ageRange, setAgeRange] = useState('');
  const [gender, setGender] = useState('');
  const [showAgePicker, setShowAgePicker] = useState(false);
  const [showGenderPicker, setShowGenderPicker] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError('');
    if (!username.trim() || !password.trim()) {
      setError('Please fill in all fields');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(username.trim())) {
      setError('Please enter a valid email address');
      return;
    }
    if (!isLogin && !displayName.trim()) {
      setError('Please enter a display name');
      return;
    }
    if (!isLogin && (!ageRange || !gender)) {
      setError('Please select your age range and gender');
      return;
    }
    setLoading(true);
    try {
      if (isLogin) {
        await login(username.trim(), password.trim());
      } else {
        await register(username.trim(), displayName.trim(), password.trim(), ageRange, gender);
      }
    } catch (err: any) {
      const msg = err?.message || 'Something went wrong';
      const cleanMsg = msg.replace(/^\d+:\s*/, '');
      try {
        const parsed = JSON.parse(cleanMsg);
        setError(parsed.message || cleanMsg);
      } catch {
        setError(cleanMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={[styles.scrollContent, {
            paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 0) + 40,
            paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 0) + 20,
          }]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.logoSection}>
            <LinearGradient
              colors={['#FF6B35', '#FF9F1C']}
              style={styles.logoCircle}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="fitness" size={48} color="#fff" />
            </LinearGradient>
            <Text style={[styles.title, { color: colors.text }]}>RepGather</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {isLogin ? 'Welcome back' : 'Create your account'}
            </Text>
          </View>

          <View style={styles.formSection}>
            <View style={[styles.inputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="mail-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="Email Address"
                placeholderTextColor={colors.textSecondary}
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                textContentType="emailAddress"
                testID="auth-username"
              />
            </View>

            {!isLogin && (
              <View style={[styles.inputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Ionicons name="person-circle-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="Display Name"
                  placeholderTextColor={colors.textSecondary}
                  value={displayName}
                  onChangeText={setDisplayName}
                  autoCorrect={false}
                  testID="auth-display-name"
                />
              </View>
            )}

            <View style={[styles.inputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="lock-closed-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="Password"
                placeholderTextColor={colors.textSecondary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                testID="auth-password"
              />
            </View>

            {!isLogin && (
              <>
                <Pressable
                  onPress={() => setShowAgePicker(true)}
                  style={[styles.inputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}
                  testID="auth-age-range"
                >
                  <Ionicons name="calendar-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
                  <Text style={[styles.input, { color: ageRange ? colors.text : colors.textSecondary }]}>
                    {ageRange || 'Age Range'}
                  </Text>
                  <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
                </Pressable>

                <Pressable
                  onPress={() => setShowGenderPicker(true)}
                  style={[styles.inputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}
                  testID="auth-gender"
                >
                  <Ionicons name="people-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
                  <Text style={[styles.input, { color: gender ? colors.text : colors.textSecondary }]}>
                    {gender || 'Gender'}
                  </Text>
                  <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
                </Pressable>
              </>
            )}

            {error ? (
              <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
            ) : null}

            <TouchableOpacity
              style={[styles.submitButton, loading && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
              testID="auth-submit"
            >
              <LinearGradient
                colors={['#FF6B35', '#FF9F1C']}
                style={styles.submitGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitText}>
                    {isLogin ? 'Sign In' : 'Create Account'}
                  </Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setIsLogin(!isLogin);
                setError('');
              }}
              style={styles.switchButton}
              testID="auth-switch"
            >
              <Text style={[styles.switchText, { color: colors.textSecondary }]}>
                {isLogin ? "Don't have an account? " : 'Already have an account? '}
                <Text style={{ color: colors.tint, fontFamily: 'Inter_600SemiBold' }}>
                  {isLogin ? 'Sign Up' : 'Sign In'}
                </Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <PickerModal
        visible={showAgePicker}
        onClose={() => setShowAgePicker(false)}
        options={AGE_RANGES}
        selectedValue={ageRange}
        onSelect={setAgeRange}
        title="Select Age Range"
        colors={colors}
      />

      <PickerModal
        visible={showGenderPicker}
        onClose={() => setShowGenderPicker(false)}
        options={GENDER_OPTIONS}
        selectedValue={gender}
        onSelect={setGender}
        title="Select Gender"
        colors={colors}
      />
    </View>
  );
}

const pickerStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  container: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
    maxHeight: '60%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(150,150,150,0.2)',
  },
  title: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  optionText: {
    fontSize: 16,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontFamily: 'Inter_700Bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
  },
  formSection: {
    gap: 14,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    height: 52,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
  },
  errorText: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    textAlign: 'center',
  },
  submitButton: {
    borderRadius: 14,
    overflow: 'hidden',
    marginTop: 6,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitText: {
    color: '#fff',
    fontSize: 17,
    fontFamily: 'Inter_600SemiBold',
  },
  switchButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  switchText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
  },
});
