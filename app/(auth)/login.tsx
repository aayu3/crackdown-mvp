import { useRouter } from 'expo-router';
import { Button, View } from 'react-native';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen() {
  const { login } = useAuth();
  const router    = useRouter();

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Button
        title="Log in"
        onPress={() => {
          login();
          router.replace('/(tabs)/goals');   // jump straight to Goals
        }}
      />
    </View>
  );
}