import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  isLoading, 
  className = '', 
  disabled,
  ...props 
}) => {
  const baseStyle = "px-6 py-2.5 rounded-md font-medium text-sm tracking-wide transition-all duration-200 flex items-center justify-center gap-2 transform active:scale-[0.98]";
  
  const variants = {
    // White/High-Contrast primary button for clean look
    primary: "bg-zinc-100 hover:bg-white text-zinc-900 shadow-[0_0_20px_rgba(255,255,255,0.1)] border border-transparent hover:shadow-[0_0_25px_rgba(255,255,255,0.2)]",
    // Dark secondary button
    secondary: "bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 hover:border-zinc-700",
    // Red danger button
    danger: "bg-red-900/50 hover:bg-red-900/80 text-red-200 border border-red-900"
  };

  return (
    <button 
      className={`${baseStyle} ${variants[variant]} ${className} ${disabled || isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <>
          <svg className="animate-spin h-3.5 w-3.5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="font-mono text-xs">PROCESSING...</span>
        </>
      ) : children}
    </button>
  );
};