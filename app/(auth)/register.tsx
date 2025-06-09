import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useAuth } from '../context/AuthContext';

export default function RegisterScreen() {
    const [username, setUsername] = useState('');
    const [firstname, setFirstname] = useState('');
    const [lastname, setLastname] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const { register } = useAuth();
    const router = useRouter();

    const validateForm = () => {
        if (!username.trim() || !firstname.trim() || !lastname.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
            Alert.alert('Error', 'Please fill in all fields');
            return false;
        }

        if (password !== confirmPassword) {
            Alert.alert('Error', 'Passwords do not match');
            return false;
        }

        if (password.length < 6) {
            Alert.alert('Error', 'Password must be at least 6 characters long');
            return false;
        }

        if (username.length < 3 || username.length > 20) {
            Alert.alert('Error', 'Username must be between 3 and 20 characters long');
            return false;
        }

        // Username validation - only letters, numbers, and underscores
        const usernameRegex = /^[a-zA-Z0-9_]+$/;
        if (!usernameRegex.test(username)) {
            Alert.alert('Error', 'Username can only contain letters, numbers, and underscores');
            return false;
        }

        if (firstname.trim().length < 1 || lastname.trim().length < 1) {
            Alert.alert('Error', 'First name and last name are required');
            return false;
        }

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            Alert.alert('Error', 'Please enter a valid email address');
            return false;
        }

        return true;
    };

    const handleRegister = async () => {
        if (!validateForm()) return;

        setLoading(true);
        try {
            await register(
                username.trim(), 
                firstname.trim(), 
                lastname.trim(), 
                email.trim(), 
                password
            );
            Alert.alert('Success', 'Account created successfully!');
            // Navigation will happen automatically via auth state change
        } catch (error: any) {
            console.error('Registration failed:', error);
            
            // Handle custom auth service errors
            let errorMessage = 'Registration failed. Please try again.';
            
            if (error.message.includes('Username') && error.message.includes('Email')) {
                errorMessage = 'Both username and email are already taken. Please choose different ones.';
            } else if (error.message.includes('Username')) {
                errorMessage = 'Username is already taken. Please choose a different username.';
            } else if (error.message.includes('Email')) {
                errorMessage = 'Email is already registered. Please use a different email or sign in.';
            } else if (error.code === 'auth/email-already-in-use') {
                errorMessage = 'An account with this email already exists.';
            } else if (error.code === 'auth/invalid-email') {
                errorMessage = 'Invalid email address.';
            } else if (error.code === 'auth/weak-password') {
                errorMessage = 'Password is too weak. Please choose a stronger password.';
            } else if (error.code === 'auth/operation-not-allowed') {
                errorMessage = 'Email/password accounts are not enabled.';
            } else if (error.code === 'auth/network-request-failed') {
                errorMessage = 'Network error. Please check your connection.';
            }
            
            Alert.alert('Registration Failed', errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const navigateToLogin = () => {
        router.push('/(auth)/login');
    };

    return (
        <KeyboardAvoidingView 
            style={styles.container} 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <ScrollView 
                contentContainerStyle={styles.scrollContainer}
                keyboardShouldPersistTaps="handled"
            >
                <View style={styles.form}>
                    <Text style={styles.title}>Create Account</Text>
                    <Text style={styles.subtitle}>Join us today</Text>

                    <TextInput
                        style={styles.input}
                        placeholder="Username"
                        value={username}
                        onChangeText={setUsername}
                        autoCorrect={false}
                        autoCapitalize="none"
                        placeholderTextColor='#666'
                    />
                    
                    <View style={styles.nameRow}>
                        <TextInput
                            style={[styles.input, styles.nameInput]}
                            placeholder="First Name"
                            value={firstname}
                            onChangeText={setFirstname}
                            autoCorrect={false}
                            autoCapitalize="words"
                            placeholderTextColor='#666'
                        />
                        
                        <TextInput
                            style={[styles.input, styles.nameInput]}
                            placeholder="Last Name"
                            value={lastname}
                            onChangeText={setLastname}
                            autoCorrect={false}
                            autoCapitalize="words"
                            placeholderTextColor='#666'
                        />
                    </View>
                    
                    <TextInput
                        style={styles.input}
                        placeholder="Email Address"
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoCorrect={false}
                        placeholderTextColor='#666'
                    />
                    
                    <TextInput
                        style={styles.input}
                        placeholder="Password"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                        autoCapitalize="none"
                        autoComplete="new-password"
                        placeholderTextColor='#666'
                    />
                    
                    <TextInput
                        style={styles.input}
                        placeholder="Confirm Password"
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        secureTextEntry
                        autoCapitalize="none"
                        autoComplete="new-password"
                        placeholderTextColor='#666'
                    />
                    
                    <Text style={styles.passwordHint}>
                        Password must be at least 6 characters long
                    </Text>
                    
                    <TouchableOpacity 
                        style={[styles.button, loading && styles.buttonDisabled]} 
                        onPress={handleRegister}
                        disabled={loading}
                    >
                        <Text style={styles.buttonText}>
                            {loading ? 'Creating Account...' : 'Create Account'}
                        </Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity onPress={navigateToLogin}>
                        <Text style={styles.linkText}>
                            Already have an account? Sign In
                        </Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    scrollContainer: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: 20,
    },
    form: {
        backgroundColor: 'white',
        padding: 30,
        borderRadius: 10,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 8,
        color: '#333',
    },
    subtitle: {
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 30,
        color: '#666',
    },
    nameRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    nameInput: {
        flex: 1,
        marginRight: 5,
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        padding: 15,
        borderRadius: 8,
        marginBottom: 15,
        fontSize: 16,
        backgroundColor: '#fafafa',
    },
    passwordHint: {
        fontSize: 12,
        color: '#666',
        marginBottom: 20,
        marginTop: -10,
        textAlign: 'center',
    },
    button: {
        backgroundColor: '#28a745',
        padding: 15,
        borderRadius: 8,
        marginTop: 10,
    },
    buttonDisabled: {
        backgroundColor: '#ccc',
    },
    buttonText: {
        color: 'white',
        textAlign: 'center',
        fontSize: 16,
        fontWeight: '600',
    },
    linkText: {
        textAlign: 'center',
        color: '#007AFF',
        marginTop: 20,
        fontSize: 16,
    },
});