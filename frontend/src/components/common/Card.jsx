import { forwardRef } from 'react';

export const Card = forwardRef(function Card(
  { children, className = 'p-5', style, ...props },
  ref
) {
  return (
    <div
      ref={ref}
      className={`surface rounded-xl ${className}`}
      style={style}
      {...props}
    >
      {children}
    </div>
  );
});

export default Card;
