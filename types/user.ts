export interface User {
  id: number;
  username: string;
  email: string;
}

export interface AuthContextType {
  accessToken: string | null;
  user: User | null;
  isLoadingContext: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
}
