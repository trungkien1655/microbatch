import { create } from 'zustand';

export const useAuthStore = create((set) => {
  const token = localStorage.getItem('mb_token');
  const userStr = localStorage.getItem('mb_user');
  let user = null;
  
  if (userStr) {
    try { user = JSON.parse(userStr); } catch (e) {}
  }

  return {
    user,
    token,
    isAuthenticated: !!token,
    
    login: (newUser, newToken) => {
      localStorage.setItem('mb_token', newToken);
      localStorage.setItem('mb_user', JSON.stringify(newUser));
      set({ user: newUser, token: newToken, isAuthenticated: true });
    },
    
    logout: () => {
      localStorage.removeItem('mb_token');
      localStorage.removeItem('mb_user');
      set({ user: null, token: null, isAuthenticated: false });
    },
    
    setUser: (newUser) => {
      localStorage.setItem('mb_user', JSON.stringify(newUser));
      set({ user: newUser });
    }
  };
});
