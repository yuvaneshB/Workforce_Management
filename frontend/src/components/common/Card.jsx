export function Card({ children, className = 'p-5', style, ...props }) {
  return (
    <div className={`surface rounded-xl ${className}`} style={style} {...props}>
      {children}
    </div>
  );
}

