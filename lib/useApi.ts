import { useAuth } from '@/lib/AuthContext';
import { request } from '@/lib/api';
import { User } from '@/types/user';
import { VerbItem } from '@/types/verb';

export function useApi() {
  const { accessToken } = useAuth();

  return {
    auth: {
      register: (body: { username: string; email: string; password: string }) =>
        request('/auth/register', { method: 'POST', body: JSON.stringify(body) }),

      login: (body: { username: string; password: string }) =>
        request<{ access_token: string; user: User }>('/auth/login', {
          method: 'POST',
          body: JSON.stringify(body),
          credentials: 'include',
        }),

      refresh: () =>
        request<{ access_token: string }>('/auth/refresh', {
          method: 'POST',
          credentials: 'include',
        }),

      logout: () =>
        request('/auth/logout', { method: 'POST', credentials: 'include' }),

      me: () => request('/auth/me', {}, accessToken),
    },

    savedVerbs: {
      getAll: () => request<VerbItem[]>('/saved-verbs', {}, accessToken),

      save: (item: VerbItem) =>
        request('/saved-verbs', {
          method: 'POST',
          body: JSON.stringify(item),
        }, accessToken),

      remove: (verb: string) =>
        request(`/saved-verbs/${verb}`, { method: 'DELETE' }, accessToken),
    },
  };
}
