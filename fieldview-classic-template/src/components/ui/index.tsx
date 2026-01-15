// Simple button component
import { type ReactNode } from 'react'

interface ButtonProps {
  children: ReactNode
  onClick?: () => void
  className?: string
  disabled?: boolean
  variant?: 'primary' | 'secondary' | 'outline'
}

export function Button({ 
  children, 
  onClick, 
  className = '', 
  disabled = false,
  variant = 'primary'
}: ButtonProps) {
  const baseClasses = 'px-4 py-2 rounded-lg font-medium transition-all duration-200'
  
  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-400',
    secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300 disabled:bg-gray-100',
    outline: 'border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:bg-gray-50'
  }
  
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
    >
      {children}
    </button>
  )
}

// Simple input component
interface InputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  multiline?: boolean
}

export function Input({ 
  value, 
  onChange, 
  placeholder = '',
  className = '',
  disabled = false,
  multiline = false
}: InputProps) {
  const baseClasses = 'px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 disabled:bg-gray-100'
  
  if (multiline) {
    return (
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={`${baseClasses} ${className}`}
        rows={3}
      />
    )
  }
  
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className={`${baseClasses} ${className}`}
    />
  )
}

// Simple card component
interface CardProps {
  children: ReactNode
  className?: string
}

export function Card({ children, className = '' }: CardProps) {
  return (
    <div className={`bg-white border border-gray-200 rounded-lg shadow-sm ${className}`}>
      {children}
    </div>
  )
}

// Simple badge component
interface BadgeProps {
  children: ReactNode
  variant?: 'success' | 'warning' | 'error' | 'info'
  className?: string
}

export function Badge({ children, variant = 'info', className = '' }: BadgeProps) {
  const variantClasses = {
    success: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    error: 'bg-red-100 text-red-800',
    info: 'bg-blue-100 text-blue-800'
  }
  
  return (
    <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${variantClasses[variant]} ${className}`}>
      {children}
    </span>
  )
}

// Simple spinner component
interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function Spinner({ size = 'md', className = '' }: SpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  }
  
  return (
    <div className={`animate-spin ${sizeClasses[size]} ${className}`}>
      <div className="w-full h-full border-2 border-gray-200 border-t-blue-600 rounded-full" />
    </div>
  )
}

export default {
  Button,
  Input,
  Card,
  Badge,
  Spinner
}