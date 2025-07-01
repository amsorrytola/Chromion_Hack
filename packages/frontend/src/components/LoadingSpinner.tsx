import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: 'purple' | 'blue' | 'green' | 'pink';
  text?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'md', 
  color = 'purple',
  text = 'Loading...' 
}) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24'
  };

  const colorClasses = {
    purple: 'text-purple-500',
    blue: 'text-blue-500',
    green: 'text-green-500',
    pink: 'text-pink-500'
  };

  return (
    <div className="flex flex-col items-center justify-center space-y-4">
      <div className="relative">
        {/* Outer ring */}
        <div className={`${sizeClasses[size]} ${colorClasses[color]} animate-spin`}>
          <svg className="w-full h-full" viewBox="0 0 24 24" fill="none">
            <circle
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeDasharray="60 40"
              className="opacity-75"
            />
          </svg>
        </div>
        
        {/* Inner ring */}
        <div className={`absolute inset-0 ${sizeClasses[size]} ${colorClasses[color]} animate-spin`} style={{ animationDirection: 'reverse', animationDuration: '0.8s' }}>
          <svg className="w-full h-full" viewBox="0 0 24 24" fill="none">
            <circle
              cx="12"
              cy="12"
              r="6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeDasharray="30 20"
              className="opacity-50"
            />
          </svg>
        </div>

        {/* Center dot */}
        <div className={`absolute inset-0 flex items-center justify-center ${colorClasses[color]}`}>
          <div className="w-2 h-2 bg-current rounded-full animate-pulse"></div>
        </div>
      </div>
      
      {text && (
        <div className="text-center">
          <p className="text-white font-game text-sm animate-pulse">{text}</p>
        </div>
      )}
    </div>
  );
};

export default LoadingSpinner;
