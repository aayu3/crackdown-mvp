import { User } from "firebase/auth";

export interface AuthContextType {
  loggedIn: boolean;
  user: User | null; // Firebase User object
  username: string | null;
  email: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}
export default AuthContextType;