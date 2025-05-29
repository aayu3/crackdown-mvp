import { Button, View } from 'react-native';
import { useAuth } from '../context/AuthContext';

export default function Settings() {
  const { logout } = useAuth();
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Button title="Log out" onPress={logout} />
    </View>
  );
}