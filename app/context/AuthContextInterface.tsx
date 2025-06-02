import { User } from "firebase/auth";
import { UserProfile } from "../types/goals";

export interface AuthContextType {
  loggedIn: boolean;
  user: User | null; // Firebase User object
  userProfile: UserProfile | null;
  username: string | null;
  email: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}
export default AuthContextType;