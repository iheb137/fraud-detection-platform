export interface User {
  id?: number;
  email: string;
  firstName: string;
  lastName: string;
  role: 'ADMIN' | 'ANALYSTE';
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  email: string;
  role: string;
  firstName: string;
  lastName: string;
}