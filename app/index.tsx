import { Redirect } from 'expo-router';

export default function Index() {
  // Always land on the dedicated login route
  return <Redirect href="/(auth)/login" />;
}
