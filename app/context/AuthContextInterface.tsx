export interface AuthContextType {
  loggedIn: boolean;
  username: string | null;
  email: string | null;
  login: () => void;//Promise<void>;
  logout: () => void;
}
export default AuthContextType;